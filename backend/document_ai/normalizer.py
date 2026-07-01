"""
Glorix Document AI — row normalizer.

Turns raw pasted supplier-table text into structured rows WITHOUT assuming a
fixed column order. Each cell is classified by TYPE (money, percent/VAT, unit,
TN VED code, model/spec token, quantity, free text) and roles are assigned by
evidence, not by position. An optional LLM pass (Ollama) refines the semantic
fields (name/brand/model/material/purpose/specs) when available; deterministic
guards always validate the numeric fields.

Safety rules (hard):
  - never default unit to "кг"
  - never treat VAT / 18% / НДС as price
  - never treat model/spec tokens (FWP10, DN50, 220V, 4-Pipe, M10, GOST…) as price
  - if a row is unclear → mark fields for review with a reason, do not guess
"""
from __future__ import annotations
import os
import re
import json
from typing import Optional

# ── Unit canonicalization (maps synonyms → a canonical unit; unknown → "") ──
_UNIT_CANON: dict[str, str] = {}
def _u(canon: str, aliases: list[str]) -> None:
    for a in aliases:
        _UNIT_CANON[a] = canon
_u("шт", ["шт", "штука", "штуки", "штук", "ед", "единица", "единиц", "pcs", "pc", "piece", "pieces", "ea"])
_u("кг", ["кг", "kg", "килограмм", "килограммов"])
_u("тонна", ["т", "тн", "тонна", "тонн", "ton", "tonne"])
_u("л", ["л", "литр", "литра", "литров", "liter", "litre", "ltr"])
_u("м", ["м", "m", "метр", "метра", "метров"])
_u("м²", ["м2", "м²", "кв.м", "квм", "sqm"])
_u("м³", ["м3", "м³", "куб.м", "кубм", "cbm"])
_u("пог.м", ["пог.м", "пм", "п.м", "погм"])
_u("рулон", ["рулон", "рулона", "рулонов", "roll", "rolls"])
_u("мешок", ["мешок", "мешка", "мешков", "bag", "bags"])
_u("упак", ["упак", "упаковка", "упаковки", "упаковок", "pack"])
_u("паллет", ["паллет", "паллета", "паллеты", "пал", "pallet", "pallets"])
_u("компл", ["компл", "комплект", "комплекта", "комплектов", "set", "sets", "kit"])

_CURRENCY = {
    "usd": "USD", "$": "USD", "eur": "EUR", "€": "EUR", "rub": "RUB", "руб": "RUB",
    "₽": "RUB", "uzs": "UZS", "сум": "UZS", "kzt": "KZT", "₸": "KZT", "cny": "CNY",
    "¥": "CNY", "try": "TRY", "₺": "TRY", "gbp": "GBP", "£": "GBP",
}
_VAT_RATES = {5, 10, 12, 15, 18, 20}
_MATERIALS = {
    "сталь": "сталь", "стальн": "сталь", "нержавею": "нержавеющая сталь", "чугун": "чугун",
    "алюмин": "алюминий", "медь": "медь", "медн": "медь", "латун": "латунь", "бронз": "бронза",
    "пластик": "пластик", "пластмасс": "пластмасса", "полиэтилен": "полиэтилен",
    "полипропилен": "полипропилен", "пвх": "ПВХ", "резин": "резина", "каучук": "каучук",
    "дерев": "дерево", "древесин": "древесина", "стекло": "стекло", "титан": "титан",
    "никель": "никель", "цинк": "цинк", "бетон": "бетон",
}

def canon_unit(s: str) -> str:
    key = (s or "").strip().lower().rstrip(".")
    return _UNIT_CANON.get(key, "")

def _norm_num(s: str) -> str:
    """Parse a European/US decimal string → canonical dotted number string, or ''."""
    c = re.sub(r"[^\d\s,.\-]", "", str(s or "")).strip()
    c = re.sub(r"\s+", "", c)
    if not c:
        return ""
    last_comma, last_dot = c.rfind(","), c.rfind(".")
    if last_comma > -1 and last_dot > -1:
        c = c.replace(",", "") if last_dot > last_comma else c.replace(".", "").replace(",", ".")
    elif last_comma > -1:
        after = c[last_comma + 1:]
        c = c.replace(",", "") if re.fullmatch(r"\d{3}", after) else c.replace(",", ".")
    return c if re.search(r"\d", c) else ""

