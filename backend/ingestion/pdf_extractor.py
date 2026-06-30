"""
PDF Extractor — извлекает текст из PDF-пояснений к ТН ВЭД.

Особенности:
- Сохраняет иерархию: раздел → глава → подраздел
- Распознаёт тип контента: примечание, исключение, пример, определение, тело
- Сохраняет метаданные: файл, страница, глава ТН ВЭД
- Оценивает качество извлечённого текста (text_quality_score)

Выход: список PdfChunk — логических смысловых блоков из PDF.
"""

import logging
import re
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional
import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

# Минимальный порог качества текста — ниже этого chunk исключается из evidence
MIN_TEXT_QUALITY_SCORE = 0.40


@dataclass
class PdfChunk:
    text: str
    chunk_type: str          # note|exclusion|example|definition|heading|body
    source_file: str
    page_num: int
    chapter: str             # Глава ТН ВЭД, к которой относится текст
    section: str
    heading: str             # Подзаголовок внутри главы
    char_count: int = 0
    text_quality_score: float = 1.0   # 0.0..1.0: доля читаемых символов
    text_quality_warning: str = ""    # описание проблемы если качество низкое

    def __post_init__(self):
        self.char_count = len(self.text)
        if self.text_quality_score == 1.0:
            self.text_quality_score, self.text_quality_warning = _assess_text_quality(self.text)


def _assess_text_quality(text: str) -> tuple[float, str]:
    """
    Оценить качество извлечённого текста PDF.

    Возвращает (score, warning):
      - score = доля нормальных символов (буквы, цифры, знаки препинания, пробелы)
      - warning = описание проблемы или "" если всё ОК

    Маркеры плохого качества:
      - Много заменяющих символов (·, □, ?, #)
      - Доля буквенно-цифровых символов < 40%
      - Очень короткий текст (< 10 значимых символов)
    """
    if not text or len(text) < 5:
        return 0.0, "Текст слишком короткий"

    # Считаем "мусорные" символы — типичные для плохой извлечения PDF
    garbage_chars = sum(1 for c in text if c in "·□▪▸►▶◆●○•▷▹◇■▪")
    replacement_chars = sum(1 for c in text if ord(c) in (0xFFFD, 0x0000, 0x001A))

    total = len(text)
    alphanumeric = sum(1 for c in text if c.isalnum())
    spaces = sum(1 for c in text if c.isspace())
    punctuation = sum(1 for c in text if c in ".,;:!?-–—()[]{}«»\"'")
    normal = alphanumeric + spaces + punctuation
    normal_ratio = normal / total if total > 0 else 0.0

    # Доля мусора
    garbage_ratio = (garbage_chars + replacement_chars) / total if total > 0 else 0.0

    # Итоговый score
    score = max(0.0, min(1.0, normal_ratio - garbage_ratio * 2))

    warning = ""
    if garbage_ratio > 0.3:
        warning = f"Много мусорных символов ({garbage_ratio:.0%}): возможна проблема кодировки PDF"
    elif normal_ratio < 0.5:
        warning = f"Низкое качество текста: {normal_ratio:.0%} читаемых символов"
    elif score < MIN_TEXT_QUALITY_SCORE:
        warning = f"Качество ниже порога {MIN_TEXT_QUALITY_SCORE:.0%}: score={score:.2f}"

    return round(score, 3), warning


# Паттерны для определения типа контента
_NOTE_PATTERNS = [
    r"^\s*примечани[еяй]",
    r"^\s*примечание\s+к\s+(субпозици|позици|разделу|главе)",
    r"^\s*\d+\.\s+в\s+данн",
    r"^\s*к\s+данной\s+(позиции|группе)\s+не\s+относятся",
]
_EXCLUSION_PATTERNS = [
    r"не\s+(включ|относ|входит|входят|применяется)",
    r"исключ[её]",
    r"кроме\s+(тех|того|случаев)",
    r"за\s+исключением",
    r"^\s*данная\s+позиция\s+не",
]
_EXAMPLE_PATTERNS = [
    r"наприм[её]р\s*[:\(]",
    r"в\s+частности\s*[:\(]",
    r"^\s*к\s+данной\s+позиции\s+относятся",
    r"^\s*в\s+эту\s+позицию\s+включ",
    r"^\s*в\s+том\s+числе",
]
_DEFINITION_PATTERNS = [
    r"понимается\s+(как|в\s+качестве)",
    r"означает\s+(любой|все)",
    r"термин\s+[«\"]",
    r"в\s+целях\s+(настоящей|данной|этой)\s+(позиции|главы|раздела)",
    r"^\s*для\s+целей\s+(настоящей|данной)",
]


