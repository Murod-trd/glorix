"""
Regression test for meta retrieval-count reporting.
Bug fixed: /classify meta.retrieval_codes/retrieval_pdf were derived from evidence
records, so refusal paths (evidence=None) reported 0 even when retrieval returned
candidates. Now meta reflects the ACTUAL retrieval counts.
Uses internal objects + neutral placeholders only. No pipeline run, no real products.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
os.environ.setdefault("MOCK_EMBEDDER", "1")
os.environ.setdefault("MOCK_LLM", "1")

from rag.classifier import ClassificationResult, CandidateAnalysis
from api.main import _result_to_response


def _candidate():
    return CandidateAnalysis(
        rank=1, code="0000000000", description="neutral placeholder item",
        chapter="00", rrf_score=0.5, reasons_for=[], reasons_against=[], opi_note=None,
    )


def test_meta_reports_retrieval_counts_on_refusal_path():
    # Refusal-like result: evidence is None, but retrieval returned candidates.
    result = ClassificationResult(
        code=None,
        confidence=0.0,
        requires_clarification=True,
        clarification_message="clarification needed",
        clarification_questions=["provide more detail"],
        top10_candidates=[_candidate(), _candidate()],
        evidence=None,
        retrieved_codes_count=7,
        retrieved_pdf_count=4,
    )
    resp = _result_to_response(result, model="test-model", include_audit=False)
    # top10 populated AND meta reflects real retrieval, not the (empty) evidence.
    assert len(resp.top10_candidates) == 2
    assert resp.meta.retrieval_codes == 7
    assert resp.meta.retrieval_pdf == 4
    # Refusal behavior preserved.
    assert resp.code is None
    assert resp.requires_clarification is True


def test_meta_defaults_zero_when_nothing_retrieved():
    result = ClassificationResult(
        code=None,
        confidence=0.0,
        requires_clarification=True,
        clarification_message="x",
        clarification_questions=[],
        top10_candidates=[],
        evidence=None,
    )
    resp = _result_to_response(result, model="m", include_audit=False)
    assert resp.meta.retrieval_codes == 0
    assert resp.meta.retrieval_pdf == 0


if __name__ == "__main__":
    test_meta_reports_retrieval_counts_on_refusal_path()
    test_meta_defaults_zero_when_nothing_retrieved()
    print("META RETRIEVAL-COUNT REGRESSION TESTS PASSED")
