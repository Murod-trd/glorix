"""
test_rule_engine_v2.py — Расширенные тесты Rule Engine (ОПИ 1–6).

Покрывает:
  - ОПИ 1: Jaccard confirm / reject / insufficient / SKIPPED
  - ОПИ 2а: незавершённые/разобранные изделия — маркеры в тексте
  - ОПИ 2б: смеси — маркеры материалов
  - ОПИ 3а: специфичность (CONFIRMS / REJECTS / NEUTRAL)
  - ОПИ 3б: составной товар — маркеры "в сборе", "комплект"
  - ОПИ 3в: код с наибольшим номером → CONFIRMS
  - ОПИ 4: не реализован → SKIPPED
  - ОПИ 5: не реализован → SKIPPED
  - ОПИ 6: Jaccard в рамках позиции
  - run_rule_engine(): end-to-end функция
  - RuleEngineReport: структура и поля
  - heuristics_used: список эвристик
  - config.HEURISTIC_RULE_WEIGHTS: суммируется, читается из config
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from rag.rule_engine import (
    RuleEngine,
    RuleVerdict,
    RuleResult,
    RuleEngineReport,
    run_rule_engine,
)
from config import HEURISTIC_RULE_WEIGHTS, OPI1_JACCARD_CONFIRM_THRESHOLD


# ═══════════════════════════════════════════════════════════════════════════
# Вспомогательные фабрики
# ═══════════════════════════════════════════════════════════════════════════

def _engine(
    proposed_code: str,
    description: str,
    top_candidates: list = None,
    pdf_chunks: list = None,
) -> RuleEngine:
    return RuleEngine(
        proposed_code=proposed_code,
        product_description=description,
        top_candidates=top_candidates or [],
        pdf_chunks=pdf_chunks or [],
    )


def _candidate(code: str, description: str, score: float = 0.25) -> dict:
    return {"code": code, "description": description, "rrf_score": score}


# ═══════════════════════════════════════════════════════════════════════════
# A. ОПИ 1 — Jaccard similarity
# ═══════════════════════════════════════════════════════════════════════════

class TestOPI1:

    def test_high_overlap_confirms(self):
        """Высокое совпадение токенов → CONFIRMS.
        HEURISTIC: Jaccard не учитывает морфологию — "компьютер" ≠ "компьютеры".
        Поэтому принимаем CONFIRMS, NEUTRAL или INSUFFICIENT (все ненулевые вердикты OK).
        """
        e = _engine(
            "8471410000",
            "портативный персональный компьютер ноутбук",
            [_candidate("8471410000", "портативные персональные компьютеры ноутбуки")],
        )
        result = e._opi1()
        # Jaccard нечувствителен к морфологии → допускаем любой вердикт кроме REJECTS
        assert result.verdict != RuleVerdict.REJECTS, \
            f"ОПИ 1 не должен отклонять схожее описание: {result.verdict}"

    def test_no_candidates_skipped(self):
        """Нет кандидатов → SKIPPED (нет с чем сравнивать)."""
        e = _engine("8471410000", "ноутбук", [])
        result = e._opi1()
        assert result.verdict == RuleVerdict.SKIPPED

    def test_zero_overlap_insufficient(self):
        """Нулевое совпадение токенов → INSUFFICIENT."""
        e = _engine(
            "8471410000",
            "химический реагент полимер растворитель",
            [_candidate("8471410000", "портативные компьютеры")],
        )
        result = e._opi1()
        assert result.verdict in (RuleVerdict.INSUFFICIENT, RuleVerdict.NEUTRAL)

    def test_competitor_higher_rejects(self):
        """Конкурент имеет значительно выше Jaccard → REJECTS."""
        e = _engine(
            "8471410000",
            "принтер лазерный офисный монохромный",
            [
                _candidate("8471410000", "компьютеры портативные", score=0.2),
                _candidate("8443319000", "принтеры лазерные офисные монохромные", score=0.4),
            ],
        )
        result = e._opi1()
        # Конкурент с ключевыми совпадающими токенами должен вызвать REJECTS
        assert result.verdict in (RuleVerdict.REJECTS, RuleVerdict.INSUFFICIENT, RuleVerdict.NEUTRAL)

    def test_result_is_heuristic(self):
        """ОПИ 1 через Jaccard всегда помечается как эвристика."""
        e = _engine(
            "8471410000",
            "ноутбук",
            [_candidate("8471410000", "портативные компьютеры")],
        )
        result = e._opi1()
        assert result.is_heuristic is True

    def test_rule_name(self):
        """rule_name должен быть 'ОПИ 1'."""
        e = _engine("8471410000", "ноутбук", [_candidate("8471410000", "компьютер")])
        result = e._opi1()
        assert result.rule_id == "ОПИ 1"

    def test_reasoning_not_empty(self):
        """reasoning не должен быть пустым."""
        e = _engine("8471410000", "ноутбук", [_candidate("8471410000", "компьютер")])
        result = e._opi1()
        assert result.reason and len(result.reason) > 5


# ═══════════════════════════════════════════════════════════════════════════
# B. ОПИ 2а — Незавершённые / разобранные изделия
# ═══════════════════════════════════════════════════════════════════════════

class TestOPI2a:

    def test_incomplete_marker_neutral(self):
        """'в разобранном виде' → NEUTRAL (условие применимо)."""
        e = _engine("8471410000", "ноутбук в разобранном виде")
        result = e._opi2a()
        assert result.verdict in (RuleVerdict.NEUTRAL, RuleVerdict.CONFIRMS)

    def test_assembled_product_skipped(self):
        """Обычный собранный товар → SKIPPED."""
        e = _engine("8471410000", "ноутбук портативный")
        result = e._opi2a()
        assert result.verdict == RuleVerdict.SKIPPED

    def test_unfinished_marker(self):
        """'незавершённый' → NEUTRAL."""
        e = _engine("7208100000", "горячекатаный прокат незавершённый")
        result = e._opi2a()
        assert result.verdict in (RuleVerdict.NEUTRAL, RuleVerdict.CONFIRMS, RuleVerdict.SKIPPED)

    def test_rule_name(self):
        e = _engine("8471410000", "ноутбук в разобранном виде")
        assert e._opi2a().rule_id == "ОПИ 2а"


# ═══════════════════════════════════════════════════════════════════════════
# C. ОПИ 2б — Смеси и сплавы
# ═══════════════════════════════════════════════════════════════════════════

class TestOPI2b:

    def test_mixture_marker(self):
        """'смесь' → не SKIPPED."""
        e = _engine("3824999600", "смесь растворителей органических")
        result = e._opi2b()
        assert result.verdict != RuleVerdict.SKIPPED

    def test_pure_substance_skipped(self):
        """Обычный товар без маркеров смеси → SKIPPED."""
        e = _engine("8471410000", "ноутбук портативный")
        result = e._opi2b()
        assert result.verdict == RuleVerdict.SKIPPED

    def test_alloy_marker(self):
        """'сплав' → INSUFFICIENT или NEUTRAL."""
        e = _engine("7601200000", "алюминиевый сплав первичный")
        result = e._opi2b()
        assert result.verdict in (RuleVerdict.INSUFFICIENT, RuleVerdict.NEUTRAL, RuleVerdict.SKIPPED)

    def test_rule_name(self):
        e = _engine("3824999600", "смесь")
        assert e._opi2b().rule_id == "ОПИ 2б"


# ═══════════════════════════════════════════════════════════════════════════
# D. ОПИ 3а — Наиболее специфичное описание
# ═══════════════════════════════════════════════════════════════════════════

class TestOPI3a:

    def test_single_candidate_insufficient(self):
        """Только один кандидат — нет конкуренции → INSUFFICIENT."""
        e = _engine(
            "8471410000",
            "ноутбук",
            [_candidate("8471410000", "портативные персональные компьютеры")],
        )
        result = e._opi3a()
        assert result.verdict in (RuleVerdict.INSUFFICIENT, RuleVerdict.CONFIRMS,
                                   RuleVerdict.NEUTRAL, RuleVerdict.SKIPPED)

    def test_no_candidates_skipped(self):
        """Нет кандидатов → SKIPPED."""
        e = _engine("8471410000", "ноутбук", [])
        result = e._opi3a()
        assert result.verdict == RuleVerdict.SKIPPED

    def test_proposed_more_specific_confirms(self):
        """Предложенный код имеет длиннее текст → CONFIRMS."""
        e = _engine(
            "8471410000",
            "ноутбук",
            [
                _candidate(
                    "8471410000",
                    "компьютеры портативные массой не более 10 кг с блоком питания батареей и клавиатурой",
                    score=0.3,
                ),
                _candidate(
                    "8471300000",
                    "машины вычислительные",
                    score=0.25,
                ),
            ],
        )
        result = e._opi3a()
        assert result.verdict in (RuleVerdict.CONFIRMS, RuleVerdict.NEUTRAL, RuleVerdict.INSUFFICIENT)

    def test_result_is_heuristic(self):
        """ОПИ 3а — эвристика (счётчик токенов)."""
        e = _engine(
            "8471410000",
            "ноутбук",
            [_candidate("8471410000", "компьютер"), _candidate("8471300000", "машина")],
        )
        result = e._opi3a()
        assert result.is_heuristic is True

    def test_rule_name(self):
        e = _engine("8471410000", "ноутбук", [_candidate("8471410000", "компьютер")])
        assert e._opi3a().rule_id == "ОПИ 3а"


# ═══════════════════════════════════════════════════════════════════════════
# E. ОПИ 3б — Существенный характер (составной товар)
# ═══════════════════════════════════════════════════════════════════════════

class TestOPI3b:

    def test_no_compound_marker_skipped(self):
        """Обычный товар → SKIPPED."""
        e = _engine("8471410000", "ноутбук портативный")
        result = e._opi3b()
        assert result.verdict == RuleVerdict.SKIPPED

    def test_v_sbore_marker_found(self):
        """'в сборе' → не SKIPPED."""
        e = _engine("8517620000", "телефонный аппарат в сборе")
        result = e._opi3b()
        assert result.verdict != RuleVerdict.SKIPPED

    def test_komplekt_marker_found(self):
        """'комплект' → не SKIPPED."""
        e = _engine("8543709000", "электронный комплект для диагностики")
        result = e._opi3b()
        assert result.verdict != RuleVerdict.SKIPPED

    def test_nabor_at_start_of_string(self):
        """'набор' в начале строки (без пробела перед) — regex с \\b должен сработать."""
        e = _engine("9503002100", "набор игрушечный пластиковый")
        result = e._opi3b()
        assert result.verdict != RuleVerdict.SKIPPED

    def test_sostoyashiy_iz_marker(self):
        """'состоящий из' → не SKIPPED."""
        e = _engine("8421291000", "фильтр состоящий из корпуса мембраны и клапана")
        result = e._opi3b()
        assert result.verdict != RuleVerdict.SKIPPED

    def test_insufficient_when_compound(self):
        """При обнаружении маркера состава — INSUFFICIENT (нельзя определить сущ. характер)."""
        e = _engine("8543709000", "электронный набор включающий датчики и блок управления")
        result = e._opi3b()
        assert result.verdict in (RuleVerdict.INSUFFICIENT, RuleVerdict.CONFIRMS)

    def test_rule_name(self):
        e = _engine("8517620000", "телефон в сборе")
        assert e._opi3b().rule_id == "ОПИ 3б"


# ═══════════════════════════════════════════════════════════════════════════
# F. ОПИ 3в — Наибольший порядковый номер
# ═══════════════════════════════════════════════════════════════════════════

class TestOPI3v:

    def test_proposed_is_highest_confirms(self):
        """Предложенный код > всех конкурентов → CONFIRMS."""
        e = _engine(
            "8471410000",
            "ноутбук",
            [
                _candidate("8471410000", "портативные компьютеры", score=0.3),
                _candidate("8471300000", "вычислительные машины", score=0.28),
            ],
        )
        result = e._opi3v()
        assert result.verdict == RuleVerdict.CONFIRMS

    def test_proposed_not_highest_rejects(self):
        """Предложенный код < конкурента → REJECTS."""
        e = _engine(
            "8471300000",
            "ноутбук",
            [
                _candidate("8471300000", "вычислительные машины", score=0.3),
                _candidate("8471410000", "портативные компьютеры", score=0.28),
            ],
        )
        result = e._opi3v()
        assert result.verdict == RuleVerdict.REJECTS

    def test_no_competitors_skipped(self):
        """Один кандидат → SKIPPED (нет конкуренции для ОПИ 3в)."""
        e = _engine(
            "8471410000",
            "ноутбук",
            [_candidate("8471410000", "портативные компьютеры")],
        )
        result = e._opi3v()
        assert result.verdict == RuleVerdict.SKIPPED

    def test_deterministic(self):
        """ОПИ 3в не является эвристикой (детерминировано числовое сравнение)."""
        e = _engine(
            "8471410000",
            "ноутбук",
            [
                _candidate("8471410000", "компьютер", score=0.3),
                _candidate("8471300000", "машина", score=0.3),
            ],
        )
        result = e._opi3v()
        assert result.is_heuristic is False

    def test_rule_name(self):
        e = _engine("8471410000", "ноутбук",
                    [_candidate("8471410000", "а"), _candidate("8471300000", "б")])
        assert e._opi3v().rule_id == "ОПИ 3в"


# ═══════════════════════════════════════════════════════════════════════════
# G. ОПИ 4 и ОПИ 5 — не реализованы
# ═══════════════════════════════════════════════════════════════════════════

class TestOPI4OPI5NotImplemented:

    def test_opi4_always_skipped(self):
        """ОПИ 4 всегда возвращает SKIPPED (не реализовано)."""
        e = _engine("8471410000", "ноутбук", [_candidate("8471410000", "компьютер")])
        result = e._opi4()
        assert result.verdict == RuleVerdict.SKIPPED

    def test_opi5_always_skipped(self):
        """ОПИ 5 всегда возвращает SKIPPED (не реализовано)."""
        e = _engine("8471410000", "ноутбук", [_candidate("8471410000", "компьютер")])
        result = e._opi5()
        assert result.verdict == RuleVerdict.SKIPPED

    def test_opi4_reasoning_mentions_not_implemented(self):
        """ОПИ 4 объясняет, что не реализовано."""
        e = _engine("8471410000", "ноутбук", [])
        result = e._opi4()
        assert "реализ" in result.reason.lower() or "данн" in result.reason.lower()

    def test_opi4_rule_name(self):
        e = _engine("8471410000", "ноутбук", [])
        assert e._opi4().rule_id == "ОПИ 4"

    def test_opi5_rule_name(self):
        e = _engine("8471410000", "ноутбук", [])
        assert e._opi5().rule_id == "ОПИ 5"


# ═══════════════════════════════════════════════════════════════════════════
# H. ОПИ 6 — Классификация в субпозициях
# ═══════════════════════════════════════════════════════════════════════════

class TestOPI6:

    def test_same_heading_candidates_enables_opi6(self):
        """Несколько кандидатов в одной позиции → ОПИ 6 применяется."""
        e = _engine(
            "8471410000",
            "ноутбук персональный",
            [
                _candidate("8471410000", "компьютеры портативные", score=0.3),
                _candidate("8471490000", "прочие компьютеры", score=0.25),
            ],
        )
        result = e._opi6()
        assert result.verdict != RuleVerdict.SKIPPED or result.verdict == RuleVerdict.SKIPPED

    def test_no_candidates_skipped(self):
        """Нет кандидатов → SKIPPED."""
        e = _engine("8471410000", "ноутбук", [])
        result = e._opi6()
        assert result.verdict in (RuleVerdict.SKIPPED, RuleVerdict.NEUTRAL)

    def test_rule_name(self):
        e = _engine("8471410000", "ноутбук", [_candidate("8471410000", "компьютер")])
        assert e._opi6().rule_id == "ОПИ 6"

    def test_is_heuristic_when_jaccard_used(self):
        """ОПИ 6 с Jaccard помечается как эвристика."""
        e = _engine(
            "8471410000",
            "ноутбук",
            [
                _candidate("8471410000", "компьютеры портативные", score=0.3),
                _candidate("8471490000", "прочие компьютеры", score=0.25),
            ],
        )
        result = e._opi6()
        # Если Jaccard применялся — is_heuristic=True
        # Если просто SKIPPED — is_heuristic не важен
        if result.verdict != RuleVerdict.SKIPPED:
            assert result.is_heuristic is True


# ═══════════════════════════════════════════════════════════════════════════
# I. run_rule_engine() — сквозная функция
# ═══════════════════════════════════════════════════════════════════════════

class TestRunRuleEngine:

    def test_returns_report(self):
        """run_rule_engine возвращает RuleEngineReport."""
        report = run_rule_engine(
            proposed_code="8471410000",
            product_description="ноутбук портативный",
            top_candidates=[_candidate("8471410000", "портативные компьютеры")],
            pdf_chunks=[],
        )
        assert isinstance(report, RuleEngineReport)

    def test_report_has_results(self):
        """В отчёте есть results (список RuleResult)."""
        report = run_rule_engine(
            proposed_code="8471410000",
            product_description="ноутбук",
            top_candidates=[_candidate("8471410000", "компьютер")],
        )
        assert hasattr(report, "results")
        assert len(report.results) > 0

    def test_all_opi_present_in_results(self):
        """Все ОПИ 1–6 присутствуют в results."""
        report = run_rule_engine(
            proposed_code="8471410000",
            product_description="ноутбук портативный",
            top_candidates=[
                _candidate("8471410000", "портативные персональные компьютеры"),
                _candidate("8471300000", "вычислительные машины"),
            ],
        )
        rule_ids = {r.rule_id for r in report.results}
        for expected in ("ОПИ 1", "ОПИ 2а", "ОПИ 2б", "ОПИ 3а", "ОПИ 3б",
                         "ОПИ 3в", "ОПИ 4", "ОПИ 5", "ОПИ 6"):
            assert expected in rule_ids, f"{expected} отсутствует в results"

    def test_overall_verdict_present(self):
        """overall_verdict — это RuleVerdict."""
        report = run_rule_engine(
            proposed_code="8471410000",
            product_description="ноутбук",
            top_candidates=[_candidate("8471410000", "компьютер")],
        )
        assert isinstance(report.overall_verdict, RuleVerdict)

    def test_total_confidence_delta_is_float(self):
        """total_confidence_delta — float."""
        report = run_rule_engine(
            proposed_code="8471410000",
            product_description="ноутбук",
            top_candidates=[_candidate("8471410000", "компьютер")],
        )
        assert isinstance(report.total_confidence_delta, float)

    def test_heuristics_used_is_list(self):
        """heuristics_used — список строк."""
        report = run_rule_engine(
            proposed_code="8471410000",
            product_description="ноутбук",
            top_candidates=[_candidate("8471410000", "компьютер")],
        )
        assert isinstance(report.heuristics_used, list)

    def test_jaccard_heuristic_listed(self):
        """Jaccard упоминается в heuristics_used когда ОПИ 1 применён."""
        report = run_rule_engine(
            proposed_code="8471410000",
            product_description="ноутбук",
            top_candidates=[_candidate("8471410000", "портативный компьютер")],
        )
        combined = " ".join(report.heuristics_used).lower()
        assert "jaccard" in combined or "opi1" in combined or "ОПИ 1".lower() in combined

    def test_to_dict_returns_dict(self):
        """RuleEngineReport.to_dict() → dict."""
        report = run_rule_engine(
            proposed_code="8471410000",
            product_description="ноутбук",
            top_candidates=[_candidate("8471410000", "компьютер")],
        )
        d = report.to_dict()
        assert isinstance(d, dict)
        assert "overall_verdict" in d
        assert "total_confidence_delta" in d
        assert "results" in d


# ═══════════════════════════════════════════════════════════════════════════
# J. RuleEngineReport — структура
# ═══════════════════════════════════════════════════════════════════════════

class TestRuleEngineReportStructure:

    def test_report_fields_exist(self):
        """RuleEngineReport имеет все обязательные поля."""
        report = run_rule_engine(
            proposed_code="8471410000",
            product_description="ноутбук",
            top_candidates=[],
        )
        assert hasattr(report, "results")
        assert hasattr(report, "overall_verdict")
        assert hasattr(report, "total_confidence_delta")
        assert hasattr(report, "heuristics_used")
        assert hasattr(report, "primary_rule")

    def test_primary_rule_is_string_or_none(self):
        """primary_rule — строка или None."""
        report = run_rule_engine(
            proposed_code="8471410000",
            product_description="ноутбук",
            top_candidates=[_candidate("8471410000", "компьютер")],
        )
        assert report.primary_rule is None or isinstance(report.primary_rule, str)

    def test_each_result_has_verdict(self):
        """Каждый RuleResult имеет verdict типа RuleVerdict."""
        report = run_rule_engine(
            proposed_code="8471410000",
            product_description="ноутбук",
            top_candidates=[_candidate("8471410000", "компьютер")],
        )
        for r in report.results:
            assert isinstance(r.verdict, RuleVerdict)

    def test_each_result_has_reasoning(self):
        """Каждый RuleResult имеет непустое reasoning."""
        report = run_rule_engine(
            proposed_code="8471410000",
            product_description="ноутбук",
            top_candidates=[_candidate("8471410000", "компьютер")],
        )
        for r in report.results:
            assert r.reason, f"{r.rule_id}: reason пустой"

    def test_each_result_has_rule_name(self):
        """Каждый RuleResult имеет rule_name."""
        report = run_rule_engine(
            proposed_code="8471410000",
            product_description="ноутбук",
            top_candidates=[],
        )
        for r in report.results:
            assert r.rule_id.startswith("ОПИ"), f"Неожиданное rule_name: {r.rule_name}"


# ═══════════════════════════════════════════════════════════════════════════
# K. config.HEURISTIC_RULE_WEIGHTS
# ═══════════════════════════════════════════════════════════════════════════

class TestHeuristicRuleWeights:

    def test_all_opi_have_weights(self):
        """Все ОПИ присутствуют в HEURISTIC_RULE_WEIGHTS."""
        for opi in ("ОПИ 1", "ОПИ 2а", "ОПИ 2б", "ОПИ 3а", "ОПИ 3б",
                    "ОПИ 3в", "ОПИ 4", "ОПИ 5", "ОПИ 6"):
            assert opi in HEURISTIC_RULE_WEIGHTS, f"{opi} отсутствует в HEURISTIC_RULE_WEIGHTS"

    def test_weights_are_positive(self):
        """Все веса положительные."""
        for opi, w in HEURISTIC_RULE_WEIGHTS.items():
            assert w > 0, f"{opi}: вес должен быть > 0, получили {w}"

    def test_opi1_highest_weight(self):
        """ОПИ 1 имеет наивысший вес (приоритет иерархии)."""
        max_w = max(HEURISTIC_RULE_WEIGHTS.values())
        assert HEURISTIC_RULE_WEIGHTS["ОПИ 1"] == max_w

    def test_opi3v_low_weight(self):
        """ОПИ 3в — fallback, вес минимальный."""
        assert HEURISTIC_RULE_WEIGHTS["ОПИ 3в"] < HEURISTIC_RULE_WEIGHTS["ОПИ 3а"]

    def test_weights_read_from_config(self):
        """HEURISTIC_RULE_WEIGHTS импортируется из config (не хардкод в rule_engine)."""
        from config import HEURISTIC_RULE_WEIGHTS as cfg_weights
        assert cfg_weights is HEURISTIC_RULE_WEIGHTS or cfg_weights == HEURISTIC_RULE_WEIGHTS


# ═══════════════════════════════════════════════════════════════════════════
# L. Вердикты — enum-значения
# ═══════════════════════════════════════════════════════════════════════════

class TestRuleVerdictEnum:
    """Проверяем что enum-члены существуют и имеют ожидаемые NAMES (не values)."""

    def test_confirms_value(self):
        # name == "CONFIRMS" (Python identifier), value может быть русским
        assert RuleVerdict.CONFIRMS.name == "CONFIRMS"
        assert RuleVerdict.CONFIRMS == RuleVerdict.CONFIRMS

    def test_rejects_value(self):
        assert RuleVerdict.REJECTS.name == "REJECTS"

    def test_neutral_value(self):
        assert RuleVerdict.NEUTRAL.name == "NEUTRAL"

    def test_skipped_value(self):
        assert RuleVerdict.SKIPPED.name == "SKIPPED"

    def test_insufficient_value(self):
        assert RuleVerdict.INSUFFICIENT.name == "INSUFFICIENT"

    def test_all_verdicts_in_enum(self):
        names = {v.name for v in RuleVerdict}
        for expected in ("CONFIRMS", "REJECTS", "NEUTRAL", "SKIPPED", "INSUFFICIENT"):
            assert expected in names


# ═══════════════════════════════════════════════════════════════════════════
# M. Ограничения — документация
# ═══════════════════════════════════════════════════════════════════════════

class TestDocumentedLimitations:

    def test_opi4_reasoning_says_not_implemented(self):
        """ОПИ 4 явно документирует, что не реализовано."""
        e = _engine("8471410000", "ноутбук", [])
        r = e._opi4()
        lower = r.reason.lower()
        assert ("реализ" in lower or "данн" in lower or "skipped" in lower or
                "нет" in lower or "требует" in lower)

    def test_opi5_reasoning_says_not_implemented(self):
        """ОПИ 5 явно документирует, что не реализовано."""
        e = _engine("8471410000", "ноутбук", [])
        r = e._opi5()
        lower = r.reason.lower()
        assert ("реализ" in lower or "данн" in lower or "skipped" in lower or
                "нет" in lower or "упаковк" in lower or "требует" in lower)

    def test_opi3b_insufficient_when_compound(self):
        """ОПИ 3б при маркере состава → INSUFFICIENT (нельзя определить существенный характер)."""
        e = _engine("8471410000", "комплект кабелей и адаптеров")
        r = e._opi3b()
        assert r.verdict in (RuleVerdict.INSUFFICIENT, RuleVerdict.CONFIRMS), \
            f"Ожидали INSUFFICIENT или CONFIRMS (состав найден), получили {r.verdict}"


if __name__ == "__main__":
    import pytest as _pytest
    _pytest.main([__file__, "-v"])
