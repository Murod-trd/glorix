# AGENT REPORT

## Last updated
2026-07-01

## Agent
Claude

## Current branch
claude/activate-tnved-ai-backend

## Last commit hash
d3f2d60

## Main objective
Activate the Python AI/RAG TN VED backend for the prepared /api/tnved-ai/* proxy.

## Honest outcome
PREPARED, NOT ACTIVATED. The backend could not be deployed/run from this environment.
TNVED_AI_API_URL remains empty → platform safely leaves codes blank. No fabricated URL set.

## 1. Code changes made
Docs only: added docs/TNVED_AI_DEPLOYMENT.md (+ this report). No app code/config changed.

## 2. Merged to main
Yes — fast-forward (docs-only, safe). See hash above.

## 3. Backend files found
backend/api/main.py, build_knowledge_base.py, config.py, Dockerfile, docker-compose.yml,
start.sh, rag/*, ingestion/*, store/qdrant_store.py, requirements.txt, .env.example.

## 4. Backend entrypoint
`uvicorn api.main:app` (port 8000). Routes: GET /health, POST /classify, POST /classify/audit,
POST /classify/explain, POST /rebuild, POST /benchmark/run.

## 5. Real-mode requirements (verified)
- Ollama running qwen2.5:7b-instruct-q4_K_M (OLLAMA_BASE_URL).
- Real embedder intfloat/multilingual-e5-base (sentence-transformers + torch). MOCK_EMBEDDER OFF.
- Qdrant vector DB (USE_EMBEDDED_QDRANT=0 + QDRANT_URL, or embedded).
- Knowledge base built from docs/reference_data/tnved/TWS_TNVED_2026-06-24.xlsx (13,289 codes)
  + docs/explanations (100 PDFs). Repo docs estimate ~1 hour build.
- MOCK_LLM/MOCK_EMBEDDER must be OFF for production.

## 6. Why not activated (sandbox evidence)
- ollama: NOT installed. nvidia-smi: absent (no GPU). RAM: 3.8 GiB total (model needs ~4.7 GB+).
- start.sh hard-requires reachable Qdrant. Real-mode KB build exceeds the 45s/process limit and
  processes do not persist between calls. → real backend cannot run here.
- No render.yaml/railway/fly.toml/Procfile in repo; no connected container-host deploy tooling.
- Backend is a long-running container service → Vercel serverless cannot host it.
- Therefore: no real backend URL obtainable; setting TNVED_AI_API_URL would be fabrication (forbidden).

## 7. Deployment target checked
Vercel (frontend/proxy only — cannot host the Python RAG service). No Render/Railway/Fly config or
tooling available. Backend is Docker/compose (Qdrant + host Ollama).

## 8. Deployed backend URL
None (not deployed).

## 9. Vercel env variables
NOT set (no real backend URL). TNVED_AI_API_URL intentionally left empty (safe state preserved).

## 10. /api/tnved-ai/health result (local, no URL)
status: "unavailable" (ok:false). Correct safe behavior.

## 11. Sample classification results (5 real products, no backend)
All returned code="" confident=false; batch reason "TNVED_AI_API_URL is not configured".
Products: Листовые ножница по металлу JS3201J; WD-40 универсальный спрей; Отвод металлический Ду-25;
Бита торцевая 8мм; Отбивочный шнур. → No fabrication; blank as designed.

## 12. Legacy fallback
Still DISABLED. DocumentCenter has no live /api/classify-batch, /api/classify, /api/search,
engine.js, or guessProductCode() call. Confirmed by grep.

## 13. Generated documents
Untouched (no src changes in this task — docs only).

## 14. Validation logs
- npm run build → ✓ built (RC 0; only pre-existing chunk-size warning).
- Proxy smoke test (no URL) → unavailable + all 5 sample codes blank; health=unavailable. PASS.

## 15. Blockers
Cannot deploy the AI/RAG backend (no GPU/Ollama/RAM/host tooling) → no real URL → cannot set Vercel
env → cannot activate. Activation requires a real container host operated by the founder.

## 16. Next exact step (manual)
Follow docs/TNVED_AI_DEPLOYMENT.md: deploy backend (Docker + Qdrant + Ollama qwen2.5:7b) on a host
with >=8 GB RAM, build the KB in real mode, verify {URL}/health (codes_count>10000, mock_*=false)
and {URL}/classify, then set Vercel env TNVED_AI_API_URL/TNVED_AI_TIMEOUT_MS/VITE_TNVED_AI_ONLY and
redeploy; verify /api/tnved-ai/health = configured.

## Handoff prompt for the other agent
> You are Codex. Activation of the TN VED AI backend is PREPARED, NOT DONE. The /api/tnved-ai/* proxy
> + frontend are merged; TNVED_AI_API_URL is empty so codes stay blank (safe). It cannot be activated
> from the sandbox (no GPU/Ollama/RAM, no host tooling). To activate, follow docs/TNVED_AI_DEPLOYMENT.md:
> deploy backend/ to a real container host, verify /health + /classify, then set Vercel env + redeploy.
> Do NOT set TNVED_AI_API_URL to localhost/fake. Do NOT re-enable legacy autofill. Update only CODEX_REPORT.md.
