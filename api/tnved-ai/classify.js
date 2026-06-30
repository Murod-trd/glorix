import { getConfig, backendFetch, unavailable, normalizeClassify } from './_client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
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