def _is_money_like(s: str) -> bool:
    t = str(s or "").strip()
    if not re.search(r"\d", t):
        return False
    core = re.sub(r"[\s]*(usd|eur|rub|uzs|kzt|uah|byn|cny|try|gbp|jpy|сум|руб|тенге|тг|₽|\$|€|₸|₴|¥|£)\.?$",
                  "", t, flags=re.I).strip()
    return bool(re.fullmatch(r"-?[\d.,  ]+", core))

def _is_percent_or_vat(s: str) -> bool:
    t = str(s or "").strip().lower()
    if re.search(r"\b(ндс|vat|tax|ставка)\b", t):
        return True
    return bool(re.fullmatch(r"\d{1,3}([.,]\d+)?\s*%", t))

def _is_tnved(s: str) -> bool:
    return bool(re.fullmatch(r"\d{8,10}", re.sub(r"\s", "", str(s or ""))))

# Model / spec tokens: alnum mixes, dims, voltages, GOST/DN/DU/M-threads, etc.
_MODEL_RE = re.compile(
    r"(?:^|[\s/(-])(?:"
    r"[A-ZА-Я]{1,5}[-\s]?\d{1,5}[A-ZА-Я0-9\-]*"   # FWP10, DN50, M10, TS-220
    r"|\d{1,4}[xх×]\d{1,4}(?:[xх×]\d{1,4})?"        # 20x40, 100х100х5
    r"|\d{2,4}\s?[vвkккkw]{1,3}\b"                    # 220V, 380В, 5kW
    r"|гост[\s\-]?\d+|ту[\s\-]?\d+|din[\s\-]?\d+|iso[\s\-]?\d+"
    r"|ду[\s\-]?\d+|dn[\s\-]?\d+|py[\s\-]?\d+|pn[\s\-]?\d+"
    r")", re.I)

def _has_model_token(s: str) -> bool:
    return bool(_MODEL_RE.search(str(s or "")))

def _extract_currency(cells: list[str]) -> str:
    for c in cells:
        t = str(c or "").lower()
        for k, v in _CURRENCY.items():
            if k in t:
                return v
    return ""

def _detect_material(text: str) -> str:
    low = (text or "").lower()
    for k, v in _MATERIALS.items():
        if k in low:
            return v
    return ""

def _extract_model(text: str) -> str:
    m = _MODEL_RE.search(str(text or ""))
    return m.group(0).strip(" /(-") if m else ""

def _split_rows(raw: str) -> list[list[str]]:
    """Split pasted text into rows of cells. Handles Excel TSV with quoted cells."""
    rows: list[list[str]] = []
    cols: list[str] = []
    field = ""
    in_q = False
    raw = (raw or "").replace("\r\n", "\n").replace("\r", "\n")
    i = 0
    n = len(raw)
    while i <= n:
        ch = raw[i] if i < n else None
        if ch == '"':
            if in_q and i + 1 < n and raw[i + 1] == '"':
                field += '"'; i += 1
            else:
                in_q = not in_q
        elif ch == "\t" and not in_q:
            cols.append(field.strip()); field = ""
        elif (ch == "\n" or ch is None) and not in_q:
            cols.append(field.strip()); field = ""
            if any(c for c in cols):
                rows.append(cols)
            cols = []
        else:
            field += (ch or "")
        i += 1
    # Fallback: single-column rows split on 2+ spaces when no tabs present
    if rows and all(len(r) == 1 for r in rows):
        rows = [re.split(r"\s{2,}|\s*\|\s*", r[0]) for r in rows]
    return rows

_HEADER_WORDS = {
    "наименование", "описание", "товар", "product", "name", "description", "№", "n", "no",
    "кол-во", "количество", "qty", "quantity", "ед", "ед.", "unit", "цена", "price",
    "стоимость", "сумма", "amount", "total", "ндс", "vat", "тн вэд", "hs code", "характеристики",
}
def _is_header_row(cells: list[str]) -> bool:
    joined = " ".join(cells).lower()
    hits = sum(1 for w in _HEADER_WORDS if w in joined)
    has_num = any(_is_money_like(c) or re.fullmatch(r"\d+", (c or "").strip()) for c in cells)
    return hits >= 2 and not has_num

