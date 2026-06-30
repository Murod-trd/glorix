"""
evidence_builder.py v6 — Обязательный сборщик доказательств классификации.

Правило Evidence First: нельзя вернуть код без доказательств.
Система проверяет наличие:
  - конкретных записей Excel (по коду)
  - конкретных PDF-чанков (по главе/коду)
  - найденных примечаний и исключений
  - применённых правил

Если минимальный порог не пройден — классификация блокируется.

═══════════════════════════════════════════════════════════════════════════
ЗАДОКУМЕНТИРОВАННЫЕ ЭВРИСТИКИ:
  - _compute_evidence_score: веса компонентов (Excel=0.40, PDF=0.30,
    Notes=0.15, Rank=0.15) — эмпирические, не из нормативных документов.
  - build_refusal_questions: список «стандартных» русских материалов
    для определения нужно ли спросить о материале — ЭВРИСТИКА.
  - MIN_EVIDENCE_SCORE=0.30 — порог не откалиброван на реальных данных.
═══════════════════════════════════════════════════════════════════════════
"""

from __future__ import annotations
import re
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from dataclasses import dataclass, field
from typing import Optional

try:
    from config import MIN_EXCEL_RECORDS, MIN_EVIDENCE_SCORE, EVIDENCE_WEIGHTS
except ImportError:
    MIN_EXCEL_RECORDS = 1
    MIN_EVIDENCE_SCORE = 0.30
    EVIDENCE_WEIGHTS = {"excel": 0.40, "pdf": 0.30, "notes": 0.15, "rank": 0.15}  # MUST match config.py

# PDF не обязательны (база может быть пустой) — только предупреждение
MIN_PDF_CHUNKS = 0
WARN_PDF_CHUNKS = 1


@dataclass
class ExcelRecord:
    """Конкретная запись из Excel-базы, подтверждающая код."""
    code: str
    description: str
    level: str          # "position", "subposition", "subsubposition"
    chapter: str
    rrf_score: float

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "description": self.description,
            "level": self.level,
            "chapter": self.chapter,
            "rrf_score": round(self.rrf_score, 4),
        }


@dataclass
class PDFChunk:
    """Конкретный фрагмент PDF с доказательством."""
    source_file: str
    page: int
    chapter: str
    text_excerpt: str       # первые 200 символов
    relevance_score: float

    def to_dict(self) -> dict:
        return {
            "source_file": self.source_file,
            "page": self.page,
            "chapter": self.chapter,
            "text_excerpt": self.text_excerpt[:200],
            "relevance_score": round(self.relevance_score, 4),
        }


@dataclass
class NoteFound:
    """Найденное примечание или исключение из PDF."""
    note_type: str          # "exclusion", "inclusion", "definition", "note"
    text: str
    applies_to_code: str    # код к которому относится
    source: str

    def to_dict(self) -> dict:
        return {
            "note_type": self.note_type,
            "text": self.text[:300],
            "applies_to_code": self.applies_to_code,
            "source": self.source,
        }


@dataclass
class Evidence:
    """Полный пакет доказательств для одного предложенного кода."""
    proposed_code: str
    excel_records: list[ExcelRecord] = field(default_factory=list)
    pdf_chunks: list[PDFChunk] = field(default_factory=list)
    notes_found: list[NoteFound] = field(default_factory=list)
    rules_applied: list[str] = field(default_factory=list)
    evidence_score: float = 0.0         # суммарная оценка качества доказательств
    is_sufficient: bool = False
    insufficiency_reasons: list[str] = field(default_factory=list)
    missing_information: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "proposed_code": self.proposed_code,
            "is_sufficient": self.is_sufficient,
            "evidence_score": round(self.evidence_score, 3),
            "excel_records": [r.to_dict() for r in self.excel_records],
            "pdf_chunks": [c.to_dict() for c in self.pdf_chunks[:5]],   # топ-5
            "notes_found": [n.to_dict() for n in self.notes_found],
            "rules_applied": self.rules_applied,
            "insufficiency_reasons": self.insufficiency_reasons,
            "missing_information": self.missing_information,
        }

    def format_summary(self) -> str:
        """Краткое текстовое резюме доказательств."""
        parts = [
            f"Код {self.proposed_code}:",
            f"  Excel: {len(self.excel_records)} записей",
            f"  PDF:   {len(self.pdf_chunks)} фрагментов",
            f"  Примечания: {len(self.notes_found)}",
            f"  Score: {self.evidence_score:.2f}",
            f"  Достаточно: {'ДА' if self.is_sufficient else 'НЕТ'}",
        ]
        if not self.is_sufficient:
            parts.append(f"  Причины: {'; '.join(self.insufficiency_reasons)}")
        return "\n".join(parts)


