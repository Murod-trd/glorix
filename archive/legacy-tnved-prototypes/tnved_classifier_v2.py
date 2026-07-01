"""
GLORIX — Two-Step TN VED Classifier v2
========================================
Архитектура: Extract → Filter → Rank

Шаг 1  OpenAI Structured Outputs + Pydantic → строгий JSON с метаданными
Шаг 2  Программный фильтр: 4-значная позиция + исключение чужих типов
Шаг 3  LLM ранжирует топ-3 кандидата → один 10-значный код

Установка:
    pip install openai pydantic

Использование:
    export OPENAI_API_KEY=sk-...
    python tnved_classifier_v2.py
"""

import os
import re
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
from openai import OpenAI

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", "YOUR_KEY"))


# ══════════════════════════════════════════════════════════════════════════════
#  БАЗА ТН ВЭД  (билингвальная: рус + eng — нужно для обоих этапов)
# ══════════════════════════════════════════════════════════════════════════════

TNVED_DB = [
    # ── 7318 БОЛТЫ ──────────────────────────────────────────────────────────
    {"code": "7318110009", "desc": "шуруп по дереву глухарь",
     "en": "wood screw coach screw lag screw carbon steel",
     "type": "screw",   "stainless": False},

    {"code": "7318120009", "desc": "саморез по металлу прессшайба",
     "en": "self-tapping screw tek screw carbon steel",
     "type": "screw",   "stainless": False},

    {"code": "7318140009", desc: "саморез нержавеющий а2",
     "en": "self-tapping screw stainless steel A2 A4",
     "type": "screw",   "stainless": True},

    {"code": "7318151001", "desc": "болт шестигранный нержавеющий а2 а4",
     "en": "hex bolt fully threaded stainless steel A2 A4",
     "type": "bolt",    "stainless": True},

    {"code": "7318158201", "desc": "болт шестигранный нержавейка а2",
     "en": "hex bolt stainless steel A2 corrosion resistant",
     "type": "bolt",    "stainless": True},

    {"code": "7318159000", "desc": "болт шестигранный стальной оцинкованный",
     "en": "hex bolt carbon steel zinc black",
     "type": "bolt",    "stainless": False},

    {"code": "7318149900", "desc": "шпилька резьбовая стержень",
     "en": "threaded rod stud bolt carbon steel",
     "type": "bolt",    "stainless": False},

    # ── 7318 ГАЙКИ ──────────────────────────────────────────────────────────
    {"code": "7318160000", "desc": "гайка шестигранная стальная оцинкованная",
     "en": "hex nut carbon steel zinc galvanized",
     "type": "nut",     "stainless": False},

    {"code": "7318161000", "desc": "гайка шестигранная нержавеющая а2",
     "en": "hex nut stainless steel A2 A4",
     "type": "nut",     "stainless": True},

    {"code": "7318163000", "desc": "гайка самоконтрящаяся корончатая",
     "en": "lock nut nyloc nut flanged nut",
     "type": "nut",     "stainless": False},

    {"code": "7318164000", "desc": "гайка высокая удлинённая муфтовая",
     "en": "coupling nut high nut sleeve nut",
     "type": "nut",     "stainless": False},

    # ── 7318 ШАЙБЫ ──────────────────────────────────────────────────────────
    {"code": "7318210000", "desc": "шайба пружинная гровер разрезная",
     "en": "spring washer lock washer split washer helical Grover",
     "type": "washer",  "stainless": False},

    {"code": "7318220009", "desc": "шайба плоская стальная оцинкованная",
     "en": "plain washer flat washer carbon steel zinc",
     "type": "washer",  "stainless": False},

    {"code": "7318229000", "desc": "шайба плоская нержавеющая а2",
     "en": "plain washer flat washer stainless steel A2 A4",
     "type": "washer",  "stainless": True},

    # ── 7318 АНКЕРЫ / ГВОЗДИ ────────────────────────────────────────────────
    {"code": "7318290000", "desc": "анкер распорный химический",
     "en": "expansion anchor chemical anchor anchor bolt",
     "type": "anchor",  "stainless": False},

    {"code": "7317000000", "desc": "гвоздь строительный стальной",
     "en": "nail construction brad nail steel",
     "type": "nail",    "stainless": False},

    # ── 8207 СВЁРЛА БУРЫ ────────────────────────────────────────────────────
    {"code": "8207130009", "desc": "бур sds-plus по бетону кирпичу",
     "en": "SDS-plus SDS-max rotary hammer drill bit concrete masonry",
     "type": "drill_bit", "stainless": False},

    {"code": "8207190009", "desc": "сверло по металлу кобальтовое спиральное",
     "en": "HSS cobalt twist drill bit metal",
     "type": "drill_bit", "stainless": False},

    # ── 7214 АРМАТУРА ───────────────────────────────────────────────────────
    {"code": "7214200000", "desc": "арматура рифлёная горячекатаная",
     "en": "rebar deformed reinforcing bar hot rolled",
     "type": "rebar",   "stainless": False},

    # ── 6307 СТРОПЫ ─────────────────────────────────────────────────────────
    {"code": "6307909800", "desc": "строп текстильный петлевой ленточный",
     "en": "textile sling lifting strap synthetic webbing",
     "type": "sling",   "stainless": False},

    # ── 3920 ПЛЁНКИ ─────────────────────────────────────────────────────────
    {"code": "3920102800", "desc": "плёнка полиэтиленовая тонкая до 0.125 мм",
     "en": "polyethylene PE film thin <= 0.125mm",
     "type": "film",    "stainless": False},

    {"code": "3920102500", "desc": "плёнка полиэтиленовая толстая более 0.125 мм",
     "en": "polyethylene PE film thick > 0.125mm",
     "type": "film",    "stainless": False},

    # ── 7019 СЕРПЯНКА ───────────────────────────────────────────────────────
    {"code": "7019690000", "desc": "серпянка стеклосетка рулон более 30 см",
     "en": "fiberglass mesh serpyanka woven > 30cm",
     "type": "mesh",    "stainless": False},

    # ── 4203 / 6116 ПЕРЧАТКИ ────────────────────────────────────────────────
    {"code": "4203210000", "desc": "краги сварщика кожаные защитные",
     "en": "leather protective gloves welding gauntlet",
     "type": "glove",   "stainless": False},

    {"code": "6116920000", "desc": "перчатки трикотажные хлопковые рабочие",
     "en": "knitted cotton work gloves jersey",
     "type": "glove",   "stainless": False},

    {"code": "6116102000", "desc": "перчатки с нитриловым ПВХ покрытием",
     "en": "knitted gloves nitrile PVC coated work",
     "type": "glove",   "stainless": False},

    # ── 9015 НИВЕЛИРЫ ───────────────────────────────────────────────────────
    {"code": "9015800000", "desc": "нивелир лазерный уровень строительный",
     "en": "laser level rotary laser line level surveying",
     "type": "instrument", "stainless": False},

    # ── 8544 КАБЕЛЬ ─────────────────────────────────────────────────────────
    {"code": "8544421900", "desc": "кабель ВВГ медный силовой",
     "en": "electric cable copper VVG power insulated",
     "type": "cable",   "stainless": False},
]


