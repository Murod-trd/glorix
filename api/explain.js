import { explain } from './_lib/engine.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const code = String(req.query?.code || '').trim();
  if (!code) return res.status(400).json({ error: 'code param required' });

  try {
    const text = explain(code);
    return res.status(200).json({ code, explanation: text || '' });
  } catch (err) {
    console.error('[/api/explain]', err);
    return res.status(500).json({ error: 'Failed' });
  }
}
