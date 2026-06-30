# Project Context for Audit

Date: 2026-06-30
Repository: Murod-trd/glorix

Glorix is a B2B procurement and trade platform for the CIS market. The current repository is not a finished production platform.

Current implementation reality:

- Frontend: React/Vite
- Current deployed API path: Vercel functions under `/api/*`
- Existing Vercel TN VED module: Node TF-IDF logic under `api/`
- Python TN VED backend: FastAPI/RAG-style module under `backend/`
- Python backend frontend integration: not connected yet

## TN VED Stabilization Scope

This audit pass focused only on the Python TN VED backend:

- dynamic Excel discovery from `EXCEL_DIR`
- full Excel parsing from `docs/reference_data/tnved/TWS_TNVED_2026-06-24.xlsx`
- real PDF discovery from `docs/explanations`
- embedded Qdrant dev-mode indexing
- `/health`
- `/classify/explain`
- evidence shape from Excel and PDFs
- test suite stability
- documentation of mock vs real behavior

## Confirmed Counts

- Full Excel indexed: yes
- Excel file path used: `../docs/reference_data/tnved/TWS_TNVED_2026-06-24.xlsx`
- Indexed code records: 13,289
- PDFs in `docs/explanations`: 100
- Indexed PDF chunks: 1,694

## Frontend/Backend Integration Status

Python AI/RAG TN VED backend is not connected to frontend yet. Frontend currently uses Vercel TF-IDF API under `/api/*`.

No architecture migration was performed. Vite/React and the existing Vercel API were left in place.

## Status Wording

Allowed statement:

TN VED backend is ready for external audit in dev-mode with full Excel and real PDFs. Real-mode quality remains pending.

Disallowed statement:

The whole Glorix platform is production-ready.
