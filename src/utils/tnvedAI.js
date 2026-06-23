/**
 * GLORIX — TN VED EAEU Classification Engine v5
 * ─────────────────────────────────────────────
 * Двухэтапный поиск по принципу таможенного права (ОПИ 1-6):
 *
 * ШАГ A  LLM (gpt-4o-mini): любой текст → { noun_en, material_en, heading_4, subheading_6 }
 * ШАГ Б  Программный фильтр: heading_4 → noun_en → material_en (по официальной базе ≥250 позиций)
 * ШАГ В  Выбор кода:
 *          • если кандидаты из базы → LLM проверяет примечания и выбирает 10-значный код
 *          • если кандидатов нет   → LLM даёт код напрямую (полное знание ТН ВЭД ЕАЭС)
 *
 * Офлайн-резерв (API недоступен): word-overlap по локальной базе
 */

import TNVED_DB from '../data/tnvedDb.js';

// ──────────────────────────────────────────────────────────────────────────────
//  ШАГ A — LLM: любой текст → структурированные таможенные параметры
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
//  ШАГ Б — Программный фильтр по официальной базе (без API)
// ──────────────────────────────────────────────────────────────────────────────

function stepBFilter(heading4, nounEn, materialEn) {
  // 1. Позиции внутри 4-значной товарной позиции ТН ВЭД
  let pool = TNVED_DB.filter(e => e.code.startsWith(heading4));

  // Если heading4 не дал результата — пробуем первые 2 знака (глава)
  if (!pool.length && heading4 && heading4.length >= 2) {
    pool = TNVED_DB.filter(e => e.code.startsWith(heading4.slice(0, 2)));
  }

  // 2. Барьер по noun_en — ключевой фильтр (шайба != болт != гайка)
  if (nounEn && pool.length) {
    const exact = pool.filter(e => e.noun_en === nounEn);
    if (exact.length) {
      pool = exact;
    } else {
      const partial = pool.filter(e =>
        e.noun_en && (e.noun_en.includes(nounEn) || nounEn.includes(e.noun_en))
      );
      if (partial.length) pool = partial;
    }
  }

  // 3. Приоритет по материалу (нержавейка vs чёрная сталь vs пластик)
  if (materialEn && materialEn !== 'other' && pool.length > 1) {
    const matMatch = pool.filter(e => e.material_en === materialEn);
    if (matMatch.length) pool = matMatch;
  }

  return pool.slice(0, 6);
}

// ──────────────────────────────────────────────────────────────────────────────
//  ШАГ В-1 — LLM выбирает из кандидатов базы (с проверкой примечаний)
// ──────────────────────────────────────────────────────────────────────────────

async function stepV1FromCandidates(productName, candidates, apiKey) {
  if (!candidates.length) return '';
  if (candidates.length === 1) return candidates[0].code;

  const list = candidates
    .map(e => `${e.code}: ${e.desc} / ${e.en}`)
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
          content: `Product: "${productName}"\n\nCandidates from official EAEU tariff:\n${list}`,
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
//  ОФЛАЙН-РЕЗЕРВ — word-overlap (API недоступен)
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
  if (!text) return 0;
  const tWords = text.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
  let hits = 0;
  for (const qw of queryWords) {
    if (tWords.some(tw => tw === qw || tw.startsWith(qw) || qw.startsWith(tw))) hits++;
  }
  return queryWords.length ? hits / queryWords.length : 0;
}

/**
 * Поиск в локальной базе без API (офлайн-резерв или быстрый путь)
 * Возвращает { code, score } или null
 */
export function searchTnvedDB(name) {
  if (!name || name.length < 2) return null;
  const qWords = cleanText(name).split(' ').filter(w => w.length >= 3);
  if (!qWords.length) return null;

  let best = null, bestScore = 0;
  for (const entry of TNVED_DB) {
    const s = wordScore(qWords, entry.desc) * 0.65
            + wordScore(qWords, entry.en || '') * 0.35;
    if (s > bestScore) { bestScore = s; best = entry; }
  }
  return best && bestScore >= 0.45 ? { code: best.code, score: bestScore } : null;
}

// ──────────────────────────────────────────────────────────────────────────────
//  ПУБЛИЧНЫЙ API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * resolveTnved(productName)
 * → { code: '7318210000', source: 'db+ai' | 'ai' | 'offline', confidence: 'high' | 'medium' | 'low' }
 *
 * db+ai   — код из официальной базы, подтверждён LLM (высокая точность)
 * ai      — LLM определил код напрямую (товар не в базе, но LLM знает ТН ВЭД)
 * offline — офлайн word-overlap (API недоступен)
 */
export async function resolveTnved(name) {
  const apiKey = localStorage.getItem('glorix_openai_key') || '';

  // ── Путь с API ─────────────────────────────────────────────────────────────
  if (apiKey) {
    try {
      // Шаг А: LLM парсит любой текст → структура
      const params = await stepAParse(name, apiKey);
      const { noun_en = '', material_en = 'other', heading_4 = '' } = params;

      // Шаг Б: фильтр по официальной базе
      const candidates = stepBFilter(heading_4, noun_en, material_en);

      if (candidates.length > 0) {
        // Шаг В-1: LLM выбирает из кандидатов базы (с учётом примечаний)
        const code = await stepV1FromCandidates(name, candidates, apiKey);
        if (code) return { code, source: 'db+ai', confidence: 'high' };
      }

      // Шаг В-2: товара нет в базе → LLM даёт код напрямую
      const directCode = await stepV2Direct(name, params, apiKey);
      if (directCode) return { code: directCode, source: 'ai', confidence: 'medium' };

    } catch (err) {
      console.warn('[TNVED] API error, switching to offline:', err.message);
    }
  }

  // ── Офлайн-резерв: word-overlap по базе ───────────────────────────────────
  const offline = searchTnvedDB(name);
  if (offline) return { code: offline.code, source: 'offline', confidence: 'low' };

  return { code: '', source: '', confidence: 'none' };
}
