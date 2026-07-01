"""
Regression test for build_refusal_questions() accepting BOTH dict candidates and
CandidateAnalysis/dataclass-like candidates (crash fix: 'X object has no attribute get').
Crash-fix only — does not assert classification quality.
"""
import sys
import os
from dataclasses import dataclass

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from rag.evidence_builder import build_refusal_questions, Evidence


def test_refusal_questions_with_dict_candidates():
    ev = Evidence(proposed_code="7307930000",
                  insufficiency_reasons=["Excel: точная позиция не найдена",
                                         "PDF: нет документального подтверждения"])
    cands = [
        {"code": "7307930000", "chapter": "73", "description": "Отвод стальной"},
        {"code": "3917400000", "chapter": "39", "description": "Фитинг пластиковый"},
    ]
    out = build_refusal_questions(ev, cands, "sample product description")
    assert isinstance(out, list)
    assert all(isinstance(q, str) for q in out)


def test_refusal_questions_with_object_candidates():
    @dataclass
    class Cand:
        code: str
        chapter: str
        description: str = ""

    cands = [Cand(code="7307930000", chapter="73"),
             Cand(code="3917400000", chapter="39")]
    ev = Evidence(proposed_code="7307930000")
    # Must NOT raise AttributeError.
    out = build_refusal_questions(ev, cands, "sample product description")
    assert isinstance(out, list)


def test_refusal_questions_object_without_chapter_uses_code_prefix():
    @dataclass
    class Cand:
        code: str
        chapter: str = ""   # empty chapter -> fallback to code[:2]

    ev = Evidence(proposed_code="8481804000")
    out = build_refusal_questions(ev, [Cand(code="7307930000")], "товар без материала")
    assert isinstance(out, list)


if __name__ == "__main__":
    test_refusal_questions_with_dict_candidates()
    test_refusal_questions_with_object_candidates()
    test_refusal_questions_object_without_chapter_uses_code_prefix()
    print("ALL REFUSAL-QUESTION REGRESSION TESTS PASSED")