def _deterministic_row(cells: list[str], row_id: int) -> dict:
    """Assign roles by cell TYPE, independent of column order."""
    review: list[str] = []
    cells = [str(c or "").strip() for c in cells]
    non_empty = [c for c in cells if c]

    existing_tnved = next((re.sub(r"\s", "", c) for c in cells if _is_tnved(c)), "")
    unit = next((canon_unit(c) for c in cells if canon_unit(c)), "")
    vat = next((c for c in cells if _is_percent_or_vat(c)), "")

    # Money cells (exclude VAT/percent and pure TN VED codes)
    money_cells = [c for c in cells if _is_money_like(c) and not _is_percent_or_vat(c) and not _is_tnved(c)]
    # Bare integers (potential qty / VAT rate) — not money-with-decimals
    def _is_bare_int(c: str) -> bool:
        return bool(re.fullmatch(r"\d{1,4}", c.replace(" ", "")))
    ints = [c for c in money_cells if _is_bare_int(c)]
    decimals = [c for c in money_cells if not _is_bare_int(c)]

    price = ""
    qty = ""
    # qty preference: a bare integer directly ADJACENT to the unit cell (the most
    # reliable "qty unit"/"unit qty" signal), independent of overall column order.
    unit_idx = next((i for i, c in enumerate(cells) if canon_unit(c)), -1)
    if unit_idx >= 0:
        for j in (unit_idx - 1, unit_idx + 1):
            if 0 <= j < len(cells):
                cj = cells[j].replace(" ", "")
                if re.fullmatch(r"\d{1,4}", cj) and int(cj) not in _VAT_RATES:
                    qty = _norm_num(cells[j]); break
    # Price = a decimal money value (prefer), else the largest bare integer that
    # is not a VAT rate and not the qty.
    if decimals:
        price = _norm_num(decimals[-1])
        if not qty:
            qcand = [c for c in ints if int(c.replace(" ", "")) not in _VAT_RATES]
            qty = _norm_num(qcand[0]) if qcand else (_norm_num(ints[0]) if ints else "")
    else:
        vals = sorted(((int(c.replace(" ", "")), c) for c in ints), reverse=True)
        vals = [c for _, c in vals if int(c.replace(" ", "")) not in _VAT_RATES] or [c for _, c in vals]
        # price = largest non-qty integer
        vals_np = [c for c in vals if _norm_num(c) != qty] or vals
        if vals_np:
            price = _norm_num(vals_np[0])
        if not qty and len(vals) > 1:
            qty = _norm_num(vals[-1])
    if not qty:
        review.append("qty_uncertain")
    if not price:
        review.append("price_missing")
    if not unit:
        review.append("unit_uncertain")

    # Name = the longest free-text cell that is not a number/unit/code/model-only token
    def _is_text(c: str) -> bool:
        if not c or _is_money_like(c) or _is_percent_or_vat(c) or _is_tnved(c):
            return False
        if canon_unit(c):
            return False
        return bool(re.search(r"[A-Za-zА-Яа-я]{2,}", c))
    text_cells = [c for c in cells if _is_text(c)]
    text_cells_sorted = sorted(text_cells, key=len, reverse=True)
    name = text_cells_sorted[0] if text_cells_sorted else ""
    if not name:
        review.append("name_uncertain")
    # Remaining text → specs; model/material/brand best-effort
    spec_cells = [c for c in text_cells if c != name]
    joined_all = " ".join(non_empty)
    model = _extract_model(name) or _extract_model(joined_all)
    material = _detect_material(joined_all)
    technical_specs = "; ".join(spec_cells).strip()
    currency = _extract_currency(cells)

    # confidence heuristic
    have = sum(1 for x in (name, qty, unit, price) if x)
    parse_confidence = round(have / 4.0, 2)

    return {
        "row_id": row_id,
        "name": name,
        "brand": "",
        "model": model,
        "material": material,
        "purpose_or_function": "",
        "technical_specs": technical_specs,
        "qty": qty,
        "unit": unit,
        "price": price,
        "currency": currency,
        "vat_or_tax": vat,
        "existing_tnved": existing_tnved,
        "raw_row": "\t".join(cells),
        "raw_cells": cells,
        "parse_confidence": parse_confidence,
        "fields_needing_review": sorted(set(review)),
        "source": "deterministic",
    }

