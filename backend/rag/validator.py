"""
validator.py v5 — Валидация результата классификации по ОПИ ТН ВЭД.

Запускается ПОСЛЕ LLM, ПЕРЕД возвратом пользователю.

Изменения v5:
  - Константы MIN_CONFIDENCE_TO_ANSWER и COMPETITION_SCORE_RATIO
    импортируются из config.py (единый источник правды).
    Дублирование порогов в нескольких файлах устранено.
  - COMPETITION_SCORE_RATIO явно помечен как HEURISTIC в config.py.
  - Проверка 8-значного fallback (proposed_code[:8]) задокументирована.

Проверки (детерминированные, не эвристические кроме явно отмеченных):
  1. Формат кода (10 цифр) — детерминирован.
  2. Код присутствует среди кандидатов — защита от галлюцинации LLM.
     ЧАСТИЧНО ЭВРИСТИКА: 8-значный fallback ([:8]) — почему 8, а не 6 или 10?
     Обоснование: 8 цифр = уровень субпозиции, не субсубпозиции.
  3. Примечания и исключения из PDF — детерминирован.
  4. Конкурирующие позиции (ОПИ 3) — ЭВРИСТИКА: порог COMPETITION_SCORE_RATIO.
  5. Порог итоговой уверенности — из config.

Если хотя бы одна критическая проверка провалена — код НЕ возвращается.
"""

from __future__ import annotations
import re
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from dataclasses import dataclass, field
from typing import Optional

try:
    from config import MIN_CONFIDENCE_TO_ANSWER, COMPETITION_SCORE_RATIO
except ImportError:
    # Fallback только для изолированного запуска тестов
    MIN_CONFIDENCE_TO_ANSWER = 0.45  # MUST match config.py
    COMPETITION_SCORE_RATIO  = 0.85  # HEURISTIC — must match config.py


# ── Паттерны исключений из ТН ВЭД ────────────────────────────────────
_EXCLUSION_PATTERNS = [
    r"не\s+включ(?:ает|аются|аем|аемые)",
    r"не\s+относ(?:ится|ятся|ящиеся)",
    r"за\s+исключением",
    r"кроме\s+(?:тех|того|случаев)",
    r"исключ(?:ая|ённые|ённый)",
    r"данная\s+(?:позиция|группа|субпозиция)\s+не\s+(?:включ|охват|примен)",
    r"не\s+входи(?:т|тв)\s+(?:в|в\s+эту)",
    r"не\s+применяется\s+(?:к|для)",
    r"из\s+данной\s+(?:позиции|группы)\s+исключ",
]

# ── Паттерны примечаний ───────────────────────────────────────────────
_NOTE_PATTERNS = [
    r"примечани(?:е|я|й)",
    r"для\s+целей\s+(?:настоящей|данной|этой)\s+(?:позиции|главы|группы|раздела)",
    r"в\s+целях\s+(?:настоящей|данной)",
    r"термин\s+[«\"]",
    r"понимается\s+(?:как|в\s+качестве)",
    r"означает\s+(?:любой|все|только)",
]


@dataclass
class ValidationResult:
    """Результат валидации классификации."""
    passed: bool
    _raw_confidence: float = field(default=0.0)
    confidence_adjustment: float = field(default=0.0)
    issues: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    competing_codes: list[dict] = field(default_factory=list)
    notes_applied: list[str] = field(default_factory=list)
    exclusions_found: list[str] = field(default_factory=list)
    checks_run: list[str] = field(default_factory=list)

    @property
    def adjusted_confidence(self) -> float:
        """Уверенность с учётом поправок валидатора (используется classifier.py)."""
        return max(0.0, min(1.0, self._raw_confidence + self.confidence_adjustment))


