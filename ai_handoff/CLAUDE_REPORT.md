# AGENT REPORT

## Last updated
2026-07-01

## Agent
Claude

## Current branch
claude/fix-refusal-questions-candidate-get

## Last commit hash
1622d58

## Main objective
Fix the 500 crash in POST /tnved/classify: build_refusal_questions() called `.get()` on
CandidateAnalysis objects.

## Root cause
rag/evidence_builder.build_refusal_questions() did `ch = c.get("chapter", c.get("code","")[:2])`,
assuming every candidate is a dict. It is called from 6 sites in rag/classifier.py:
  - line 257 passes `top10[:5]` which are CandidateAnalysis dataclass objects (no `.get()`),
  - lines 303/321/348/388/435 pass `codes[:5]` which are dicts.
The CandidateAnalysis path (refusal/clarification after retrieval+LLM+evidence) raised
"'CandidateAnalysis' object has no attribute 'get'" -> 500. It only surfaced in the refusal path,
which is why /health and many classifications were fine.

## Files changed
- backend/rag/evidence_builder.py — added `_candidate_get(c, key, default)` (dict.get OR getattr)
  and used it in the competing-chapters loop:
    code = _candidate_get(c, "code", "") or ""
    ch   = _candidate_get(c, "chapter", "") or code[:2]
  Same question text/behavior; now accepts dicts AND dataclass-like candidates.
- backend/tests/test_build_refusal_questions.py — new regression test:
  dict candidates; dataclass object candidates (code/chapter); object without chapter (code[:2]
  fallback). Asserts no raise + returns list.

## Scan for other type mismatches (classifier.py)
- build_refusal_questions: line 257 (CandidateAnalysis) + 303/321/348/388/435 (dicts) — all covered.
- Other `.get()` in classifier.py operate on retrieval dicts: retrieved.get(...) (217/218) and the
  function at ~480 that BUILDS CandidateAnalysis FROM dict candidates (492-548). Those consume dicts,
  not CandidateAnalysis, so no crash. No other fix needed. Pipeline NOT refactored.

## Tests
- py_compile rag/evidence_builder.py rag/classifier.py api/main.py tests/test_build_refusal_questions.py -> OK
- python tests/test_build_refusal_questions.py -> ALL REFUSAL-QUESTION REGRESSION TESTS PASSED
- pytest tests/test_build_refusal_questions.py tests/test_refusals.py -> 22 passed
- python tests/unit_tests.py -> 101 passed, 0 failed
  (One transient failure earlier was ONLY because I set EVIDENCE_MIN_SCORE=0.0 in the shell; with the
  real default threshold it passes. Not related to this change.)

## Crash-fix only
This is a crash fix, NOT a classification-quality change. Thresholds, prompts, evidence-score rules,
refusal logic, question text, and frontend behavior are unchanged. The endpoint may still return
requires_clarification / low confidence — that is acceptable; the fix only prevents the 500.

## Founder verification (Windows)
```
docker compose --env-file infra/local/.env.local -f infra/local/docker-compose.local.yml --profile core up -d --build
curl http://localhost:8787/tnved/health   # stays ok (codes_count 13289, pdf_chunks_count 1694)
curl -X POST http://localhost:8787/tnved/classify -H "Content-Type: application/json" \
     -d '{"description":"<product description>","include_audit":false}'
# expect 200 (may be requires_clarification), NOT 500
```
Not run in sandbox (no Docker/Ollama here); verified via py_compile + regression + full unit suite.

## Merged to main
Yes — fast-forward (small backend crash fix; no classification logic/thresholds/prompts/security).

## Handoff prompt for the other agent
> You are Codex. Claude fixed a 500 crash: build_refusal_questions() in rag/evidence_builder.py now
> reads candidate fields via _candidate_get() (dict.get OR getattr), so it accepts both dict and
> CandidateAnalysis candidates. Added tests/test_build_refusal_questions.py. No thresholds/prompts/
> scoring/classifier changes; 101 unit tests + refusal tests pass. Update only CODEX_REPORT.md.

---
## Cleanup pass (accidental test artifacts)
- No accidental artifact files were tracked or present on disk (request.json, tnved-error-*,
  tnved-response-*, tnved-test-*): nothing to git rm.
- Removed the non-approved test string "Отвод металлический Ду-250": replaced with a neutral
  placeholder in backend/tests/test_build_refusal_questions.py (test still passes) and neutralized
  the curl example in this report to "<product description>".
- WD-40 in src/pages/DocumentCenter.jsx (PRODUCT_TNVED_MAP regex) is PRE-EXISTING application code
  (commit 56bda71), not a test artifact — left unchanged per "do not change classification logic".
- Added .gitignore entries for local API test artifacts.
