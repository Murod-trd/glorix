import { search, explain } from './_lib/engine.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const name = String(
    req.method === 'POST' ? (req.body?.name || '') : (req.query?.name || '')
  ).trim();

  if (!name || name.length < 2) {
    return res.status(400).json({ error: 'Name too short' });
  }

  try {
    const results = search(name, 1);
    if (!results.length) return res.status(200).json({ code: '', desc: '', score: 0 });
    const top = results[0];
    const explanation = explain(top.code);
    return res.status(200).json({ ...top, explanation });
  } catch (err) {
    console.error('[/api/classify]', err);
    return res.status(500).json({ error: 'Classification failed' });
  }
}
