"""
Glorix Document AI job engine — resumable large-import processing.

Lifecycle: create → (normalizing → normalized → classifying → classified/review/
error/skipped_manual/reused_from_cache). Progress is persisted after processing,
so a browser refresh (or backend restart) never loses work — the frontend
reconnects by job_id and resumes.

Heavy classification (RAG) is dependency-injected (`set_classifier`) so the
engine is testable without Qdrant/Ollama.
"""
from __future__ import annotations
import asyncio
import concurrent.futures
import os
import time
import uuid
from typing import Callable, Optional

from . import store
from document_ai import normalizer
from document_ai import signature as sigmod
from document_ai import web_evidence

_JOBS: dict[str, dict] = {}
_CONTROLS: dict[str, dict] = {}
_TASKS: dict[str, "asyncio.Task"] = {}
_CLASSIFY_FN: Optional[Callable] = None
_EXECUTOR: Optional[concurrent.futures.ThreadPoolExecutor] = None

ROW_STATUSES = {"pending", "normalizing", "normalized", "classifying", "classified",
                "review", "error", "skipped_manual", "reused_from_cache"}


def _concurrency() -> int:
    try:
        return max(1, min(8, int(os.getenv("DOC_AI_CONCURRENCY", "3"))))
    except Exception:
        return 3


def _executor() -> concurrent.futures.ThreadPoolExecutor:
    global _EXECUTOR
    if _EXECUTOR is None:
        _EXECUTOR = concurrent.futures.ThreadPoolExecutor(max_workers=_concurrency())
    return _EXECUTOR


def set_classifier(fn: Callable) -> None:
    """Inject the classify function: classify(description) -> dict (ClassificationResult.to_dict)."""
    global _CLASSIFY_FN
    _CLASSIFY_FN = fn


def _get_classifier() -> Callable:
    global _CLASSIFY_FN
    if _CLASSIFY_FN is None:
        from rag.classifier import classify as _c  # lazy — needs Qdrant/Ollama at call time

        def _wrap(description: str) -> dict:
            return _c(description=description).to_dict()

        _CLASSIFY_FN = _wrap
    return _CLASSIFY_FN


def _use_llm() -> bool:
    return os.getenv("DOC_AI_USE_LLM", "1").strip().lower() in {"1", "true", "yes", "on"}


# ── Public API ────────────────────────────────────────────────────────────
def create_job(raw_text: str, options: Optional[dict] = None) -> dict:
    options = options or {}
    tnved = bool(options.get("tnved", True))
    rows_cells = normalizer.split_raw_rows(raw_text or "")
    job_id = "job_" + uuid.uuid4().hex[:12]
    rows = [{"row_id": i, "status": "pending", "normalized": None,
             "signature": "", "result": None, "error": "", "raw_cells": rc}
            for i, rc in enumerate(rows_cells)]
    job = {
        "job_id": job_id,
        "status": "queued",
        "options": {"tnved": tnved,
                    "model": options.get("model", "qwen2.5:7b-instruct-q4_K_M")},
        "created_at": time.time(),
        "updated_at": time.time(),
        "totals": _totals(rows),
        "rows": rows,
    }
    _JOBS[job_id] = job
    _CONTROLS[job_id] = {"pause": False, "cancel": False}
    store.save_job(job)
    _spawn(job_id)
    return {"job_id": job_id, "status": job["status"], "totals": job["totals"],
            "row_count": len(rows)}


def get_job(job_id: str) -> Optional[dict]:
    job = _JOBS.get(job_id) or store.load_job(job_id)
    if not job:
        return None
    _JOBS[job_id] = job
    return {"job_id": job_id, "status": job["status"], "options": job.get("options"),
            "created_at": job.get("created_at"), "updated_at": job.get("updated_at"),
            "totals": _totals(job["rows"]), "row_count": len(job["rows"])}


def get_rows(job_id: str, offset: int = 0, limit: int = 500) -> Optional[dict]:
    job = _JOBS.get(job_id) or store.load_job(job_id)
    if not job:
        return None
    rows = job["rows"][offset: offset + limit]
    return {"job_id": job_id, "offset": offset, "limit": limit,
            "total": len(job["rows"]), "rows": rows}


def pause(job_id: str) -> dict:
    if job_id in _CONTROLS:
        _CONTROLS[job_id]["pause"] = True
    job = _JOBS.get(job_id) or store.load_job(job_id)
    if job and job["status"] in ("running", "queued"):
        job["status"] = "paused"
        _JOBS[job_id] = job
        store.save_job(job)
    return get_job(job_id) or {"error": "not_found"}


