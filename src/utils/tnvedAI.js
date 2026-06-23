/**
 * Трёхуровневый поиск ТН ВЭД ЕАЭС:
 *   1. (в DocumentCenter.jsx) regex-словарь — мгновенно
 *   2. Word-overlap по базе ЕАЭС (~150 записей, русские описания)
 *   3. OpenAI gpt-4o (expert customs broker prompt) — если user предоставил ключ
 */

import TNVED_DB from '../data/tnvedDb.js';

// ── Предобработка запроса ────────────────────────────────────────────────────
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

// ── Word-overlap scorer ──────────────────────────────────────────────────────
function overlapScore(queryWords, descWords) {
  if (!queryWords.length) return 0;
  const descLong = descWords.filter(w => w.length >= 3);
  let hits = 0;
  for (const qw of queryWords) {
    const found = descLong.some(dw =>
      dw === qw || dw.startsWith(qw) || qw.startsWith(dw)
    );
    if (found) hits++;
  }
  return hits / queryWords.length;
}

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
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  if (!best || bestScore < 0.5) return null;
  return { code: best.code, score: bestScore };
}

// ── Системный промпт эксперта-таможенника ───────────────────────────────────
const EXPERT_SYSTEM_PROMPT = `You are an expert Customs Broker and TN VED (ТН ВЭД ЕАЭС / HS Code) Classification Engine.
Your sole purpose is to analyze commercial product descriptions (usually in Russian) and output the single most accurate, valid 10-digit TN VED EAEU code.

### CLASSIFICATION ALGORITHM (apply in strict order):

1. TECHNICAL TRANSLATION
   Convert commercial/slang names to dry customs terminology:
   - "Краги" → Leather protective gloves for welding
   - "Валик малярный" → Paint rollers
   - "Отбивочный шнур" → Measuring and marking instruments
   - "Ерш сантехнический" → Toilet brush, plastic

2. MATERIAL IS KING (analyze material BEFORE function keywords)
   - "A2" / "Нержавейка" / "нержав" → stainless/corrosion-resistant steel subheadings
     e.g., bolt A2 → 7318158201 (NOT generic 7318159000)
   - "Ду" / "черная сталь" / "ст20" → black/carbon steel → Chapter 73
   - "Пластик" / "ПВХ" / "полимер" → Chapter 39
   - "Медь" → Chapter 74; "Алюминий" → Chapter 76; "Латунь" → Chapter 74

3. DIMENSIONAL BOUNDARY CHECK
   - Roll width > 30 cm → use codes for "other" width category
     e.g., fiberglass mesh 1m wide → 7019690000 NOT 7019610000
   - Film thickness ≤ 0.125 mm (43 мкм) → 3920102800; > 0.125 mm → 3920102500
   - Pipe diameter (Ду/DN) determines subheadings in Chapter 73

4. POWER SOURCE CHECK (CRITICAL for tools)
   - Manual / hand-operated → Chapter 82 or 83
     e.g., manual caulking gun → 8205590000; manual stapler → 8203400000
   - Electric / pneumatic / hydraulic → Chapter 84 or 85
     e.g., Makita drill → 8467219000; air compressor → 8414809000

5. ITEM ISOLATION
   - Never mix different items into one code
   - "Болт + Гайка" must produce TWO different codes

### HS CODE EXAMPLES (EAEU 10-digit):
- Стальная арматура рифлёная → 7214200000
- Болт стальной (не нержав.) → 7318159000
- Болт A2 нержавейка → 7318158201
- Гайка стальная → 7318160000
- Шуруп/саморез → 7318120009
- Дюбель пластиковый → 3926909709
- Анкер стальной → 7318210000
- Кабель ВВГ медный → 8544421900
- Труба ПВХ → 3917230009
- Труба стальная черная → 7306409100
- Серпянка (ширина >30 см) → 7019690000
- Пленка ПЭ 43 мкм → 3920102800
- Герметик силиконовый → 3214100000
- Краска алкидная → 3210000000
- Шланг резиновый → 4009210000
- Перчатки защитные кожаные (краги) → 4203210000
- Перчатки трикотажные х/б → 6116920000
- Нивелир лазерный → 9015800000
- Инструмент ручной (молоток, гаечный ключ) → 8204110000 / 8205599000
- Электроинструмент дрель → 8467219000
- Компрессор воздушный → 8414809000
- Цемент → 2523290000
- Кирпич силикатный → 6901000000
- Кирпич керамический → 6904100000
- Фанера → 4412310000
- OSB-плита → 4410110009
- Минвата, теплоизоляция → 7019900000
- Пенопласт ПСБ-С → 3921110000
- Краска водно-дисперсионная → 3209100000
- Грунтовка → 3211000000
- Шпаклёвка → 3214901000
- Валик малярный → 8364000000
- Кисть малярная → 9603290000
- Строп текстильный → 6307909800
- Лопата, кирка (ручной инструмент) → 8201300000

### OUTPUT FORMAT:
Respond with EXACTLY 10 digits, nothing else. No spaces, no dashes, no explanation.
If genuinely uncertain between two valid codes, output the more specific (longer match) one.`;

/**
 * Вызывает OpenAI API с промптом эксперта-таможенника.
 */
export async function fetchTnvedFromAI(productName) {
  const apiKey = localStorage.getItem('glorix_openai_key') || '';
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: EXPERT_SYSTEM_PROMPT },
          { role: 'user', content: `Classify this product: ${productName}` },
        ],
        max_tokens: 15,
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
 * Главная функция: DB word-overlap → OpenAI expert.
 */
export async function resolveTnved(name) {
  const dbResult = searchTnvedDB(name);
  if (dbResult) return { code: dbResult.code, source: 'db' };
  const aiCode = await fetchTnvedFromAI(name);
  if (aiCode) return { code: aiCode, source: 'ai' };
  return { code: '', source: '' };
}
