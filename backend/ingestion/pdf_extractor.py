"""
pdf_extractor.py v8 — PDF extraction with mandatory text quality scoring.

Каждый PdfChunk ОБЯЗАН содержать:
  - text_quality_score (float 0..1)
  - text_quality_warning (str, пустая если всё ОК)
  - chapter (str, номер главы ТН ВЭД если найден)
  - source_file, page_num, chunk_type, section, heading

Chapter detection помечен как #HEURISTIC — алгоритм, не нормативный метод.
Low-quality chunks (score < MIN_TEXT_QUALITY_SCORE) индексируются, но
получают пониженный вес в evidence_builder.
"""
from __future__ import annotations

import re
import sys
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

# ── Константы ────────────────────────────────────────────────────────────────
MIN_TEXT_QUALITY_SCORE = 0.40   # Ниже этого — chunk помечается как low-quality
CHUNK_MAX_CHARS       = 1000    # Максимальный размер чанка в символах
CHUNK_MIN_CHARS       = 50      # Меньше этого — не индексировать
CHUNK_OVERLAP         = 100     # Перекрытие между чанками

# #HEURISTIC — паттерн определения главы ТН ВЭД из текста PDF
# Поддерживает: "Глава 73", "глава 73", "Glava 73", "glava 73", "Chapter 73", "chapter 73"
# НЕ является нормативным методом — только текстовый поиск.
CHAPTER_PATTERN = re.compile(
    r"(?:глава|glava|chapter)\s+(\d{1,2})",
    re.IGNORECASE | re.UNICODE,
)

# #HEURISTIC — мусорные символы (артефакты сканирования / broken кодировки)
GARBAGE_CHARS = set("·□▪▸►▶◆●○•▷▹◇■▪")


@dataclass
class PdfChunk:
    """Единица текста из PDF с обязательным text_quality_score."""
    text:                str
    chunk_type:          str          # "text", "heading", "note", "table"
    source_file:         str
    page_num:            int
    chapter:             str          # Номер главы ТН ВЭД ("73") или ""
    section:             str          # Подраздел, если найден
    heading:             str          # Заголовок блока
    char_count:          int  = 0
    text_quality_score:  float = 1.0  # 0.0..1.0 (1.0 = отличный текст)
    text_quality_warning: str = ""    # Пустая строка если качество OK


def _assess_text_quality(text: str) -> tuple[float, str]:
    """
    Вычислить качество текста PDF-чанка.

    Returns:
        (score, warning) где score ∈ [0.0, 1.0]
        1.0 = отличный читаемый текст
        0.0 = полный мусор (не индексировать как нормальный чанк)

    #HEURISTIC — соотношение нормальных символов к общему числу.
    Нормальные = буквы, цифры, пробелы, стандартная пунктуация.
    Мусор = спецсимволы сканирования, replacement chars (U+FFFD), нули.
    """
    total = len(text)
    if total == 0:
        return 0.0, "Пустой текст"

    garbage_count = sum(1 for c in text if c in GARBAGE_CHARS)
    replacement_count = sum(1 for c in text if ord(c) in (0xFFFD, 0x0000, 0x001A))
    alphanumeric = sum(1 for c in text if c.isalnum())
    spaces = sum(1 for c in text if c.isspace())
    punctuation = sum(1 for c in text if c in ".,;:!?-–—()[]{}«»\"'%/\\")

    normal = alphanumeric + spaces + punctuation
    normal_ratio   = normal / total
    garbage_ratio  = (garbage_count + replacement_count) / total

    # Штраф: garbage_ratio учитывается вдвойне
    score = max(0.0, min(1.0, normal_ratio - garbage_ratio * 2))

    warning = ""
    if score < MIN_TEXT_QUALITY_SCORE:
        warning = (
            f"Low quality text (score={score:.2f}): "
            f"normal={normal_ratio:.0%}, garbage={garbage_ratio:.0%}, "
            f"total_chars={total}"
        )
    elif garbage_ratio > 0.05:
        warning = f"Minor quality issue (garbage_ratio={garbage_ratio:.1%})"

    return score, warning


def _detect_chapter(text: str) -> str:
    """
    #HEURISTIC: Определить номер главы ТН ВЭД из текста.

    Паттерн поддерживает:
      "Глава 73", "глава 73", "Glava 73", "glava 73",
      "Chapter 73", "chapter 73"

    Возвращает: строку с номером ("73") или "" если не найден.
    """
    match = CHAPTER_PATTERN.search(text)
    if match:
        chapter_num = match.group(1)
        # Главы ТН ВЭД: 01..97 (ЕАЭС)
        num = int(chapter_num)
        if 1 <= num <= 97:
            return chapter_num.zfill(2)  # "73" не "7"
    return ""


def _extract_chapter_from_filename(filename: str) -> str:
    """
    #HEURISTIC: Определить главу из имени файла ЕЭК.

    Поддерживает форматы:
      ru.73_2022.pdf        → "73"
      ru.07_2022_fix.pdf    → "07"
      chapter73.pdf         → нет совпадения
    """
    # Формат ЕЭК: ru.NN_...
    m = re.match(r"ru\.(\d{2})_", Path(filename).name, re.IGNORECASE)
    if m:
        num = int(m.group(1))
        if 1 <= num <= 97:
            return m.group(1)
    return ""


