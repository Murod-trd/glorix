# TN VED AI Backend — Production Deployment & Activation

Status: the frontend + `/api/tnved-ai/*` proxy are **prepared and merged**. The
Python AI/RAG backend is **NOT yet deployed**, so `TNVED_AI_API_URL` is empty and
the platform safely leaves TN VED codes blank. This document is the exact, real
procedure to activate it. Do not set `TNVED_AI_API_URL` to localhost or a fake URL.

## Why this cannot be activated from the build sandbox

Real-mode classification requires resources the CI/agent sandbox does not have
(verified): no Ollama installed, no GPU, only ~3.8 GB RAM (the `qwen2.5:7b` model
needs ~4.7 GB+), and a one-time knowledge-base build the repo documents as ~1 hour.
The backend is also a long-running container service (FastAPI + external Qdrant +
host Ollama) — Vercel serverless cannot host it. Therefore it must be deployed to a
container host with enough CPU/RAM (or GPU).

## What the backend needs (from backend/)

- Entrypoint: `uvicorn api.main:app` on port 8000 (see `backend/Dockerfile`, `start.sh`).
- Endpoints used by the proxy: `GET /health`, `POST /classify`, `POST /classify/explain`.
- External services:
  - **Qdrant** vector DB (`backend/docker-compose.yml` ships `qdrant/qdrant:v1.11.3`).
  - **Ollama** running `qwen2.5:7b-instruct-q4_K_M` (on the host, `OLLAMA_BASE_URL`).
  - Real embedder `intfloat/multilingual-e5-base` via `sentence-transformers` (MOCK_EMBEDDER OFF).
- Reference data (already in repo): `docs/reference_data/tnved/TWS_TNVED_2026-06-24.xlsx`
  (13,289 codes) and `docs/explanations/` (100 PDFs).
- Real mode = **MOCK_EMBEDDER and MOCK_LLM must be OFF**. Mock mode is never production.

## Recommended host

A VM/container host that allows a persistent service + Ollama, e.g. a CPU/GPU VPS,
Render (Docker), Railway, or Fly.io. Minimum practical: ~8 GB RAM (Ollama 7B + embedder).
GPU strongly recommended for acceptable latency.

## Step A — Build the knowledge base (one time, real mode)

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
# Real mode (NO mocks). Requires Qdrant reachable and the embedder model.
export USE_EMBEDDED_QDRANT=0 QDRANT_URL=http://<qdrant-host>:6333
export EXCEL_DIR=../docs/reference_data/tnved
export PDF_DIRS=../docs/explanations
export STRICT_BUILD=1 REQUIRE_EXCEL=1 REQUIRE_PDF=1
python build_knowledge_base.py
# Expect: indexed codes > 10000 and pdf_chunks > 0
```

## Step B — Run the backend (Docker)

```bash
cd backend
cp .env.example .env   # set OLLAMA_BASE_URL, QDRANT_HOST/PORT; do NOT commit .env
# Pull the model on the Ollama host first:
ollama pull qwen2.5:7b-instruct-q4_K_M
docker compose up -d            # starts Qdrant + the API
docker compose exec glorix python build_knowledge_base.py   # if not built yet
```

Expose the API over **HTTPS** behind your host's TLS/proxy. Note the public base
URL, e.g. `https://tnved.<your-domain>`.

## Step C — Verify the backend BEFORE touching Vercel

```bash
curl -s https://tnved.<your-domain>/health | jq
# qdrant.codes_count must be > 10000, pdf_chunks_count > 0, mock_embedder=false, mock_llm=false

curl -s -X POST https://tnved.<your-domain>/classify \
  -H 'Content-Type: application/json' \
  -d '{"description":"<product description>"}' | jq
# Expect a structured ClassifyResponse. A code is returned ONLY when evidence is
# sufficient; otherwise code is null/empty with requires_clarification=true.
```

Do not proceed unless `/health` and `/classify` pass with real (non-mock) data.

## Step D — Activate in Vercel (production + preview)

In Vercel → Project `glorix` → Settings → Environment Variables, add (Production
and Preview):

| Name | Value |
|---|---|
| `TNVED_AI_API_URL` | `https://tnved.<your-domain>` (no trailing slash) |
| `TNVED_AI_TIMEOUT_MS` | `8000` |
| `VITE_TNVED_AI_ONLY` | `true` |

Then **redeploy** the project (env changes require a new deployment).

## Step E — Verify activation

```bash
curl -s https://<glorix-vercel-domain>/api/tnved-ai/health | jq
# → { "ok": true, "status": "configured", "codes_count": >10000, ... }
```

In Document Center: import products → only **confident** AI codes are filled; the
rest stay blank with the “проверьте с декларантом” status. The network tab must
show calls to `/api/tnved-ai/*` only — never `/api/classify-batch`.

## Behavior if the backend is later unavailable

Proxy returns `{ ok:false, unavailable:true, code:"" }`; the UI leaves codes blank
and shows the manual-verification warning. No legacy fallback, no fabricated codes.

## Honest limitation

AI suggestions can still be wrong. The final TN VED code for customs clearance
**must be verified by a customs declarant or broker**.
