/**
 * GLORIX — Two-Step TN VED Classification Engine (JS)
 * ─────────────────────────────────────────────────────
 * Шаг 1  LLM парсит товар → JSON {item_type, material, heading, is_stainless, has_thread}
 * Шаг 2  Программный фильтр: ТОЛЬКО внутри 4-значной позиции + исключение чужих маркеров
 * Шаг 3  LLM выбирает лучший код из топ-5 кандидатов
 */

import TNVED_DB from '../data/tnvedDb.js';

// ── Системный промпт Шаг 1 ──────────────────────────────────────────────────
const STEP1_SYSTEM = `You are a customs classification expert (TN VED EAEU).
Analyze the product and return ONLY a JSON object with exactly these fields:
- "technical_english_name": precise customs terminology
- "material": e.g. "stainless steel A2", "carbon steel", "polyethylene", "rubber"  
- "has_thread": boolean — true ONLY if the item itself is threaded (bolt/screw/nut). false for washers/pins/plates/film.
- "item_type": exactly one of: bolt|nut|washer|screw|anchor|pin|drill_bit|cable|pipe|glove|tool_manual|tool_electric|film|mesh|sealant|sling|rebar|other
- "suggested_4_digit_heading": 4-digit HS string e.g. "7318" for fasteners, "8207" for drill bits
- "is_stainless": boolean — true if stainless/A2/A4/нержав/corrosion-resistant
Return ONLY valid JSON, no markdown, no explanation.`;

// ── Маркеры типов — запрещены в описаниях чужих типов ───────────────────────
const TYPE_MARKERS = {
  bolt:          ['bolt', 'hex bolt'],
  nut:           ['hex nut', ' nut ', 'nuts'],
  washer:        ['washer', 'plain washer', 'spring washer', 'lock washer', 'flat washer', 'split washer'],
  screw:         ['screw', 'self-tapping', 'wood screw'],
  anchor:        ['anchor'],
  drill_bit:     ['drill bit', 'sds', 'rotary hammer drill', 'tap', 'die'],
  glove:         ['glove', 'gauntlet'],
  tool_manual:   ['hand tool', 'manual', 'wrench', 'spanner', 'shovel'],
  tool_electric: ['electric drill', 'power tool', 'chain saw'],
  film:          ['film', 'sheet', 'polyethylene'],
  mesh:          ['mesh', 'woven fabric', 'fiberglass mesh'],
  sealant:       ['sealant', 'putty', 'filler'],
  sling:         ['sling', 'strap', 'lifting'],
  rebar:         ['rebar', 'reinforcing bar'],
  cable:         ['cable', 'wire'],
  pipe:          ['pipe', 'tube'],
};
const STAINLESS_KW = new Set(['stainless', 'a2', 'a4', 'corrosion-resistant', 'inox']);

// ── Шаг 1: парсинг через LLM ────────────────────────────────────────────────
async function step1Parse(productName, apiKey) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: STEP1_SYSTEM },
        { role: 'user', content: `Product: ${productName}` },
      ],
      temperature: 0,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI step1 ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}

// ── Шаг 2: программная фильтрация базы ──────────────────────────────────────
function step2Filter(parsed) {
  const heading     = String(parsed.suggested_4_digit_heading || '').trim();
  const itemType    = (parsed.item_type || 'other').toLowerCase();
  const isStainless = !!parsed.is_stainless;
  const hasThread   = parsed.has_thread !== false; // true by default

  // 1. Только внутри 4-значной позиции
  let candidates = TNVED_DB.filter(e => e.code.startsWith(heading));
  if (!candidates.length) candidates = [...TNVED_DB]; // fallback: вся база

  // 2. Маркеры ДРУГИХ типов — запрещены
  const myMarkers  = new Set(TYPE_MARKERS[itemType] || []);
  const forbidden  = new Set();
  for (const [t, markers] of Object.entries(TYPE_MARKERS)) {
    if (t !== itemType) markers.forEach(m => { if (!myMarkers.has(m)) forbidden.add(m); });
  }

  // 3. Без резьбы — дополнительно запрещаем резьбовые термины
  if (!hasThread) {
    ['bolt', 'screw', 'nut', 'threaded', 'thread'].forEach(w => forbidden.add(w));
  }

  const isBad = e => {
    const d = e.desc.toLowerCase();
    return [...forbidden].some(f => d.includes(f));
  };

  const filtered = candidates.filter(e => !isBad(e));
  candidates = filtered.length ? filtered : candidates; // fallback при перефильтрации

  // 4. Нержавейка — поднимаем приоритет stainless записей
  if (isStainless) {
    const ss = candidates.filter(e =>
      [...STAINLESS_KW].some(k => e.desc.toLowerCase().includes(k))
    );
    if (ss.length) candidates = ss;
  }

  return candidates.slice(0, 5);
}

