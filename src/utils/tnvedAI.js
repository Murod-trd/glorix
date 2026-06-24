/**
 * tnvedAI.js  — GLORIX ТН ВЭД client
 * All search is delegated to Vercel Serverless API (/api/*).
 * Zero browser computation, zero local indexes.
 */

const API_BASE = '/api';

// ── helpers ──────────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API ${res.status}`);
  }
  return res.json();
}

// ── Public API ────────────────────────────────────────────────

/**
 * Search ТН ВЭД by product name/description.
 * Returns: [{ code, desc, score }, ...]
 */
export async function searchTnvedDB(name, topK = 5) {
  if (!name || name.trim().length < 2) return [];
  const data = await apiFetch(
    `/search?q=${encodeURIComponent(name.trim())}&topK=${topK}`
  );
  return data.results || [];
}

/**
 * Classify a single product name.
 * Returns: { code, desc, score, source }
 */
export async function resolveTnved(name) {
  if (!name || name.trim().length < 2) return { code: '', desc: '', score: 0, source: 'none' };

  // If OpenAI key is configured, try it first
  const openaiKey = localStorage.getItem('openai_api_key') || '';
  if (openaiKey) {
    try {
      const result = await resolveWithOpenAI(name.trim(), openaiKey);
      if (result?.code) return { ...result, source: 'openai' };
    } catch (e) {
      console.warn('[tnvedAI] OpenAI failed, falling back to server TF-IDF:', e.message);
    }
  }

  // Server-side TF-IDF (no browser computation)
  try {
    const data = await apiFetch('/classify', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim() }),
    });
    return { code: data.code || '', desc: data.desc || '', score: data.score || 0, source: 'tfidf' };
  } catch (e) {
    console.error('[tnvedAI] classify API error:', e.message);
    return { code: '', desc: '', score: 0, source: 'error' };
  }
}

/**
 * Get explanation text for a ТН ВЭД code.
 * Returns: string | null
 */
export async function getExplanation(code) {
  if (!code) return null;
  try {
    const data = await apiFetch(`/explain?code=${encodeURIComponent(code)}`);
    return data.explanation || null;
  } catch {
    return null;
  }
}

// ── OpenAI helper (optional, user's own key) ─────────────────

async function resolveWithOpenAI(name, apiKey) {
  const systemPrompt = `Ты эксперт ТН ВЭД ЕАЭС. Определи 10-значный код ТН ВЭД для указанного товара.
Ответь ТОЛЬКО JSON: { "code": "XXXXXXXXXX", "desc": "краткое описание" }
Без пояснений, без markdown.`;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: name },
      ],
      max_tokens: 100,
      temperature: 0,
    }),
  });

  if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content || '';
  return JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || 'null');
}
