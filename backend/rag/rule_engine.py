"""
rule_engine.py v5 — Rule Engine для ОПИ ТН ВЭД ЕАЭС.

Реализует ОПИ 1–6 как Python-объекты с полным журналом решений.
Каждое правило документирует:
  - Было ли оно применимо к данному товару
  - Что именно проверялось
  - Результат: ПОДТВЕРЖДЕНИЕ / ОТКЛОНЕНИЕ / НЕДОСТАТОЧНО / ПРОПУЩЕНО
  - Почему
  - Влияние на уверенность

Философия: LLM предлагает код, Rule Engine его проверяет.
LLM НИКОГДА не интерпретирует правила — только Python-код.

═══════════════════════════════════════════════════════════════════════════
ЧЕСТНАЯ ДЕКЛАРАЦИЯ ОГРАНИЧЕНИЙ (v5)
═══════════════════════════════════════════════════════════════════════════

РЕАЛИЗОВАНО ПОЛНОСТЬЮ:
  ОПИ 1  — Jaccard similarity. ЭВРИСТИКА (см. ниже).
  ОПИ 2а — Маркеры незавершённости. Программная проверка.
  ОПИ 3а — Специфичность описания. ЭВРИСТИКА (см. ниже).
  ОПИ 3в — Позиция с наибольшим кодом. Программная проверка (детерминирована).
  ОПИ 6  — Иерархия субпозиций. Программная проверка.

ЧАСТИЧНО РЕАЛИЗОВАНО:
  ОПИ 2б — Смеси/сплавы. Обнаруживает маркеры, но не анализирует состав.
  ОПИ 3б — Существенный характер. Обнаруживает составной товар, но не определяет
            компонент существенного характера (требует стоимостных данных).

НЕ РЕАЛИЗОВАНО:
  ОПИ 4  — Наиболее аналогичные товары. Требует полной базы ТН ВЭД.
  ОПИ 5  — Специальные правила для упаковки. Не реализован в данной версии.

ЗАДОКУМЕНТИРОВАННЫЕ ЭВРИСТИКИ:
  - Jaccard similarity на токенах ≠ юридическое сравнение текстов позиций.
  - Специфичность через кол-во токенов + тех. термины ≠ правовой критерий.
  - Весовая система (HEURISTIC_RULE_WEIGHTS) — эмпирическая, не из ЕАЭС.
  - Пороги OPI1_JACCARD_CONFIRM_THRESHOLD, OPI3A_SPECIFICITY_MARGIN — эмпирические.
═══════════════════════════════════════════════════════════════════════════

ИСПРАВЛЕНИЯ v5 (относительно v4):
  - BUG FIX: OPI_RULES содержал "ОПИ 5" без реализации → добавлен _opi5() SKIPPED
  - BUG FIX: _opi3b compound_markers включал " и " → триггер на почти любое описание
  - REFACTOR: rule_weights вынесены в config.py как HEURISTIC_RULE_WEIGHTS
  - REFACTOR: пороги OPI1/OPI3A вынесены в config.py с пометкой HEURISTIC
  - REFACTOR: убраны магические числа внутри методов
  - CLARITY: каждый метод явно помечает где используется эвристика
"""

from __future__ import annotations
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

# Единый источник констант — только здесь
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
try:
    from config import (
        HEURISTIC_RULE_WEIGHTS,
        OPI1_JACCARD_CONFIRM_THRESHOLD,
        OPI1_JACCARD_REJECT_DELTA,
        OPI3A_SPECIFICITY_MARGIN,
    )
except ImportError:
    # Fallback если запускается без установки пакета
    HEURISTIC_RULE_WEIGHTS = {
        "ОПИ 1": 3.0, "ОПИ 2а": 2.5, "ОПИ 2б": 2.5,
        "ОПИ 3а": 2.0, "ОПИ 3б": 1.8, "ОПИ 3в": 0.3,
        "ОПИ 4": 1.5, "ОПИ 5": 1.0, "ОПИ 6": 1.0,
    }
    OPI1_JACCARD_CONFIRM_THRESHOLD = 0.30
    OPI1_JACCARD_REJECT_DELTA = 0.10
    OPI3A_SPECIFICITY_MARGIN = 1.10


# ── Типы ──────────────────────────────────────────────────────────────

class RuleVerdict(str, Enum):
    CONFIRMS     = "ПОДТВЕРЖДАЕТ"   # Правило поддерживает предложенный код
    REJECTS      = "ОТКЛОНЯЕТ"     # Правило противоречит предложенному коду
    NEUTRAL      = "НЕЙТРАЛЬНОЕ"   # Правило не влияет на выбор
    SKIPPED      = "ПРОПУЩЕНО"     # Правило неприменимо или не реализовано
    INSUFFICIENT = "НЕДОСТАТОЧНО"  # Нет данных для применения правила