// ── Шаг 3: финальный выбор ──────────────────────────────────────────────────
async function step3Final(productName, candidates, apiKey) {
  if (!candidates.length) return '';
  if (candidates.length === 1) return candidates[0].code;

  const options = candidates.map(e => `${e.code}: ${e.desc}`).join('\n');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content:
          'You are a senior customs broker. Pick the single most accurate 10-digit HS code '
          + 'from the candidates below. Reply with ONLY the 10-digit code, nothing else.' },
        { role: 'user', content: `Product: ${productName}\n\nCandidates:\n${options}` },
      ],
      max_tokens: 12,
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI step3 ${res.status}`);
  const data = await res.json();
  const raw = (data.choices?.[0]?.message?.content || '').trim().replace(/\D/g, '');
  return /^\d{10}$/.test(raw) ? raw : candidates[0].code;
}

// ── Публичный API ────────────────────────────────────────────────────────────

/** Word-overlap поиск по локальной базе (быстрый, без API) */
export function cleanQuery(name) {
  let s = name.toLowerCase();
  s = s.replace(/\d+[.,]?\d*\s*[хx×]\s*\d+[.,]?\d*/gi, ' ');
  s = s.replace(/\d+[.,]?\d*\s*(мм|см|м|кг|г|л|т|шт|кв|куб|пог)/gi, ' ');
  s = s.replace(/\s(мм|см|кг|шт|пог|кв|куб)\s/gi, ' ');
  s = s.replace(/\d+[.,]?\d*/g, ' ');
  s = s.replace(/[а-яёa-z]{1,3}\d+/gi, ' ');
  s = s.replace(/[a-z]+/gi, m =>
    /^(ввг|пвх|пэ|пп|sds|wd|нд|ду|led|а2|a2)$/i.test(m) ? m : ' ');
  s = s.replace(/[^а-яёa-z\s]/gi, ' ');
  s = s.replace(/\s[а-яёa-z]\s/gi, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

export function searchTnvedDB(name) {
  if (!name || name.length < 3) return null;
  const cleaned = cleanQuery(name);
  const queryWords = cleaned.split(' ').filter(w => w.length >= 3);
  if (!queryWords.length) return null;

  const descLong = (ws) => ws.filter(w => w.length >= 3);
  const score = (qws, dws) => {
    const dl = descLong(dws);
    let hits = 0;
    for (const qw of qws) {
      if (dl.some(dw => dw === qw || dw.startsWith(qw) || qw.startsWith(dw))) hits++;
    }
    return hits / qws.length;
  };

  let best = null, bestScore = 0;
  for (const entry of TNVED_DB) {
    const dws = entry.desc.toLowerCase().split(/\s+/);
    const s = score(queryWords, dws);
    if (s > bestScore) { bestScore = s; best = entry; }
  }
  return best && bestScore >= 0.5 ? { code: best.code, score: bestScore } : null;
}

/**
 * Главная функция: DB word-overlap → Two-Step LLM (если ключ есть).
 */
export async function resolveTnved(name) {
  // Быстрый путь: local DB
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
    console.warn('TNVED two-step error:', e.message);
    return { code: '', source: '' };
  }
}
