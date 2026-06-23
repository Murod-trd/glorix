/**
 * Двухуровневый поиск ТН ВЭД ЕАЭС:
 *   1. Fuse.js fuzzy-поиск по базе (~150 записей, русские описания)
 *   2. OpenAI API fallback (если user предоставил ключ и уверенность низкая)
 */

import Fuse from 'fuse.js';
import TNVED_DB from '../data/tnvedDb.js';

// ── Fuse.js индекс ──────────────────────────────────────────────────────────
const fuse = new Fuse(TNVED_DB, {
  keys: ['desc'],
  threshold: 0.45,       // 0 = точное совпадение, 1 = всё подходит
  minMatchCharLength: 3,
  includeScore: true,
  ignoreLocation: true,  // искать по всему тексту, не только с начала
});

/**
 * Ищет код в базе Fuse.js.
 * @returns {{ code: string, score: number } | null}
 */
export function searchTnvedDB(name) {
  if (!name || name.length < 3) return null;
  const results = fuse.search(name.toLowerCase().trim());
  if (!results.length) return null;
  const best = results[0];
  // score: 0 = идеально, 1 = плохо → инвертируем в confidence
  const confidence = 1 - (best.score || 0);
  return { code: best.item.code, confidence };
}

/**
 * Вызывает OpenAI API для получения ТН ВЭД кода.
 * Требует OPENAI_API_KEY в localStorage.
 * @returns {Promise<string|null>}
 */
export async function fetchTnvedFromAI(productName) {
  const apiKey = localStorage.getItem('glorix_openai_key') || '';
  if (!apiKey) return null;

  const prompt = `Ты — эксперт по классификации товаров ТН ВЭД ЕАЭС.
Определи 10-значный код ТН ВЭД ЕАЭС для товара.
Ответь ТОЛЬКО кодом, без пояснений, без пробелов, ровно 10 цифр.

Товар: ${productName}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 20,
        temperature: 0,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content || '').trim().replace(/\D/g, '');
    if (/^\d{10}$/.test(raw)) return raw;
    return null;
  } catch (e) {
    console.warn('TNVED AI error:', e.message);
    return null;
  }
}

/**
 * Главная функция: regex dict → Fuse DB → OpenAI API.
 * Если уверенность Fuse >= 0.65 — не вызываем API.
 * @returns {Promise<{ code: string, source: 'regex'|'db'|'ai'|'' }>}
 */
export async function resolveTnved(name, regexCode) {
  // Уровень 1: уже нашли через regex-словарь
  if (regexCode) return { code: regexCode, source: 'regex' };

  // Уровень 2: Fuse.js по базе
  const dbResult = searchTnvedDB(name);
  if (dbResult && dbResult.confidence >= 0.62) {
    return { code: dbResult.code, source: 'db' };
  }

  // Уровень 3: OpenAI API
  const aiCode = await fetchTnvedFromAI(name);
  if (aiCode) return { code: aiCode, source: 'ai' };

  // Ничего не нашли
  return { code: '', source: '' };
}
