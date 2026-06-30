"""
opi_checker.py v6 — DEPRECATED. Stub-заглушка.

ИСТОРИЯ:
  v1-v4: содержал OPI-логику (Jaccard similarity, специфичность).
  v5+:   полностью заменён модулем rule_engine.py.

ПРИЧИНА ЗАМЕНЫ:
  - opi_checker дублировал логику rule_engine
  - двойное усреднение результатов OPI давало артефакты
  - rule_engine.py реализует ОПИ 1-6 с явными вердиктами,
    маркировкой эвристик и полным журналом (heuristics_used)

ТЕКУЩИЙ СТАТУС:
  Stub для обратной совместимости. Функции возвращают пустые структуры
  и выдают DeprecationWarning. В pipeline (classifier.py v5+) НЕ используется.

УДАЛЕНИЕ:
  Планируется в v7 после подтверждения отсутствия внешних зависимостей.
"""

import warnings
import logging

logger = logging.getLogger(__name__)


# ── Stub-типы ──────────────────────────────────────────────────────────────

class OPIReport:
    """DEPRECATED stub. Используйте RuleEngineReport из rule_engine.py."""

    def __init__(self, *args, **kwargs):
        warnings.warn(
            "OPIReport из opi_checker.py устарел. "
            "Используйте RuleEngineReport из rag.rule_engine.",
            DeprecationWarning,
            stacklevel=2,
        )
        self.rules_applied: list = []
        self.overall_verdict: str = "DEPRECATED"
        self.confidence_delta: float = 0.0
        self.heuristics_used: list = []

    def to_dict(self) -> dict:
        return {
            "deprecated": True,
            "message": "Используйте rule_engine.RuleEngineReport",
        }


# Алиас для обратной совместимости с кодом v3-v4
FullOPIReport = OPIReport


# ── Stub-функции ──────────────────────────────────────────────────────────

def run_opi_checks(
    proposed_code: str,
    product_description: str,
    top_candidates: list,
    pdf_chunks: list = None,
) -> OPIReport:
    """
    DEPRECATED. Stub — не выполняет никаких проверок.

    Замена: используйте run_rule_engine() из rag.rule_engine.
    """
    warnings.warn(
        "run_opi_checks() из opi_checker.py устарел и не выполняет проверок. "
        "Используйте run_rule_engine() из rag.rule_engine.",
        DeprecationWarning,
        stacklevel=2,
    )
    logger.warning(
        "DEPRECATED: run_opi_checks() вызван. "
        "Замените на run_rule_engine() из rule_engine.py."
    )
    return OPIReport()
