import { getConfig, backendFetch, unavailable, normalizeClassify } from './tnved-ai/_client.js';

/**
 * Consolidated TN VED AI proxy — ONE Vercel Serverless Function (stays under the
 * Hobby plan's 12-function limit). Dispatches by the dynamic [action] segment.
 *
 * Public endpoints are UNCHANGED:
 *   GET  /api/tnved-ai/health
 *   POST /api/tnved-ai/classify
 *   POST /api/tnved-ai/classify-batch
 *   POST /api/tnved-ai/explain
 *
 * Each action's behavior (methods, status codes, CORS, error/unavailable/timeout
 * responses) is moved verbatim from the former per-file handlers. Uses the same
 * env vars via _client.js (TNVED_AI_API_URL, TNVED_AI_TIMEOUT_MS).
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
    default:
      return res.status(404).json({ ok: false, error: true, reason: `Unknown tnved-ai action: ${action || '(none)'}` });
  }
}

// ── GET /api/tnved-ai/health ─────────────────────────────────────────────
async function health(req, res) {
  const { configured, timeoutMs } = getConfig();
  if (!configured) {
    return res.status(200).json({ ...unavailable('TNVED_AI_API_URL is not configured'), status: 'unavailable' });
  }
  try {
    const { httpOk, status, data } = await backendFetch('/health', { timeoutMs });
    if (!httpOk) {
      return res.status(200).json({ ok: false, error: true, status: 'error', reason: `AI backend /health HTTP ${status}` });
    }
    return res.status(200).json({
      ok: true,
      status: 'configured',
      codes_count: data?.qdrant?.codes_count ?? null,
      pdf_chunks_count: data?.qdrant?.pdf_chunks_count ?? null,
      backend: data?.status ?? null,
    });
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'AI backend timeout' : 'AI backend unreachable';
    return res.status(200).json({ ok: false, error: true, status: 'error', reason });
  }
}

// ── POST /api/tnved-ai/classify ──────────────────────────────────────────
async function classify(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: true, code: '', reason: 'POST only' });

  const name = String(req.body?.name ?? req.body?.description ?? '').trim();
  if (name.length < 2) return res.status(400).json({ ok: false, error: true, code: '', reason: 'name too short' });

  const { configured, timeoutMs } = getConfig();
  if (!configured) return res.status(200).json(unavailable('TNVED_AI_API_URL is not configured'));

  try {
    // backend requires description length >= 5
    const description = name.length < 5 ? `Товар: ${name}` : name;
    const { httpOk, status, data } = await backendFetch('/classify', {
      method: 'POST', timeoutMs, body: { description },
    });
    if (!httpOk) return res.status(200).json({ ok: false, error: true, code: '', reason: `AI backend HTTP ${status}` });
    return res.status(200).json(normalizeClassify(data));
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'AI backend timeout' : 'AI backend unreachable';
    return res.status(200).json({ ok: false, error: true, code: '', reason });
  }
}

// ── POST /api/tnved-ai/classify-batch ────────────────────────────────────
async function classifyBatch(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: true, reason: 'POST only', results: [] });

  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ ok: false, error: true, reason: 'items array required', results: [] });
  if (items.length > 50) return res.status(400).json({ ok: false, error: true, reason: 'Max 50 items per batch', results: [] });

  const { configured, timeoutMs } = getConfig();
  if (!configured) {
    // Explicitly return empty codes — never fabricate.
    return res.status(200).json({
      ...unavailable('TNVED_AI_API_URL is not configured'),
      results: items.map(name => ({ name: String(name || '').trim(), code: '', confident: false })),
    });
  }

  const results = [];
  for (const raw of items) {
    const name = String(raw || '').trim();
    if (name.length < 2) { results.push({ name, code: '', confident: false }); continue; }
    try {
      const description = name.length < 5 ? `Товар: ${name}` : name;
      const { httpOk, data } = await backendFetch('/classify', { method: 'POST', timeoutMs, body: { description } });
      if (!httpOk) { results.push({ name, code: '', confident: false, error: true }); continue; }
      const n = normalizeClassify(data);
      results.push({ name, code: n.code, confident: n.confident, confidence: n.confidence });
    } catch {
      results.push({ name, code: '', confident: false, error: true });
    }
  }
  return res.status(200).json({ ok: true, results });
}

// ── POST /api/tnved-ai/explain ───────────────────────────────────────────
// The AI backend explains a DESCRIPTION (POST /classify/explain), not a bare code.
// If a code is supplied without a description, we forward the code as the
// description text (limited). Honest limitation documented in the migration doc.
async function explain(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: true, reason: 'POST only' });

  const description = String(req.body?.description ?? req.body?.code ?? '').trim();
  if (description.length < 2) return res.status(400).json({ ok: false, error: true, reason: 'description or code required' });

  const { configured, timeoutMs } = getConfig();
  if (!configured) return res.status(200).json(unavailable('TNVED_AI_API_URL is not configured'));

  try {
    const text = description.length < 5 ? `Код/товар: ${description}` : description;
    const { httpOk, status, data } = await backendFetch('/classify/explain', {
      method: 'POST', timeoutMs, body: { description: text, include_audit: true },
    });
    if (!httpOk) return res.status(200).json({ ok: false, error: true, reason: `AI backend HTTP ${status}` });
    return res.status(200).json({ ok: true, explain: data });
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'AI backend timeout' : 'AI backend unreachable';
    return res.status(200).json({ ok: false, error: true, reason });
  }
}
