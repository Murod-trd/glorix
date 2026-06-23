/**
 * GLORIX — TN VED Classification Engine v3
 * ──────────────────────────────────────────
 * Быстрый путь: type-aware word-overlap (без API, мгновенно)
 *   1. Определяем тип товара по русским ключевым словам
 *   2. Фильтруем базу: только записи нужного типа
 *   3. Word-overlap внутри отфильтрованного множества
 *
 * Медленный путь (если ключ OpenAI есть и быстрый не нашёл):
 *   Шаг 1 → LLM парсит → JSON
 *   Шаг 2 → программный фильтр по типу + материалу
 *   Шаг 3 → LLM выбирает из топ-5
 */

import TNVED_DB from '../data/tnvedDb.js';

// ══════════════════════════════════════════════════════════════════════════════
//  ТИП ТОВАРА — определяем по русским словам во входной строке
// ══════════════════════════════════════════════════════════════════════════════

const TYPE_DETECT_RU = {
  washer:        ['шайба', 'шайбы', 'шайбу', 'гровер'],
  nut:           ['гайка', 'гайки', 'гайку', 'гаек'],
  bolt:          ['болт', 'болты', 'болта', 'болтов', 'шпилька'],
  screw:         ['саморез', 'шуруп', 'самореза', 'шурупов'],
  anchor:        ['анкер', 'дюбель', 'анкера'],
  nail:          ['гвоздь', 'гвозди', 'гвоздей'],
  drill_bit:     ['бур', 'буры', 'сверло', 'свёрла', 'sds'],
  rebar:         ['арматура', 'арматуры', 'арматуру'],
  glove:         ['перчатки', 'перчатка', 'краги', 'рукавицы'],
  sling:         ['строп', 'стропы'],
  film:          ['плёнка', 'пленка', 'плёнки'],
  mesh:          ['серпянка', 'сетка', 'стеклосетка'],
  cable:         ['кабель', 'провод', 'кабеля'],
  sealant:       ['герметик', 'шпаклёвка', 'шпаклевка'],
  instrument:    ['нивелир', 'уровень', 'лазерный'],
  tool_manual:   ['ключ', 'молоток', 'отвёртка', 'плоскогубцы', 'шпатель'],
  tool_electric: ['перфоратор', 'дрель', 'болгарка', 'шуруповёрт', 'пила'],
};

// Тип в DB-записи → разрешённые типы из запроса (для сопоставления)
const DB_TYPE_FIELD = {
  washer:        'washer',
  nut:           'nut',
  bolt:          'bolt',
  screw:         'screw',
  anchor:        'anchor',
  nail:          'nail',
  drill_bit:     'drill_bit',
  rebar:         'rebar',
  glove:         'glove',
  sling:         'sling',
  film:          'film',
  mesh:          'mesh',
  cable:         'cable',
  sealant:       'sealant',
  instrument:    'instrument',
  tool_manual:   'tool_manual',
  tool_electric: 'tool_electric',
};

function detectItemType(query) {
  const q = query.toLowerCase();
  for (const [type, keywords] of Object.entries(TYPE_DETECT_RU)) {
    if (keywords.some(kw => q.includes(kw))) return type;
  }
  return null;
}

function isStainlessQuery(query) {
  const q = query.toLowerCase();
  return /a2|а2|a4|а4|нержав|inox|stainless/.test(q);
}

// ══════════════════════════════════════════════════════════════════════════════
//  БЫСТРЫЙ ПУТЬ: type-aware word-overlap поиск по локальной базе
// ══════════════════════════════════════════════════════════════════════════════

