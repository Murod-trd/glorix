"""
Backend-only internet-assisted evidence for TN VED candidate discovery.

Honest by design: OFF unless a provider + key are configured via env.
  WEB_SEARCH_PROVIDER  (e.g. "tavily", "serpapi", "bing") — empty = OFF
  WEB_SEARCH_API_KEY   provider key
  WEB_SEARCH_TIMEOUT   seconds (default 8)

When OFF it returns a clear not_configured status and NO fabricated results.
Web results are ONLY supporting evidence / candidate discovery — the final code
must still be validated against the local TN VED database by the classifier.
"""
from __future__ import annotations
import os
import time
from typing import Optional

_CACHE: dict[str, dict] = {}
_CACHE_TTL = 60 * 60 * 6  # 6h


def config_status() -> dict:
    provider = (os.getenv("WEB_SEARCH_PROVIDER", "") or "").strip().lower()
    key = (os.getenv("WEB_SEARCH_API_KEY", "") or "").strip()
    if not provider:
        return {"web_search": "not_configured", "provider": None}
    if not key:
        return {"web_search": "error", "provider": provider, "reason": "WEB_SEARCH_API_KEY missing"}
    return {"web_search": "configured", "provider": provider}


def _cache_get(q: str) -> Optional[dict]:
    v = _CACHE.get(q)
    if v and (time.time() - v["ts"]) < _CACHE_TTL:
        return v["data"]
    return None


def search_evidence(query: str) -> dict:
    """Return {status, sources:[{title,url,snippet}], from_cache}. Never fabricates."""
    st = config_status()
    if st["web_search"] != "configured":
        return {"status": st["web_search"], "sources": [], "from_cache": False,
                "reason": st.get("reason", "web search not configured")}
    cached = _cache_get(query)
    if cached is not None:
        return {"status": "ok", "sources": cached, "from_cache": True}

    provider = st["provider"]
    key = os.getenv("WEB_SEARCH_API_KEY", "")
    timeout = float(os.getenv("WEB_SEARCH_TIMEOUT", "8") or 8)
    try:
        import httpx
        sources: list[dict] = []
        if provider == "tavily":
            r = httpx.post("https://api.tavily.com/search",
                           json={"api_key": key, "query": query, "max_results": 5,
                                 "include_domains": []},
                           timeout=timeout)
            r.raise_for_status()
            for it in (r.json().get("results") or [])[:5]:
                sources.append({"title": it.get("title", ""), "url": it.get("url", ""),
                                "snippet": (it.get("content", "") or "")[:300]})
        else:
            # Unknown/unsupported provider — report clearly, do not fake.
            return {"status": "error", "sources": [], "from_cache": False,
                    "reason": f"provider '{provider}' not implemented"}
        _CACHE[query] = {"ts": time.time(), "data": sources}
        return {"status": "ok", "sources": sources, "from_cache": False}
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "sources": [], "from_cache": False, "reason": str(e)[:200]}
