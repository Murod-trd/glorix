"""
Persistent job storage — JSON files OUTSIDE the repository.

Location (first configured wins):
  DOC_JOBS_DIR                       e.g. G:\\GLORIX_SERVER\\jobs   (recommended on the laptop)
  <DATA_DIR>/doc_jobs                DATA_DIR is git-ignored (backend/.gitignore: data/)
Atomic writes (tmp + os.replace) so a crash/refresh never corrupts a job.
"""
from __future__ import annotations
import json
import os
import threading
import time
from pathlib import Path
from typing import Optional


def jobs_dir() -> Path:
    d = os.getenv("DOC_JOBS_DIR", "").strip()
    if not d:
        data_dir = os.getenv("DATA_DIR", "./data").strip() or "./data"
        d = str(Path(data_dir) / "doc_jobs")
    p = Path(d)
    if not p.is_absolute():
        p = (Path(__file__).resolve().parent.parent / p).resolve()
    p.mkdir(parents=True, exist_ok=True)
    return p


_LOCKS: dict[str, threading.Lock] = {}
_GLOBAL = threading.Lock()


def _lock(job_id: str) -> threading.Lock:
    with _GLOBAL:
        if job_id not in _LOCKS:
            _LOCKS[job_id] = threading.Lock()
        return _LOCKS[job_id]


def _path(job_id: str) -> Path:
    safe = "".join(c for c in job_id if c.isalnum() or c in "-_")
    return jobs_dir() / f"{safe}.json"


def save_job(job: dict) -> None:
    job["updated_at"] = time.time()
    p = _path(job["job_id"])
    tmp = p.with_suffix(".tmp")
    with _lock(job["job_id"]):
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(job, f, ensure_ascii=False)
        os.replace(tmp, p)


def load_job(job_id: str) -> Optional[dict]:
    p = _path(job_id)
    if not p.exists():
        return None
    with _lock(job_id):
        try:
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None


def list_jobs() -> list[dict]:
    out = []
    for p in sorted(jobs_dir().glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True):
        try:
            with open(p, "r", encoding="utf-8") as f:
                j = json.load(f)
            out.append({"job_id": j.get("job_id"), "status": j.get("status"),
                        "created_at": j.get("created_at"), "totals": j.get("totals")})
        except Exception:
            continue
    return out


# ── Persistent signature cache (cross-job dedup) ──────────────────────────
_CACHE_LOCK = threading.Lock()


def _cache_path() -> Path:
    return jobs_dir() / "_signature_cache.json"


def cache_load() -> dict:
    p = _cache_path()
    if not p.exists():
        return {}
    with _CACHE_LOCK:
        try:
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}


def cache_put(sig: str, result: dict) -> None:
    with _CACHE_LOCK:
        data = {}
        p = _cache_path()
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                data = {}
        data[sig] = {"ts": time.time(), "result": result}
        tmp = p.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        os.replace(tmp, p)