export function cleanQuery(name) {
  let s = name.toLowerCase();
  s = s.replace(/\d+[.,]?\d*\s*[хx×]\s*\d+[.,]?\d*/gi, ' ');
  s = s.replace(/\d+[.,]?\d*\s*(мм|см|м|кг|г|л|т|шт|кв|куб|пог)/gi, ' ');
  s = s.replace(/\d+[.,]?\d*/g, ' ');
  s = s.replace(/[a-z]{1,3}\d+/gi, ' ');
  // Сохраняем важные аббревиатуры
  s = s.replace(/[a-z]+/gi, m =>
    /^(ввг|пвх|пэ|пп|sds|а2|a2|а4|a4|led|нд|ду)$/i.test(m) ? m : ' '
  );
  s = s.replace(/[^а-яёa-z\s]/gi, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

export function searchTnvedDB(name) {
  if (!name || name.length < 3) return null;

  const detectedType = detectItemType(name);
  const isStainless  = isStainlessQuery(name);
  const cleaned      = cleanQuery(name);
  const queryWords   = cleaned.split(' ').filter(w => w.length >= 3);
  if (!queryWords.length) return null;

  // 1. Сужаем базу по типу (ключевой фильтр — шайба ≠ болт)
  let pool = detectedType
    ? TNVED_DB.filter(e => e.type === detectedType)
    : TNVED_DB;

  // Если тип не определён или пул пустой — вся база (graceful fallback)
  if (!pool.length) pool = TNVED_DB;

  // 2. Фильтр нержавейки внутри типа
  if (isStainless && detectedType) {
    const ss = pool.filter(e => e.stainless === true);
    if (ss.length) pool = ss;
  }

  // 3. Word-overlap внутри отфильтрованного множества
  const score = (qws, entry) => {
    const dWords = (entry.desc + ' ' + (entry.en || '')).toLowerCase().split(/\s+/)
                    .filter(w => w.length >= 3);
    let hits = 0;
    for (const qw of qws) {
      if (dWords.some(dw => dw === qw || dw.startsWith(qw) || qw.startsWith(dw))) hits++;
    }
    return hits / qws.length;
  };

  let best = null, bestScore = 0;
  for (const entry of pool) {
    const s = score(queryWords, entry);
    if (s > bestScore) { bestScore = s; best = entry; }
  }

  // Порог 0.3 — ниже для type-filtered пула (уже строго по типу)
  const threshold = detectedType ? 0.3 : 0.5;
  return best && bestScore >= threshold ? { code: best.code, score: bestScore } : null;
}

// ══════════════════════════════════════════════════════════════════════════════
//  МЕДЛЕННЫЙ ПУТЬ: Two-Step LLM
// ══════════════════════════════════════════════════════════════════════════════

const STEP1_SYSTEM = `You are a customs classification expert (TN VED EAEU).
Analyze the product and return ONLY a JSON object:
- "item_type": bolt|nut|washer|screw|anchor|nail|drill_bit|rebar|sling|film|mesh|glove|cable|sealant|instrument|tool_manual|tool_electric|other
- "is_stainless": true if A2/A4/stainless/нержав
- "has_thread": true only for bolt/screw/nut — false for washer/pin/film
- "suggested_4_digit_heading": e.g. "7318","8207","6307"
Return ONLY valid JSON.`;

async function step1Parse(productName, apiKey) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: STEP1_SYSTEM },
        { role: 'user',   content: `Product: ${productName}` },
      ],
      temperature: 0,
      max_tokens: 150,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI step1 ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}

function step2Filter(parsed) {
  const heading    = String(parsed.suggested_4_digit_heading || '').trim();
  const itemType   = (parsed.item_type || 'other').toLowerCase();
  const isStainless = !!parsed.is_stainless;
  const hasThread  = parsed.has_thread !== false;

  // 1. Только нужный тип
  let pool = TNVED_DB.filter(e => e.type === itemType);
  if (!pool.length) pool = TNVED_DB.filter(e => e.code.startsWith(heading));
  if (!pool.length) pool = [...TNVED_DB];

  // 2. Нержавейка
  if (isStainless) {
    const ss = pool.filter(e => e.stainless === true);
    if (ss.length) pool = ss;
  }

  // 3. Без резьбы — исключаем резьбовые записи
  if (!hasThread) {
    pool = pool.filter(e => !['bolt','screw','nut'].includes(e.type));
    if (!pool.length) pool = TNVED_DB.filter(e => e.code.startsWith(heading));
  }

  return pool.slice(0, 5);
}

async function step3Final(productName, candidates, apiKey) {
  if (!candidates.length) return '';
  if (candidates.length === 1) return candidates[0].code;

  const options = candidates.map(e => `${e.code}: ${e.desc} / ${e.en || ''}`).join('\n');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Senior customs broker. Reply ONLY with the single best 10-digit HS code, nothing else.' },
        { role: 'user',   content: `Product: ${productName}\n\nCandidates:\n${options}` },
      ],
      max_tokens: 12,
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI step3 ${res.status}`);
  const data = await res.json();
  const raw = (data.choices?.[0]?.message?.content || '').replace(/\D/g, '');
  return /^\d{10}$/.test(raw) ? raw : candidates[0].code;
}

// ══════════════════════════════════════════════════════════════════════════════
//  ПУБЛИЧНЫЙ API
// ══════════════════════════════════════════════════════════════════════════════

export async function resolveTnved(name) {
  // Быстрый путь: type-aware локальная база
  const dbResult = searchTnvedDB(name);
  if (dbResult) return { code: dbResult.code, source: 'db' };

  // Медленный путь: Two-Step LLM
  const apiKey = localStorage.getItem('glorix_openai_key') || '';
  if (!apiKey) return { code: '', source: '' };

  try {
    const parsed     = await step1Parse(name, apiKey);
    const candidates = step2Filter(parsed);
    const finalCode  = await step3Final(name, candidates, apiKey);
    return finalCode ? { code: finalCode, source: 'ai' } : { code: '', source: '' };
  } catch (e) {
    console.warn('TNVED error:', e.message);
    return { code: '', source: '' };
  }
}