# ── Главная функция ──────────────────────────────────────────────────────

def build_evidence(
    proposed_code: str,
    retrieved_codes: list[dict],
    retrieved_pdf_chunks: list[dict],
    product_description: str,
) -> Evidence:
    """
    Собрать и проверить доказательную базу для предложенного кода.

    Args:
        proposed_code:        10-значный предложенный код
        retrieved_codes:      Результаты из Qdrant (коды)
        retrieved_pdf_chunks: Результаты из Qdrant (PDF-чанки)
        product_description:  Описание товара

    Returns:
        Evidence с флагом is_sufficient и деталями
    """
    evidence = Evidence(proposed_code=proposed_code)
    proposed_chapter = proposed_code[:2]

    # ── 1. Собрать Excel-записи ──────────────────────────────────────
    excel_records = _collect_excel_records(proposed_code, retrieved_codes)
    evidence.excel_records = excel_records

    # ── 2. Собрать PDF-чанки ────────────────────────────────────────
    pdf_chunks = _collect_pdf_chunks(proposed_chapter, retrieved_pdf_chunks)
    evidence.pdf_chunks = pdf_chunks

    # ── 3. Найти примечания и исключения ────────────────────────────
    notes = _extract_notes(proposed_code, retrieved_pdf_chunks, product_description)
    evidence.notes_found = notes

    # ── 4. Определить применённые правила ───────────────────────────
    evidence.rules_applied = _identify_applied_rules(excel_records, pdf_chunks, notes)

    # ── 5. Вычислить итоговый evidence score ────────────────────────
    evidence.evidence_score = _compute_evidence_score(
        excel_records, pdf_chunks, notes, retrieved_codes, proposed_code
    )

    # ── 6. Проверить достаточность ──────────────────────────────────
    _check_sufficiency(evidence, product_description)

    return evidence


