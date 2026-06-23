/**
 * Трёхуровневый поиск ТН ВЭД ЕАЭС:
 *   1. (в DocumentCenter.jsx) regex-словарь — мгновенно
 *   2. Word-overlap по базе ЕАЭС (~150 записей, русские описания)
 *   3. OpenAI API fallback (если user предоставил ключ)
 *
 * Почему word-overlap, а не Fuse.js:
 *   Fuse использует алгоритм Bitap — штрафует за каждое лишнее слово
 *   в описании DB, поэтому длинные описания дают низкий score даже при
 *   точном совпадении ключевых слов. Word-overlap считает только попадания,
 *   игнорирует лишние слова и поддерживает prefix-match (болты→болт).
 */

import TNVED_DB from '../data/tnvedDb.js';

// ── Предобработка запроса ────────────────────────────────────────────────────
// \b не работает с кириллицей в JS — все паттерны без \b
export function cleanQuery(name) {
  let s = name.toLowerCase();
  // Размеры вида 3х2.5, 6х210, 12x20
  s = s.replace(/\d+[.,]?\d*\s*[хx×]\s*\d+[.,]?\d*/gi, ' ');
  // Числа + единица (без пробела — кириллица не имеет \b)
  s = s.replace(/\d+[.,]?\d*\s*(мм|см|м|кг|г|л|т|шт|кв|куб|пог)/gi, ' ');
  // Одиночные единицы оставшиеся после удаления размеров
  s = s.replace(/\s(мм|см|кг|шт|пог|кв|куб)\s/gi, ' ');
  // Все оставшиеся числа
  s = s.replace(/\d+[.,]?\d*/g, ' ');
  // Буквенно-цифровые коды: а3, ду50, м500
  s = s.replace(/[а-яёa-z]{1,3}\d+/gi, ' ');
  // Латинские слова (кроме аббревиатур материалов)
  s = s.replace(/[a-z]+/gi, m =>
    /^(ввг|пвх|пэ|пп|sds|wd|нд|ду|led)$/i.test(m) ? m : ' ');
  // Знаки препинания
  s = s.replace(/[^а-яёa-z\s]/gi, ' ');
  // Однобуквенные мусорные токены
  s = s.replace(/\s[а-яёa-z]\s/gi, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

// ── Word-overlap scorer ──────────────────────────────────────────────────────
// Возвращает долю слов запроса, которые нашлись в описании (prefix-match)
// Prefix-match: "болты" → "болт" ✅, "арматура" → "арматурные" ✅
function overlapScore(queryWords, descWords) {
  if (!queryWords.length) return 0;
  // Фильтруем короткие слова из desc (предлоги и т.п.) чтобы
  // "пожарный".startsWith("по") не давало ложных совпадений
  const descLong = descWords.filter(w => w.length >= 3);
  let hits = 0;
  for (const qw of queryWords) {
    const found = descLong.some(dw =>
      dw === qw ||                    // точное совпадение
      dw.startsWith(qw) ||            // desc содержит форму слова (арматурные→арматур)
      qw.startsWith(dw)              // запрос содержит форму (болты→болт в desc)
    );
    if (found) hits++;
  }
  return hits / queryWords.length;
}

/**
 * Ищет код в базе по word-overlap.
 * @returns {{ code: string, score: number } | null}
 */
export function searchTnvedDB(name) {
  if (!name || name.length < 3) return null;

  const cleaned = cleanQuery(name);
  const queryWords = cleaned.split(' ').filter(w => w.length >= 3);
  if (!queryWords.length) return null;

  let best = null;
  let bestScore = 0;

  for (const entry of TNVED_DB) {
    const descWords = entry.desc.toLowerCase().split(/\s+/);
    const score = overlapScore(queryWords, descWords);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (!best || bestScore < 0.5) return null;
  return { code: best.code, score: bestScore };
}

/**
 * Вызывает OpenAI API для получения ТН ВЭД кода.
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
 * Главная функция: DB word-overlap → OpenAI API.
 */
export async function resolveTnved(name) {
  const dbResult = searchTnvedDB(name);
  if (dbResult) return { code: dbResult.code, source: 'db' };
  const aiCode = await fetchTnvedFromAI(name);
  if (aiCode) return { code: aiCode, source: 'ai' };
  return { code: '', source: '' };
}
