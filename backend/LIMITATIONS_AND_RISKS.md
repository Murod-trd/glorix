# TN VED Backend Limitations and Risks

Date: 2026-06-30

## Not Production-Ready

The Python TN VED backend passed dev-mode wiring and data-ingestion checks, but it is not production-ready.

Real-mode quality remains pending because this run did not test:

- Ollama availability and model behavior
- Real `intfloat/multilingual-e5-base` embeddings
- Remote or persistent production Qdrant
- Human customs expert review on a real benchmark set
- Production authentication, authorization, rate limits, or observability

## Dev-Mode Quality Limits

`MOCK_EMBEDDER=1` and `MOCK_LLM=1` are useful for deterministic local proof, but they do not prove classification accuracy.

Known behavior from the dev-mode proof:

- The request for a steel galvanized bolt returned real Excel and PDF evidence.
- The final response still required clarification because the evidence/rule gates did not allow a confident final code.
- This is acceptable for audit of wiring and evidence shape, but it is not a quality benchmark.

## Data Risks

- The full Excel file is discovered dynamically from `EXCEL_DIR`; this is intentional.
- If multiple Excel files are placed in `EXCEL_DIR`, all `.xlsx` and `.xls` files are parsed and deduplicated by code.
- PDF extraction depends on text quality inside source PDFs. Scanned or malformed PDFs may produce weak chunks.
- Indexed PDF chunks can be fewer than extracted chunks because Qdrant point IDs are deterministic and duplicate-like chunks can collapse.

## Frontend Integration Risk

Python AI/RAG TN VED backend is not connected to frontend yet. Frontend currently uses Vercel TF-IDF API under `/api/*`.

Future integration should be behind a safe opt-in configuration such as `VITE_TNVED_BACKEND_URL`. Default Vercel behavior should remain unchanged until approved.

## Security Risks Before Production

- Replace any dev/test rebuild token before deployment.
- Do not commit `.env`.
- Do not commit generated Qdrant storage.
- Add production authentication and authorization around rebuild/admin endpoints.
- Add request logging, rate limits, and monitoring before exposing the Python backend publicly.

## Remaining Work

- Test real-mode with Ollama and the real embedder.
- Build a curated human-reviewed benchmark set.
- Measure exact-match, heading-match, refusal rate, and latency.
- Decide frontend integration strategy.
- Decide deployment target for Python FastAPI separately from the current Vercel frontend/API flow.
