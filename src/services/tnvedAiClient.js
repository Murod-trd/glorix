/**
 * tnvedAiClient.js — frontend client for the GLORIX AI/RAG TN VED backend.
 *
 * SAFETY / SCOPE:
 *   - Calls ONLY /api/tnved-ai/* (the AI-backend proxy).
 *   - NEVER calls legacy /api/classify, /api/classify-batch, /api/search, or
 *     api/_lib/engine.js.
 *   - NEVER uses a local regex/TF-IDF dictionary to assign a final code.
 *   - If the AI backend is unavailable/erroring/unconfident, it returns an
 *     EMPTY code. A wrong TN VED code can cost millions, so blank is safer.
 */

async function postJson(path, body) {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    return data;
  } catch (e) {
    return { ok: false, error: true, code: '', reason: e?.message || 'network error' };
  }
}

/** Health/status of the AI backend. Returns { ok, status, reason, codes_count, pdf_chunks_count }. */
export async function healthTnvedAi() {
  try {
    const res = await fetch('/api/tnved-ai/health');
    return await res.json();
  } catch (e) {
    return { ok: false, error: true, status: 'error', reason: e?.message || 'network error' };
  }
}

/**
 * Classify a single product name.
 * Returns: { ok, code, confident, requiresClarification, reason, unavailable? }
 * `code` is '' unless the AI backend is confident.
 */
export async function classifySingleTnved(name) {
  const n = String(name || '').trim();
  if (n.length < 2) return { ok: false, code: '', confident: false, reason: 'name too short' };
  return postJson('/api/tnved-ai/classify', { name: n });
}

/**
 * Classify a batch of product names.
 * Accepts an array of strings OR an array of item objects (uses .name).
 * Returns: { ok, unavailable?, results: [{ name, code, confident }] }
 * Every code is '' unless the AI backend is confident.
 */
export async function classifyBatchTnved(items) {
  const names = (Array.isArray(items) ? items : [])
    .map(it => (typeof it === 'string' ? it : (it?.name || '')))
    .map(s => String(s).trim());
  if (!names.length) return { ok: true, results: [] };
  return postJson('/api/tnved-ai/classify-batch', { items: names });
}

/** Explainability for a description/code via the AI backend. Returns { ok, explain } or unavailable. */
export async function explainTnved(code) {
  const c = String(code || '').trim();
  if (!c) return { ok: false, error: true, reason: 'code required' };
  return postJson('/api/tnved-ai/explain', { code: c });
}

export default { healthTnvedAi, classifySingleTnved, classifyBatchTnved, explainTnved };
