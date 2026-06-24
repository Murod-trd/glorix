/**
 * GLORIX Sparse TF-IDF Search Engine v3
 * — pymorphy2 lemmatized corpus, min_df=1 (every unique term indexed)
 * — inflection lookup table: 120K forms → lemma
 * — synonym expansion: ADDS to query, never replaces the original word
 * — sparse cosine similarity (no LSA)
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', '_data');

let _eng = null;

function getEngine() {
  if (_eng) return _eng;

  const vocab       = JSON.parse(readFileSync(join(DATA, 'vocab.json'),       'utf8'));
  const codes       = JSON.parse(readFileSync(join(DATA, 'codes.json'),       'utf8'));
  const descs       = JSON.parse(readFileSync(join(DATA, 'descs.json'),       'utf8'));
  const inflections = JSON.parse(readFileSync(join(DATA, 'inflections.json'), 'utf8'));
  const synonyms    = JSON.parse(readFileSync(join(DATA, 'synonyms.json'),    'utf8'));

  const raw = readFileSync(join(DATA, 'matrix.bin'));
  const buf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  const dv  = new DataView(buf);

  const vocabSize = dv.getUint32(0, true);
  const nDocs     = dv.getUint32(4, true);
  let off = 8;

  const idf     = new Float32Array(buf, off, vocabSize); off += vocabSize * 4;
  const offsets = new Uint32Array(buf, off, nDocs + 1);  off += (nDocs + 1) * 4;
  const sparseStart = off;

  _eng = { vocab, codes, descs, inflections, synonyms,
           idf, offsets, buf, sparseStart, vocabSize, nDocs };
  console.log(`[Engine v3] vocab=${vocabSize} docs=${nDocs} min_df=1`);
  return _eng;
}

const STOP = new Set([
  'и','в','на','из','по','от','до','за','не','но','с','к','для','при','как',
  'что','это','все','они','его','или','же','а','о','об','во','со','ко','да',
  'нет','ни','так','уже','был','была','были','если','бы','без','над','под',
  'через','после','перед','между','также','кроме','другой','другие','прочих',
  'прочие','прочих','позиции','которые','который','которых','которой','которому',
  'которыми','настоящей','данной','таких','такой','такие','такими','этого',
  'этой','этих','этому','этим','этими','весь','всех','всем','всеми','всё',
  'следующих','следующий','следующим','включая','исключая',
  'содержащий','содержащие','имеющие','имеющий','предназначенные',
  'является','являются','может','могут','должен','должны',
  'более','менее','только','либо','однако','иных','иной','иные',
  'товарного','товарной','товарных','группы','группе','раздела','разделе',
  'включаются','гр','об',
]);

function lemmatize(word, inflections) {
  return inflections[word] || word;
}

/**
 * tokenize — original word ALWAYS included in result.
 * Synonyms strictly APPEND to the query; they never replace.
 *
 * For each raw word w:
 *   1. lemmatize(w) → lem
 *   2. push lem (original, normalized)
 *   3. look up synonyms[w] OR synonyms[lem] (handles inflected user input)
 *   4. push each synonym that differs from lem (no self-duplicates)
 */
function tokenize(text, inflections, synonyms) {
  const raw = (text.toLowerCase().match(/[а-яё]{3,}/g) || []);
  const result = [];

  for (const w of raw) {
    if (STOP.has(w)) continue;

    // Always push the normalized original
    const lem = lemmatize(w, inflections);
    if (!STOP.has(lem) && lem.length >= 3) result.push(lem);

    // Append synonyms (check raw form first, then lemma)
    const synList = synonyms[w] || synonyms[lem];
    if (synList) {
      for (const syn of synList) {
        if (!STOP.has(syn) && syn !== lem) result.push(syn);
      }
    }
  }

  return result;
}

function sparseDocDot(eng, docIdx, qVec) {
  const { offsets, buf, sparseStart } = eng;
  const byteStart = sparseStart + offsets[docIdx];
  const byteEnd   = sparseStart + offsets[docIdx + 1];
  const dv = new DataView(buf, byteStart, byteEnd - byteStart);
  let pos = 0;
  const nTerms = dv.getUint16(pos, true); pos += 2;
  let dot = 0;
  for (let j = 0; j < nTerms; j++) {
    const idx = dv.getUint16(pos, true); pos += 2;
    const val = dv.getFloat32(pos, true); pos += 4;
    if (qVec[idx] !== 0) dot += val * qVec[idx];
  }
  return dot;
}

export function search(query, topK = 5) {
  const eng = getEngine();
  const { vocab, codes, descs, inflections, synonyms, idf, vocabSize, nDocs } = eng;

  const terms = tokenize(query, inflections, synonyms);
  if (!terms.length) return [];

  const tf = new Map();
  for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);

  const qVec = new Float32Array(vocabSize);
  let qNorm = 0;
  for (const [t, cnt] of tf) {
    const idx = vocab[t];
    if (idx !== undefined) {
      const w = (1 + Math.log(cnt)) * idf[idx];
      qVec[idx] = w;
      qNorm += w * w;
    }
    // terms absent from min_df=1 vocab are stop words or misspellings — silently skip
  }
  if (qNorm === 0) return [];
  qNorm = Math.sqrt(qNorm);
  for (let i = 0; i < vocabSize; i++) qVec[i] /= qNorm;

  const scores = new Float32Array(nDocs);
  for (let i = 0; i < nDocs; i++) {
    scores[i] = sparseDocDot(eng, i, qVec);
  }

  return Array.from({ length: nDocs }, (_, i) => i)
    .sort((a, b) => scores[b] - scores[a])
    .slice(0, topK)
    .map(i => ({ code: codes[i], desc: descs[i], score: +scores[i].toFixed(4) }));
}

let _db = null;
function getDb() {
  if (_db) return _db;
  try {
    _db = JSON.parse(readFileSync(join(process.cwd(), 'public', 'tnved_db.json'), 'utf8'));
  } catch {
    _db = [];
  }
  return _db;
}

export function explain(code) {
  if (!code) return null;
  const db = getDb();
  const row = db.find(r => r[0] === code);
  if (row && row[2]) return row[2];
  const prefix = String(code).slice(0, 2);
  const chRow = db.find(r => r[0].startsWith(prefix) && r[2]);
  return chRow?.[2] || null;
}