def resume(job_id: str) -> dict:
    job = _JOBS.get(job_id) or store.load_job(job_id)
    if not job:
        return {"error": "not_found"}
    _JOBS[job_id] = job
    _CONTROLS.setdefault(job_id, {"pause": False, "cancel": False})
    _CONTROLS[job_id]["pause"] = False
    _CONTROLS[job_id]["cancel"] = False
    if job["status"] in ("paused", "queued", "running") or _has_unfinished(job):
        job["status"] = "queued"
        store.save_job(job)
        _spawn(job_id)
    return get_job(job_id) or {"error": "not_found"}


def cancel(job_id: str) -> dict:
    if job_id in _CONTROLS:
        _CONTROLS[job_id]["cancel"] = True
    job = _JOBS.get(job_id) or store.load_job(job_id)
    if job:
        job["status"] = "cancelled"
        _JOBS[job_id] = job
        store.save_job(job)
    return get_job(job_id) or {"error": "not_found"}


def retry(job_id: str, row_ids: Optional[list[int]] = None) -> dict:
    job = _JOBS.get(job_id) or store.load_job(job_id)
    if not job:
        return {"error": "not_found"}
    _JOBS[job_id] = job
    target = set(row_ids) if row_ids else None
    for r in job["rows"]:
        if r["status"] in ("error", "review") and (target is None or r["row_id"] in target):
            r["status"] = "normalized" if r.get("normalized") else "pending"
            r["error"] = ""
            r["result"] = None
    job["status"] = "queued"
    store.save_job(job)
    _CONTROLS.setdefault(job_id, {"pause": False, "cancel": False})
    _CONTROLS[job_id]["pause"] = False
    _CONTROLS[job_id]["cancel"] = False
    _spawn(job_id)
    return get_job(job_id) or {"error": "not_found"}


def config_status() -> dict:
    st = {"llm": normalizer.llm_status(),
          "concurrency": _concurrency(),
          "jobs_dir": str(store.jobs_dir())}
    st.update(web_evidence.config_status())
    return st


def bootstrap() -> None:
    """On backend startup: reload persisted jobs; mark 'running' as 'paused'."""
    for meta in store.list_jobs():
        jid = meta.get("job_id")
        if not jid:
            continue
        job = store.load_job(jid)
        if not job:
            continue
        if job.get("status") == "running":
            job["status"] = "paused"
            store.save_job(job)
        _JOBS[jid] = job
        _CONTROLS.setdefault(jid, {"pause": False, "cancel": False})


# ── Internals ─────────────────────────────────────────────────────────────
def _totals(rows: list[dict]) -> dict:
    t = {k: 0 for k in ROW_STATUSES}
    t["total"] = len(rows)
    for r in rows:
        t[r["status"]] = t.get(r["status"], 0) + 1
    t["done"] = sum(t.get(s, 0) for s in ("classified", "review", "error",
                                          "skipped_manual", "reused_from_cache", "normalized"))
    t["filled"] = t.get("classified", 0) + t.get("reused_from_cache", 0)
    return t


def _has_unfinished(job: dict) -> bool:
    return any(r["status"] in ("pending", "normalizing", "classifying") for r in job["rows"])


def _spawn(job_id: str) -> None:
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        return
    old = _TASKS.get(job_id)
    if old and not old.done():
        return
    _TASKS[job_id] = loop.create_task(_run_job(job_id))


def _compose_description(nrow: dict) -> str:
    parts = [nrow.get("name", ""), nrow.get("brand", ""), nrow.get("model", ""),
             nrow.get("material", ""), nrow.get("purpose_or_function", ""),
             nrow.get("technical_specs", "")]
    desc = ", ".join(p for p in parts if p).strip(", ").strip()
    if len(desc) < 5:
        desc = "Товар: " + (nrow.get("raw_row") or nrow.get("name") or "н/д")
    return desc[:2000]


def _map_result(cd: dict) -> dict:
    code = (cd.get("code") or "").strip()
    ev = cd.get("evidence") or {}
    cands = []
    for c in (cd.get("top10_candidates") or [])[:5]:
        cands.append({"code": c.get("code"), "description": c.get("description"),
                      "chapter": c.get("chapter"),
                      "reasons_for": c.get("reasons_for", []),
                      "reasons_against": c.get("reasons_against", [])})
    return {
        "final_code": code,
        "confidence": cd.get("confidence", 0.0),
        "requires_clarification": bool(cd.get("requires_clarification")),
        "reason": cd.get("clarification_message") or cd.get("reasoning") or "",
        "candidates": cands,
        "missing_information": (ev.get("missing_information") or cd.get("clarification_questions") or []),
        "evidence": {"excel": len(ev.get("excel_records", []) or []),
                     "pdf": len(ev.get("pdf_chunks", []) or []),
                     "is_sufficient": ev.get("is_sufficient")},
        "sources_used": cd.get("sources_used", []),
    }


