import { getConfig, backendFetch, unavailable } from './_client.js';

/**
 * The AI backend explains a DESCRIPTION (POST /classify/explain), not a bare code.
 * If a code is supplied without a description, we forward the code as the
 * description text (limited). Honest limitation documented in the migration doc.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
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
