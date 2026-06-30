"""
product_feature_extractor.py — Шаг 1+2 pipeline: разбор описания и извлечение признаков товара.

Извлекает структурированные признаки из свободного текстового описания:
  - материал (сталь, пластик, алюминий, ...)
  - функция/назначение (насос, крепёж, ...)
  - размеры и технические параметры (ГОСТ, DIN, размеры)
  - степень обработки (сырьё / полуфабрикат / готовое изделие)
  - компонентность (простой товар / составной / комплект)
  - глава-кандидат по материалу

ВАЖНО: Этот модуль использует ТОЛЬКО regex и словари.
Никакого LLM. Никаких предположений — только то, что явно указано в тексте.
Если признак неизвестен — поле остаётся None, не угадывается.

Ограничение: эвристический разбор на основе русского языка.
Не гарантирует полноту — является дополнительным сигналом для pipeline.
"""

from __future__ import annotations
import re
from dataclasses import dataclass, field
from typing import Optional


# ── Словари признаков ──────────────────────────────────────────────────

# Материалы → глава ТН ВЭД (только явные упоминания)
MATERIAL_KEYWORDS: dict[str, tuple[str, str]] = {
    # (chapter, canonical_name)
    "чугун":           ("72", "чугун"),
    "сталь":           ("72", "сталь"),
    "стальной":        ("72", "сталь"),
    "нержавеющ":       ("72", "нержавеющая сталь"),
    "ферро":           ("72", "сплав на основе железа"),
    "железо":          ("72", "железо"),
    "железный":        ("72", "железо"),
    "медь":            ("74", "медь"),
    "медный":          ("74", "медь"),
    "латунь":          ("74", "латунь"),
    "бронза":          ("74", "бронза"),
    "алюминий":        ("76", "алюминий"),
    "алюминиев":       ("76", "алюминий"),
    "цинк":            ("79", "цинк"),
    "цинков":          ("79", "цинк"),
    "свинец":          ("78", "свинец"),
    "никель":          ("75", "никель"),
    "титан":           ("81", "титан"),
    "вольфрам":        ("81", "вольфрам"),
    "полиэтилен":      ("39", "полиэтилен"),
    "полипропилен":    ("39", "полипропилен"),
    "пвх":             ("39", "поливинилхлорид"),
    "пластмасс":       ("39", "пластмасса"),
    "пластик":         ("39", "пластмасса"),
    "полимер":         ("39", "полимер"),
    "акрил":           ("39", "акрил"),
    "нейлон":          ("39", "нейлон/полиамид"),
    "полиамид":        ("39", "полиамид"),
    "каучук":          ("40", "каучук/резина"),
    "резин":           ("40", "резина"),
    "дерев":           ("44", "древесина"),
    "древесин":        ("44", "древесина"),
    "фанер":           ("44", "фанера"),
    "стекло":          ("70", "стекло"),
    "стеклянн":        ("70", "стекло"),
    "бумаг":           ("48", "бумага"),
    "картон":          ("48", "картон"),
    "хлопок":          ("52", "хлопок"),
    "хлопчатобум":     ("52", "хлопок"),
    "шерсть":          ("51", "шерсть"),
    "шёлк":            ("50", "шёлк"),
    "лён":             ("53", "лён"),
    "кожа":            ("41", "кожа"),
    "кожаный":         ("42", "кожа"),
    "керамик":         ("69", "керамика"),
    "фарфор":          ("69", "фарфор"),
    "цемент":          ("25", "цемент"),
    "бетон":           ("25", "бетон"),
}

# Функции с "материало-зависимым" кодом (форма изделия, не функция)
# Если такая функция + есть явный материал → материал определяет главу
MATERIAL_DOMINANT_FUNCTIONS = {
    "труба", "лист", "пруток", "профиль", "полоса", "проволока",
    "арматур", "фитинг", "заготовка", "слиток",
}