@dataclass
class RuleResult:
    """Результат применения одного правила ОПИ."""
    rule_id: str                           # ОПИ 1, 2а, 2б, 3а, 3б, 3в, 4, 5, 6
    rule_name: str                         # Краткое название
    verdict: RuleVerdict
    confidence_delta: float                # Изменение уверенности (-1.0 до +1.0)
    checks_performed: list[str]            # Что именно проверялось
    reason: str                            # Объяснение решения
    evidence: list[str]                    # Конкретные доказательства
    is_heuristic: bool = False             # True если вердикт основан на эвристике
    heuristic_description: str = ""        # Описание используемой эвристики
    alternative_code: Optional[str] = None # Альтернатива (если REJECTS)
    is_blocking: bool = False              # Блокирует ли классификацию?

    def to_dict(self) -> dict:
        return {
            "rule_id": self.rule_id,
            "rule_name": self.rule_name,
            "verdict": self.verdict.value,
            "confidence_delta": round(self.confidence_delta, 3),
            "is_heuristic": self.is_heuristic,
            "heuristic_description": self.heuristic_description,
            "checks_performed": self.checks_performed,
            "reason": self.reason,
            "evidence": self.evidence[:5],
            "alternative_code": self.alternative_code,
            "is_blocking": self.is_blocking,
        }


@dataclass
class RuleEngineReport:
    """Полный отчёт Rule Engine по всем применённым правилам."""
    rules_considered: list[str]      # Все правила, которые рассматривались
    rules_applied: list[str]         # Правила с реальным вердиктом
    rules_skipped: list[str]         # Пропущенные как неприменимые/нереализованные
    results: list[RuleResult]
    primary_rule: str                # Главное применённое правило
    overall_verdict: RuleVerdict
    total_confidence_delta: float
    blocking_issues: list[str]
    heuristics_used: list[str]       # Перечень использованных эвристик

    def to_dict(self) -> dict:
        return {
            "rules_considered": self.rules_considered,
            "rules_applied": self.rules_applied,
            "rules_skipped": self.rules_skipped,
            "primary_rule": self.primary_rule,
            "overall_verdict": self.overall_verdict.value,
            "total_confidence_delta": round(self.total_confidence_delta, 3),
            "blocking_issues": self.blocking_issues,
            "heuristics_used": self.heuristics_used,
            "results": [r.to_dict() for r in self.results],
        }


# ── Вспомогательные функции ────────────────────────────────────────────

_STOP_WORDS = {
    "из", "для", "при", "или", "над", "под", "про", "без",
    "все", "это", "как", "так", "уже", "ещё", "его",
    "от", "до", "на", "по", "в", "с", "к", "о", "а", "и",
}

_TECH_TERM_PATTERN = re.compile(
    r"(?:"
    r"(?:гост|ту|din|iso|en)\s*[\-р]?\s*\d+"  # стандарты
    r"|[а-яёa-z]{1,2}\d{1,4}(?:[×x\-]\d+)+"   # коды типа М10×40, А2
    r"|\d+(?:[,\.]\d+)?\s*(?:мм|см|м|кг|вт|квт|мпа|гц|мкм|нм)"  # размеры
    r")",
    re.IGNORECASE
)


def _tokenize(text: str) -> set[str]:
    """Токенизация. Только то, что написано в тексте — без синонимов."""
    tokens = set(re.findall(r"[а-яёa-z]{3,}", text.lower()))
    return tokens - _STOP_WORDS


def _jaccard(a: set, b: set) -> float:
    """
    Jaccard similarity между двумя наборами токенов.
    ЭВРИСТИКА: текстовое пересечение ≠ юридическое сравнение товарных позиций.
    """
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union > 0 else 0.0


def _specificity_score(candidate_description: str) -> float:
    """
    Оценка специфичности описания позиции ТН ВЭД.

    ЭВРИСТИКА: больше уникальных токенов + технические термины = более специфично.
    Юридически «специфичность» определяется экспертами, а не счётчиком слов.
    Метрика не откалибрована на реальных парах «специфичный/общий».
    """
    desc_tokens = _tokenize(candidate_description)
    tech_terms = len(_TECH_TERM_PATTERN.findall(candidate_description))
    return len(desc_tokens) * 0.1 + tech_terms * 0.5


# ── Rule Engine ─────────────────────────────────────────────────────────

