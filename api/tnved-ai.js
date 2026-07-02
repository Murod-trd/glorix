import { getConfig, backendFetch, unavailable } from './tnved-ai/_client.js';
import {
  normalizeAndTokenize, detectConcept, scoreCandidate, applyDecisionPolicy, DECISION,
} from './tnved-ai/_engine.js';
import { health as dbHealth, queryCandidates, getByCode } from './tnved-ai/_db.js';

/**
 * Consolidated TN VED AI route — ONE Vercel Serverless Function.
 *
 * health / classify / classify-batch / explain are served by the LOCAL SQLite
 * expert engine (sql.js WASM + glorix-sql-stemmer-v1). No external AI API, no
 * client-side models, no BM25/KEYWORD_ROUTES as final authority. Never fabricates
 * a code — insufficient confidence returns empty code + review + candidates.
 *
 * documents stays a passthrough to the existing Document AI job engine
 * (backendFetch → TNVED_AI_API_URL). It is intentionally UNCHANGED.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = String(req.query?.action ?? '').trim();
  switch (action) {
    case 'health':          return health(req, res);
    case 'classify':        return classify(req, res);
    case 'classify-batch':  return classifyBatch(req, res);
    case 'explain':         return explain(req, res);
    case 'documents':       return documents(req, res);
    default:
      return res.status(404).json({ ok: false, error: true, reason: `Unknown tnved-ai action: ${action || '(none)'}` });
  }
}

// ── Local classifier core (shared by classify / batch / explain) ────────────
function rawTokensOf(text) {
  return String(text || '').toLowerCase().replace(/ё/g, 'е')
    .match(/[a-zа-я0-9]+(?:-[a-zа-я0-9]+)*/gi) || [];
}

async function classifyText(text) {
  const description = String(text || '').trim();
  const stems = normalizeAndTokenize(description);
  const raw = rawTokensOf(description);
  const concept = detectConcept(raw, stems);

  // Exact embedded TN VED code (8–10 digits) — accept ONLY if it exists in the DB.
  for (const t of raw) {
    if (/^\d{8,10}$/.test(t)) {
      const row = await getByCode(t);
      if (row) {
        return {
          status: 'classified', code: row.code, confident: true, confidence: 1,
          requiresClarification: false,
          candidates: [{
            code: row.code, description: row.title, chapter: row.chapter,
            tariff: row.tariff, score: 100, confidence: 1,
            reasons_for: ['код указан в запросе и подтверждён в базе ТН ВЭД'],
          }],
          reason: 'Код указан в запросе и подтверждён в локальной базе ТН ВЭД.',
          missing_information: [],
          audit: { query: description, tokens: stems, concept: concept?.id || null, matched_code: row.code },
        };
      }
    }
  }

  const expanded = concept ? concept.expandedStems : [];
  const codeHints = concept ? (concept.code_hints || []) : [];
  const terms = Array.from(new Set([...stems, ...expanded]));
  const r = await queryCandidates(terms, { codeHints });
  if (!r.ok) return { dbError: true, reason: r.reason };

  const scored = (r.candidates || []).map((c) => scoreCandidate(terms, c, concept));
  const decision = applyDecisionPolicy(scored, { activeConcept: concept });
  decision.audit = {
    query: description, tokens: stems, concept: concept?.id || null,
    retrieved: r.candidates?.length || 0, thresholds: DECISION,
  };
  return decision;
}

// ── GET /api/tnved-ai/health ─────────────────────────────────────────────
async function health(req, res) {
  try {
    const h = await dbHealth();
    if (!h.ok) {
      return res.status(200).json({ ok: false, error: true, status: 'error', reason: h.reason || 'tnved_complete.db not found' });
    }
    return res.status(200).json({
      ok: true,
      status: 'configured',
      backend: 'local-sqlite',
      engine: 'glorix-sql-stemmer-v1',
      db: 'tnved_complete.db',
      table: h.table,
      rows_count: h.rows_count,
      columns: h.columns,
    });
  } catch (err) {
    return res.status(200).json({ ok: false, error: true, status: 'error', reason: String(err?.message || err) });
  }
}

// ── POST /api/tnved-ai/classify ──────────────────────────────────────────
async function classify(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: true, code: '', reason: 'POST only' });
  const text = String(req.body?.description ?? req.body?.name ?? req.body?.query ?? '').trim();
  if (text.length < 2) return res.status(400).json({ ok: false, error: true, code: '', reason: 'query too short' });

  try {
    const d = await classifyText(text.slice(0, 1200));
    if (d.dbError) return res.status(200).json({ ok: false, error: true, status: 'error', code: '', reason: d.reason });
    return res.status(200).json({
      ok: true, status: d.status, code: d.code, confident: d.confident, confidence: d.confidence,
      requiresClarification: d.requiresClarification, candidates: d.candidates,
      reason: d.reason, missing_information: d.missing_information, audit: d.audit,
    });
  } catch (err) {
    return res.status(200).json({ ok: false, error: true, status: 'error', code: '', reason: String(err?.message || err) });
  }
}

