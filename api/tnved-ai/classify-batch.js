import { getConfig, backendFetch, unavailable, normalizeClassify } from './_client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
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
