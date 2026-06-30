# TN VED Backend Audit Report

Date: 2026-06-30
Repository: Murod-trd/glorix
Scope: Python FastAPI TN VED backend under `backend/`

## Current Result

Dev-mode passed with the full TN VED Excel source and real PDF explanations.

This does not mean production-ready. Real-mode quality is still pending because Ollama and the real SentenceTransformer embedder were not tested in this run.

## Real Data Used

- Excel source: `../docs/reference_data/tnved/TWS_TNVED_2026-06-24.xlsx`
- Excel files discovered: 1
- Indexed TN VED code records: 13,289
- PDF source dirs: `./data/pdf,../docs/explanations`
- PDFs discovered in `../docs/explanations`: 100
- Extracted PDF chunks before unique Qdrant point storage: 1,708
- Indexed PDF chunks in Qdrant: 1,694

`backend/data/excel/mini_tnved.xlsx` and `backend/data/pdf/chapter73_test.pdf` were not present in production `backend/data/` in this workspace. Production data was not copied into `backend/data/excel/`.

## Backend Checks

Captured validation output is in `outputs/test_log.txt`.

Commands run from `backend/`:

- `python -m py_compile api/main.py build_knowledge_base.py rag/*.py store/*.py ingestion/*.py tests/*.py`
- `python tests/unit_tests.py`
- `pytest -q`
- `python -c "import api.main; print('API_IMPORT_OK')"`

Results:

- Python compile: passed
- Custom unit tests: 101 passed, 0 failed
- Pytest: 87 passed, 1 warning
- API import: `API_IMPORT_OK`

The compile command was run with PowerShell-expanded wildcards because Windows PowerShell does not expand `rag/*.py` for Python the same way a POSIX shell does.

## Dev-Mode API Proof

Captured outputs:

- Full build log: `outputs/build_knowledge_base.log`
- `/health`: `outputs/health.json`
- `/classify/explain`: `outputs/classify_explain.json`

Environment used:

- `USE_EMBEDDED_QDRANT=1`
- `MOCK_EMBEDDER=1`
- `MOCK_LLM=1`
- `STRICT_BUILD=1`
- `REQUIRE_EXCEL=1`
- `REQUIRE_PDF=1`
- `DATA_DIR=./data`
- `EXCEL_DIR=../docs/reference_data/tnved`
- `PDF_DIRS=./data/pdf,../docs/explanations`
- `EVIDENCE_MIN_SCORE=0.0`
- `REBUILD_TOKEN=test-token`
- `APP_ENV=dev`

API proof result:

- `/health` returned `codes_count=13289`
- `/health` returned `pdf_chunks_count=1694`
- `/health` returned `docs_explanations_detected=true`
- `/health` returned `docs_explanations_included=true`
- `/classify/explain` returned non-empty `evidence.excel_records`
- `/classify/explain` returned non-empty `evidence.pdf_chunks`
- `/classify/explain` returned non-empty `sources_used` with real files from `docs/explanations`
- `/classify/explain` returned `retrieval_stats.pdf_chunks_found > 0`
- `/classify/explain` returned `audit_trail`
- `/classify/explain` returned `rule_engine`

## Mock vs Real

Real in this run:

- Full Excel discovery and parsing
- Real TN VED records from `TWS_TNVED_2026-06-24.xlsx`
- Real PDFs from `docs/explanations`
- PDF text extraction
- Qdrant embedded storage
- FastAPI endpoint wiring
- Evidence assembly from Excel and PDF records

Mock in this run:

- Embeddings (`MOCK_EMBEDDER=1`)
- LLM classification (`MOCK_LLM=1`)

Because mock embeddings and mock LLM are enabled, classification quality is not proven. The dev-mode proof validates ingestion, indexing, retrieval shape, evidence shape, and API wiring only.

## Frontend Integration

Python AI/RAG TN VED backend is not connected to frontend yet. Frontend currently uses Vercel TF-IDF API under `/api/*`.

Inspected files:

- `src/utils/tnvedAI.js`
- `api/classify.js`
- `api/explain.js`
- `api/search.js`
- `api/_lib/engine.js`
- `vercel.json`
- `package.json`

The current Vercel behavior remains the default. No frontend or Vercel API integration was changed in this stabilization pass.

## Security Notes

- No `.env` file should be committed.
- Generated Qdrant storage should not be committed.
- `REBUILD_TOKEN` is environment-driven. An unset or mismatched token rejects rebuild and benchmark endpoints.
- `.gitignore` includes Python caches, virtualenvs, and Qdrant storage.

## Honest Status

TN VED backend is ready for external audit in dev-mode with full Excel and real PDFs. Real-mode quality remains pending.