# Функциональные категории → глава
FUNCTION_KEYWORDS: dict[str, tuple[str, str]] = {
    "насос":           ("84", "насос"),
    "компрессор":      ("84", "компрессор"),
    "клапан":          ("84", "клапан"),
    "редуктор":        ("84", "редуктор"),
    "подшипник":       ("84", "подшипник"),
    "вентилятор":      ("84", "вентилятор"),
    "двигатель":       ("84", "двигатель"),
    "мотор":           ("84", "электродвигатель"),
    "генератор":       ("85", "генератор"),
    "трансформатор":   ("85", "трансформатор"),
    "аккумулятор":     ("85", "аккумулятор"),
    "кабель":          ("85", "кабель"),
    "провод":          ("85", "провод"),
    "разъём":          ("85", "разъём"),
    "реле":            ("85", "реле"),
    "конденсатор":     ("85", "конденсатор"),
    "диод":            ("85", "диод/транзистор"),
    "транзистор":      ("85", "транзистор"),
    "микросхем":       ("85", "микросхема"),
    "процессор":       ("84", "процессор/ЭВМ"),
    "компьютер":       ("84", "компьютер"),
    "принтер":         ("84", "принтер"),
    "телефон":         ("85", "телефон"),
    "смартфон":        ("85", "смартфон"),
    "таблетк":         ("30", "лекарственный препарат"),
    "капсул":          ("30", "капсулы"),
    "лекарств":        ("30", "лекарство"),
    "препарат":        ("30", "препарат"),
    "вакцин":          ("30", "вакцина"),
    "инструмент":      ("82", "инструмент"),
    "сверло":          ("82", "сверло"),
    "болт":            ("73", "крепёж"),
    "гайка":           ("73", "крепёж"),
    "шайба":           ("73", "крепёж"),
    # "труба" намеренно НЕ здесь: форма изделия, главу определяет материал
    # "труба стальная" → 73 (от материала), "труба полиэтиленовая" → 39
    "арматур":         ("72", "арматура"),
    "автомобиль":      ("87", "автомобиль"),
    "трактор":         ("87", "трактор"),
    "самолёт":         ("88", "воздушное судно"),
    "корабль":         ("89", "судно"),
    "удобрени":        ("31", "удобрение"),
    "пестицид":        ("38", "пестицид"),
    "краск":           ("32", "краска/лак"),
    "лак":             ("32", "лак"),
    "мыло":            ("34", "мыло"),
    "шампунь":         ("33", "косметика"),
    "парфюм":          ("33", "парфюмерия"),
}

# Степень обработки
PROCESSING_KEYWORDS = {
    "сырьё": "raw",
    "руда": "raw",
    "концентрат": "semi",
    "слиток": "semi",
    "заготовка": "semi",
    "полуфабрикат": "semi",
    "прокат": "semi",
    "лист": "semi",
    "пруток": "semi",
    "готов": "finished",
    "изделие": "finished",
}

# Стандарты и нормы
STANDARD_PATTERN = re.compile(
    r"(?:гост|din|iso|en|tu|тu|ту|ansi|astm|bs|nf)\s*[\-р]?\s*\d+(?:[\/\.\-]\d+)?",
    re.IGNORECASE
)

# Размерные параметры
DIMENSION_PATTERN = re.compile(
    r"\b(\d+(?:[,\.]\d+)?)\s*"
    r"(мм|см|м\b|дм|кг|г\b|т\b|л\b|мл|вт|квт|в\b|а\b|гц|мпа|атм|бар|rpm|об/мин)",
    re.IGNORECASE
)


@dataclass
class ProductFeatures:
    """Структурированные признаки товара, извлечённые из описания."""
    # Исходное описание
    raw_description: str

    # Признаки (None = не определено из описания)
    materials: list[str] = field(default_factory=list)          # найденные материалы
    material_chapters: list[str] = field(default_factory=list)  # главы по материалам
    functions: list[str] = field(default_factory=list)          # функции/назначение
    function_chapters: list[str] = field(default_factory=list)  # главы по функциям
    dominant_chapter: Optional[str] = None                      # наиболее вероятная глава
    standards: list[str] = field(default_factory=list)          # ГОСТ, DIN, ISO
    dimensions: list[tuple[str, str]] = field(default_factory=list)  # (значение, ед.изм.)
    processing_level: Optional[str] = None                      # raw/semi/finished
    is_compound: bool = False                                    # составной товар
    is_set: bool = False                                         # комплект/набор
    missing_for_classification: list[str] = field(default_factory=list)  # чего не хватает

    def to_dict(self) -> dict:
        return {
            "materials": self.materials,
            "material_chapters": self.material_chapters,
            "functions": self.functions,
            "function_chapters": self.function_chapters,
            "dominant_chapter": self.dominant_chapter,
            "standards": self.standards,
            "dimensions": [{"value": v, "unit": u} for v, u in self.dimensions],
            "processing_level": self.processing_level,
            "is_compound": self.is_compound,
            "is_set": self.is_set,
            "missing_for_classification": self.missing_for_classification,
        }