// ── POST /api/tnved-ai/classify-batch ────────────────────────────────────
async function classifyBatch(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: true, reason: 'POST only', results: [] });
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ ok: false, error: true, reason: 'items array required', results: [] });
  if (items.length > 50) return res.status(400).json({ ok: false, error: true, reason: 'Max 50 items per batch', results: [] });

  const results = [];
  for (const raw of items) {
    const rowId = (raw && typeof raw === 'object') ? raw.row_id : undefined;
    const text = String((raw && typeof raw === 'object') ? (raw.description ?? raw.name ?? raw.query ?? '') : raw).trim().slice(0, 1200);
    const base = { row_id: rowId, name: text };
    if (text.length < 2) { results.push({ ...base, status: 'review', code: '', confident: false, candidates: [], reason: 'query too short' }); continue; }
    try {
      const d = await classifyText(text);
      if (d.dbError) { results.push({ ...base, status: 'error', code: '', confident: false, error: true, reason: d.reason }); continue; }
      results.push({
        ...base, status: d.status, code: d.code, confident: d.confident, confidence: d.confidence,
        requiresClarification: d.requiresClarification, candidates: d.candidates,
        reason: d.reason, missing_information: d.missing_information,
      });
    } catch (err) {
      results.push({ ...base, status: 'error', code: '', confident: false, error: true, reason: String(err?.message || err) });
    }
  }
  return res.status(200).json({ ok: true, results });
}

// ── POST /api/tnved-ai/explain ───────────────────────────────────────────
async function explain(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: true, reason: 'POST only' });
  const text = String(req.body?.description ?? req.body?.query ?? req.body?.code ?? '').trim();
  if (text.length < 2) return res.status(400).json({ ok: false, error: true, reason: 'description or code required' });

  try {
    const d = await classifyText(text.slice(0, 1200));
    if (d.dbError) return res.status(200).json({ ok: false, error: true, status: 'error', reason: d.reason });
    return res.status(200).json({
      ok: true,
      explain: {
        description: text, status: d.status, code: d.code, confidence: d.confidence,
        reason: d.reason, missing_information: d.missing_information,
        candidates: d.candidates, audit: d.audit,
      },
    });
  } catch (err) {
    return res.status(200).json({ ok: false, error: true, status: 'error', reason: String(err?.message || err) });
  }
}

// ── POST /api/tnved-ai/documents ─────────────────────────────────────────
// UNCHANGED passthrough to the existing Document AI job engine. Do not break.
// Body: { op, jobId?, offset?, limit?, raw_text?, tnved?, model?, row_ids? }
//   op: config | create | status | rows | pause | resume | cancel | retry
async function documents(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: true, reason: 'POST only' });
  const { configured, timeoutMs } = getConfig();
  if (!configured) return res.status(200).json(unavailable('TNVED_AI_API_URL is not configured'));

  const b = req.body || {};
  const op = String(b.op || '').trim();
  const jid = encodeURIComponent(String(b.jobId || ''));
  let method;
  let path;
  let body = null;
  switch (op) {
    case 'config': method = 'GET';  path = '/documents/config'; break;
    case 'create': method = 'POST'; path = '/documents/jobs';
      body = { raw_text: String(b.raw_text || ''), tnved: b.tnved !== false, use_llm_normalizer: b.use_llm_normalizer === true, model: b.model || undefined };
      break;
    case 'status': method = 'GET';  path = `/documents/jobs/${jid}`; break;
    case 'rows':   method = 'GET';  path = `/documents/jobs/${jid}/rows?offset=${Number(b.offset) || 0}&limit=${Number(b.limit) || 500}`; break;
    case 'pause':
    case 'resume':
    case 'cancel': method = 'POST'; path = `/documents/jobs/${jid}/${op}`; break;
    case 'retry':  method = 'POST'; path = `/documents/jobs/${jid}/retry`; body = { row_ids: b.row_ids || null }; break;
    default: return res.status(400).json({ ok: false, error: true, reason: `Unknown documents op: ${op || '(none)'}` });
  }

  try {
    const { httpOk, status, data } = await backendFetch(path, { method, timeoutMs, body });
    if (!httpOk) return res.status(200).json({ ok: false, error: true, reason: `AI backend HTTP ${status}`, status });
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'AI backend timeout' : 'AI backend unreachable';
    return res.status(200).json({ ok: false, error: true, reason });
  }
}