def build_refusal_questions(
    evidence: Evidence,
    top_candidates: list[dict],
    product_description: str,
) -> list[str]:
    """
    Сформировать конкретные уточняющие вопросы если доказательств недостаточно.
    Используется в режиме отказа (requires_clarification=True).
    """
    questions = []

    # Вопросы на основе конкурирующих кодов
    competing_chapters = set()
    for c in top_candidates[:5]:
        ch = c.get("chapter", c.get("code", "")[:2])
        if ch and ch != evidence.proposed_code[:2]:
            competing_chapters.add(ch)

    if competing_chapters:
        questions.append(
            f"Система нашла конкурирующие позиции в главах {', '.join(sorted(competing_chapters))}. "
            "Уточните: из какого материала изготовлен товар?"
        )

    # Вопросы на основе недостаточности доказательств
    for reason in evidence.insufficiency_reasons:
        if "Excel" in reason:
            questions.append(
                "Не найдено точной позиции в базе. "
                "Укажите точное торговое наименование товара, производителя, ГОСТ/ТУ."
            )
        if "PDF" in reason or "документ" in reason:
            questions.append(
                "Нет документального подтверждения из ТН ВЭД. "
                "Укажите страну происхождения — это влияет на применимые примечания к разделам."
            )

    # Стандартные уточняющие вопросы по типу описания
    # ЭВРИСТИКА: список материалов выбран разработчиком, покрывает ~80% случаев,
    # не является исчерпывающим перечнем материалов ТН ВЭД.
    desc_lower = product_description.lower()
    _MATERIAL_HINT_WORDS = [
        "сталь", "алюминий", "медь", "пластик", "дерево", "резина", "стекло",
        "нержавеющ", "полипропилен", "полиэтилен", "чугун", "латунь", "бронз",
        "никель", "титан", "керамик", "бетон", "цемент", "ткань", "кожа",
    ]
    if not any(m in desc_lower for m in _MATERIAL_HINT_WORDS):
        questions.append("Из какого основного материала изготовлен товар?")

    if not any(f in desc_lower for f in ["назначен", "применяется", "используется", "для "]):
        questions.append("Каково основное назначение товара?")

    if not any(d in desc_lower for d in ["мм", "см", "кг", "г ", " л", "вт", "квт"]):
        questions.append("Укажите технические характеристики: размеры, масса, мощность, производительность.")

    if not questions:
        questions.append("Предоставьте дополнительные технические данные для однозначной классификации.")

    # Убрать дубли, вернуть максимум 5
    seen = set()
    unique = []
    for q in questions:
        key = q[:50]
        if key not in seen:
            seen.add(key)
            unique.append(q)

    return unique[:5]


# ── Вспомогательные функции ─────────────────────────────────────────────

def _collect_excel_records(proposed_code: str, retrieved_codes: list[dict]) -> list[ExcelRecord]:
    """Найти Excel-записи строго для предложенного кода."""
    records = []
    for item in retrieved_codes:
        item_code = item.get("code", "").strip()
        if item_code == proposed_code:
            records.append(ExcelRecord(
                code=item_code,
                description=item.get("description", ""),
                level=item.get("level", "unknown"),
                chapter=item.get("chapter", item_code[:2]),
                rrf_score=item.get("rrf_score", item.get("score", 0.0)),
            ))
    return records


def _collect_pdf_chunks(chapter: str, retrieved_pdf_chunks: list[dict]) -> list[PDFChunk]:
    """Собрать PDF-чанки по главе предложенного кода."""
    chunks = []
    for item in retrieved_pdf_chunks:
        item_chapter = item.get("chapter", "")
        # Принимаем чанк если глава совпадает или не указана (общие примечания)
        if item_chapter == chapter or not item_chapter:
            text = item.get("text", "")
            chunks.append(PDFChunk(
                source_file=item.get("source_file", item.get("source", "unknown")),
                page=item.get("page", 0),
                chapter=item_chapter,
                text_excerpt=text[:200],
                relevance_score=item.get("rrf_score", item.get("score", 0.0)),
            ))
    # Сортировать по релевантности
    chunks.sort(key=lambda c: -c.relevance_score)
    return chunks


