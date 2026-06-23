/**
 * labelTnvedDb.mjs — Auto-labeling script
 * Читает tnvedDb.js, одним батч-запросом к GPT-4o-mini
 * получает { noun_en, material_en } для каждой записи,
 * записывает обратно с этими полями.
 *
 * Запуск при добавлении новых товаров:
 *   OPENAI_API_KEY=sk-... node scripts/labelTnvedDb.mjs
 */
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, '../src/data/tnvedDb.js');
const API_KEY   = process.env.OPENAI_API_KEY;
if (!API_KEY) { console.error('Set OPENAI_API_KEY'); process.exit(1); }

// Читаем файл и вытаскиваем массив через регулярку
const src   = fs.readFileSync(DB_PATH, 'utf8');
const rows  = [];
const RE    = /\{\s*code:\s*'([^']+)'[\s\S]*?desc:\s*'([^']+)'(?:,\s*\n\s*en:\s*'([^']*)')?\s*\}/g;
let m;
while ((m = RE.exec(src)) !== null) {
  rows.push({ code: m[1], desc: m[2], en: m[3] || '' });
}
console.log(`Found ${rows.length} entries`);

// Батч-промпт — одним запросом для всей базы
const lines = rows.map((r, i) => `${i}|${r.code}|${r.desc}|${r.en}`).join('\n');
const PROMPT = `You are a TN VED / HS Code customs expert.
For each line (index|code|russian_desc|english_desc) return a JSON object:
{ "labels": [ { "i": 0, "noun_en": "washer", "material_en": "carbon_steel" }, ... ] }

Rules:
- noun_en: single precise English noun used in customs (washer, nut, bolt, screw, anchor, nail, 
  drill bit, screwdriver bit, rebar, wire rod, angle bar, sheet, pipe, sling, wire rope,
  film, insulation, fiberglass mesh, glove, laser level, cable, wire, drill, angle grinder,
  drill driver, wrench, hammer, screwdriver, putty knife, caulking gun, sealant, filler,
  cutting disc, diamond disc, insulation board, mineral wool, paint, primer, cement, aggregate,
  adhesive tape, aluminium tape, lock, hinge, clamp, valve, scissors — use whatever fits)
- material_en: stainless_steel | carbon_steel | plastic | rubber | leather | textile | mineral | other

Entries:
${lines}

Return ONLY the JSON object with "labels" array.`;

const res  = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Output only valid JSON.' },
      { role: 'user',   content: PROMPT },
    ],
    temperature: 0,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  }),
});
const data   = await res.json();
const raw    = data.choices?.[0]?.message?.content || '{}';
const parsed = JSON.parse(raw);
const labels = parsed.labels || [];

// Применяем метки и перезаписываем файл
const labelMap = {};
labels.forEach(l => { labelMap[l.i] = l; });

const updated = rows.map((r, i) => ({
  ...r,
  noun_en:     labelMap[i]?.noun_en     || '',
  material_en: labelMap[i]?.material_en || 'other',
}));

const fileRows = updated.map(e => {
  const en  = e.en  ? `\n    en:          '${e.en.replace(/'/g, "\\'")}',` : '';
  return `  { code: '${e.code}', noun_en: '${e.noun_en}', material_en: '${e.material_en}',\n    desc: '${e.desc.replace(/'/g, "\\'")}',${en} }`;
});

const out = `// База ТН ВЭД ЕАЭС
// noun_en и material_en — авто-разметка через labelTnvedDb.mjs (не вручную)
// Для добавления новых товаров: добавь строку без noun_en, запусти скрипт.
const TNVED_DB = [\n${fileRows.join(',\n')}\n];\n\nexport default TNVED_DB;\n`;
fs.writeFileSync(DB_PATH, out, 'utf8');
console.log(`✓ Labeled ${updated.length} entries → saved to tnvedDb.js`);