def _split_into_chunks(text: str, page_num: int, source_file: str,
                        chapter_hint: str) -> list[PdfChunk]:
    """
    Разбить текст страницы на чанки.

    Размер: CHUNK_MIN_CHARS..CHUNK_MAX_CHARS символов с перекрытием CHUNK_OVERLAP.
    Chapter определяется из текста (поиск паттерна) с fallback на chapter_hint (из filename).
    """
    if not text or len(text.strip()) < CHUNK_MIN_CHARS:
        return []

    text = text.strip()
    chunks: list[PdfChunk] = []

    # Попробовать найти главу в тексте страницы
    chapter_from_text = _detect_chapter(text)
    chapter = chapter_from_text or chapter_hint

    # Разбить на блоки по CHUNK_MAX_CHARS с перекрытием
    start = 0
    while start < len(text):
        end = start + CHUNK_MAX_CHARS
        chunk_text = text[start:end]

        if len(chunk_text.strip()) < CHUNK_MIN_CHARS:
            break

        # Качество текста
        score, warning = _assess_text_quality(chunk_text)

        # Определить тип чанка
        chunk_type = "heading" if len(chunk_text) < 120 and "\n" not in chunk_text else "text"
        if re.search(r"примечани[ея]|note\s*\d|исключени[ея]", chunk_text, re.IGNORECASE):
            chunk_type = "note"

        chunks.append(PdfChunk(
            text=chunk_text,
            chunk_type=chunk_type,
            source_file=source_file,
            page_num=page_num,
            chapter=chapter,
            section="",
            heading="",
            char_count=len(chunk_text),
            text_quality_score=score,
            text_quality_warning=warning,
        ))

        start = end - CHUNK_OVERLAP
        if start >= len(text):
            break

    return chunks


def extract_pdf(pdf_path: str | Path) -> list[PdfChunk]:
    """
    Извлечь чанки из одного PDF-файла.

    Требует PyMuPDF (fitz). Если fitz не установлен → пустой список + warning.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        print(f"  [PDF] WARNING: PyMuPDF не установлен. pip install pymupdf")
        return []

    pdf_path = Path(pdf_path)
    # #HEURISTIC: определить главу из имени файла (fallback для страниц без явного упоминания)
    chapter_from_filename = _extract_chapter_from_filename(pdf_path.name)

    chunks: list[PdfChunk] = []
    try:
        doc = fitz.open(str(pdf_path))
        for page_num, page in enumerate(doc, 1):
            text = page.get_text("text")
            page_chunks = _split_into_chunks(
                text,
                page_num=page_num,
                source_file=pdf_path.name,
                chapter_hint=chapter_from_filename,
            )
            chunks.extend(page_chunks)
        doc.close()
    except Exception as e:
        print(f"  [PDF] ERROR: {pdf_path.name}: {e}")

    return chunks


def extract_all_pdfs_from_dirs(
    pdf_dirs: list[str | Path],
) -> tuple[list[PdfChunk], dict]:
    """
    Извлечь чанки из всех PDF в списке директорий.

    Returns:
        (all_chunks, dir_stats) где dir_stats — словарь статистики по каждой директории.
    """
    all_chunks: list[PdfChunk] = []
    dir_stats: dict[str, dict] = {}

    for pdf_dir in pdf_dirs:
        pdf_dir = Path(pdf_dir)
        dir_key = str(pdf_dir)
        stats: dict = {
            "exists": pdf_dir.exists(),
            "pdf_count": 0,
            "chunk_count": 0,
            "chunks_with_chapter": 0,
            "chunks_without_chapter": 0,
            "low_quality_chunks": 0,
        }

        if not pdf_dir.exists():
            dir_stats[dir_key] = stats
            continue

        pdf_files = sorted(pdf_dir.glob("**/*.pdf"))
        stats["pdf_count"] = len(pdf_files)

        for pdf_file in pdf_files:
            file_chunks = extract_pdf(pdf_file)
            all_chunks.extend(file_chunks)
            stats["chunk_count"] += len(file_chunks)
            for ch in file_chunks:
                if ch.chapter:
                    stats["chunks_with_chapter"] += 1
                else:
                    stats["chunks_without_chapter"] += 1
                if ch.text_quality_score < MIN_TEXT_QUALITY_SCORE:
                    stats["low_quality_chunks"] += 1

        dir_stats[dir_key] = stats
        print(
            f"  [PDF] {pdf_dir}: "
            f"{stats['pdf_count']} PDF → {stats['chunk_count']} chunks "
            f"(с главой: {stats['chunks_with_chapter']}, "
            f"без главы: {stats['chunks_without_chapter']}, "
            f"low-quality: {stats['low_quality_chunks']})"
        )

    return all_chunks, dir_stats
