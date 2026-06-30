# AGENT REPORT

## Last updated
2026-07-01

## Agent
Claude

## Current branch
claude/disable-legacy-tnved-autofill

## Last commit hash
9ab7a7f

## Git status before work
Clean, synced to origin/main (d97cf33 — TN VED UI warning).

## Git status after work
Clean after commit; merged to main via fast-forward (see below).

## What I read from the other agent report
No CODEX_REPORT.md present. Not edited.

## Main objective
Disable legacy automatic TN VED autofill; route autofill exclusively through the AI/RAG backend.

## Project direction
Glorix stays React/Vite + Vercel. Legacy TF-IDF files remain in repo (historical/internal) but
are no longer used by Document Center autofill. No architecture rewrite.

## Files changed by this agent
- `api/tnved-ai/_client.js` (new) — shared AI-backend client; confidence gate; never calls legacy engine.
- `api/tnved-ai/health.js` (new) — proxy GET /health; unavailable response if URL missing.
- `api/tnved-ai/classify.js` (new) — proxy POST /classify; blank code unless confident.
- `api/tnved-ai/classify-batch.js` (new) — loops backend /classify (no batch route); blank codes if unavailable.
- `api/tnved-ai/explain.js` (new) — proxy POST /classify/explain.
- `src/services/tnvedAiClient.js` (new) — frontend client; calls ONLY /api/tnved-ai/*.
- `src/pages/DocumentCenter.jsx` (mod) — AI-only autofill; removed regex+TF-IDF autofill; removed
  OpenAI key field → GLORIX AI status; added autofill status message. generateKP/exports untouched.
- `.env.example` (mod) — TNVED_AI_API_URL, TNVED_AI_TIMEOUT_MS, VITE_TNVED_AI_ONLY (placeholders).
- `docs/TNVED_AI_ONLY_MIGRATION.md` (new) — full migration doc.

## Code changes made
handlePaste now: keep manual codes; send code-less items to `classifyBatchTnved` (→ /api/tnved-ai/
classify-batch → backend /classify). Fill code only when backend confident; else blank. No
guessProductCode call, no /api/classify-batch call. Health checked on mount → aiStatus indicator.

## Why these changes were made
Legacy regex/TF-IDF assigned wrong codes. Wrong TN VED → customs fines worth millions. Better blank
than wrong; AI backend already refuses to answer when evidence insufficient.

## Commands run
- npm install --ignore-scripts; npm run build
- node /tmp/smoke.mjs (safety smoke test)
- npx eslint on changed files

## Results
- Build: `✓ built in 4.21s` (RC 0; only pre-existing chunk-size warning).
- Smoke test: PASSED — unavailable→blank; confidence gate (requires_clarification / evidence.is_sufficient) enforced; classify/batch/health all return empty/unavailable with no AI URL; no legacy calls.
- eslint DocumentCenter.jsx: 3 errors, ALL pre-existing (line 134 qty, 762/769 companyLogo empty catches). My change introduced 0 new errors and removed 4 pre-existing ones. Proxy + service files lint-clean.

## Tests passed
Frontend build; node safety smoke test.

## Tests failed
None.

## Build status
PASS.

## Frontend/demo compatibility
Demo preserved. Import still works. Manual codes preserved. Missing AI URL → blank codes + warning, UI not broken.

## Auth/database status
Unchanged.

## Current blockers
None for merge. AI backend not yet deployed/configured (TNVED_AI_API_URL empty) → intended safe behavior.

## Next exact step
Deploy backend/ (FastAPI) with full Excel + PDFs; set TNVED_AI_API_URL in Vercel; redeploy; verify /api/tnved-ai/health = configured.

## Handoff prompt for the other agent
> You are Codex. Claude disabled legacy TN VED autofill in DocumentCenter and added an AI-only proxy
> (api/tnved-ai/*) + src/services/tnvedAiClient.js. With TNVED_AI_API_URL unset, autofill returns
> blank codes (safe). To activate: deploy the Python backend/, set TNVED_AI_API_URL in Vercel.
> Do not re-enable legacy regex/TF-IDF autofill. Update only CODEX_REPORT.md.
