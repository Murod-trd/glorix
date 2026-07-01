# AGENT REPORT

## Last updated
2026-07-01

## Agent
Claude

## Current branch
claude/fix-tnved-runtime-wiring

## Last commit hash
004ad24

## Main objective
Fix container runtime wiring so tnved reaches host Ollama + Docker Qdrant, and enable the KB build.

## Root cause
1. HEALTH -> OLLAMA: backend/api/main.py /health called hardcoded http://localhost:11434/api/tags.
   Inside a container `localhost` is the container, not the Windows host -> "Ollama недоступна".
2. QDRANT SELECTION: store/qdrant_store.get_client() uses QDRANT_URL + USE_EMBEDDED_QDRANT, but compose
   only set QDRANT_HOST/QDRANT_PORT. With QDRANT_URL unset it fell back to embedded local storage ->
   "Collection tnved_codes not found" (it wasn't talking to the Docker Qdrant service at all).
3. OLLAMA CLIENT: rag/llm_client.py calls ollama.chat(...) directly; the ollama python client reads
   OLLAMA_HOST, which was not set in the container.

## Files changed
- infra/local/docker-compose.local.yml (tnved service):
  + QDRANT_URL=http://qdrant:6333, USE_EMBEDDED_QDRANT=0 (kept QDRANT_HOST/PORT).
  + OLLAMA_HOST=${OLLAMA_BASE_URL:-http://host.docker.internal:11434} (for the ollama client),
    alongside existing OLLAMA_BASE_URL (for /health).
  + EXCEL_DIR=/data/tnved-excel, PDF_DIRS=/data/explanations, STRICT_BUILD/REQUIRE_EXCEL/REQUIRE_PDF=1.
  + HF_HOME/TRANSFORMERS_CACHE=/root/.cache/huggingface + hf_cache named volume (persists ~2 GB model;
    lives on G: via Docker disk image).
  + read-only mounts: ../../docs/reference_data/tnved -> /data/tnved-excel, ../../docs/explanations ->
    /data/explanations (relative paths avoid the Windows drive-colon issue).
  + added hf_cache to the volumes: block. Qdrant still 127.0.0.1-only; nothing new exposed.
- backend/api/main.py (/health only): base = os.getenv("OLLAMA_BASE_URL","http://localhost:11434").rstrip("/");
  await client.get(f"{base}/api/tags"). No other behavior changed.
- scripts/windows/build-tnved-kb.ps1 + BUILD_TNVED_KB.bat: run build_knowledge_base.py inside the running
  tnved container via compose exec; warns first build is slow (~2 GB model, tens of minutes).
- docs/GLORIX_LOCAL_SERVER_HUB.md: "Build the TN VED knowledge base" section + runtime wiring note.

## Test commands (in this sandbox)
- python3 -m py_compile backend/api/main.py            -> OK
- yaml.safe_load(docker-compose.local.yml)            -> OK
- get_client() branch test with QDRANT_URL set + USE_EMBEDDED_QDRANT=0 (stubbed QdrantClient)
  -> selects QdrantClient(url="http://qdrant:6333"); PASS (external Docker Qdrant, not embedded).
- npm run build                                        -> built (RC 0), frontend unaffected.

## Whether curl health checks passed
NOT run here: sandbox has no Docker/Ollama/GPU, so docker compose + /tnved/health curls could not be
executed. Fixes verified statically + by import/branch tests. Founder verifies on Windows (below).

## Founder verification (Windows)
```
docker compose --env-file infra/local/.env.local -f infra/local/docker-compose.local.yml --profile core down --remove-orphans
docker compose --env-file infra/local/.env.local -f infra/local/docker-compose.local.yml --profile core up -d --build
docker exec glorix_tnved python -c "import os;print(os.getenv('OLLAMA_BASE_URL'));print(os.getenv('QDRANT_URL'));print(os.getenv('USE_EMBEDDED_QDRANT'))"
  # expect: http://host.docker.internal:11434 / http://qdrant:6333 / 0
curl http://localhost:8787/health            # {"ok":true,...}
curl http://localhost:8787/tnved/health      # ollama ok + qdrant ok (collections may be empty until KB build)
scripts\windows\BUILD_TNVED_KB.bat           # long first run
curl http://localhost:8787/tnved/health      # codes_count > 10000, pdf_chunks_count > 0
```

## Safety
No classification logic, thresholds, prompts, evidence/refusal rules, frontend, or auth/security changed.
Legacy TN VED autofill stays disabled. Qdrant/Ollama remain internal (127.0.0.1); nothing new public.
No secrets committed.

## Merged to main
Yes — fast-forward (local infra/runtime wiring + health-endpoint URL; no classification/auth/security).

## Handoff prompt for the other agent
> You are Codex. Claude wired the tnved container to the Docker Qdrant (QDRANT_URL + USE_EMBEDDED_QDRANT=0)
> and host Ollama (OLLAMA_HOST/OLLAMA_BASE_URL=host.docker.internal), fixed /health to use OLLAMA_BASE_URL,
> mounted the reference Excel/PDFs read-only, and added BUILD_TNVED_KB scripts. Verified statically + by
> import/branch tests; full docker run not possible in sandbox. Do not change classification logic.
> Update only CODEX_REPORT.md.