def _extract_notes(
    proposed_code: str,
    retrieved_pdf_chunks: list[dict],
    product_description: str,
) -> list[NoteFound]:
    """
    Извлечь примечания, исключения и определения из PDF-чанков.
    Ищем паттерны: 'примечание', 'исключение', 'не включаются', 'означает'.
    """
    notes = []
    proposed_chapter = proposed_code[:2]
    proposed_heading = proposed_code[:4]

    exclusion_patterns = [
        r"(?:не\s+включа(?:ются|ет(?:ся)?)|исключа(?:ются|ет(?:ся)?)|кроме|за\s+исключением)",
        r"(?:exclude[sd]?|not\s+includ(?:ed?|ing))",
    ]
    note_patterns = [
        r"(?:примечание|пояснение|дефиниция|означает|понимается\s+как)",
        r"(?:note|meaning|defined?\s+as)",
    ]
    inclusion_patterns = [
        r"(?:включа(?:ются|ет(?:ся)?)|в\s+данную\s+позицию\s+включ)",
        r"(?:includ(?:ed?|es|ing)|falls?\s+within)",
    ]

    for item in retrieved_pdf_chunks:
        text = item.get("text", "")
        if not text:
            continue

        text_lower = text.lower()
        item_chapter = item.get("chapter", "")
        source = item.get("source_file", item.get("source", "pdf"))

        # Проверить применимость к нашей главе/позиции
        chapter_ref = proposed_chapter in text or proposed_heading[:4] in text

        for pattern in exclusion_patterns:
            if re.search(pattern, text_lower):
                snippet = _extract_snippet(text, pattern, 200)
                if snippet:
                    notes.append(NoteFound(
                        note_type="exclusion",
                        text=snippet,
                        applies_to_code=proposed_code if chapter_ref else item_chapter + "xx",
                        source=f"{source} стр.{item.get('page', '?')}",
                    ))
                    break

        for pattern in note_patterns:
            if re.search(pattern, text_lower):
                snippet = _extract_snippet(text, pattern, 200)
                if snippet:
                    notes.append(NoteFound(
                        note_type="definition",
                        text=snippet,
                        applies_to_code=proposed_code if chapter_ref else item_chapter + "xx",
                        source=f"{source} стр.{item.get('page', '?')}",
                    ))
                    break

        for pattern in inclusion_patterns:
            if re.search(pattern, text_lower):
                snippet = _extract_snippet(text, pattern, 200)
                if snippet:
                    notes.append(NoteFound(
                        note_type="inclusion",
                        text=snippet,
                        applies_to_code=proposed_code if chapter_ref else item_chapter + "xx",
                        source=f"{source} стр.{item.get('page', '?')}",
                    ))
                    break

    # Убрать дубликаты по первым 80 символам текста
    seen_texts: set[str] = set()
    unique_notes = []
    for note in notes:
        key = note.text[:80]
        if key not in seen_texts:
            seen_texts.add(key)
            unique_notes.append(note)

    return unique_notes[:10]  # максимум 10 примечаний


def _identify_applied_rules(
    excel_records: list[ExcelRecord],
    pdf_chunks: list[PDFChunk],
    notes: list[NoteFound],
) -> list[str]:
    """Определить какие правила классификации были применены."""
    rules = []
    if excel_records:
        rules.append("Сопоставление с базой кодов ТН ВЭД ЕАЭС")
    if pdf_chunks:
        rules.append("Анализ пояснений к ТН ВЭД (PDF)")
    if any(n.note_type == "exclusion" for n in notes):
        rules.append("Проверка исключений и примечаний к разделу/главе")
    if any(n.note_type == "definition" for n in notes):
        rules.append("Применение определений из пояснений ТН ВЭД")
    if any(n.note_type == "inclusion" for n in notes):
        rules.append("Подтверждение включения товара в позицию")
    return rules


