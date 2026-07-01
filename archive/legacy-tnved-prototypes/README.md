# Legacy TN VED prototypes (archived — not used by the platform)

These are **early prototype** TN VED classifiers, kept here only for historical
reference / emergency comparison. They are **not** part of the active Glorix
platform and must **not** be run in production.

## Files

- `tnved_classifier.py` — v1 two-step **OpenAI**-based classifier
  (parse → filter within 4-digit heading → LLM chooses 10-digit code).
- `tnved_classifier_v2.py` — v2: BM25 + **OpenAI** Structured Outputs + Pydantic
  (extract → filter → rank).

## Why they are archived

- They call the **OpenAI API**, which the current architecture explicitly does
  **not** use — the platform runs a fully local RAG system.
- Nothing in the codebase imports or references them (dead code).
- They are superseded by the active backend.

## Current active architecture (do not confuse with these)

The real TN VED classifier is the local RAG service under **`backend/`**:
FastAPI + **Qdrant** (vector store) + **Ollama** (local LLM) + BM25 hybrid
retrieval + evidence/OPI/refusal logic. See `docs/` and `backend/` for the
active system.

## Warning

Do not wire these prototypes into the platform, CI, or any deployment. They
remain purely for reference.
