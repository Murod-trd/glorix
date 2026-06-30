# TN VED AI-Only Migration

This change **disables the legacy automatic TN VED code selection** in Document
Center and routes auto-fill exclusively through the GLORIX AI/RAG backend.

> Why: the old automatic selection (regex dictionary → TF-IDF) could assign
> **completely wrong** TN VED codes. A wrong code can cost millions at customs.
> From now on, if the AI backend is not available or not confident, the code is
> left **empty** and the user is told to enter/verify it manually. No guessing.

## Old dangerous flow (now disabled)

On Excel/Word import, `DocumentCenter.jsx` previously did:

1. `guessProductCode(name)` — local regex dictionary (`PRODUCT_TNVED_MAP`) → assigned a code.
2. For unresolved items → `POST /api/classify-batch` → `api/_lib/engine.js`
   (**Sparse TF-IDF Search Engine v3**) → assigned `result.code`.

Both steps auto-filled a code even when wrong. This is the behavior that was removed.

## New AI-only flow

On Excel/Word import:

1. If an item already has a **manually supplied** TN VED code → it is **kept**.
2. Items without a code are sent to the AI backend via the proxy
   `POST /api/tnved-ai/classify-batch`.
3. A code is filled **only** if the AI backend is confident
   (`code` present, `requires_clarification !== true`, and — when provided —
   `evidence.is_sufficient === true`).
4. Otherwise the code is left **empty**. There is **no fallback** to the legacy
   regex dictionary or TF-IDF engine.
5. A small UI status is shown (never written into generated documents):
   - “AI ТН ВЭД: код подобран …” (success)
   - “AI ТН ВЭД недоступен — введите код вручную или проверьте с декларантом”

The misleading per-user OpenAI API key field was removed and replaced with an
honest **GLORIX AI ТН ВЭД** status indicator (configured / unavailable / error).
Users are never asked to paste an OpenAI key.

## Proxy endpoints (new)

All live under `api/tnved-ai/` and call **only** the AI backend — never
`api/_lib/engine.js` or the legacy `/api/classify*` routes:

| Endpoint | Method | Maps to AI backend |
|---|---|---|
| `/api/tnved-ai/health` | GET | `GET {TNVED_AI_API_URL}/health` |
| `/api/tnved-ai/classify` | POST `{name}` | `POST /classify` `{description}` |
| `/api/tnved-ai/classify-batch` | POST `{items:[name]}` | loops `POST /classify` (backend has no batch route) |
| `/api/tnved-ai/explain` | POST `{code\|description}` | `POST /classify/explain` |

If `TNVED_AI_API_URL` is missing, every endpoint returns a clear unavailable
response with an empty code, e.g.:

```json
{ "ok": false, "unavailable": true, "code": "", "reason": "TNVED_AI_API_URL is not configured" }
```

## Environment variables

Add to `.env` (placeholders are in `.env.example`):

```
TNVED_AI_API_URL=        # base URL of the deployed Python AI backend; empty = no autofill
TNVED_AI_TIMEOUT_MS=8000 # per-request proxy timeout
VITE_TNVED_AI_ONLY=true  # optional client-visible flag (AI-only is default regardless)
```

`.env` must never be committed.

## Deploying / configuring the AI backend

1. Deploy the Python AI/RAG backend in `backend/` (FastAPI + Qdrant + Ollama).
   It must be reachable over HTTP and expose `GET /health`, `POST /classify`,
   `POST /classify/explain`. Build its knowledge base first (full Excel
   `docs/reference_data/tnved/TWS_TNVED_2026-06-24.xlsx` + `docs/explanations`).
2. In Vercel → Project → Settings → Environment Variables, set
   `TNVED_AI_API_URL` to that backend's base URL (e.g. `https://tnved.internal.example.com`)
   and optionally `TNVED_AI_TIMEOUT_MS`.
3. Redeploy. `GET /api/tnved-ai/health` should then report `status: "configured"`.

## Behavior when the AI backend is unavailable

- The Document Center UI keeps working.
- No code is auto-filled (codes stay blank).
- A warning status tells the user to enter the code manually / verify with a
  declarant or broker.
- Manually entered codes are preserved; Excel/Word import still works.
- Generated KP / DOCX / PDF structure is unchanged (blank codes render as the
  existing “⚠ требует кода” marker, as before).

## How to test

**Classify single (no AI configured):**
```bash
curl -s -X POST http://localhost:3000/api/tnved-ai/classify \
  -H 'Content-Type: application/json' -d '{"name":"Болт М10x40"}'
# → {"ok":false,"unavailable":true,"code":"","reason":"TNVED_AI_API_URL is not configured"}
```

**Classify batch (no AI configured):**
```bash
curl -s -X POST http://localhost:3000/api/tnved-ai/classify-batch \
  -H 'Content-Type: application/json' -d '{"items":["Болт М10","Цемент М400"]}'
# → results all have "code":"" (never fabricated)
```

**Verify no legacy fallback:** import items in Document Center with no
`TNVED_AI_API_URL` set → codes remain blank, the warning status appears, and the
network tab shows calls to `/api/tnved-ai/*` only (never `/api/classify-batch`).

## Honest limitation

AI classification can still be wrong. The autofilled code is a **suggestion**.
The final TN VED code used for customs clearance **must be verified by a customs
declarant or broker**. The legacy TF-IDF endpoints remain in the repo for
historical/internal testing only and are no longer used by Document Center.
