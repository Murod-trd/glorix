"""
Excel Parser — читает коды ТН ВЭД из Excel-файла.

Ожидаемый формат столбцов (гибкий, автоопределяется):
  - Код ТН ВЭД (10 цифр или меньше для групп/подгрупп)
  - Описание (наименование)
  - Доп. единица измерения (опционально)
  - Ставка пошлины (опционально)

Выход: список dict со следующими полями:
  code, section, chapter, heading, subheading,
  description, full_text, level
"""

import re
import pandas as pd
from pathlib import Path
from typing import Optional


def parse_excel(filepath: str | Path) -> list[dict]:
    """
    Читает Excel с кодами ТН ВЭД.
    Возвращает список записей с иерархией section→chapter→heading→subheading→code.
    """
    filepath = Path(filepath)
    if not filepath.exists():
        raise FileNotFoundError(f"Excel файл не найден: {filepath}")

    # Попробовать все листы, взять первый непустой
    xl = pd.ExcelFile(filepath)
    df = None
    for sheet in xl.sheet_names:
        candidate = pd.read_excel(filepath, sheet_name=sheet, header=None, dtype=str)
        if len(candidate) > 100:
            df = candidate
            break
    if df is None:
        raise ValueError("Не удалось найти лист с данными ТН ВЭД")

    df = df.fillna("")

    # Найти столбцы: код и описание
    code_col, desc_col = _detect_columns(df)

    records = []
    current_section = ""
    current_chapter = ""
    current_heading = ""

    for _, row in df.iterrows():
        raw_code = str(row[code_col]).strip()
        description = str(row[desc_col]).strip()

        if not description:
            continue

        code_clean = re.sub(r"[\s\-]", "", raw_code)

        # Определить уровень иерархии по коду
        level = _classify_level(code_clean, description)

        if level == "section":
            current_section = description
            continue
        elif level == "chapter":
            current_chapter = description
            current_heading = ""
            continue
        elif level == "heading":
            current_heading = description
            continue

        # Нормализовать код до 10 цифр
        normalized = _normalize_code(code_clean)

        # Определить section/chapter из кода
        chapter_num = normalized[:2] if len(normalized) >= 2 else ""
        heading_num = normalized[:4] if len(normalized) >= 4 else ""

        record = {
            "code": normalized,
            "raw_code": raw_code,
            "level": level,
            "section": current_section,
            "chapter": chapter_num,
            "heading": heading_num,
            "description": description,
            # Полный текст для embedding: код + описание + контекст
            "full_text": _build_full_text(normalized, description, current_chapter, current_section),
            # Дополнительные поля если есть
            "extra": {k: str(row[k]).strip() for k in df.columns
                      if k not in [code_col, desc_col] and str(row[k]).strip()},
        }
        records.append(record)

    print(f"[ExcelParser] Загружено {len(records)} записей из {filepath.name}")
    return records


def _detect_columns(df: pd.DataFrame) -> tuple[int, int]:
    """Автоопределение столбцов кода и описания."""
    # Ищем столбец, где первые непустые значения похожи на коды ТН ВЭД
    for col_idx in range(min(5, len(df.columns))):
        col_values = df.iloc[:, col_idx].dropna().astype(str)
        non_empty = col_values[col_values.str.strip() != ""]
        code_like = non_empty.str.match(r"^\s*\d[\d\s\-]{0,14}\d\s*$")
        if code_like.sum() > len(non_empty) * 0.3:
            # Следующий столбец с длинными строками — описание
            for desc_idx in range(col_idx + 1, min(col_idx + 4, len(df.columns))):
                desc_values = df.iloc[:, desc_idx].dropna().astype(str)
                desc_non_empty = desc_values[desc_values.str.strip() != ""]
                if desc_non_empty.str.len().mean() > 20:
                    return col_idx, desc_idx
    # Fallback: первые два столбца
    return 0, 1


def _classify_level(code: str, description: str) -> str:
    """Определить уровень иерархии записи."""
    desc_lower = description.lower()

    # Нет цифрового кода → структурный элемент
    if not re.search(r"\d", code):
        if any(w in desc_lower for w in ["раздел", "section"]):
            return "section"
        return "section"

    digits = re.sub(r"\D", "", code)

    if len(digits) == 0:
        return "section"
    elif len(digits) <= 2:
        return "chapter"
    elif len(digits) <= 4:
        return "heading"
    elif len(digits) <= 6:
        return "subheading"
    else:
        return "code"  # 8–10 цифр — конечный код


def _normalize_code(raw: str) -> str:
    """Привести код к 10-значному формату."""
    digits = re.sub(r"\D", "", raw)
    if len(digits) < 10:
        digits = digits.ljust(10, "0")
    return digits[:10]


def _build_full_text(code: str, description: str,
                     chapter: str, section: str) -> str:
    """Строит полный текст записи для embedding."""
    parts = [f"Код ТН ВЭД: {code}"]
    if section:
        parts.append(f"Раздел: {section[:100]}")
    if chapter:
        parts.append(f"Глава: {chapter[:100]}")
    parts.append(f"Описание: {description}")
    return " | ".join(parts)