def extract_pdf(filepath: str | Path) -> list[PdfChunk]:
    """Извлекает смысловые блоки из одного PDF-файла."""
    filepath = Path(filepath)
    doc = fitz.open(str(filepath))
    source_name = filepath.name
    page_count = len(doc)

    raw_pages = []
    for page_num, page in enumerate(doc, 1):
        blocks = page.get_text("dict")["blocks"]
        page_elements = []
        for block in blocks:
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    if not text:
                        continue
                    page_elements.append({
                        "text": text,
                        "size": span.get("size", 10),
                        "bold": "bold" in span.get("font", "").lower(),
                        "page": page_num,
                    })
        raw_pages.append(page_elements)

    doc.close()

    paragraphs = _build_paragraphs(raw_pages)
    chunks = _build_chunks(paragraphs, source_name)

    # Статистика качества
    low_quality = [c for c in chunks if c.text_quality_score < MIN_TEXT_QUALITY_SCORE]
    chunks_with_chapter = sum(1 for c in chunks if c.chapter)
    chunks_without_chapter = len(chunks) - chunks_with_chapter

    logger.info(
        "[PDFExtractor] %s: %d чанков из %d страниц "
        "(с главой: %d, без главы: %d, низкое качество: %d)",
        source_name, len(chunks), page_count,
        chunks_with_chapter, chunks_without_chapter, len(low_quality),
    )
    if low_quality:
        logger.warning(
            "[PDFExtractor] %s: %d чанков с низким quality score (< %.0f%%) — "
            "будут использоваться с пониженным весом evidence",
            source_name, len(low_quality), MIN_TEXT_QUALITY_SCORE * 100,
        )
    return chunks


def extract_all_pdfs(pdf_dir: str | Path) -> list[PdfChunk]:
    """Обработать все PDF в одной директории (рекурсивно)."""
    pdf_dir = Path(pdf_dir)
    all_chunks: list[PdfChunk] = []
    pdf_files = sorted(pdf_dir.glob("**/*.pdf"))
    logger.info("[PDFExtractor] Директория %s: найдено %d PDF", pdf_dir, len(pdf_files))

    for pdf_file in pdf_files:
        try:
            chunks = extract_pdf(pdf_file)
            all_chunks.extend(chunks)
        except Exception as e:
            logger.error("[PDFExtractor] ОШИБКА %s: %s", pdf_file.name, e)

    low_q = sum(1 for c in all_chunks if c.text_quality_score < MIN_TEXT_QUALITY_SCORE)
    logger.info(
        "[PDFExtractor] Итого из %s: %d чанков из %d файлов (низкое качество: %d)",
        pdf_dir, len(all_chunks), len(pdf_files), low_q,
    )
    return all_chunks


def extract_all_pdfs_from_dirs(pdf_dirs: list[str | Path]) -> tuple[list[PdfChunk], dict]:
    """
    Обработать PDF из нескольких директорий.

    Возвращает (chunks, stats) где stats содержит статистику по каждой директории.
    """
    all_chunks: list[PdfChunk] = []
    stats: dict = {}

    for pdf_dir in pdf_dirs:
        pdf_dir = Path(pdf_dir)
        if not pdf_dir.exists():
            logger.warning("[PDFExtractor] Директория не существует: %s", pdf_dir)
            stats[str(pdf_dir)] = {"exists": False, "pdf_count": 0, "chunk_count": 0}
            continue

        pdf_files = sorted(pdf_dir.glob("**/*.pdf"))
        dir_chunks = extract_all_pdfs(pdf_dir)
        all_chunks.extend(dir_chunks)

        low_q = sum(1 for c in dir_chunks if c.text_quality_score < MIN_TEXT_QUALITY_SCORE)
        with_chapter = sum(1 for c in dir_chunks if c.chapter)
        stats[str(pdf_dir)] = {
            "exists": True,
            "pdf_count": len(pdf_files),
            "chunk_count": len(dir_chunks),
            "chunks_with_chapter": with_chapter,
            "chunks_without_chapter": len(dir_chunks) - with_chapter,
            "low_quality_chunks": low_q,
        }

    return all_chunks, stats