# ══════════════════════════════════════════════════════════════════════════════
#  ШАГ 1 — Pydantic-модели + Structured Outputs
# ══════════════════════════════════════════════════════════════════════════════

class ProductType(str, Enum):
    bolt        = "bolt"
    nut         = "nut"
    washer      = "washer"
    screw       = "screw"
    anchor      = "anchor"
    nail        = "nail"
    drill_bit   = "drill_bit"
    rebar       = "rebar"
    sling       = "sling"
    film        = "film"
    mesh        = "mesh"
    glove       = "glove"
    cable       = "cable"
    instrument  = "instrument"
    other       = "other"

class Material(str, Enum):
    stainless_steel = "stainless_steel"   # A2, A4, нержавейка
    carbon_steel    = "carbon_steel"      # чёрная, оцинк, DIN
    plastic         = "plastic"
    rubber          = "rubber"
    leather         = "leather"
    synthetic       = "synthetic"
    other           = "other"

class ProductParams(BaseModel):
    """Структурированные параметры товара — результат Шага 1."""
    product_type: ProductType = Field(
        description="Тип товара: bolt/nut/washer/screw/anchor/nail/drill_bit/rebar/sling/film/mesh/glove/cable/instrument/other"
    )
    sub_type: str = Field(
        description="Уточнение типа: hex/spring/plain/sleeve/flat/self-tapping/SDS-plus и т.д."
    )
    material: Material = Field(
        description="Материал"
    )
    has_thread: bool = Field(
        description="True только если сам товар ЯВЛЯЕТСЯ резьбовым (болт/гайка/шуруп). Шайбы/пластины/плёнки = false."
    )
    predicted_4_digit: str = Field(
        description="Первые 4 цифры кода ТН ВЭД, например '7318', '8207', '6307'"
    )
    technical_english_name: str = Field(
        description="Точное таможенное наименование на английском"
    )