async def _run_job(job_id: str) -> None:
    job = _JOBS.get(job_id) or store.load_job(job_id)
    if not job:
        return
    _JOBS[job_id] = job
    ctrl = _CONTROLS.setdefault(job_id, {"pause": False, "cancel": False})
    job["status"] = "running"
    store.save_job(job)

    tnved = bool(job["options"].get("tnved", True))
    model = job["options"].get("model", "qwen2.5:7b-instruct-q4_K_M")
    total = len(job["rows"])
    flush_every = 1 if total <= 200 else max(1, total // 100)
    cache = store.cache_load()
    sem = asyncio.Semaphore(_concurrency())
    loop = asyncio.get_event_loop()
    processed = {"n": 0}

    async def handle(row: dict) -> None:
        if ctrl["cancel"]:
            return
        while ctrl["pause"] and not ctrl["cancel"]:
            await asyncio.sleep(0.4)
        if ctrl["cancel"]:
            return
        async with sem:
            try:
                # 1) Normalize (position-independent)
                if not row.get("normalized"):
                    row["status"] = "normalizing"
                    nrow = await loop.run_in_executor(
                        _executor(), lambda: normalizer.normalize_row(
                            row["raw_cells"], row["row_id"], _use_llm(), model))
                    row["normalized"] = nrow
                    row["status"] = "normalized"
                nrow = row["normalized"]

                if not tnved:
                    row["status"] = "normalized"
                    return

                # 2) Preserve any manual / existing code
                if (nrow.get("existing_tnved") or "").strip():
                    row["result"] = {"final_code": nrow["existing_tnved"], "confidence": 1.0,
                                     "requires_clarification": False, "reason": "manual/existing code preserved",
                                     "candidates": [], "missing_information": [], "sources_used": []}
                    row["status"] = "skipped_manual"
                    return

                # 3) Dedup by product signature
                sig = sigmod.product_signature(nrow)
                row["signature"] = sig
                if sig in cache:
                    row["result"] = cache[sig]["result"]
                    row["status"] = "reused_from_cache"
                    return

                # 4) Full-context classification (heavy → executor)
                row["status"] = "classifying"
                desc = _compose_description(nrow)
                cd = await loop.run_in_executor(_executor(), lambda: _get_classifier()(desc))
                res = _map_result(cd)
                # Optional internet evidence for uncertain rows (OFF unless configured)
                if not res["final_code"] and web_evidence.config_status().get("web_search") == "configured":
                    web = web_evidence.search_evidence(nrow.get("name") or desc)
                    res["web_sources"] = web.get("sources", [])
                    res["web_status"] = web.get("status")
                row["result"] = res
                if res["final_code"]:
                    row["status"] = "classified"
                    store.cache_put(sig, res)
                    cache[sig] = {"result": res}
                else:
                    row["status"] = "review"
            except Exception as e:  # noqa: BLE001 — real technical error (not "AI unsure")
                row["status"] = "error"
                row["error"] = str(e)[:300]
            finally:
                row["updated_at"] = time.time()
                processed["n"] += 1
                if processed["n"] % flush_every == 0:
                    job["totals"] = _totals(job["rows"])
                    store.save_job(job)

    pending = [r for r in job["rows"] if r["status"] in ("pending", "normalizing", "normalized", "classifying")
               and not (r["status"] == "normalized" and not tnved)]
    # Process with bounded concurrency
    batch: list[asyncio.Task] = []
    for row in pending:
        if ctrl["cancel"]:
            break
        while ctrl["pause"] and not ctrl["cancel"]:
            await asyncio.sleep(0.4)
        batch.append(loop.create_task(handle(row)))
        if len(batch) >= _concurrency() * 4:
            await asyncio.gather(*batch)
            batch = []
    if batch:
        await asyncio.gather(*batch)

    job["totals"] = _totals(job["rows"])
    if ctrl["cancel"]:
        job["status"] = "cancelled"
    elif ctrl["pause"]:
        job["status"] = "paused"
    elif _has_unfinished(job):
        job["status"] = "paused"
    else:
        job["status"] = "completed"
    store.save_job(job)
