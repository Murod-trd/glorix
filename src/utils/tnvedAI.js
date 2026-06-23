/**
 * GLORIX — Universal TN VED Classification Engine v4
 * ─────────────────────────────────────────────────────
 * Архитектура без ручных списков и хардкода.
 *
 * Быстрый путь (без API, мгновенно):
 *   Word-overlap по desc+en, взвешенный по noun_en совпадению
 *
 * Полный путь (с ключом OpenAI):
 *   Шаг 1 → LLM: любой текст → { noun_en, material_en, heading_4 }
 *   Шаг 2 → Фильтр: DB[heading_4] → подмножество по noun_en
 *   Шаг 3 → LLM: топ-5 кандидатов → один 10-значный код
 *
 * Новые товары добавляются в tnvedDb.js без noun_en,
 * затем запускается: node scripts/labelTnvedDb.mjs
 */

import TNVED_DB from '../data/tnvedDb.js';

// ══════════════════════════════════════════════════════════════════════════════
//  ШАГ 1 — LLM: любой запрос → структурированные параметры
// ══════════════════════════════════════════════════════════════════════════════
const STEP1_SYSTEM = `You are a TN VED / HS Code customs expert.
Analyze the product text and return ONLY this JSON:
{
  "noun_en": "single precise English customs noun, e.g.: washer, nut, bolt, screw, clamp, valve, pipe, scissors, hinge, glove, film, mesh, cable, drill bit, laser level, paint, cement — whatever fits this product",
  "material_en": "stainless_steel | carbon_steel | plastic | rubber | leather | textile | mineral | other",
  "heading_4": "4-digit HS heading, e.g. 7318 for fasteners, 8207 for drill bits, 3920 for films"
}
No markdown. No explanation. Pure JSON only.`;

async function step1Parse(productName, apiKey) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: STEP1_SYSTEM },
        { role: 'user',   content: `Product: ${productName}` },
      ],
      temperature: 0,
      max_tokens: 100,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI step1 ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}

// ══════════════════════════════════════════════════════════════════════════════
//  ШАГ 2 — Программный фильтр: heading_4 → noun_en
// ══════════════════════════════════════════════════════════════════════════════
function step2Filter(heading4, nounEn, materialEn) {
  // 1. Все записи внутри 4-значной позиции
  let pool = TNVED_DB.filter(e => e.code.startsWith(heading4));
  if (!pool.length) pool = [...TNVED_DB]; // fallback: вся база

  // 2. Фильтр по noun_en — ключевой барьер (работает для ЛЮБОГО товара)
  if (nounEn) {
    const exact = pool.filter(e => e.noun_en === nounEn);
    if (exact.length) {
      pool = exact;
    } else {
      // Мягкий матч: noun_en содержится как подстрока
      const partial = pool.filter(e =>
        e.noun_en && (e.noun_en.includes(nounEn) || nounEn.includes(e.noun_en))
      );
      if (partial.length) pool = partial;
    }
  }

  // 3. Приоритет по материалу (нержавейка vs чёрная сталь)
  if (materialEn && materialEn !== 'other') {
    const matMatch = pool.filter(e => e.material_en === materialEn);
    if (matMatch.length) pool = matMatch;
  }

  return pool.slice(0, 5);
}

// ══════════════════════════════════════════════════════════════════════════════
//  ШАГ 3 — LLM: финальный выбор из топ-5
// ══════════════════════════════════════════════════════════════════════════════
async function step3Final(productName, candidates, apiKey) {
  if (!candidates.length) return '';
  if (candidates.length === 1) return candidates[0].code;

  const opts = candidates.map(e =>
    `${e.code}: ${e.desc} / ${e.en || ''}`
  ).join('\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Senior customs broker. Pick the single most accurate 10-digit HS code from the list. Reply with ONLY the 10-digit code.' },
        { role: 'user',   content: `Product: ${productName}\n\nCandidates:\n${opts}` },
      ],
      max_tokens: 12,
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI step3 ${res.status}`);
  const data = await res.json();
  const raw  = (data.choices?.[0]?.message?.content || '').replace(/\D/g, '');
  return /^\d{10}$/.test(raw) ? raw : candidates[0].code;
}

// ══════════════════════════════════════════════════════════════════════════════
//  БЫСТРЫЙ ПУТЬ — word-overlap без API (работает если товар есть в базе)
// ══════════════════════════════════════════════════════════════════════════════
function cleanText(name) {
  return name.toLowerCase()
    .replace(/\d+[.,]?\d*\s*[хx×]\s*\d+[.,]?\d*/gi, ' ')
    .replace(/\d+[.,]?\d*\s*(мм|см|м|кг|шт|пог)/gi, ' ')
    .replace(/\d+[.,]?\d*/g, ' ')
    .replace(/[^а-яёa-z\s]/gi, ' ')
    .replace(/\s+/g, ' ').trim();
}

function wordScore(queryWords, text) {
  const tWords = text.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
  let hits = 0;
  for (const qw of queryWords) {
    if (tWords.some(tw => tw === qw || tw.startsWith(qw) || qw.startsWith(tw))) hits++;
  }
  return queryWords.length ? hits / queryWords.length : 0;
}

export function searchTnvedDB(name) {
  if (!name || name.length < 2) return null;
  const qWords = cleanText(name).split(' ').filter(w => w.length >= 3);
  if (!qWords.length) return null;

  let best = null, bestScore = 0;
  for (const entry of TNVED_DB) {
    // Скорим по русскому описанию + английскому
    const s = (wordScore(qWords, entry.desc) * 0.7) +
              (wordScore(qWords, entry.en || '') * 0.3);
    if (s > bestScore) { bestScore = s; best = entry; }
  }
  return best && bestScore >= 0.4 ? { code: best.code, score: bestScore } : null;
}

// ══════════════════════════════════════════════════════════════════════════════
//  ПУБЛИЧНЫЙ API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * resolveTnved(name) → { code: '7318161000', source: 'db' | 'ai' }
 *
 * Быстрый путь: word-overlap по локальной базе (мгновенно, без API)
 * Полный путь:  3-шаговый LLM-пайплайн (если есть ключ OpenAI)
 */
export async function resolveTnved(name) {
  // Быстрый путь
  const db = searchTnvedDB(name);
  if (db) return { code: db.code, source: 'db' };

  // Полный путь
  const apiKey = localStorage.getItem('glorix_openai_key') || '';
  if (!apiKey) return { code: '', source: '' };

  try {
    const { noun_en = '', material_en = 'other', heading_4 = '' } = await step1Parse(name, apiKey);
    const candidates = step2Filter(heading_4, noun_en, material_en);
    const code = await step3Final(name, candidates, apiKey);
    return code ? { code, source: 'ai' } : { code: '', source: '' };
  } catch (e) {
    console.warn('TNVED resolve error:', e.message);
    return { code: '', source: '' };
  }
}
