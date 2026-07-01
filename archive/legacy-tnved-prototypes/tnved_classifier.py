"""
GLORIX — Two-Step TN VED Classification Engine
================================================
Шаг 1: LLM парсит товар → структурированный JSON (материал, тип, глава)
Шаг 2: Фильтрация базы СТРОГО внутри 4-значной позиции + исключение ошибок
Шаг 3: LLM выбирает идеальный 10-значный код из топ-5 кандидатов
"""

import json, re, os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", "YOUR_KEY_HERE"))

# ─────────────────────────────────────────────────────────────────────────────
# БАЗА ТН ВЭД — расширенная, с разделением болт/гайка/шайба
# ─────────────────────────────────────────────────────────────────────────────
TNVED_DB = [
    # ── 7318 Крепёж ────────────────────────────────────────────────────────
    {"code": "7318110009", "desc": "wood screws self-tapping carbon steel"},
    {"code": "7318120009", "desc": "self-tapping screw metal tek screw carbon steel"},
    {"code": "7318140009", "desc": "self-tapping screw stainless steel A2 A4"},
    {"code": "7318149900", "desc": "coach screw lag screw wood bolt carbon steel"},
    {"code": "7318151001", "desc": "hex bolt stainless steel A2 corrosion-resistant threaded"},
    {"code": "7318158201", "desc": "hex bolt stainless steel A2 A4 fully threaded"},
    {"code": "7318159000", "desc": "hex bolt carbon steel black zinc-plated threaded"},
    {"code": "7318160000", "desc": "hex nut carbon steel zinc galvanized threaded"},
    {"code": "7318161000", "desc": "hex nut stainless steel A2 A4 threaded"},
    {"code": "7318210000", "desc": "spring washer lock washer split washer Grover helical"},
    {"code": "7318220009", "desc": "plain washer flat washer carbon steel zinc"},
    {"code": "7318229000", "desc": "plain washer flat washer stainless steel A2 A4"},
    {"code": "7318290000", "desc": "anchor bolt expansion anchor chemical anchor fastener"},

    # ── 8207 Буры SDS / свёрла ──────────────────────────────────────────────
    {"code": "8207130009", "desc": "SDS-plus SDS-max rotary hammer drill bit concrete"},
    {"code": "8207190009", "desc": "drill bit metal HSS twist drill interchangeable"},
    {"code": "8207400000", "desc": "tapping threading tool tap die set"},

    # ── 7214 Арматура ────────────────────────────────────────────────────────
    {"code": "7214200000", "desc": "rebar deformed reinforcing bar steel hot-rolled"},
    {"code": "7214300000", "desc": "round bar steel bright drawn"},

    # ── 8544 Кабель ──────────────────────────────────────────────────────────
    {"code": "8544421900", "desc": "electric cable copper VVG power cable insulated"},
    {"code": "8544491900", "desc": "electric wire copper stranded insulated low voltage"},

    # ── 3920 Плёнки ──────────────────────────────────────────────────────────
    {"code": "3920102800", "desc": "polyethylene PE film sheet <= 0.125mm thin"},
    {"code": "3920102500", "desc": "polyethylene PE film sheet > 0.125mm thick"},

    # ── 7019 Стекловолокно ───────────────────────────────────────────────────
    {"code": "7019690000", "desc": "fiberglass mesh serpyanka woven fabric > 30cm"},
    {"code": "7019610000", "desc": "fiberglass woven fabric <= 30cm narrow"},

    # ── 4203 / 6116 Перчатки ────────────────────────────────────────────────
    {"code": "4203210000", "desc": "leather protective gloves welding kraги gauntlet"},
    {"code": "6116920000", "desc": "knitted cotton work gloves jersey"},
    {"code": "6116100009", "desc": "rubber latex coated gloves protective"},

    # ── 9015 Нивелиры ────────────────────────────────────────────────────────
    {"code": "9015800000", "desc": "laser level rotary laser line level surveying"},

    # ── 8205 / 8204 Ручной инструмент ───────────────────────────────────────
    {"code": "8204110000", "desc": "open end wrench spanner hand tool manual"},
    {"code": "8205590000", "desc": "hand tool caulking gun manual staple gun"},
    {"code": "8201300000", "desc": "shovel spade pick axe hand tool"},

    # ── 8467 Электроинструмент ───────────────────────────────────────────────
    {"code": "8467219000", "desc": "electric drill rotary hammer power tool Makita Bosch"},
    {"code": "8467810000", "desc": "chain saw electric power tool"},

    # ── 3214 Герметики ───────────────────────────────────────────────────────
    {"code": "3214100000", "desc": "silicone sealant construction sealant glaziers putty"},
    {"code": "3214901000", "desc": "finishing putty wall filler gypsum-based"},

    # ── 7306 Трубы ───────────────────────────────────────────────────────────
    {"code": "7306409100", "desc": "steel pipe tube black carbon welded"},
    {"code": "7306610000", "desc": "stainless steel pipe tube welded"},

    # ── 6307 Стропы ──────────────────────────────────────────────────────────
    {"code": "6307909800", "desc": "textile sling lifting strap synthetic webbing"},
]

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — LLM: коммерческое описание → структурированный JSON
# ─────────────────────────────────────────────────────────────────────────────
STEP1_SYSTEM = """You are a customs classification expert (HS / TN VED EAEU).
Analyze the product and return ONLY a JSON object with these fields:
- "technical_english_name": precise customs terminology (e.g. "spring washer, split type")
- "material": e.g. "stainless steel A2", "carbon steel", "polyethylene", "rubber"
- "has_thread": true only if the item IS threaded (bolt/screw/nut). false for washers/pins/plates.
- "item_type": one of: bolt | nut | washer | screw | anchor | pin | drill_bit | cable | pipe | glove | tool_manual | tool_electric | film | mesh | sealant | sling | rebar | other
- "suggested_4_digit_heading": 4-digit HS heading string (e.g. "7318", "8207", "3920")
- "is_stainless": true if stainless / corrosion-resistant / A2 / A4 / нержав
Return ONLY valid JSON."""