def validate_classification(
    proposed_code: str,
    confidence: float = 0.0,
    product_description: str = "",
    retrieved_codes: list[dict] = None,
    retrieved_pdf_chunks: list[dict] = None,
    # Алиасы для classifier.py v3:
    raw_confidence: float = None,
    pdf_chunks: list[dict] = None,
) -> ValidationResult:
    """
    Полная валидация результата классификации.

    Принимает два набора имён параметров для обратной совместимости:
      confidence / raw_confidence — уверенность (0.0–1.0)
      retrieved_pdf_chunks / pdf_chunks — фрагменты PDF

    Returns:
        ValidationResult. Если result.passed=False — код нельзя отдавать.
    """
    # Алиасы
    if raw_confidence is not None:
        confidence = raw_confidence
    if pdf_chunks is not None:
        retrieved_pdf_chunks = pdf_chunks
    if retrieved_codes is None:
        retrieved_codes = []
    if retrieved_pdf_chunks is None:
        retrieved_pdf_chunks = []

    vr = ValidationResult(passed=True, _raw_confidence=confidence)

    # ── Проверка 1: Формат кода ───────────────────────────────────────
    vr.checks_run.append("format_check")
    if not proposed_code:
        vr.passed = False
        vr.issues.append("LLM не предложила код классификации.")
        return vr

    clean_code = re.sub(r"\s", "", proposed_code)
    if not re.match(r"^\d{10}$", clean_code):
        vr.passed = False
        vr.issues.append(
            f"Код '{proposed_code}' не соответствует формату ТН ВЭД (ровно 10 цифр). "
            f"Возможная причина: LLM вернула неполный или нечисловой код."
        )
        return vr

    proposed_code = clean_code

    # ── Проверка 2: Код существует в кандидатах (галлюцинация-защита) ─
    vr.checks_run.append("hallucination_guard")
    candidate_codes = {r.get("code", "").strip() for r in retrieved_codes}
    candidate_8digit = {c[:8] for c in candidate_codes if len(c) >= 8}

    if proposed_code not in candidate_codes and proposed_code[:8] not in candidate_8digit:
        vr.passed = False
        vr.issues.append(
            f"Код {proposed_code} отсутствует в результатах семантического поиска "
            f"({len(candidate_codes)} кандидатов). Возможна галлюцинация LLM. "
            f"Система отказывается выдавать неподтверждённый код."
        )
        vr.confidence_adjustment -= 0.5
        return vr
    elif proposed_code not in candidate_codes and proposed_code[:8] in candidate_8digit:
        vr.passed = False
        vr.issues.append(
            f"Точная 10-значная субсубпозиция {proposed_code} отсутствует среди кандидатов, "
            f"хотя 8-значная позиция {proposed_code[:8]} найдена. "
            f"Система отказывается выдавать неподтверждённый 10-значный код."
        )
        vr.confidence_adjustment -= 0.25
        return vr

    # ── Проверка 3: Примечания и исключения из PDF ────────────────────
    vr.checks_run.append("pdf_notes_and_exclusions")
    proposed_chapter = proposed_code[:2]
    excl_result = _check_exclusions(product_description, proposed_chapter, retrieved_pdf_chunks)
    if excl_result["found"]:
        vr.exclusions_found.extend(excl_result["texts"])
        vr.warnings.append(
            f"Обнаружены возможные исключения для главы {proposed_chapter} в PDF-пояснениях. "
            f"Рекомендуется ручная проверка примечаний."
        )
        vr.confidence_adjustment -= 0.10

    notes = _extract_relevant_notes(proposed_chapter, retrieved_pdf_chunks)
    vr.notes_applied.extend(notes[:4])

    # ── Проверка 4: Конкурирующие позиции (ОПИ 3) ────────────────────
    vr.checks_run.append("competing_positions_opi3")
    competing = _find_competing_codes(proposed_code, retrieved_codes)
    vr.competing_codes.extend(competing)

    if competing:
        codes_list = ", ".join(c["code"] for c in competing[:4])
        vr.warnings.append(
            f"Найдены {len(competing)} конкурирующих позиций: {codes_list}. "
            f"Применить ОПИ 3а (наиболее конкретное) или 3б (существенный характер)."
        )
        very_close = [c for c in competing if c.get("score_ratio", 0) > 0.95]
        if very_close:
            vr.confidence_adjustment -= 0.15
            vr.warnings.append(
                f"ВНИМАНИЕ: {len(very_close)} позиций имеют почти равную оценку. "
                f"Рекомендуется проверка у таможенного брокера."
            )

    # ── Проверка 5: Итоговый порог уверенности ────────────────────────
    vr.checks_run.append("confidence_threshold")
    if vr.adjusted_confidence < MIN_CONFIDENCE_TO_ANSWER:
        vr.passed = False
        vr.issues.append(
            f"Итоговая уверенность ({vr.adjusted_confidence:.0%}) ниже допустимого порога "
            f"({MIN_CONFIDENCE_TO_ANSWER:.0%}). "
            f"Система отказывается выдавать код."
        )

    return vr


