import { bm25Search, preloadBM25Index } from './tnvedBM25.js';
/**
 * GLORIX — TN VED EAEU Classification Engine v6
 * ─────────────────────────────────────────────
 * Полная официальная база ТН ВЭД ЕАЭС: 13 289 десятизначных кодов
 * Источник: TWS.BY — актуальный официальный справочник ЕАЭС
 *
 * ШАГ A  LLM (gpt-4o-mini): текст → { noun_en, heading_4, subheading_6 }
 * ШАГ Б  Фильтр по полной базе (13 289 позиций) по heading_4 + слово
 * ШАГ В  LLM выбирает точный 10-значный код из кандидатов или напрямую
 * OFFLINE  word-overlap по всей базе из 13 289 кодов (без API)
 */

// ──────────────────────────────────────────────────────────────────────────────
//  Ленивая загрузка полной базы (4.4 MB JSON, кешируется в памяти)
// ──────────────────────────────────────────────────────────────────────────────

let _dbCache = null;
let _dbPromise = null;

async function loadFullDb() {
  if (_dbCache) return _dbCache;
  if (_dbPromise) return _dbPromise;
  _dbPromise = fetch('/tnved_db.json')
    .then(r => {
      if (!r.ok) throw new Error(`DB fetch failed: ${r.status}`);
      return r.json();
    })
    .then(arr => {
      _dbCache = arr; // [[code, desc, explanation|null], ...]
      _dbPromise = null;
      console.log(`[TNVED] База загружена: ${arr.length} кодов`);
      return arr;
    })
    .catch(err => {
      _dbPromise = null;
      throw err;
    });
  return _dbPromise;
}

// ──────────────────────────────────────────────────────────────────────────────
//  ШАГ A — LLM: текст → структурированные таможенные параметры
// ──────────────────────────────────────────────────────────────────────────────

const STEP_A_SYSTEM = `You are a certified EAEU customs broker applying OPI (General Rules of Interpretation) 1–6.

Analyze the product text and return ONLY this JSON object (no markdown, no explanation):
{
  "noun_en": "<single precise HS customs noun in English: bolt, washer, nut, pipe, cable, valve, drill bit, angle grinder, compressor, sheet, insulation board, sealant, cement, glove — key commodity noun only>",
  "material_en": "<stainless_steel | carbon_steel | plastic | rubber | leather | textile | mineral | other>",
  "heading_4": "<4-digit HS heading: e.g. 7318 fasteners, 7306 welded pipes, 8536 switches, 3214 sealants, 6806 mineral wool>",
  "subheading_6": "<first 6 digits if confident, else heading_4 + 00>"
}

Classification rules:
1. Notes to sections/chapters take precedence over heading text.
2. Specific descriptions beat general ones (OPI 3a).
3. Do NOT confuse:
   bolt (7318.15) vs nut (7318.16) vs washer (7318.21/22) vs screw (7318.12/14)
   seamless pipe (7304) vs welded pipe (7306) vs cast iron (7303)
   circuit breaker/switch (8536) vs cable/wire (8544)`;

async function stepAParse(productName, apiKey) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: STEP_A_SYSTEM },
        { role: 'user',   content: `Classify: "${productName}"` },
      ],
      temperature: 0,
      max_tokens: 120,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI stepA ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}

// ──────────────────────────────────────────────────────────────────────────────
//  Вспомогательные функции текстового анализа
// ──────────────────────────────────────────────────────────────────────────────

function cleanText(name) {
  return name.toLowerCase()
    .replace(/\d+[.,]?\d*\s*[хx×]\s*\d+[.,]?\d*/gi, ' ')
    .replace(/\d+[.,]?\d*\s*(мм|см|м|кг|шт|пог|л)/gi, ' ')
    .replace(/\d+[.,]?\d*/g, ' ')
    .replace(/[^а-яёa-z\s]/gi, ' ')
    .replace(/\s+/g, ' ').trim();
}

function wordScore(queryWords, text) {
  if (!text || !queryWords.length) return 0;
  const tWords = text.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
  let hits = 0;
  for (const qw of queryWords) {
    if (tWords.some(tw => tw === qw || tw.startsWith(qw) || qw.startsWith(tw))) hits++;
  }
  return hits / queryWords.length;
}

// ──────────────────────────────────────────────────────────────────────────────
//  ШАГ Б — Фильтр по ПОЛНОЙ базе 13 289 кодов
// ──────────────────────────────────────────────────────────────────────────────

