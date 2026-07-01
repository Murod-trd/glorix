/**
 * docAiClient.js — frontend client for the Glorix backend Document AI job engine.
 *
 * The FRONTEND is UI only. All parsing/normalization/classification runs in the
 * backend as a resumable job. This client only creates jobs and polls status/rows
 * through the single Vercel proxy function (/api/tnved-ai/documents).
 * If the backend (TNVED_AI_API_URL) is not configured, every call returns
 * { ok:false, unavailable:true } and the UI degrades gracefully.
 */
async function call(op, payload = {}) {
  try {
    const res = await fetch('/api/tnved-ai/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    return data; // { ok, data } | { ok:false, unavailable|error, reason }
  } catch (e) {
    return { ok: false, error: true, reason: e?.message || 'network error' };
  }
}

export const docConfig      = () => call('config');
export const createDocJob   = (rawText, opts = {}) => call('create', { raw_text: rawText, tnved: opts.tnved !== false, use_llm_normalizer: opts.useLlmNormalizer === true, model: opts.model });
export const getDocJob      = (jobId) => call('status', { jobId });
export const getDocRows     = (jobId, offset = 0, limit = 1000) => call('rows', { jobId, offset, limit });
export const pauseDocJob    = (jobId) => call('pause', { jobId });
export const resumeDocJob   = (jobId) => call('resume', { jobId });
export const cancelDocJob   = (jobId) => call('cancel', { jobId });
export const retryDocJob    = (jobId, rowIds) => call('retry', { jobId, row_ids: rowIds || null });

export default { docConfig, createDocJob, getDocJob, getDocRows, pauseDocJob, resumeDocJob, cancelDocJob, retryDocJob };