STEP1_SYSTEM = """You are a senior customs broker specializing in EAEU TN VED (HS Code) classification.
Analyze the product description and fill in the JSON fields precisely.

Critical rules:
- washer (шайба) → has_thread: false, product_type: washer
- nut (гайка) → has_thread: true, product_type: nut  
- bolt (болт) → has_thread: true, product_type: bolt
- spring washer / lock washer / Grover → sub_type: spring
- plain / flat washer → sub_type: plain
- A2 / A4 / нержавейка / нержав / stainless → material: stainless_steel
- SDS, бур, сверло → product_type: drill_bit, predicted_4_digit: 8207"""


def step1_extract(product_name: str) -> ProductParams:
    """Шаг 1: Structured Outputs → Pydantic-объект с метаданными."""
    completion = client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": STEP1_SYSTEM},
            {"role": "user",   "content": f"Product: {product_name}"},
        ],
        response_format=ProductParams,
        temperature=0,
    )
    return completion.choices[0].message.parsed


# ══════════════════════════════════════════════════════════════════════════════
#  ШАГ 2 — Умный фильтр: 4-знак + исключение чужих типов
# ══════════════════════════════════════════════════════════════════════════════

# Типы, несовместимые с каждым product_type.
# Если ищем шайбу — в результатах не должно быть болтов и гаек.
INCOMPATIBLE = {
    "bolt":       {"washer", "nut", "screw", "nail", "anchor"},
    "nut":        {"washer", "bolt", "screw", "nail", "anchor"},
    "washer":     {"bolt", "nut", "screw", "nail", "anchor"},
    "screw":      {"washer", "nut", "bolt", "nail", "anchor"},
    "anchor":     {"washer", "bolt", "nut", "screw", "nail"},
    "nail":       {"washer", "bolt", "nut", "screw", "anchor"},
    "drill_bit":  set(),   # только буры/свёрла
    "rebar":      set(),
    "sling":      set(),
    "film":       set(),
    "mesh":       set(),
    "glove":      set(),
    "cable":      set(),
    "instrument": set(),
    "other":      set(),
}


def step2_filter(params: ProductParams) -> list[dict]:
    """
    Шаг 2: Фильтрация базы.
    1. Берём только записи с нужным 4-значным prefixом.
    2. Исключаем записи с типом из INCOMPATIBLE[product_type].
    3. Если не нашли — возвращаем все записи с нужным prefix (graceful fallback).
    4. Если нержавейка — приоритет stainless=True записям.
    """
    heading    = params.predicted_4_digit.strip()
    ptype      = params.product_type.value
    is_ss      = params.material == Material.stainless_steel
    bad_types  = INCOMPATIBLE.get(ptype, set())

    # 1. Фильтр по 4-значной позиции
    pool = [e for e in TNVED_DB if e["code"].startswith(heading)]
    if not pool:
        pool = list(TNVED_DB)  # fallback: вся база

    # 2. Исключаем несовместимые типы (ключевой барьер)
    filtered = [e for e in pool if e.get("type", "other") not in bad_types]
    if not filtered:
        filtered = pool  # не перефильтровываем до пустого множества

    # 3. Фильтр по типу — оставляем только нужный тип
    typed = [e for e in filtered if e.get("type") == ptype]
    if typed:
        filtered = typed

    # 4. Нержавейка — приоритет
    if is_ss:
        ss = [e for e in filtered if e.get("stainless", False)]
        if ss:
            filtered = ss

    return filtered[:3]  # топ-3 кандидата


# ══════════════════════════════════════════════════════════════════════════════
#  ШАГ 3 — LLM выбирает лучший код из топ-3
# ══════════════════════════════════════════════════════════════════════════════

class FinalChoice(BaseModel):
    """Результат Шага 3."""
    code: str = Field(description="10-значный код ТН ВЭД, ровно 10 цифр")
    reason: str = Field(description="Одно предложение — почему именно этот код")


