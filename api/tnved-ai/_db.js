/**
 * GLORIX local SQLite access for the TN VED expert engine.
 *
 * - sql.js (WebAssembly) — NO native modules (Vercel-safe).
 * - Read-only, bundled DB: api/tnved-ai/data/tnved_complete.db
 * - WASM vendored next to the DB (api/tnved-ai/data/sql-wasm.wasm) so a single
 *   vercel.json includeFiles glob bundles everything deterministically.
 * - Lazily initialised and cached for the lifetime of a warm serverless instance.
 * - Schema is auto-detected; user input is ONLY ever bound as parameters.
 *   Identifiers come exclusively from PRAGMA metadata via quoteIdent().
 *
 * ESM module (package.json has "type": "module").
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'tnved_complete.db');
const WASM_PATH = path.join(DATA_DIR, 'sql-wasm.wasm');

const CODE_COLS = ['code', 'tnved_code', 'tnved', 'hs_code', 'hscode'];
const TITLE_COLS = ['title', 'name', 'name_ru', 'description_ru', 'short_name', 'desc', 'short_desc'];
const DESC_COLS = ['description', 'full_description', 'description_full', 'text', 'body', 'desc'];
const EXPL_COLS = ['explanations', 'explanation', 'notes', 'note', 'commentary'];
const TARIFF_COLS = ['tariff', 'duty', 'rate', 'duty_rate'];
const CH_NUM_COLS = ['chapter', 'group', 'chapter_num', 'glava', 'id'];
const CH_TXT_COLS = ['explanation', 'explanations', 'text', 'note', 'notes', 'body', 'commentary'];

let _promise = null;

export function quoteIdent(id) {
  return '"' + String(id).replace(/"/g, '""') + '"';
}

function pick(cols, cands) {
  const lower = cols.map((c) => c.toLowerCase());
  for (const w of cands) { const i = lower.indexOf(w); if (i >= 0) return cols[i]; }
  return null;
}

async function open() {
  if (!fs.existsSync(DB_PATH)) return { ok: false, reason: 'tnved_complete.db not found' };
  if (!fs.existsSync(WASM_PATH)) return { ok: false, reason: 'sql-wasm.wasm not found next to DB' };
  const SQL = await initSqlJs({ wasmBinary: fs.readFileSync(WASM_PATH) });
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  const tRes = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  const tables = tRes.length ? tRes[0].values.map((r) => r[0]) : [];
  let best = null;
  for (const t of tables) {
    const info = db.exec(`PRAGMA table_info(${quoteIdent(t)})`);
    const cols = info.length ? info[0].values.map((r) => r[1]) : [];
    const code = pick(cols, CODE_COLS);
    const title = pick(cols, TITLE_COLS);
    if (code && title) {
      const cand = {
        table: t, cols, code, title,
        description: pick(cols, DESC_COLS),
        explanations: pick(cols, EXPL_COLS),
        tariff: pick(cols, TARIFF_COLS),
      };
      if (String(t).toLowerCase() === 'tnved') { best = cand; break; }
      if (!best) best = cand;
    }
  }
  if (!best) { db.close(); return { ok: false, reason: 'no table with code+title columns detected' }; }

  const cnt = db.exec(`SELECT COUNT(*) FROM ${quoteIdent(best.table)}`);
  const rows_count = cnt.length ? Number(cnt[0].values[0][0]) : 0;

  // Load chapter-level explanations into RAM ONCE (Pass-1 dynamic chapter ranking).
  // chapter numbers are normalised to 2-digit strings so they match code[:2].
  let chapters = [];
  try {
    const lower = tables.map((t) => String(t).toLowerCase());
    const ci = lower.indexOf('chapters');
    if (ci >= 0) {
      const chTable = tables[ci];
      const info2 = db.exec(`PRAGMA table_info(${quoteIdent(chTable)})`);
      const cols2 = info2.length ? info2[0].values.map((r) => r[1]) : [];
      const chCol = pick(cols2, CH_NUM_COLS);
      const txtCol = pick(cols2, CH_TXT_COLS);
      if (chCol && txtCol) {
        const res = db.exec(`SELECT ${quoteIdent(chCol)}, ${quoteIdent(txtCol)} FROM ${quoteIdent(chTable)}`);
        if (res.length) {
          for (const [ch, txt] of res[0].values) {
            const digits = String(ch == null ? '' : ch).replace(/\D/g, '');
            if (!digits) continue;
            const key = digits.padStart(2, '0').slice(-2);
            chapters.push({ chapter: key, text: String(txt == null ? '' : txt) });
          }
        }
      }
    }
  } catch { /* chapters table optional — engine degrades to title-only scoring */ }

  return { ok: true, db, schema: best, rows_count, chapters };
}

/** Cached DB handle for the warm instance. */
export function getDb() {
  if (!_promise) _promise = open().catch((e) => ({ ok: false, reason: String((e && e.message) || e) }));
  return _promise;
}

