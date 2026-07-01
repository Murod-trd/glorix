"""Product signature for cache / dedup — same product ⇒ same classification."""
from __future__ import annotations
import hashlib
import re


def _norm(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[^\wЀ-ӿ ]+", "", s)
    return s.strip()


def product_signature(row: dict) -> str:
    """Stable signature from the fields that determine the TN VED code."""
    parts = [
        _norm(row.get("name", "")),
        _norm(row.get("brand", "")),
        _norm(row.get("model", "")),
        _norm(row.get("material", "")),
        _norm(row.get("purpose_or_function", "")),
        _norm(row.get("technical_specs", ""))[:120],
        _norm(row.get("unit", "")),
    ]
    key = "|".join(parts)
    if not key.replace("|", "").strip():
        # No usable signal — fall back to the raw row so we still dedup identical pastes.
        key = "raw:" + _norm(row.get("raw_row", ""))[:200]
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]