def _compute_evidence_score(
    excel_records: list[ExcelRecord],
    pdf_chunks: list[PDFChunk],
    notes: list[NoteFound],
    retrieved_codes: list[dict],
    proposed_code: str,
) -> float:
    """
    Вычислить суммарный evidence score [0.0, 1.0].

    ЭВРИСТИКА: весовые коэффициенты читаются из config.EVIDENCE_WEIGHTS.
    Формула (веса из config, не хардкод):
      excel — наличие записи в Excel     (HEURISTIC, default 0.40)
      pdf   — релевантный PDF-чанк       (HEURISTIC, default 0.30)
      notes — примечания/исключения      (HEURISTIC, default 0.15)
      rank  — позиция в RRF-рейтинге     (HEURISTIC, default 0.15)

    При пустой базе (Qdrant не заполнена) — score = 0.0 → evidence not sufficient.
    Это корректное поведение: без данных нельзя подтвердить классификацию.
    """
    w = EVIDENCE_WEIGHTS  # из config.py — единый источник
    score = 0.0

    # Компонент 1: Excel records
    if excel_records:
        best_excel_score = max(r.rrf_score for r in excel_records)
        score += w["excel"] * min(best_excel_score * 3, 1.0)  # RRF обычно < 0.33

    # Компонент 2: PDF chunks
    if pdf_chunks:
        best_pdf_score = max(c.relevance_score for c in pdf_chunks)
        pdf_count_bonus = min(len(pdf_chunks) / 5, 1.0)
        score += w["pdf"] * (0.7 * min(best_pdf_score * 3, 1.0) + 0.3 * pdf_count_bonus)

    # Компонент 3: Примечания
    if notes:
        # Включения усиливают, исключения ослабляют
        inclusions = sum(1 for n in notes if n.note_type == "inclusion")
        exclusions = sum(1 for n in notes if n.note_type == "exclusion")
        note_score = (inclusions * 0.05 - exclusions * 0.05)
        score += max(0.0, min(w["notes"], 0.08 + note_score))

    # Компонент 4: Позиция в общем рейтинге
    all_scores = [c.get("rrf_score", c.get("score", 0)) for c in retrieved_codes]
    if all_scores:
        max_score = max(all_scores)
        proposed_score = 0.0
        for c in retrieved_codes:
            if c.get("code", "").strip() == proposed_code:
                proposed_score = c.get("rrf_score", c.get("score", 0))
                break
        if max_score > 0:
            score += w["rank"] * (proposed_score / max_score)

    return min(score, 1.0)


def _check_sufficiency(evidence: Evidence, product_description: str) -> None:
    """Проверить достаточность доказательств. Модифицирует evidence на месте."""
    reasons = []
    missing = []

    # Проверка 1: Excel-записи
    if len(evidence.excel_records) < MIN_EXCEL_RECORDS:
        reasons.append(
            f"Код {evidence.proposed_code} не найден в Excel-базе ТН ВЭД "
            f"(требуется минимум {MIN_EXCEL_RECORDS} запись)"
        )
        missing.append("Точная позиция в базе кодов ТН ВЭД ЕАЭС")

    # Проверка 2: PDF-чанки (предупреждение, не блокировка)
    if len(evidence.pdf_chunks) < WARN_PDF_CHUNKS:
        # Не блокируем, но добавляем в missing
        missing.append("Пояснения к ТН ВЭД (PDF) — документальное подтверждение отсутствует")

    # Проверка 3: Суммарный score
    if evidence.evidence_score < MIN_EVIDENCE_SCORE:
        reasons.append(
            f"Недостаточная доказательная база: score={evidence.evidence_score:.2f} "
            f"(минимум {MIN_EVIDENCE_SCORE})"
        )
        missing.append("Дополнительные документальные источники для подтверждения кода")

    # Проверка 4: Наличие исключений без включений
    exclusions_only = (
        any(n.note_type == "exclusion" and n.applies_to_code.startswith(evidence.proposed_code[:4]) for n in evidence.notes_found)
        and not any(n.note_type == "inclusion" for n in evidence.notes_found)
    )
    if exclusions_only:
        reasons.append(
            f"Найдено примечание-исключение для главы {evidence.proposed_code[:2]}, "
            "но не найдено явного включения данного товара в позицию"
        )
        missing.append("Явное включение товара в данную позицию ТН ВЭД")

    evidence.insufficiency_reasons = reasons
    evidence.missing_information = missing
    evidence.is_sufficient = len(reasons) == 0


def _extract_snippet(text: str, pattern: str, max_len: int) -> Optional[str]:
    """Извлечь фрагмент текста вокруг найденного паттерна."""
    match = re.search(pattern, text, re.IGNORECASE)
    if not match:
        return None
    start = max(0, match.start() - 50)
    end = min(len(text), match.end() + max_len)
    snippet = text[start:end].strip()
    return snippet if len(snippet) > 10 else None