# ── Optional LLM refine (Ollama). MOCK_LLM / no-ollama → deterministic only. ──
_NORM_SYSTEM = (
    "Ты — парсер строк из прайс-листов поставщиков для платформы Glorix. "
    "Тебе дают ОДНУ строку таблицы (ячейки в произвольном порядке). "
    "Верни СТРОГО JSON без пояснений с полями: "
    "name, brand, model, material, purpose_or_function, technical_specs, qty, unit, price, currency, vat_or_tax. "
    "Правила: порядок колонок неизвестен; название товара может быть в любой ячейке; "
    "НДС/18%/проценты — это НЕ цена; модель/артикул (FWP10, DN50, 220V, M10, ГОСТ) — это НЕ цена и НЕ количество; "
    "единицу не выдумывай (если непонятно — пустая строка). Если поля нет — пустая строка."
)

def _llm_available() -> bool:
    if os.getenv("MOCK_LLM", "").strip().lower() in {"1", "true", "yes", "on"}:
        return False
    try:
        import ollama  # noqa: F401
        return True
    except Exception:
        return False

def _llm_refine(cells: list[str], base: dict, model: str) -> dict:
    """Refine semantic fields with the LLM; keep deterministic numeric guards."""
    try:
        import ollama
        raw_row = "\t".join(cells)
        resp = ollama.chat(
            model=model,
            messages=[
                {"role": "system", "content": _NORM_SYSTEM},
                {"role": "user", "content": f"Ячейки строки: {json.dumps(cells, ensure_ascii=False)}\nСырьё: {raw_row}"},
            ],
            options={"temperature": 0.0, "num_predict": 400, "top_p": 0.9},
        )
        text = resp["message"]["content"]
        m = re.search(r"\{.*\}", text, re.S)
        data = json.loads(m.group(0)) if m else {}
    except Exception as e:  # noqa: BLE001
        base = dict(base)
        base["llm_error"] = str(e)[:200]
        return base

    out = dict(base)
    # Prefer LLM for SEMANTIC fields only.
    for f in ("name", "brand", "model", "material", "purpose_or_function", "technical_specs"):
        v = str(data.get(f, "") or "").strip()
        if v:
            out[f] = v
    # Numeric fields: accept LLM value ONLY if it passes deterministic guards.
    u = canon_unit(str(data.get("unit", "")))
    if u and not out.get("unit"):
        out["unit"] = u
    p = str(data.get("price", "")).strip()
    if p and _is_money_like(p) and not _is_percent_or_vat(p) and not _has_model_token(p):
        out["price"] = _norm_num(p) or out["price"]
    q = str(data.get("qty", "")).strip()
    if q and re.search(r"\d", q) and not _is_percent_or_vat(q):
        out["qty"] = _norm_num(q) or out["qty"]
    if not out.get("currency"):
        cur = str(data.get("currency", "")).strip().upper()
        if cur in {"USD", "EUR", "RUB", "UZS", "KZT", "CNY", "TRY", "GBP"}:
            out["currency"] = cur
    # Recompute review + confidence after refine
    review = []
    if not out.get("name"):
        review.append("name_uncertain")
    if not out.get("qty"):
        review.append("qty_uncertain")
    if not out.get("unit"):
        review.append("unit_uncertain")
    if not out.get("price"):
        review.append("price_missing")
    out["fields_needing_review"] = sorted(set(review))
    have = sum(1 for x in (out.get("name"), out.get("qty"), out.get("unit"), out.get("price")) if x)
    out["parse_confidence"] = round(have / 4.0, 2)
    out["source"] = "llm+deterministic"
    return out

def normalize_row(cells: list[str], row_id: int, use_llm: bool = True,
                  model: str = "qwen2.5:7b-instruct-q4_K_M") -> dict:
    base = _deterministic_row(cells, row_id)
    if use_llm and _llm_available():
        return _llm_refine(cells, base, model)
    return base

def split_raw_rows(raw_text: str) -> list[list[str]]:
    """Public: split pasted text into data rows (header rows removed)."""
    rows = _split_rows(raw_text)
    out = []
    for r in rows:
        if _is_header_row(r):
            continue
        # drop pure ordinal-number rows ("1", "2"...) with no other data
        if len([c for c in r if c]) == 1 and re.fullmatch(r"\d{1,3}", (r[0] or "").strip()):
            continue
        out.append(r)
    return out

def llm_status() -> str:
    return "available" if _llm_available() else "mock_or_unavailable"
