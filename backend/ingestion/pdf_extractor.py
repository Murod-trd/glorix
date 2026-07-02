"""
PDF Extractor — извлекает текст из PDF-пояснений к ТН ВЭД.

Особенности:
- Сохраняет иерархию: раздел → глава → подраздел
- Распознаёт тип контента: примечание, исключение, пример, определение, тело
- Сохраняет метаданные: файл, страница, глава ТН ВЭД

Выход: список Chunk — логических смысловых блоков из PDF.
"""

import re
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional
import fitz  # PyMuPDF


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

    def __post_init__(self):
        self.char_count = len(self.text)


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
    """
    Извлекает смысловые блоки из одного PDF-файла.
    """
    filepath = Path(filepath)
    doc = fitz.open(str(filepath))
    source_name = str(filepath)

    # Извлечь весь текст со структурой шрифтов
    raw_pages = []
    page_count = len(doc)
    for page_num, page in enumerate(doc, 1):
        blocks = page.get_text("dict")["blocks"]
        page_elements = []
        for block in blocks:
            if block.get("type") != 0:  # 0 = текст
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

    # Собрать параграфы из спанов
    paragraphs = _build_paragraphs(raw_pages)

    # Нарезать на смысловые чанки
    chunks = _build_chunks(paragraphs, source_name)

    print(f"[PDFExtractor] {source_name}: {len(chunks)} чанков из {page_count} страниц")
    return chunks


def extract_txt(filepath: str | Path) -> list[PdfChunk]:
    """Извлечь чанки из .txt-пояснения ТН ВЭД.

    Использует ТОТ ЖЕ чанкер, что и PDF (_build_chunks): одинаковые типы
    (note/exclusion/example), та же группа из имени файла (ru.NN_...). Страниц
    в TXT нет → page_num=1. 'Жирность' определяется эвристически по коротким
    строкам-заголовкам (Глава NN / Раздел / КАПС), чтобы работали распознавание
    глав, разделов и подзаголовков.
    """
    filepath = Path(filepath)
    source_name = filepath.name
    try:
        raw = filepath.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        raw = filepath.read_text(encoding="cp1251", errors="replace")

    paragraphs: list[dict] = []
    for block in re.split(r"\n\s*\n", raw):          # разбиваем по пустым строкам
        text = " ".join(line.strip() for line in block.splitlines()).strip()
        if not text:
            continue
        is_heading = len(text) < 150 and (
            re.match(r"^\s*(глава|раздел)\s", text, re.IGNORECASE) is not None
            or (text == text.upper() and any(ch.isalpha() for ch in text))
        )
        paragraphs.append({
            "text": text,
            "page": 1,
            "bold": is_heading,
            "size": 12 if is_heading else 10,
        })

    chunks = _build_chunks(paragraphs, str(filepath))
    print(f"[PDFExtractor] {source_name}: {len(chunks)} чанков из TXT")
    return chunks


def extract_all_pdfs(pdf_dir: str | Path) -> list[PdfChunk]:
    """Обработать все PDF и TXT в директории."""
    pdf_dir = Path(pdf_dir)
    all_chunks = []
    doc_files = sorted(pdf_dir.glob("**/*.pdf")) + sorted(pdf_dir.glob("**/*.txt"))
    print(f"[PDFExtractor] Найдено {len(doc_files)} документов (pdf+txt)")

    for doc_file in doc_files:
        try:
            if doc_file.suffix.lower() == ".txt":
                chunks = extract_txt(doc_file)
            else:
                chunks = extract_pdf(doc_file)
            all_chunks.extend(chunks)
        except Exception as e:
            print(f"[PDFExtractor] ОШИБКА {doc_file.name}: {e}")

    print(f"[PDFExtractor] Итого: {len(all_chunks)} чанков из {len(doc_files)} файлов")
    return all_chunks


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

            # Новый заголовок — сохранить предыдущий параграф, начать новый
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
                # Продолжить параграф
                if current_para["page"] != page:
                    # Смена страницы — проверить не начался ли новый блок
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
    current_chapter = _chapter_from_source(source_file)
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
        chunks.append(PdfChunk(
            text=text[:2000],  # ограничить 2000 символами
            chunk_type=chunk_type,
            source_file=source_file,
            page_num=buffer_page,
            chapter=current_chapter,
            section=current_section,
            heading=current_heading,
        ))
        buffer = []

    for para in paragraphs:
        text = para["text"].strip()
        if not text:
            continue

        # Распознать заголовок главы ТН ВЭД (например "Глава 73" или "ГЛАВА 73")
        chapter_match = re.search(r"глава\s+(\d+)", text, re.IGNORECASE)
        if chapter_match and para["bold"]:
            flush_buffer()
            current_chapter = chapter_match.group(1).zfill(2)
            current_heading = text
            continue

        # Распознать раздел ТН ВЭД
        section_match = re.search(r"раздел\s+([IVXLC]+|\d+)", text, re.IGNORECASE)
        if section_match and para["bold"] and len(text) < 100:
            flush_buffer()
            current_section = text
            continue

        # Распознать подзаголовок (жирный, короткий)
        if para["bold"] and len(text) < 150:
            flush_buffer()
            current_heading = text
            buffer.append(para)
            buffer_page = para["page"]
            continue

        # Переход на новый параграф при "примечани"
        if re.match(r"^\s*примечани", text, re.IGNORECASE):
            flush_buffer()
            buffer.append(para)
            buffer_page = para["page"]
            continue

        # Обычный текст — буферизировать
        if not buffer:
            buffer_page = para["page"]
        buffer.append(para)

        # Если буфер накопил достаточно — сохранить чанк
        total_len = sum(len(p["text"]) for p in buffer)
        if total_len > 800:
            flush_buffer()

    flush_buffer()
    return chunks


def _chapter_from_source(source_file: str) -> str:
    """Infer chapter from docs/explanations filenames such as ru.73_2022.pdf."""
    name = Path(source_file).name
    match = re.search(r"(?:^|[._-])ru\.(\d{2})(?:[._-]|$)", name, re.IGNORECASE)
    if match:
        return match.group(1)
    match = re.search(r"(?:^|[._-])(\d{2})(?:[._-]|$)", name)
    return match.group(1) if match else ""


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

    # Заголовки
    if len(text) < 120 and text == text.upper():
        return "heading"

    return "body"
