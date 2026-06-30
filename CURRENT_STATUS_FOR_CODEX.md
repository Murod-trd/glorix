# Current Status for Codex

Date: 2026-06-30
Branch target: `codex/tnved-stabilization`

## Backend Status

Dev-mode backend validation passed locally against the full data sources.

Validated data:

- `docs/reference_data/tnved/TWS_TNVED_2026-06-24.xlsx`
- `docs/explanations` with 100 PDFs

Indexed counts:

- TN VED code records: 13,289
- PDF chunks: 1,694

Validation artifacts:

- `outputs/test_log.txt`
- `outputs/build_knowledge_base.log`
- `outputs/health.json`
- `outputs/classify_explain.json`

## Mode Status

Real in dev proof:

- Excel parsing
- PDF extraction
- embedded Qdrant indexing
- FastAPI import/startup
- `/health`
- `/classify/explain`
- Excel and PDF evidence output

Mock in dev proof:

- `MOCK_EMBEDDER=1`
- `MOCK_LLM=1`

Real-mode pending:

- Ollama model execution
- real SentenceTransformer embeddings
- real classification quality measurement

## Frontend Status

Python AI/RAG TN VED backend is not connected to frontend yet. Frontend currently uses Vercel TF-IDF API under `/api/*`.

Do not remove the Vercel API. Any future Python backend integration should be opt-in behind config and must keep current Vercel behavior as default until approved.

## Publish Status

PR #1 exists, branch `codex/tnved-stabilization`, commit `e22ec87826fea8d2a8154c507f447423accb8f4c`, base `main`, mergeable `true`, ready for review, changed files 15, main not touched.