def step3_rank(product_name: str, params: ProductParams, candidates: list[dict]) -> FinalChoice:
    """Шаг 3: LLM выбирает один код из отфильтрованных кандидатов."""
    if not candidates:
        return FinalChoice(code="", reason="Кандидатов не найдено")
    if len(candidates) == 1:
        return FinalChoice(code=candidates[0]["code"], reason="Единственный кандидат")

    lines = "\n".join(
        f"- {e['code']}: {e['desc']} / {e['en']}"
        for e in candidates
    )
    user_msg = (
        f"Товар: {product_name}\n"
        f"Тип: {params.product_type.value}, Подтип: {params.sub_type}, "
        f"Материал: {params.material.value}, Резьба: {params.has_thread}\n\n"
        f"Кандидаты:\n{lines}"
    )

    completion = client.beta.chat.completions.parse(
        model="gpt-4o",
        messages=[
            {"role": "system", "content":
             "Ты старший таможенный брокер ЕАЭС. "
             "Выбери ОДИН точный 10-значный код ТН ВЭД из списка кандидатов. "
             "Верни ровно 10 цифр в поле code и краткое обоснование в reason."},
            {"role": "user", "content": user_msg},
        ],
        response_format=FinalChoice,
        temperature=0,
    )
    return completion.choices[0].message.parsed


# ══════════════════════════════════════════════════════════════════════════════
#  ГЛАВНЫЙ ПАЙПЛАЙН
# ══════════════════════════════════════════════════════════════════════════════

def classify(product_name: str) -> dict:
    print(f"\n{'═'*60}")
    print(f"📦  Товар: {product_name}")

    # ── Шаг 1 ──
    params = step1_extract(product_name)
    print(f"\n  ├─ Шаг 1 (параметры):")
    print(f"  │   type={params.product_type.value}  sub={params.sub_type}")
    print(f"  │   material={params.material.value}  thread={params.has_thread}")
    print(f"  │   heading={params.predicted_4_digit}")
    print(f"  │   en_name={params.technical_english_name}")

    # ── Шаг 2 ──
    candidates = step2_filter(params)
    print(f"\n  ├─ Шаг 2 (фильтр → {len(candidates)} кандидата):")
    for c in candidates:
        print(f"  │   {c['code']}  {c['desc']}")

    # ── Шаг 3 ──
    result = step3_rank(product_name, params, candidates)
    print(f"\n  └─ Шаг 3 ✅  {result.code}")
    print(f"     {result.reason}")

    return {
        "product":    product_name,
        "code":       result.code,
        "reason":     result.reason,
        "params":     params.model_dump(),
        "candidates": [c["code"] for c in candidates],
    }


# ══════════════════════════════════════════════════════════════════════════════
#  ТЕСТ — проблемные случаи
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    tests = [
        # ── Классические путаницы ──────────────────────────────────────────
        "ШАЙБА M10 A2 гровер",             # → 7318210000 (пружинная, не болт)
        "ГАЙКА M10 A2 нержавеющая",        # → 7318161000 (гайка SS, не болт)
        "БОЛТ М8×50 A2 шестигранный",      # → 7318158201 (болт SS)
        "Шайба плоская М6 оцинкованная",   # → 7318220009 (плоская, не spring)
        "Саморез 4.2×25 по металлу",       # → 7318120009 (screw)
        "Гайка самоконтрящаяся М12",       # → 7318163000

        # ── Другие типы ────────────────────────────────────────────────────
        "Бур SDS-plus 10×160 по бетону",   # → 8207130009
        "Серпянка 1м рулон стеклосетка",   # → 7019690000
        "Плёнка ПЭ 43 мкм прозрачная",    # → 3920102800
        "Краги сварщика кожаные",          # → 4203210000
        "Перчатки х/б трикотажные",        # → 6116920000
    ]

    results = []
    for t in tests:
        try:
            r = classify(t)
            results.append(r)
        except Exception as e:
            print(f"  ✗ Ошибка: {e}")

    print(f"\n{'═'*60}")
    print("ИТОГОВАЯ ТАБЛИЦА:")
    print(f"{'Товар':<35} {'Код':>12}  Обоснование")
    print("─" * 80)
    for r in results:
        print(f"{r['product']:<35} {r['code']:>12}  {r['reason'][:40]}")