def step1_parse(product_name: str) -> dict:
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": STEP1_SYSTEM},
            {"role": "user", "content": f"Product: {product_name}"},
        ],
        temperature=0,
        response_format={"type": "json_object"},
        max_tokens=200,
    )
    return json.loads(resp.choices[0].message.content)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — Программная фильтрация: только нужная 4-значная позиция
# ─────────────────────────────────────────────────────────────────────────────

# Слова-маркеры для каждого типа — их НЕ должно быть в описании ДРУГИХ типов
TYPE_MARKERS = {
    "bolt":         ["bolt", "hex bolt"],
    "nut":          ["nut", "hex nut"],
    "washer":       ["washer", "plain washer", "spring washer", "lock washer", "flat washer", "split washer"],
    "screw":        ["screw", "self-tapping", "wood screw"],
    "anchor":       ["anchor"],
    "pin":          ["pin", "dowel"],
    "drill_bit":    ["drill bit", "sds", "rotary", "tap", "die"],
    "glove":        ["glove", "gauntlet"],
    "tool_manual":  ["hand tool", "manual", "wrench", "spanner", "shovel"],
    "tool_electric":["electric", "power tool", "chain saw"],
    "film":         ["film", "sheet", "polyethylene"],
    "mesh":         ["mesh", "fabric", "woven"],
    "sealant":      ["sealant", "putty", "filler"],
    "sling":        ["sling", "strap", "lifting"],
    "rebar":        ["rebar", "bar", "reinforcing"],
    "cable":        ["cable", "wire"],
    "pipe":         ["pipe", "tube"],
}

STAINLESS_KEYWORDS = {"stainless", "a2", "a4", "corrosion-resistant", "inox"}


def step2_filter(parsed: dict) -> list:
    heading    = str(parsed.get("suggested_4_digit_heading", "")).strip()
    item_type  = parsed.get("item_type", "other").lower()
    is_stainless = parsed.get("is_stainless", False)
    has_thread = parsed.get("has_thread", True)

    # 1. Фильтр по 4-значной позиции
    candidates = [e for e in TNVED_DB if e["code"].startswith(heading)]

    # 2. Определяем слова-маркеры ДРУГИХ типов для данной позиции (которые нельзя)
    other_markers = set()
    for t, markers in TYPE_MARKERS.items():
        if t != item_type:
            other_markers.update(markers)

    # Оставляем маркеры текущего типа разрешёнными
    my_markers = set(TYPE_MARKERS.get(item_type, []))
    forbidden  = other_markers - my_markers

    # 3. Если нет резьбы — исключаем "bolt", "screw", "nut" из кандидатов
    if not has_thread:
        forbidden.update(["bolt", "screw", "nut", "threaded", "thread"])

    def bad(entry):
        d = entry["desc"].lower()
        return any(f in d for f in forbidden)

    filtered = [e for e in candidates if not bad(e)]
    candidates = filtered if filtered else candidates  # fallback

    # 4. Нержавейка — поднимаем стальные с маркером stainless/A2
    if is_stainless:
        ss = [e for e in candidates
              if any(k in e["desc"].lower() for k in STAINLESS_KEYWORDS)]
        if ss:
            candidates = ss

    return candidates[:5]


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — LLM: финальный выбор из топ-5
# ─────────────────────────────────────────────────────────────────────────────
def step3_final(product_name: str, candidates: list) -> str:
    if not candidates:
        return ""
    if len(candidates) == 1:
        return candidates[0]["code"]

    options = "\n".join(f"{e['code']}: {e['desc']}" for e in candidates)
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content":
             "You are a senior customs broker. Pick the single most accurate 10-digit HS code "
             "from the list for this product. Reply with ONLY the 10-digit code, nothing else."},
            {"role": "user", "content":
             f"Product: {product_name}\n\nCandidates:\n{options}"},
        ],
        max_tokens=12,
        temperature=0,
    )
    raw = re.sub(r"\D", "", resp.choices[0].message.content.strip())
    return raw if len(raw) == 10 else candidates[0]["code"]


# ─────────────────────────────────────────────────────────────────────────────
# MAIN PIPELINE
# ─────────────────────────────────────────────────────────────────────────────
def classify(product_name: str) -> dict:
    print(f"\n{'─'*60}")
    print(f"📦  Товар: {product_name}")

    parsed = step1_parse(product_name)
    print(f"  ├─ Шаг 1 (парсинг):   {parsed}")

    candidates = step2_filter(parsed)
    print(f"  ├─ Шаг 2 (фильтр):   {[c['code'] for c in candidates]}")

    final = step3_final(product_name, candidates)
    print(f"  └─ Шаг 3 (итог):     ✅ {final}")

    return {"product": product_name, "code": final, "parsed": parsed}


if __name__ == "__main__":
    test_items = [
        "ШАЙБА M10 A2 гровер",
        "Болт М8х50 нержавейка A2",
        "Гайка М12 шестигранная оцинкованная",
        "Саморез 4.2х25 по металлу",
        "Шайба плоская М6 черная сталь",
        "Бур SDS-plus 10x160",
        "Серпянка рулон ширина 1м",
        "Пленка ПЭ 43 мкм",
        "Краги сварщика кожаные",
        "Перчатки трикотажные х/б",
        "Нивелир лазерный Bosch",
        "Монтажный пистолет (монтажный пистолет для гвоздей)",
    ]

    for item in test_items:
        classify(item)