def extract_features(description: str) -> ProductFeatures:
    """
    Извлечь структурированные признаки товара из описания.

    Использует только regex и словари.
    Не угадывает — если признак не найден в тексте, поле остаётся пустым.

    Args:
        description: Свободное текстовое описание товара

    Returns:
        ProductFeatures с заполненными полями
    """
    features = ProductFeatures(raw_description=description)
    desc_lower = description.lower()

    # ── Материалы ──────────────────────────────────────────────────────
    seen_mats = set()
    for keyword, (chapter, canonical) in MATERIAL_KEYWORDS.items():
        if keyword in desc_lower:
            if canonical not in seen_mats:
                features.materials.append(canonical)
                if chapter not in features.material_chapters:
                    features.material_chapters.append(chapter)
                seen_mats.add(canonical)

    # ── Функции ────────────────────────────────────────────────────────
    seen_funcs = set()
    for keyword, (chapter, canonical) in FUNCTION_KEYWORDS.items():
        if keyword in desc_lower:
            if canonical not in seen_funcs:
                features.functions.append(canonical)
                if chapter not in features.function_chapters:
                    features.function_chapters.append(chapter)
                seen_funcs.add(canonical)

    # ── Доминирующая глава ─────────────────────────────────────────────
    # Правило: реальная функция (насос/двигатель/телефон) важнее материала.
    # Форм-изделие (труба/лист) → главу определяет материал.
    # Это соответствует принципу ТН ВЭД: трубы из пластика → 39, из стали → 73.

    chapter_scores: dict[str, float] = {}
    for ch in features.function_chapters:
        chapter_scores[ch] = chapter_scores.get(ch, 0) + 2.0   # функция приоритетнее
    for ch in features.material_chapters:
        chapter_scores[ch] = chapter_scores.get(ch, 0) + 1.0

    # Специальные переопределения: крепёж (болт/гайка/шайба) всегда 73
    # (изделия из нержавеющей стали глава 73, а не 72 — 72 только прокат/слитки)
    if "крепёж" in features.functions:
        chapter_scores["73"] = chapter_scores.get("73", 0) + 3.0
        chapter_scores.pop("72", None)  # убрать конкурента "прокат стальной"
    # Арматура → 72 (прокат для строительства)
    if "арматура" in features.functions and "73" not in str(features.functions):
        chapter_scores["72"] = chapter_scores.get("72", 0) + 1.0

    # Если функция материало-зависима (нет реальных устройств) → материал главный
    material_dep_funcs = {"крепёж", "арматура"}
    real_device_funcs = set(features.functions) - material_dep_funcs
    if not real_device_funcs and features.material_chapters:
        # Повысить вес материала
        for ch in features.material_chapters:
            chapter_scores[ch] = chapter_scores.get(ch, 0) + 2.0

    if chapter_scores:
        features.dominant_chapter = max(chapter_scores, key=lambda k: chapter_scores[k])

    # ── Стандарты ──────────────────────────────────────────────────────
    features.standards = STANDARD_PATTERN.findall(description)

    # ── Размеры ────────────────────────────────────────────────────────
    features.dimensions = [
        (m.group(1), m.group(2).lower())
        for m in DIMENSION_PATTERN.finditer(description)
    ]

    # ── Степень обработки ──────────────────────────────────────────────
    for keyword, level in PROCESSING_KEYWORDS.items():
        if keyword in desc_lower:
            features.processing_level = level
            break
    if features.processing_level is None and (
        features.functions or features.standards or features.dimensions
    ):
        features.processing_level = "finished"  # эвристика: если есть параметры → готовое изделие

    # ── Составной товар ────────────────────────────────────────────────
    compound_markers = [" из ", " в сборе", " комплект", " набор", " с ", " и "]
    features.is_compound = any(m in desc_lower for m in compound_markers[:3])
    features.is_set = (
        any(m in desc_lower for m in [" комплект", " набор", " kit", " set"])
        or desc_lower.startswith("набор") or desc_lower.startswith("комплект")
        or desc_lower.startswith("kit ") or desc_lower.startswith("set ")
    )

    # ── Чего не хватает для классификации ─────────────────────────────
    missing = []
    if not features.materials and not features.functions:
        missing.append("Не указан материал изготовления и/или функция/назначение товара")
    if not features.materials and features.function_chapters and \
       any(ch in ("72","73","74","76") for ch in features.function_chapters):
        missing.append("Уточните материал: сталь, нержавеющая сталь, алюминий, медь?")
    if features.is_compound and not features.dominant_chapter:
        missing.append("Составной товар: укажите доминирующий материал или функцию")
    if features.processing_level is None:
        missing.append("Укажите степень обработки: сырьё, полуфабрикат или готовое изделие")
    features.missing_for_classification = missing

    return features