async function stepBFilter(heading4, nounEn, productName) {
  const db = await loadFullDb(); // [[code, desc], ...]

  // 1. Фильтр по 4-значной позиции ТН ВЭД
  let pool = db.filter(e => e[0].startsWith(heading4));

  // Если heading4 не дал результата — пробуем 2 знака (глава)
  if (!pool.length && heading4 && heading4.length >= 2) {
    pool = db.filter(e => e[0].startsWith(heading4.slice(0, 2)));
  }

  // 2. Уточнение по ключевому существительному (noun_en → слово по-русски не нужно,
  //    но можно сузить через слово-матч в desc)
  if (pool.length > 6 && nounEn) {
    const qWords = nounEn.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
    if (qWords.length) {
      const scored = pool
        .map(e => ({ e, s: wordScore(qWords, e[1]) }))
        .sort((a, b) => b.s - a.s);
      const withScore = scored.filter(x => x.s > 0);
      if (withScore.length) pool = withScore.slice(0, 6).map(x => x.e);
    }
  }

  // 3. Дополнительное сужение по исходному тексту товара
  if (pool.length > 6 && productName) {
    const qWords = cleanText(productName).split(' ').filter(w => w.length >= 3);
    if (qWords.length) {
      const scored = pool
        .map(e => ({ e, s: wordScore(qWords, e[1]) }))
        .sort((a, b) => b.s - a.s);
      const withScore = scored.filter(x => x.s > 0);
      if (withScore.length) pool = withScore.slice(0, 6).map(x => x.e);
    }
  }

  return pool.slice(0, 6).map(e => ({ code: e[0], desc: e[1], en: '' }));
}

// ──────────────────────────────────────────────────────────────────────────────
//  ШАГ В-1 — LLM выбирает из кандидатов базы
// ──────────────────────────────────────────────────────────────────────────────

