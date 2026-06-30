/* global process */
/**
 * Shared server-side client for the GLORIX AI/RAG TN VED backend.
 *
 * SAFETY: This module NEVER calls the legacy TF-IDF engine (api/_lib/engine.js)
 * and NEVER fabricates codes. If the AI backend is not configured or not
 * confident, it returns an empty code. A wrong TN VED code can cost millions,
 * so "no code" is always preferred over a guessed code.
 *
 * Backend contract (FastAPI, backend/api/main.py):
 *   GET  {base}/health
 *   POST {base}/classify          body: { description, chapter_hint?, include_audit?, model? }
 *   POST {base}/classify/explain  body: { description, ... }
 * ClassifyResponse: { code, confidence, requires_clarification, evidence:{ is_sufficient, ... }, sources_used, ... }
 */

export function getConfig() {
  const url = (process.env.TNVED_AI_API_URL || '').trim().replace(/\/+$/, '');
  const timeoutMs = Number(process.env.TNVED_AI_TIMEOUT_MS || 8000) || 8000;
  return { url, timeoutMs, configured: url.length > 0 };
}

export function unavailable(reason) {
  return { ok: false, unavailable: true, code: '', reason };
}

export async function backendFetch(path, { method = 'GET', body, timeoutMs } = {}) {
  const { url } = getConfig();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    return { httpOk: res.ok, status: res.status, data };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Decide whether a backend classification is confident enough to auto-fill.
 * Only accept a non-empty code when the model is NOT requesting clarification
 * and (if present) the evidence is marked sufficient.
 */
export function acceptCode(data) {
  const code = (data && typeof data.code === 'string') ? data.code.trim() : '';
  if (!code) return '';
  if (data.requires_clarification === true) return '';
  const ev = data.evidence;
  if (ev && ev.is_sufficient === false) return '';
  return code;
}

export function normalizeClassify(data) {
  const code = acceptCode(data);
  return {
    ok: true,
    code,
    confident: code !== '',
    confidence: typeof data?.confidence === 'number' ? data.confidence : null,
    requiresClarification: data?.requires_clarification === true,
    evidenceSufficient: data?.evidence ? data.evidence.is_sufficient === true : null,
    sourcesUsed: Array.isArray(data?.sources_used) ? data.sources_used : [],
    reason: code ? '' : 'AI backend not confident — manual verification required',
  };
}