export async function health() {
  const h = await getDb();
  if (!h.ok) return { ok: false, reason: h.reason };
  return {
    ok: true,
    table: h.schema.table,
    rows_count: h.rows_count,
    chapters_count: (h.chapters || []).length,
    columns: {
      code: h.schema.code,
      title: h.schema.title,
      description: h.schema.description,
      explanations: h.schema.explanations,
    },
  };
}

/** All chapter explanation texts, loaded once into RAM (for Pass-1 ranking). */
export async function getAllChapters() {
  const h = await getDb();
  return h.ok ? (h.chapters || []) : [];
}

/**
 * Retrieve candidate rows by LIKE over the (short) title column and by code
 * prefix for numeric tokens. Explanations are read back per candidate row (for
 * scoring) but NOT scanned in the WHERE clause, so retrieval stays fast.
 * All user tokens are bound as parameters.
 */
export async function queryCandidates(terms, opts = {}) {
  const h = await getDb();
  if (!h.ok) return { ok: false, reason: h.reason, candidates: [] };
  const { db, schema } = h;
  const T = quoteIdent(schema.table);
  const CODE = quoteIdent(schema.code);
  const TITLE = quoteIdent(schema.title);
  const sel = [
    `${CODE} AS code`,
    `${TITLE} AS title`,
    schema.description ? `${quoteIdent(schema.description)} AS description` : `NULL AS description`,
    schema.explanations ? `${quoteIdent(schema.explanations)} AS explanation` : `NULL AS explanation`,
    schema.tariff ? `${quoteIdent(schema.tariff)} AS tariff` : `NULL AS tariff`,
  ];

  const selSql = sel.join(', ');
  const rows = [];
  const seen = new Set();
  const collect = (whereSql, params, limit) => {
    if (!whereSql) return;
    const stmt = db.prepare(`SELECT ${selSql} FROM ${T} WHERE ${whereSql} LIMIT ${limit}`);
    stmt.bind(params);
    while (stmt.step()) {
      const o = stmt.getAsObject();
      if (seen.has(o.code)) continue;
      seen.add(o.code);
      o.chapter = String(o.code || '').slice(0, 2);
      rows.push(o);
    }
    stmt.free();
  };

  // (1) Code seeds — numeric tokens in the query + concept code hints. Run FIRST
  //     in their own bounded query so aligned headings are ALWAYS retrieved and
  //     never truncated by the generic term LIMIT.
  const seedWhere = [];
  const seedParams = [];
  for (const t of (terms || [])) {
    if (/^\d{4,10}$/.test(String(t))) { seedWhere.push(`${CODE} LIKE ?`); seedParams.push(t + '%'); }
  }
  for (const hint of (opts.codeHints || [])) {
    if (/^\d{2,10}$/.test(String(hint))) { seedWhere.push(`${CODE} LIKE ?`); seedParams.push(hint + '%'); }
  }
  collect(seedWhere.length ? seedWhere.join(' OR ') : '', seedParams, 150);

  // (1b) Anchor-priority: the base noun (first token) is the most important term,
  // so fetch its title matches in their OWN bounded query. Prevents a common
  // modifier (e.g. "металл") from flooding out a rare anchor (e.g. "ножниц")
  // under the row LIMIT.
  const anchorTok = String(opts.anchor || '').trim();
  if (anchorTok.length >= 3) {
    collect(`${TITLE} LIKE ?`, ['%' + anchorTok + '%'], 200);
  }

  // (2) Term matches over the (short) title column.
  const uterms = Array.from(new Set((terms || []).filter((t) => t && String(t).length >= 3))).slice(0, 12);
  const termWhere = [];
  const termParams = [];
  for (const t of uterms) { termWhere.push(`${TITLE} LIKE ?`); termParams.push('%' + t + '%'); }
  const limit = Math.max(50, Math.min(600, Number(opts.limit) || 300));
  collect(termWhere.length ? termWhere.join(' OR ') : '', termParams, limit);

  return { ok: true, schema, candidates: rows };
}

/** Fetch one row by exact code (for user-supplied embedded codes). */
export async function getByCode(code) {
  const h = await getDb();
  if (!h.ok) return null;
  const { db, schema } = h;
  const stmt = db.prepare(
    `SELECT ${quoteIdent(schema.code)} AS code, ${quoteIdent(schema.title)} AS title, ` +
    `${schema.explanations ? quoteIdent(schema.explanations) : 'NULL'} AS explanation, ` +
    `${schema.tariff ? quoteIdent(schema.tariff) : 'NULL'} AS tariff ` +
    `FROM ${quoteIdent(schema.table)} WHERE ${quoteIdent(schema.code)} = ? LIMIT 1`);
  stmt.bind([String(code)]);
  let o = null;
  if (stmt.step()) { o = stmt.getAsObject(); o.chapter = String(o.code || '').slice(0, 2); }
  stmt.free();
  return o;
}

export default { getDb, health, getAllChapters, queryCandidates, getByCode, quoteIdent };