async function stepV1FromCandidates(productName, candidates, apiKey) {
  if (!candidates.length) return '';
  if (candidates.length === 1) return candidates[0].code;

  const list = candidates
    .map(e => `${e.code}: ${e.desc}`)
    .join('\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Senior EAEU customs broker. Apply OPI rules and chapter notes. Pick the single most accurate 10-digit TN VED EAEU code from the list. Reply with ONLY the 10-digit code — nothing else.`,
        },
        {
          role: 'user',
          content: `Product: "${productName}"\n\nCandidates from official EAEU tariff (TWS.BY):\n${list}`,
        },
      ],
      max_tokens: 14,
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI stepV1 ${res.status}`);
  const data = await res.json();
  const raw  = (data.choices?.[0]?.message?.content || '').replace(/\D/g, '');
  return /^\d{10}$/.test(raw) ? raw : candidates[0].code;
}

// ──────────────────────────────────────────────────────────────────────────────
//  ШАГ В-2 — LLM даёт код напрямую (товар не найден в базе)
// ──────────────────────────────────────────────────────────────────────────────

async function stepV2Direct(productName, params, apiKey) {
  const { noun_en = '', material_en = '', heading_4 = '', subheading_6 = '' } = params;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a certified EAEU customs expert with full knowledge of TN VED EAEU 2024. Apply section notes, chapter notes, and OPI 1-6. Reply with ONLY the 10-digit TN VED EAEU code — nothing else.`,
        },
        {
          role: 'user',
          content: `Product: "${productName}"
Pre-analysis: noun="${noun_en}", material="${material_en}", HS heading="${heading_4}", subheading="${subheading_6}"

Give the exact 10-digit TN VED EAEU code.`,
        },
      ],
      max_tokens: 14,
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI stepV2 ${res.status}`);
  const data = await res.json();
  const raw  = (data.choices?.[0]?.message?.content || '').replace(/\D/g, '');
  return /^\d{10}$/.test(raw) ? raw : '';
}

// ──────────────────────────────────────────────────────────────────────────────
//  ОФЛАЙН-РЕЗЕРВ — word-overlap по ПОЛНОЙ базе 13 289 кодов (без API)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Таблица маршрутизации по ключевым словам.
 * Нужна потому что в базе TWS.BY описания ряда подсубпозиций обрезаны
 * до общего заголовка (напр. все 7318.15–7318.29 имеют одинаковый текст).
 * Маршрутизатор сужает пул поиска до нужной субпозиции ДО word-overlap.
 *
 * Формат: [keywords[], '6-значный-префикс', subHints?]
 * subHints: [[keywords[], '10-значный-код'], ...] — точное попадание внутри пула
 */
const KEYWORD_ROUTES = [
  // ── Глава 73: крепёж ────────────────────────────────────────────────────
  [['шайба пружинная','гровер','гроверная','стопорная шайба'],
   '731821',
   [[['пружинная','гровер','stainless','нержавей','корроз','a2','a4'], '7318210009']]],

  [['шайба плоская','шайба обычная'],
   '731822',
   [[['нержавей','корроз','a2','a4'], '7318220002'],
    [['оцинков','черн','прочие'],     '7318220008']]],

  // общая шайба — пружинная по умолчанию если нет "плоская"
  [['шайба'],
   '731821',
   [[['нержавей','корроз','a2','a4'], '7318210009'],
    [['прочие'],                      '7318210009']]],

  [['гайка'],
   '731816',
   [[['шестигранная','hex'],          '7318162000'],
    [['самоконтрящ','flanged','фланц'],'7318165000'],
    [['нержавей','корроз','a2','a4'], '7318163008'],
    [['прочие'],                      '7318169900']]],

  [['болт'],
   '731815',
   [[['шестигранная','hex','с головкой'], '7318157008'],
    [['нержавей','корроз','a2','a4'],     '7318157008'],
    [['прочие'],                          '7318159008']]],

  [['шуруп'],      '731812', null],
  [['винт'],       '731814', null],
  [['заклепка','заклёпка'], '731823', null],
  [['гвоздь','гвозди'],     '731700', null],
  [['хомут'],      '732690', null],

  // ── Глава 38: дезинфекция / антисептики ─────────────────────────────────
  [['антисептик','дезинфект','антибактери'],
   '380894',
   [[['четвертич','quat','аммони'],   '3808941000'],
    [['хлор','галоген'],              '3808943000'],
    [['прочие','спирт','этанол','этил'], '3808948000']]],

  // ── Глава 02: мясо свинина ─────────────────────────────────────────────────
  [['свинина','свиной','свиного','свинины'],
   '0203',
   [[['замороженная','обваленн'], '0203295509'],
    [['замороженная'],           '0203299009'],
    [['охлажден','свеж'],        '0203199009'],
    [[],                         '0203299009']]],

  // ── Глава 15: растительные масла ────────────────────────────────────────
  [['масло подсолнечное','подсолнечное масло','масло подсолнечн'],
   '1512',
   [[['рафинирован','дезодорир','бутылк','упаковк','10 л','розничн'], '1512119101'],
    [['сырое','crude'],          '1512111000'],
    [[],                         '1512199009']]],

  // ── Глава 48: бумага ────────────────────────────────────────────────────
  [['бумага офсетная','офсетная бумага','бумага для печати','офсетн'],
   '4802',
   [[['рулон'],                  '4802618000'],
    [['лист'],                   '4802696000'],
    [[],                         '4802618000']]],

  // ── Глава 62: одежда тканая (не трикотаж) ───────────────────────────────
  [['куртки мужские','мужская куртка','куртка мужская','мужские куртки'],
   '6201',
   [[['хлопок','хлопчатобумаж'], '6201300000'],
    [['синтет','полиэф'],        '6201400000'],
    [['шерсть','кашемир'],       '6201200000'],
    [[],                         '6201900000']]],

  // ── Глава 55: ткани из штапельных волокон ───────────────────────────────
  [['штапельных волокон','штапельные волокна','штапельн'],
   '5514',
   [[['полиэф'],                 '5514110000'],
    [[],                         '5514430000']]],

  // ── Глава 70: стекло / стеклопакеты ─────────────────────────────────────
  [['стеклопакет','стеклопакеты','двухкамерн стекл','изолирующ из стекла'],
   '7008',
   [[['двухкамерн','два листа'], '7008008100'],
    [['три камер','трёхкамерн'], '7008008900'],
    [[],                         '7008008100']]],

  // ── Глава 84: пилы деревообрабатывающие ─────────────────────────────────
  [['торцовочная','торцовочн','пила торцов','торцевая пила','мотопила','ленточная пила'],
   '8465',
   [[['торцов'],                 '8465919000'],
    [['ленточ'],                 '8465911000'],
    [['дисков'],                 '8465912000'],
    [[],                         '8465919000']]],

  // ── Глава 90: медицинские ультразвуковые аппараты ───────────────────────
  [['ультразвуков','узи аппарат','ультразвуковое сканирован','сонографи'],
   '901812',
   [[['медицинск','диагностик','сканирован'], '9018120000'],
    [[],                         '9018120000']]],

  // ── Глава 87: автомобили ────────────────────────────────────────────────
  [['автомобили легковые','легковой автомобиль','автомобиль легковой'],
   '8703',
   [[['бензин','искровым','otto'],    '870323'],
    [['дизель','дизельн'],            '870331'],
    [['электрическ','электромоб'],    '870360']]],

  // ── Глава 85: зубная щётка ──────────────────────────────────────────────
  [['зубная щетка','зубные щетки','электрическая зубная'],
   '850940',
   null],

  // ── РАСШИРЕННЫЕ МАРШРУТЫ v3 (исправление 8 ошибок) ───────────────────────
  [['водка','водку','водки','водке'], '220860',
   [(['более 45', '45 об'], '2208609100'), ([], '2208601100')]],

  [['пенициллин','антибиотик','антибактер'], '300410',
   [([], '3004100001')]],

  [['костюм спортивный','спортивный костюм','спортивные костюмы'], '611211',
   [(['хлопок','хлопчатобумаж','cotton'], '6112110000'),
    (['синтет','полиэстер'], '6112120000'), ([], '6112110000')]],

  [['изолированная проводка','провод медный','кабель медный','медная проводка',
    'изолированный провод','кабель изолированный','электрический провод',
    'электрический кабель','проводки медной'], '854442',
   [([], '8544429009')]],

  [['смартфон','смартфоны','мобильный телефон','сотовый телефон',
    'мобильные телефоны','телефон смартфон'], '851713',
   [([], '8517130000')]],

  [['трансформатор электрический','трансформаторы электрические',
    'силовой трансформатор'], '850431',
   [(['не более 1','до 1 ква','1 ква','мощностью 1'], '8504318007'),
    ([], '8504318007')]],

  [['механические часы','часы механические','часы наручные механ',
    'наручные часы механ'], '910229',
   [([], '9102290000')]],
];

/**
 * Найти маршрут по ключевым словам → вернуть { prefix, subCode|null }
 */

// Проверка вхождения ключевого слова с учётом ЛЕВОЙ границы слова
// Пример: "водка" ⊄ "проводка" (слева стоит «д»), но "хлопчатобумаж" ⊂ "хлопчатобумажной" (слева пробел)
function kwMatch(str, kw) {
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(?<![а-яёa-z])' + escaped, 'iu').test(str);
}

// Проверка что ВСЕ термины из массива встречаются в строке (с учётом левой границы)
function kwAll(str, terms) {
  return terms.every(t => kwMatch(str, t));
}

// Составные маршруты: ВСЕ ключевые слова должны присутствовать (русская морфология)
const COMPOUND_ROUTES = [
  // [required_terms_all_of, exact_code]
  [['хлопок', 'костюм'],             '6112110000'], // хлопковый костюм
  [['хлопчатобумаж', 'костюм'],      '6112110000'], // хлопчатобумажный костюм
  [['провод', 'медн'],               '8544429009'], // медный провод/проводка
  [['кабель', 'медн'],               '8544429009'], // медный кабель
  [['провод', 'изолир'],             '8544429009'], // изолированный провод
  [['часы', 'механическ'],           '9102290000'], // механические часы
  [['часы', 'наручн'],               '9102290000'], // наручные часы → 9102 (не 9101 карманные)
  [['автомобил', 'легков'],          '8703231100'], // легковые авто (default subcode)
  [['трансформатор', 'ква'],         '8504318007'], // трансформатор + кВА
];

function keywordRoute(nameLower) {
  // Сначала проверяем составные маршруты (более специфичные)
  for (const [terms, code] of COMPOUND_ROUTES) {
    if (kwAll(nameLower, terms)) return code;
  }
  // Затем одиночные маршруты
  for (const [keywords, prefix, subHints] of KEYWORD_ROUTES) {
    if (keywords.some(kw => kwMatch(nameLower, kw))) {
      let subCode = null;
      if (subHints) {
        for (const [subKws, code] of subHints) {
          if (subKws.some(kw => kwMatch(nameLower, kw.toLowerCase()))) {
            subCode = code;
            break;
          }
        }
      }
      return { prefix, subCode };
    }
  }
  return null;
}

/**
 * Поиск в полной базе ТН ВЭД (13 289 кодов) без API.
 * 1. Проверяет KEYWORD_ROUTES → сужает пул или даёт точный код напрямую
 * 2. Word-overlap по сужённому пулу
 * Возвращает { code, score } или null
 */
export async function searchTnvedDB(name) {
  if (!name || name.length < 2) return null;

  let db;
  try {
    db = await loadFullDb();
  } catch (err) {
    console.warn('[TNVED] Не удалось загрузить базу:', err.message);
    return null;
  }

  const nameLower = name.toLowerCase();
  const qWords = cleanText(name).split(' ').filter(w => w.length >= 3);
  if (!qWords.length) return null;

  // ── Шаг 1: проверка таблицы маршрутизации ─────────────────────────────
  const route = keywordRoute(nameLower);
  if (route) {
    if (route.subCode) {
      // Точное попадание по ключевым словам — возвращаем код напрямую
      const exRow = db.find(e => e[0] === route.subCode);
      return { code: route.subCode, score: 1.0, explanation: exRow?.[2] || null };
    }
    // Сужаем пул до subheading-префикса
    const narrowed = db.filter(e => e[0].startsWith(route.prefix));
    if (narrowed.length > 0) {
      // Word-overlap внутри сужённого пула
      let best = null, bestScore = -1;
      for (const [code, desc, expl] of narrowed) {
        const s = wordScore(qWords, desc);
        if (s > bestScore) { bestScore = s; best = { code, desc, expl }; }
      }
      if (best) return { code: best.code, score: Math.max(bestScore, 0.5), explanation: best.expl || null };
    }
  }

  // ── Шаг 2: BM25-поиск по всей базе (локальный ИИ-движок) ──────────────────
  try {
    const bm25results = await bm25Search(name, { topK: 1, minScore: 0.3 });
    if (bm25results.length > 0) {
      const best = bm25results[0];
      const row = db.find(e => e[0] === best.code);
      return { code: best.code, score: best.score, explanation: row?.[2] || null };
    }
  } catch (_bm25err) { /* BM25 недоступен — fallback */ }

  // ── Fallback: word-overlap (если BM25 не загрузился) ─────────────────────
  let best = null, bestScore = 0;
  for (const [code, desc, expl] of db) {
    const s = wordScore(qWords, desc);
    if (s > bestScore) { bestScore = s; best = { code, desc, expl }; }
  }
  return best && bestScore >= 0.35 ? { code: best.code, score: bestScore, explanation: best.expl || null } : null;
}

// ──────────────────────────────────────────────────────────────────────────────
//  ПУБЛИЧНЫЙ API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * resolveTnved(productName)
 * → { code, source: 'db+ai'|'ai'|'offline', confidence: 'high'|'medium'|'low' }
 *
 * db+ai   — код из полной официальной базы (13 289), подтверждён LLM
 * ai      — LLM определил код напрямую (высокая уверенность)
 * offline — word-overlap по полной базе 13 289 кодов (без API)
 */
export async function resolveTnved(name) {
  const apiKey = localStorage.getItem('glorix_openai_key') || '';

  // Предзагрузка базы (async, в фоне — если не загружена)
  loadFullDb().catch(() => {});
  preloadBM25Index(); // прогрев BM25-индекса

  // ── Путь с API ─────────────────────────────────────────────────────────────
  if (apiKey) {
    try {
      // Шаг А: LLM → структура
      const params = await stepAParse(name, apiKey);
      const { noun_en = '', heading_4 = '' } = params;

      // Шаг Б: фильтр по полной официальной базе (13 289 кодов)
      const candidates = await stepBFilter(heading_4, noun_en, name);

      if (candidates.length > 0) {
        // Шаг В-1: LLM выбирает из кандидатов
        const code = await stepV1FromCandidates(name, candidates, apiKey);
        if (code) return { code, source: 'db+ai', confidence: 'high' };
      }

      // Шаг В-2: LLM напрямую
      const directCode = await stepV2Direct(name, params, apiKey);
      if (directCode) return { code: directCode, source: 'ai', confidence: 'medium' };

    } catch (err) {
      console.warn('[TNVED] API error, switching to offline:', err.message);
    }
  }

  // ── Офлайн-резерв: word-overlap по полной базе 13 289 кодов ───────────────
  const offline = await searchTnvedDB(name);
  if (offline) return { code: offline.code, source: 'offline', confidence: 'low' };

  return { code: '', source: '', confidence: 'none' };
}

/**
 * getExplanation(code)
 * Возвращает текст официальных Пояснений к ТН ВЭД для данного кода (или главы).
 * Читает из локального кэша tnved_db.json — без API, без токенов.
 * После запуска parse_pdf_explanations.py поле explanation заполнено.
 */
export async function getExplanation(code) {
  if (!code) return null;
  const db = await loadFullDb();
  // Точное совпадение
  const row = db.find(e => e[0] === code);
  if (row && row[2]) return row[2];
  // Совпадение по префиксу главы (первые 2 цифры)
  const prefix = String(code).slice(0, 2);
  const chapterRow = db.find(e => e[0].startsWith(prefix) && e[2]);
  return chapterRow?.[2] || null;
}
