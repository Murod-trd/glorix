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
      _dbCache = arr; // [[code, desc], ...]
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
 * Поиск в полной базе ТН ВЭД (13 289 кодов) без API
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

  const qWords = cleanText(name).split(' ').filter(w => w.length >= 3);
  if (!qWords.length) return null;

  let best = null, bestScore = 0;
  for (const [code, desc] of db) {
    const s = wordScore(qWords, desc);
    if (s > bestScore) { bestScore = s; best = { code, desc }; }
  }
  return best && bestScore >= 0.35 ? { code: best.code, score: bestScore } : null;
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