def _build_paragraphs(raw_pages: list) -> list[dict]:
    """Собрать параграфы из отдельных спанов."""
    paragraphs = []
    current_para = {"text": "", "page": 1, "bold": False, "size": 10}

    for page_elements in raw_pages:
        for elem in page_elements:
            text = elem["text"]
            page = elem["page"]
            is_bold = elem["bold"]
            size = elem["size"]

            if is_bold and size > 10 and len(text) < 200:
                if current_para["text"].strip():
                    paragraphs.append(current_para)
                current_para = {
                    "text": text,
                    "page": page,
                    "bold": True,
                    "size": size,
                }
            else:
                if current_para["page"] != page:
                    if current_para["text"].strip() and len(current_para["text"]) > 100:
                        paragraphs.append(current_para)
                        current_para = {
                            "text": text,
                            "page": page,
                            "bold": False,
                            "size": size,
                        }
                        continue
                current_para["text"] += " " + text
                current_para["page"] = page

    if current_para["text"].strip():
        paragraphs.append(current_para)

    return paragraphs


def _build_chunks(paragraphs: list[dict], source_file: str) -> list[PdfChunk]:
    """Сгруппировать параграфы в смысловые чанки."""
    chunks = []
    current_chapter = ""
    current_section = ""
    current_heading = ""
    buffer = []
    buffer_page = 1

    def flush_buffer():
        nonlocal buffer, buffer_page
        if not buffer:
            return
        text = " ".join(p["text"] for p in buffer).strip()
        if len(text) < 30:
            buffer = []
            return
        chunk_type = _classify_text(text)
        quality_score, quality_warning = _assess_text_quality(text)
        chunks.append(PdfChunk(
            text=text[:2000],
            chunk_type=chunk_type,
            source_file=source_file,
            page_num=buffer_page,
            chapter=current_chapter,
            section=current_section,
            heading=current_heading,
            text_quality_score=quality_score,
            text_quality_warning=quality_warning,
        ))
        buffer = []

    for para in paragraphs:
        text = para["text"].strip()
        if not text:
            continue

        # HEURISTIC: Распознать заголовок главы ТН ВЭД
        chapter_match = re.search(r"глава\s+(\d+)", text, re.IGNORECASE)
        if chapter_match and para["bold"]:
            flush_buffer()
            current_chapter = chapter_match.group(1).zfill(2)
            current_heading = text
            continue

        # HEURISTIC: Распознать раздел ТН ВЭД
        section_match = re.search(r"раздел\s+([IVXLC]+|\d+)", text, re.IGNORECASE)
        if section_match and para["bold"] and len(text) < 100:
            flush_buffer()
            current_section = text
            continue

        if para["bold"] and len(text) < 150:
            flush_buffer()
            current_heading = text
            buffer.append(para)
            buffer_page = para["page"]
            continue

        if re.match(r"^\s*примечани", text, re.IGNORECASE):
            flush_buffer()
            buffer.append(para)
            buffer_page = para["page"]
            continue

        if not buffer:
            buffer_page = para["page"]
        buffer.append(para)

        total_len = sum(len(p["text"]) for p in buffer)
        if total_len > 800:
            flush_buffer()

    flush_buffer()
    return chunks


def _classify_text(text: str) -> str:
    """Определить тип чанка по его содержимому."""
    text_lower = text.lower()

    for pattern in _NOTE_PATTERNS:
        if re.search(pattern, text_lower):
            return "note"
    for pattern in _EXCLUSION_PATTERNS:
        if re.search(pattern, text_lower):
            return "exclusion"
    for pattern in _EXAMPLE_PATTERNS:
        if re.search(pattern, text_lower):
            return "example"
    for pattern in _DEFINITION_PATTERNS:
        if re.search(pattern, text_lower):
            return "definition"
    if len(text) < 120 and text == text.upper():
        return "heading"
    return "body"
