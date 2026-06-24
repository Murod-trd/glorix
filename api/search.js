import { search } from './_lib/engine.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q    = String(req.query?.q || '').trim();
  const topK = Math.min(parseInt(req.query?.topK || '5', 10), 20);

  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }

  try {
    const results = search(q, topK);
    return res.status(200).json({ results });
  } catch (err) {
    console.error('[/api/search]', err);
    return res.status(500).json({ error: 'Search failed' });
  }
}
