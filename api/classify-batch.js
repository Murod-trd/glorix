import { search } from './_lib/engine.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ error: 'items array required' });
  if (items.length > 50) return res.status(400).json({ error: 'Max 50 items per batch' });

  try {
    const results = items.map(name => {
      const n = String(name || '').trim();
      if (!n || n.length < 2) return { name: n, code: '', desc: '', score: 0 };
      const top = search(n, 1);
      if (!top.length) return { name: n, code: '', desc: '', score: 0 };
      return { name: n, ...top[0] };
    });
    return res.status(200).json({ results });
  } catch (err) {
    console.error('[/api/classify-batch]', err);
    return res.status(500).json({ error: 'Batch failed' });
  }
}