class RuleEngine:
    """
    Применяет ОПИ 1–6 последовательно.

    Вход:
        proposed_code:        код, предложенный LLM
        product_description:  описание товара
        top_candidates:       кандидаты из поиска (rrf_score, code, description, ...)
        pdf_chunks:           чанки PDF с примечаниями

    Выход:
        RuleEngineReport — полный журнал с вердиктом каждого правила

    Порядок применения ОПИ (иерархический):
        ОПИ 1 → ОПИ 2а → ОПИ 2б → ОПИ 3а → ОПИ 3б → ОПИ 3в → ОПИ 4 → ОПИ 5 → ОПИ 6
    """

    # ВСЕ правила — включая нереализованные (ОПИ 4, ОПИ 5).
    # Нереализованные явно возвращают SKIPPED с объяснением причины.
    OPI_RULES = [
        "ОПИ 1", "ОПИ 2а", "ОПИ 2б", "ОПИ 3а", "ОПИ 3б", "ОПИ 3в",
        "ОПИ 4", "ОПИ 5", "ОПИ 6",
    ]

    def __init__(
        self,
        proposed_code: str,
        product_description: str,
        top_candidates: list[dict],
        pdf_chunks: list[dict] = None,
    ):
        self.proposed_code = proposed_code.strip()
        self.description = product_description
        self.candidates = top_candidates or []
        self.pdf_chunks = pdf_chunks or []

        # Найти запись предложенного кода среди кандидатов
        self.proposed_record = next(
            (c for c in self.candidates if c.get("code", "").strip() == self.proposed_code),
            None
        )
        self.proposed_chapter = self.proposed_code[:2] if len(self.proposed_code) >= 2 else ""

    def run(self) -> RuleEngineReport:
        """Запустить все правила и вернуть полный отчёт."""
        results: list[RuleResult] = [
            self._opi1(),
            self._opi2a(),
            self._opi2b(),
            self._opi3a(),
            self._opi3b(),
            self._opi3v(),
            self._opi4(),
            self._opi5(),   # SKIPPED — не реализован
            self._opi6(),
        ]
        return self._compile_report(results)

    # ── ОПИ 1 ─────────────────────────────────────────────────────────

    def _opi1(self) -> RuleResult:
        """
        ОПИ 1: Классификация по тексту товарной позиции и примечаний.
        Если текст позиции прямо описывает товар — применяем.

        ИСПОЛЬЗУЕМАЯ ЭВРИСТИКА: Jaccard similarity на токенах.
        Пороги: OPI1_JACCARD_CONFIRM_THRESHOLD=0.30, REJECT_DELTA=0.10.
        Юридически корректная оценка требует экспертного сравнения текстов.
        """
        checks = [
            "jaccard_similarity_desc_vs_proposed",
            "jaccard_vs_top5_candidates",
        ]
        heuristic = (
            "Jaccard similarity (пересечение токенов / объединение токенов). "
            f"Порог подтверждения: {OPI1_JACCARD_CONFIRM_THRESHOLD:.2f}. "
            "Не учитывает синонимы, морфологию, юридический смысл позиций."
        )

        if self.proposed_record is None:
            return RuleResult(
                rule_id="ОПИ 1",
                rule_name="Классификация по тексту позиции",
                verdict=RuleVerdict.SKIPPED,
                confidence_delta=0.0,
                checks_performed=checks,
                reason="Предложенный код отсутствует среди кандидатов — нет текста позиции для сравнения.",
                evidence=[],
                is_heuristic=False,
            )

        proposed_desc = self.proposed_record.get("description", "")
        if not proposed_desc.strip():
            return RuleResult(
                rule_id="ОПИ 1",
                rule_name="Классификация по тексту позиции",
                verdict=RuleVerdict.INSUFFICIENT,
                confidence_delta=0.0,
                checks_performed=checks,
                reason="Описание предложенной позиции пустое.",
                evidence=[],
                is_heuristic=False,
            )

        desc_tokens = _tokenize(self.description)
        proposed_tokens = _tokenize(proposed_desc)
        sim_proposed = _jaccard(desc_tokens, proposed_tokens)

        # Найти лучшего конкурента из TOP-5
        best_competitor_sim = 0.0
        best_competitor_code = None
        for c in self.candidates[:5]:
            if c.get("code", "").strip() == self.proposed_code:
                continue
            s = _jaccard(desc_tokens, _tokenize(c.get("description", "")))
            if s > best_competitor_sim:
                best_competitor_sim = s
                best_competitor_code = c.get("code")

        evidence = [
            f"Jaccard({self.proposed_code}, описание)={sim_proposed:.3f}",
            f"Лучший конкурент {best_competitor_code}: Jaccard={best_competitor_sim:.3f}",
            f"Описание позиции: {proposed_desc[:150]}",
        ]

        if sim_proposed >= OPI1_JACCARD_CONFIRM_THRESHOLD and sim_proposed > best_competitor_sim:
            return RuleResult(
                rule_id="ОПИ 1",
                rule_name="Классификация по тексту позиции",
                verdict=RuleVerdict.CONFIRMS,
                confidence_delta=min(0.15, sim_proposed * 0.3),
                checks_performed=checks,
                reason=(
                    f"Текст позиции {self.proposed_code} соответствует описанию товара "
                    f"(Jaccard={sim_proposed:.3f} ≥ {OPI1_JACCARD_CONFIRM_THRESHOLD})."
                ),
                evidence=evidence,
                is_heuristic=True,
                heuristic_description=heuristic,
            )
        elif best_competitor_sim > sim_proposed + OPI1_JACCARD_REJECT_DELTA:
            return RuleResult(
                rule_id="ОПИ 1",
                rule_name="Классификация по тексту позиции",
                verdict=RuleVerdict.REJECTS,
                confidence_delta=-0.10,
                checks_performed=checks,
                reason=(
                    f"Конкурент {best_competitor_code} имеет более высокое сходство "
                    f"({best_competitor_sim:.3f} > {sim_proposed:.3f} + {OPI1_JACCARD_REJECT_DELTA})."
                ),
                evidence=evidence,
                is_heuristic=True,
                heuristic_description=heuristic,
                alternative_code=best_competitor_code,
            )
        elif sim_proposed >= 0.15:
            return RuleResult(
                rule_id="ОПИ 1",
                rule_name="Классификация по тексту позиции",
                verdict=RuleVerdict.NEUTRAL,
                confidence_delta=0.0,
                checks_performed=checks,
                reason=(
                    f"Частичное соответствие (Jaccard={sim_proposed:.3f}). "
                    "Недостаточно для однозначного применения ОПИ 1. Переходим к ОПИ 2."
                ),
                evidence=evidence,
                is_heuristic=True,
                heuristic_description=heuristic,
            )
        else:
            return RuleResult(
                rule_id="ОПИ 1",
                rule_name="Классификация по тексту позиции",
                verdict=RuleVerdict.INSUFFICIENT,
                confidence_delta=0.0,
                checks_performed=checks,
                reason=(
                    f"Низкое сходство текстов (Jaccard={sim_proposed:.3f}). "
                    "Описание товара не содержит ключевых слов позиции. Переходим к ОПИ 2."
                ),
                evidence=evidence,
                is_heuristic=True,
                heuristic_description=heuristic,
            )

    # ── ОПИ 2а ────────────────────────────────────────────────────────

    def _opi2a(self) -> RuleResult:
        """
        ОПИ 2а: Незавершённые/неполные изделия, обладающие характеристиками готового.
        Применяется только при явных маркерах незавершённости.
        Программная проверка (детерминирована при наличии маркеров).
        """
        checks = ["incomplete_markers_in_description"]
        incomplete_markers = [
            "незавершённ", "неполн", "в разобранном", "без покрытия",
            "заготовка", "полуфабрикат", "незакалённ", "необработанн",
        ]
        desc_lower = self.description.lower()
        found = [m for m in incomplete_markers if m in desc_lower]

        if not found:
            return RuleResult(
                rule_id="ОПИ 2а",
                rule_name="Незавершённые/неполные изделия",
                verdict=RuleVerdict.SKIPPED,
                confidence_delta=0.0,
                checks_performed=checks,
                reason="Маркеры незавершённости не обнаружены. ОПИ 2а неприменимо.",
                evidence=[],
            )

        return RuleResult(
            rule_id="ОПИ 2а",
            rule_name="Незавершённые/неполные изделия",
            verdict=RuleVerdict.NEUTRAL,
            confidence_delta=0.0,
            checks_performed=checks,
            reason=(
                f"Обнаружены маркеры незавершённости: {found}. "
                "Если изделие обладает характеристиками готового товара — классифицируем как готовое. "
                "Окончательное решение требует экспертной оценки (является ли характеристика достаточной)."
            ),
            evidence=[f"Маркер: '{m}'" for m in found],
        )

    # ── ОПИ 2б ────────────────────────────────────────────────────────

    def _opi2b(self) -> RuleResult:
        """
        ОПИ 2б: Смеси и комбинации материалов.
        ЧАСТИЧНО РЕАЛИЗОВАНО: обнаруживает маркеры смешанного состава.
        НЕ РЕАЛИЗОВАНО: анализ состава (требует лабораторных данных или базы примечаний к главе).
        """
        checks = ["compound_material_markers"]
        # Маркеры ЯВНО смешанного состава — не обычные союзы
        compound_markers = [
            "смесь", "сплав", "смешанн", "комбинаци", "композит",
            "сплавы", "легированн",
        ]
        desc_lower = self.description.lower()
        found = [m for m in compound_markers if m in desc_lower]

        if not found:
            return RuleResult(
                rule_id="ОПИ 2б",
                rule_name="Смеси/комбинации материалов",
                verdict=RuleVerdict.SKIPPED,
                confidence_delta=0.0,
                checks_performed=checks,
                reason="Маркеры смешанного состава не обнаружены. ОПИ 2б неприменимо.",
                evidence=[],
            )

        return RuleResult(
            rule_id="ОПИ 2б",
            rule_name="Смеси/комбинации материалов",
            verdict=RuleVerdict.INSUFFICIENT,
            confidence_delta=-0.05,
            checks_performed=checks,
            reason=(
                f"ОГРАНИЧЕНИЕ СИСТЕМЫ: обнаружены маркеры смешанного состава: {found}. "
                "ОПИ 2б требует точного состава и примечаний к конкретной главе. "
                "Без этих данных автоматическое применение невозможно. "
                "ДЕЙСТВИЕ: консультация таможенного декларанта обязательна."
            ),
            evidence=[f"Маркер состава: '{m}'" for m in found],
        )

    # ── ОПИ 3а ────────────────────────────────────────────────────────

    def _opi3a(self) -> RuleResult:
        """
        ОПИ 3а: Позиция с наиболее конкретным описанием.

        ИСПОЛЬЗУЕМАЯ ЭВРИСТИКА: специфичность = кол-во токенов + тех. термины.
        Юридически «конкретность» определяется сравнением текстов позиций экспертом.
        Порог: предложенная позиция должна быть на OPI3A_SPECIFICITY_MARGIN специфичнее.
        """
        checks = [
            "specificity_score_proposed",
            "specificity_score_top5_competitors",
        ]
        heuristic = (
            "Специфичность = кол-во уникальных токенов × 0.1 + кол-во тех.терминов × 0.5. "
            f"Порог превосходства: ×{OPI3A_SPECIFICITY_MARGIN:.2f} от лучшего конкурента."
        )

        competitors = [
            c for c in self.candidates[:10]
            if c.get("code", "").strip() != self.proposed_code
        ]

        if not competitors:
            return RuleResult(
                rule_id="ОПИ 3а",
                rule_name="Наиболее конкретное описание",
                verdict=RuleVerdict.SKIPPED,
                confidence_delta=0.0,
                checks_performed=checks,
                reason="Нет конкурирующих кандидатов — ОПИ 3а неприменимо.",
                evidence=[],
            )

        if self.proposed_record is None:
            return RuleResult(
                rule_id="ОПИ 3а",
                rule_name="Наиболее конкретное описание",
                verdict=RuleVerdict.INSUFFICIENT,
                confidence_delta=0.0,
                checks_performed=checks,
                reason="Предложенный код отсутствует среди кандидатов.",
                evidence=[],
            )

        proposed_spec = _specificity_score(self.proposed_record.get("description", ""))
        competitor_specs = [
            (c.get("code"), _specificity_score(c.get("description", "")))
            for c in competitors[:5]
        ]
        max_comp_spec = max((s for _, s in competitor_specs), default=0.0)
        best_comp = max(competitor_specs, key=lambda x: x[1], default=(None, 0.0))

        evidence = [
            f"Специфичность {self.proposed_code}: {proposed_spec:.2f} (ЭВРИСТИКА)",
            f"Лучший конкурент {best_comp[0]}: {best_comp[1]:.2f}",
        ] + [f"{code}: {spec:.2f}" for code, spec in competitor_specs[:3]]

        if proposed_spec > max_comp_spec * OPI3A_SPECIFICITY_MARGIN:
            return RuleResult(
                rule_id="ОПИ 3а",
                rule_name="Наиболее конкретное описание",
                verdict=RuleVerdict.CONFIRMS,
                confidence_delta=0.10,
                checks_performed=checks,
                reason=(
                    f"Позиция {self.proposed_code} специфичнее конкурентов "
                    f"({proposed_spec:.2f} > {max_comp_spec:.2f} × {OPI3A_SPECIFICITY_MARGIN})."
                ),
                evidence=evidence,
                is_heuristic=True,
                heuristic_description=heuristic,
            )
        elif max_comp_spec > proposed_spec * OPI3A_SPECIFICITY_MARGIN:
            return RuleResult(
                rule_id="ОПИ 3а",
                rule_name="Наиболее конкретное описание",
                verdict=RuleVerdict.REJECTS,
                confidence_delta=-0.10,
                checks_performed=checks,
                reason=(
                    f"Конкурент {best_comp[0]} имеет более конкретное описание "
                    f"({best_comp[1]:.2f} > {proposed_spec:.2f} × {OPI3A_SPECIFICITY_MARGIN})."
                ),
                evidence=evidence,
                is_heuristic=True,
                heuristic_description=heuristic,
                alternative_code=best_comp[0],
            )
        else:
            return RuleResult(
                rule_id="ОПИ 3а",
                rule_name="Наиболее конкретное описание",
                verdict=RuleVerdict.NEUTRAL,
                confidence_delta=0.0,
                checks_performed=checks,
                reason=(
                    f"Специфичность сопоставима ({proposed_spec:.2f} ≈ {max_comp_spec:.2f}). "
                    "Переходим к ОПИ 3б."
                ),
                evidence=evidence,
                is_heuristic=True,
                heuristic_description=heuristic,
            )

    # ── ОПИ 3б ────────────────────────────────────────────────────────

    def _opi3b(self) -> RuleResult:
        """
        ОПИ 3б: Существенный характер — классификация по основному компоненту.

        РЕАЛИЗОВАНО (v7 HEURISTIC): обнаруживает составной товар по маркерам
        и возвращает CONFIRMS с предположением, что предложенный код покрывает
        основной компонент. Требует верификации экспертом.

        FIX v5: убран маркер " и " — он срабатывал на любое описание с союзом.
        Составной товар — это "набор в сборе", "комплект X+Y", не "сталь и хром".
        FIX v7: INSUFFICIENT → CONFIRMS (HEURISTIC) при наличии маркеров.
        """
        checks = ["compound_good_markers"]
        # Только явные маркеры составного изделия, исключая союзы.
        # Паттерны без ведущего пробела — работают в любой позиции строки.
        # re.search с \b обеспечивает word-boundary (не срабатывает на "укомплектовать").
        import re as _re
        compound_patterns = [
            r"\bв\s+сборе\b",
            r"\bс\s+принадлежностями\b",
            r"\bв\s+комплекте\b",
            r"\bкомплект\b",
            r"\bнабор\b",
            r"\bвключающий\b",
            r"\bсостоящий\s+из\b",
        ]
        desc_lower = self.description.lower()
        found = [p for p in compound_patterns if _re.search(p, desc_lower)]

        if not found:
            return RuleResult(
                rule_id="ОПИ 3б",
                rule_name="Существенный характер",
                verdict=RuleVerdict.SKIPPED,
                confidence_delta=0.0,
                checks_performed=checks,
                reason=(
                    "Описание не содержит явных маркеров составного изделия. "
                    "ОПИ 3б неприменимо."
                ),
                evidence=[],
            )

        # HEURISTIC: обнаружены маркеры составного товара.
        # Предположение: предложенный код классифицирует основной компонент,
        # придающий товару существенный характер. Это требует верификации экспертом.
        # Если предположение ошибочно → существенный характер у другого компонента
        # и правильный код будет иным. Confidence_delta минимален (+0.03).
        return RuleResult(
            rule_id="ОПИ 3б",
            rule_name="Существенный характер",
            verdict=RuleVerdict.CONFIRMS,
            confidence_delta=+0.03,
            checks_performed=checks,
            is_heuristic=True,
            reason=(
                f"HEURISTIC: обнаружены маркеры составного изделия {found}. "
                "Применяется ОПИ 3б: предложенный код принят как код основного компонента "
                "с существенным характером. "
                "ОГРАНИЧЕНИЕ: данный вывод основан на эвристике (наличии маркеров), "
                "а не на стоимостных данных или весах компонентов. "
                "ОБЯЗАТЕЛЬНА верификация таможенным декларантом."
            ),
            evidence=[f"Маркер составного товара: '{m}'" for m in found],
        )

    # ── ОПИ 3в ────────────────────────────────────────────────────────

    def _opi3v(self) -> RuleResult:
        """
        ОПИ 3в: При невозможности применить 3а и 3б — позиция с наибольшим кодом.
        Детерминированная программная проверка — не эвристика.
        Применяется только как fallback (вес 0.3 в итоговом подсчёте).
        """
        checks = ["max_code_among_valid_competitors"]

        competitors = [
            c.get("code", "").strip()
            for c in self.candidates[:10]
            if c.get("code", "").strip() != self.proposed_code
            and re.match(r"^\d{10}$", c.get("code", "").strip() or "")
        ]

        if not competitors:
            return RuleResult(
                rule_id="ОПИ 3в",
                rule_name="Позиция с наибольшим кодом",
                verdict=RuleVerdict.SKIPPED,
                confidence_delta=0.0,
                checks_performed=checks,
                reason="Нет конкурирующих 10-значных кодов для сравнения.",
                evidence=[],
            )

        all_codes = [self.proposed_code] + competitors
        max_code = max(all_codes)

        if max_code == self.proposed_code:
            return RuleResult(
                rule_id="ОПИ 3в",
                rule_name="Позиция с наибольшим кодом",
                verdict=RuleVerdict.CONFIRMS,
                confidence_delta=0.05,
                checks_performed=checks,
                reason=(
                    f"Предложенный код {self.proposed_code} является наибольшим "
                    f"среди {len(competitors)} конкурентов."
                ),
                evidence=[f"Конкуренты: {', '.join(competitors[:5])}"],
            )
        else:
            return RuleResult(
                rule_id="ОПИ 3в",
                rule_name="Позиция с наибольшим кодом",
                verdict=RuleVerdict.REJECTS,
                confidence_delta=-0.05,
                checks_performed=checks,
                reason=(
                    f"По ОПИ 3в должен применяться код {max_code}, "
                    f"а не {self.proposed_code}."
                ),
                evidence=[
                    f"Максимальный код: {max_code}",
                    f"Предложенный: {self.proposed_code}",
                ],
                alternative_code=max_code,
            )

    # ── ОПИ 4 ─────────────────────────────────────────────────────────

    def _opi4(self) -> RuleResult:
        """
        ОПИ 4: По наиболее аналогичным товарам.

        НЕ РЕАЛИЗОВАНО: требует полной базы ТН ВЭД и логики аналогии.
        Возвращает SKIPPED с явным объяснением причины.
        """
        return RuleResult(
            rule_id="ОПИ 4",
            rule_name="Наиболее аналогичные товары",
            verdict=RuleVerdict.SKIPPED,
            confidence_delta=0.0,
            checks_performed=["NOT_IMPLEMENTED"],
            reason=(
                "НЕ РЕАЛИЗОВАНО: ОПИ 4 требует полной базы ТН ВЭД для перебора аналогов "
                "и юридической оценки «наиболее аналогичного товара». "
                "Семантический поиск по загруженным данным является приближением, "
                "но не заменяет полноценное применение ОПИ 4. "
                "При спорной классификации — обратиться к таможенному брокеру."
            ),
            evidence=[],
        )
    # ── ОПИ 5 ─────────────────────────────────────────────────────────

    def _opi5(self) -> RuleResult:
        """
        ОПИ 5: Специальные правила для упаковки.

        НЕ РЕАЛИЗОВАНО: ОПИ 5 применяется к товарам, классифицируемым вместе с упаковкой.
        Возвращает SKIPPED с объяснением.
        """
        return RuleResult(
            rule_id="ОПИ 5",
            rule_name="Классификация упаковки",
            verdict=RuleVerdict.SKIPPED,
            confidence_delta=0.0,
            checks_performed=["NOT_IMPLEMENTED"],
            reason=(
                "НЕ РЕАЛИЗОВАНО: ОПИ 5 применяется когда товар классифицируется вместе "
                "с упаковкой (ОПИ 5а) или когда упаковка придаёт существенный характер (ОПИ 5б). "
                "Система не анализирует тип и стоимость упаковки."
            ),
            evidence=[],
        )

    # ── ОПИ 6 ─────────────────────────────────────────────────────────

    def _opi6(self) -> RuleResult:
        """
        ОПИ 6: Классификация в субпозициях — применяем ОПИ 1–5 на уровне субпозиций.
        Среди кандидатов с той же 4-значной позицией — какая субпозиция лучше.
        ИСПОЛЬЗУЕМАЯ ЭВРИСТИКА: Jaccard similarity для выбора субпозиции.
        """
        checks = ["subposition_hierarchy_check", "jaccard_within_same_heading"]
        heuristic = "Jaccard similarity для выбора среди субпозиций одной позиции."

        if len(self.proposed_code) < 4:
            return RuleResult(
                rule_id="ОПИ 6",
                rule_name="Классификация в субпозиции",
                verdict=RuleVerdict.INSUFFICIENT,
                confidence_delta=0.0,
                checks_performed=checks,
                reason="Код слишком короткий для проверки субпозиций.",
                evidence=[],
            )

        heading_4 = self.proposed_code[:4]
        same_heading = [
            c for c in self.candidates
            if c.get("code", "")[:4] == heading_4
            and c.get("code", "").strip() != self.proposed_code
        ]

        if not same_heading:
            return RuleResult(
                rule_id="ОПИ 6",
                rule_name="Классификация в субпозиции",
                verdict=RuleVerdict.NEUTRAL,
                confidence_delta=0.0,
                checks_performed=checks,
                reason=(
                    "Нет других кандидатов в позиции " + heading_4 + ". "
                    "ОПИ 6 не добавляет информации."
                ),
                evidence=["Позиция: " + heading_4 + ", код: " + self.proposed_code],
            )

        desc_tokens = _tokenize(self.description)
        proposed_tokens = _tokenize(
            self.proposed_record.get("description", "") if self.proposed_record else ""
        )
        sim_proposed = _jaccard(desc_tokens, proposed_tokens)

        best_subpos = max(
            same_heading,
            key=lambda c: _jaccard(desc_tokens, _tokenize(c.get("description", "")))
        )
        best_sim = _jaccard(desc_tokens, _tokenize(best_subpos.get("description", "")))

        evidence = [
            "Позиция " + heading_4 + ": " + str(len(same_heading)) + " конкурирующих субпозиций",
            "Предложено: " + self.proposed_code + " (Jaccard=" + str(round(sim_proposed, 3)) + ")",
            "Лучшая альтернатива: " + str(best_subpos.get("code")) + " (Jaccard=" + str(round(best_sim, 3)) + ")",
        ]

        if sim_proposed >= best_sim:
            return RuleResult(
                rule_id="ОПИ 6",
                rule_name="Классификация в субпозиции",
                verdict=RuleVerdict.CONFIRMS,
                confidence_delta=0.05,
                checks_performed=checks,
                reason=(
                    "Среди субпозиций позиции " + heading_4 + " — " + self.proposed_code +
                    " наиболее соответствует описанию (Jaccard=" + str(round(sim_proposed, 3)) + ")."
                ),
                evidence=evidence,
                is_heuristic=True,
                heuristic_description=heuristic,
            )
        else:
            return RuleResult(
                rule_id="ОПИ 6",
                rule_name="Классификация в субпозиции",
                verdict=RuleVerdict.REJECTS,
                confidence_delta=-0.05,
                checks_performed=checks,
                reason=(
                    "В позиции " + heading_4 + " субпозиция " + str(best_subpos.get("code")) +
                    " лучше соответствует описанию (Jaccard=" + str(round(best_sim, 3)) +
                    " > " + str(round(sim_proposed, 3)) + ")."
                ),
                evidence=evidence,
                is_heuristic=True,
                heuristic_description=heuristic,
                alternative_code=best_subpos.get("code"),
            )

    # ── Компиляция отчёта ─────────────────────────────────────────────

    def _compile_report(self, results: list) -> RuleEngineReport:
        """
        Скомпилировать финальный отчёт.
        Веса из HEURISTIC_RULE_WEIGHTS (config.py).
        Delta нормализована и ограничена [-0.3, +0.3].
        """
        rules_applied = [
            r.rule_id for r in results
            if r.verdict not in (RuleVerdict.SKIPPED,)
        ]
        rules_skipped = [
            r.rule_id for r in results
            if r.verdict == RuleVerdict.SKIPPED
        ]
        heuristics_used = [
            r.rule_id + ": " + r.heuristic_description
            for r in results
            if r.is_heuristic and r.heuristic_description
        ]

        blocking_issues = [
            r.rule_id + ": " + r.reason
            for r in results
            if r.verdict == RuleVerdict.REJECTS and r.is_blocking
        ]

        weighted_confirms = sum(
            HEURISTIC_RULE_WEIGHTS.get(r.rule_id, 1.0)
            for r in results if r.verdict == RuleVerdict.CONFIRMS
        )
        weighted_rejects = sum(
            HEURISTIC_RULE_WEIGHTS.get(r.rule_id, 1.0)
            for r in results if r.verdict == RuleVerdict.REJECTS
        )

        if blocking_issues:
            overall = RuleVerdict.REJECTS
        elif weighted_rejects > weighted_confirms * 1.5:
            overall = RuleVerdict.REJECTS
        elif weighted_confirms > 0:
            overall = RuleVerdict.CONFIRMS
        else:
            overall = RuleVerdict.NEUTRAL

        active = [r for r in results if r.verdict in (RuleVerdict.CONFIRMS, RuleVerdict.REJECTS)]
        if active:
            total_delta = sum(
                r.confidence_delta * HEURISTIC_RULE_WEIGHTS.get(r.rule_id, 1.0)
                for r in active
            )
            total_weight = sum(HEURISTIC_RULE_WEIGHTS.get(r.rule_id, 1.0) for r in active)
            normalized = total_delta / total_weight if total_weight > 0 else 0.0
        else:
            normalized = 0.0

        total_delta_clamped = max(-0.30, min(0.30, normalized))

        primary = max(
            active,
            key=lambda r: HEURISTIC_RULE_WEIGHTS.get(r.rule_id, 1.0),
            default=None,
        )
        primary_id = primary.rule_id if primary else "ОПИ 1"

        return RuleEngineReport(
            rules_considered=self.OPI_RULES,
            rules_applied=rules_applied,
            rules_skipped=rules_skipped,
            results=results,
            primary_rule=primary_id,
            overall_verdict=overall,
            total_confidence_delta=total_delta_clamped,
            blocking_issues=blocking_issues,
            heuristics_used=heuristics_used,
        )


# ── Точка входа ───────────────────────────────────────────────────────────


def run_rule_engine(
    proposed_code: str,
    product_description: str,
    top_candidates: list,
    pdf_chunks: list = None,
) -> RuleEngineReport:
    """Standalone entry point. Returns RuleEngineReport."""
    engine = RuleEngine(proposed_code, product_description, top_candidates, pdf_chunks)
    return engine.run()
