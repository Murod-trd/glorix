/**
 * GLORIX TF-IDF + LSA Semantic Search Engine
 * Runs on Vercel serverless — pure Node.js, no external deps
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', '_data');

// ── Cold-start cache ─────────────────────────────────────────
let _eng = null;

function getEngine() {
  if (_eng) return _eng;

  const vocab = JSON.parse(readFileSync(join(DATA, 'vocab.json'), 'utf8'));
  const codes = JSON.parse(readFileSync(join(DATA, 'codes.json'), 'utf8'));
  const descs = JSON.parse(readFileSync(join(DATA, 'descs.json'), 'utf8'));

  const raw = readFileSync(join(DATA, 'matrix.bin'));
  const dv  = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const vocabSize = dv.getUint32(0, true);
  const dims      = dv.getUint32(4, true);
  const nDocs     = dv.getUint32(8, true);

  let off = 12;
  const idf        = new Float32Array(raw.buffer, raw.byteOffset + off, vocabSize); off += vocabSize * 4;
  const components = new Float32Array(raw.buffer, raw.byteOffset + off, dims * vocabSize); off += dims * vocabSize * 4;
  const docVecs    = new Float32Array(raw.buffer, raw.byteOffset + off, nDocs * dims);

  _eng = { vocab, codes, descs, idf, components, docVecs, vocabSize, dims, nDocs };
  console.log(`[Engine] loaded: vocab=${vocabSize} dims=${dims} docs=${nDocs}`);
  return _eng;
}

// ── Tokenizer (mirrors tnvedBM25.js) ────────────────────────
const STOP = new Set([
  'и','в','на','из','по','от','до','за','не','но','с','к','для','при','как',
  'что','это','все','они','его','или','же','а','о','об','во','со','ко','да',
  'нет','ни','так','уже','был','была','были','если','бы','без','над','под',
  'через','после','перед','между','также','кроме','другой','другие','прочих',
  'товаров','группе','включаются','настоящей','примечания','которые',
  'прочие','раздела','позиции',
]);

function stem(w) { return w.length >= 6 ? w.slice(0, 5) : w; }

function tokenize(text) {
  const words = text.toLowerCase().match(/[а-яё]{3,}/g) || [];
  return words.filter(w => !STOP.has(w) && w.length >= 3).map(stem);
}

// ── Search ───────────────────────────────────────────────────
export function search(query, topK = 5) {
  const { vocab, codes, descs, idf, components, docVecs, vocabSize, dims, nDocs } = getEngine();

  const terms = tokenize(query);
  if (!terms.length) return [];

  // TF (raw count per term)
  const tf = new Map();
  for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);

  // TF-IDF sparse vector (sublinear TF)
  const qRaw = new Float32Array(vocabSize);
  for (const [t, cnt] of tf) {
    const idx = vocab[t];
    if (idx !== undefined) qRaw[idx] = (1 + Math.log(cnt)) * idf[idx];
  }

  // Project onto LSA space: qLSA = qRaw · components^T   (dims × vocabSize)
  const qLSA = new Float32Array(dims);
  for (let d = 0; d < dims; d++) {
    let s = 0;
    const row = d * vocabSize;
    for (let v = 0; v < vocabSize; v++) s += qRaw[v] * components[row + v];
    qLSA[d] = s;
  }

  // L2-normalize query
  let qNorm = 0;
  for (let d = 0; d < dims; d++) qNorm += qLSA[d] * qLSA[d];
  qNorm = Math.sqrt(qNorm) || 1;
  for (let d = 0; d < dims; d++) qLSA[d] /= qNorm;

  // Cosine similarity with all docs
  const scores = new Float32Array(nDocs);
  for (let i = 0; i < nDocs; i++) {
    let dot = 0;
    const base = i * dims;
    for (let d = 0; d < dims; d++) dot += qLSA[d] * docVecs[base + d];
    scores[i] = dot;
  }

  // Top-K by score
  return Array.from({ length: nDocs }, (_, i) => i)
    .sort((a, b) => scores[b] - scores[a])
    .slice(0, topK)
    .map(i => ({ code: codes[i], desc: descs[i], score: +scores[i].toFixed(4) }));
}

// ── Get explanation from tnved_db.json ──────────────────────
let _db = null;
function getDb() {
  if (_db) return _db;
  // tnved_db.json lives in public/ — accessible from function filesystem
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