def _check_exclusions(
    description: str,
    chapter: str,
    pdf_chunks: list[dict],
) -> dict:
    # HEURISTIC: совпадение >=2 общих слов (≥4 букв) между описанием и текстом
    # исключения считается «попаданием». Не учитывает синонимы и морфологию.
    desc_lower = description.lower()
    desc_words = set(re.findall(r"[а-яё]{4,}", desc_lower))
    found_texts = []

    chapter_chunks = [
        c for c in pdf_chunks
        if c.get("chapter", "") == chapter
        and c.get("chunk_type") in ("exclusion", "note")
    ]

    for chunk in chapter_chunks:
        text = chunk.get("text", "")
        text_lower = text.lower()
        has_exclusion_pattern = any(re.search(p, text_lower) for p in _EXCLUSION_PATTERNS)
        if not has_exclusion_pattern:
            continue
        excl_words = set(re.findall(r"[а-яё]{4,}", text_lower))
        overlap = desc_words & excl_words
        if len(overlap) >= 2:
            found_texts.append(text[:250])

    return {"found": bool(found_texts), "texts": found_texts}


def _extract_relevant_notes(chapter: str, pdf_chunks: list[dict]) -> list[str]:
    notes = []
    for chunk in pdf_chunks:
        if chunk.get("chapter", "") != chapter:
            continue
        if chunk.get("chunk_type") not in ("note", "definition"):
            continue
        text = chunk.get("text", "")
        if len(text) < 40:
            continue
        has_note = any(re.search(p, text.lower()) for p in _NOTE_PATTERNS)
        if has_note:
            notes.append(f"[Глава {chapter}] {text[:300]}")
    return notes


def _find_competing_codes(
    proposed_code: str,
    retrieved_codes: list[dict],
) -> list[dict]:
    # HEURISTIC: конкурирующим считается любой код, чей score >= COMPETITION_SCORE_RATIO
    # (0.85 по умолчанию) от score предложенного кода. Порог эмпирический.
    proposed_score = None
    for rec in retrieved_codes:
        if rec.get("code", "").strip() == proposed_code:
            proposed_score = rec.get("rrf_score", rec.get("score", 0.0))
            break

    if proposed_score is None or proposed_score <= 0:
        return []

    competing = []
    for rec in retrieved_codes:
        code = rec.get("code", "").strip()
        if code == proposed_code:
            continue
        score = rec.get("rrf_score", rec.get("score", 0.0))
        ratio = score / proposed_score if proposed_score > 0 else 0.0
        if ratio >= COMPETITION_SCORE_RATIO:
            competing.append({
                "code": code,
                "description": rec.get("description", "")[:150],
                "rrf_score": round(score, 6),
                "score_ratio": round(ratio, 3),
            })

    competing.sort(key=lambda c: -c["score_ratio"])
    return competing[:5]
