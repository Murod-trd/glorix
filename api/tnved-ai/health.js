import { getConfig, backendFetch, unavailable } from './_client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

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
