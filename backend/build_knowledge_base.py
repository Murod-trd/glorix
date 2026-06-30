"""
Build the TN VED knowledge base from configured Excel and PDF sources.

Dev/full-data example from backend/:
  USE_EMBEDDED_QDRANT=1 MOCK_EMBEDDER=1 MOCK_LLM=1 STRICT_BUILD=1 \
  REQUIRE_EXCEL=1 REQUIRE_PDF=1 DATA_DIR=./data \
  EXCEL_DIR=../docs/reference_data/tnved \
  PDF_DIRS=./data/pdf,../docs/explanations \
  python build_knowledge_base.py
"""

from __future__ import annotations

import os
import shutil
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from ingestion.embedder import embed_documents
from ingestion.excel_parser import parse_excel
from ingestion.pdf_extractor import extract_all_pdfs
from store.qdrant_store import (
    get_client,
    get_collection_stats,
    get_storage_path,
    init_collections,
    upsert_codes,
    upsert_pdf_chunks,
)

BACKEND_DIR = Path(__file__).resolve().parent


def _flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _resolve_path(raw: str | Path) -> Path:
    path = Path(raw)
    if not path.is_absolute():
        path = BACKEND_DIR / path
    return path.resolve()


def _data_dir() -> Path:
    return _resolve_path(os.getenv("DATA_DIR", "./data"))


def _excel_dir() -> Path:
    return _resolve_path(os.getenv("EXCEL_DIR", str(_data_dir() / "excel")))


def _pdf_dirs() -> list[Path]:
    configured = os.getenv("PDF_DIRS")
    if configured:
        parts = [p.strip() for p in configured.split(",") if p.strip()]
    else:
        parts = [str(_data_dir() / "pdf")]
    return [_resolve_path(p) for p in parts]


def _find_excel_files(excel_dir: Path) -> list[Path]:
    if not excel_dir.exists():
        return []
    files = list(excel_dir.glob("*.xlsx")) + list(excel_dir.glob("*.xls"))
    return sorted(p for p in files if not p.name.startswith("~$"))


def _find_pdf_files(pdf_dirs: list[Path]) -> list[Path]:
    files: list[Path] = []
    for pdf_dir in pdf_dirs:
        if pdf_dir.exists():
            files.extend(sorted(pdf_dir.glob("**/*.pdf")))
    return files


def _display(path: Path) -> str:
    try:
        return str(path.relative_to(BACKEND_DIR))
    except ValueError:
        return str(path)


def _fail_if_required(condition: bool, message: str) -> None:
    if condition:
        raise RuntimeError(message)


def main() -> None:
    start_total = time.time()
    strict = _flag("STRICT_BUILD")
    require_excel = _flag("REQUIRE_EXCEL")
    require_pdf = _flag("REQUIRE_PDF")

    excel_dir = _excel_dir()
    pdf_dirs = _pdf_dirs()
    excel_files = _find_excel_files(excel_dir)
    pdf_files = _find_pdf_files(pdf_dirs)

    print("=" * 72)
    print("TN VED KNOWLEDGE BASE BUILD")
    print("=" * 72)
    print(f"DATA_DIR={_display(_data_dir())}")
    print(f"EXCEL_DIR={_display(excel_dir)}")
    print("PDF_DIRS=" + ",".join(_display(p) for p in pdf_dirs))
    print(f"MOCK_EMBEDDER={_flag('MOCK_EMBEDDER')}")
    print(f"STRICT_BUILD={strict}")
    print(f"REQUIRE_EXCEL={require_excel}")
    print(f"REQUIRE_PDF={require_pdf}")
    print(f"Excel files found: {len(excel_files)}")
    for path in excel_files:
        print(f"  Excel: {_display(path)}")
    for pdf_dir in pdf_dirs:
        count = len(list(pdf_dir.glob('**/*.pdf'))) if pdf_dir.exists() else 0
        print(f"PDF files found in {_display(pdf_dir)}: {count}")
    print(f"PDF files found total: {len(pdf_files)}")

    _fail_if_required(require_excel and not excel_files, f"No Excel files found in {excel_dir}")
    _fail_if_required(require_pdf and not pdf_files, "No PDF files found in configured PDF_DIRS")

    print("\n[1/5] Initializing Qdrant...")
    if _flag("USE_EMBEDDED_QDRANT", True) and not os.getenv("QDRANT_URL"):
        storage_path = get_storage_path()
        if storage_path.exists():
            shutil.rmtree(storage_path)
            print(f"Removed embedded Qdrant storage: {_display(storage_path)}")
    client = get_client()
    init_collections(client, recreate=True)

    print("\n[2/5] Reading Excel TN VED records...")
    all_codes: list[dict] = []
    for excel_file in excel_files:
        print(f"  Parsing Excel: {_display(excel_file)}")
        records = parse_excel(excel_file)
        all_codes.extend(records)

    seen_codes: set[str] = set()
    unique_codes: list[dict] = []
    for record in all_codes:
        code = record.get("code")
        if code and code not in seen_codes:
            seen_codes.add(code)
            unique_codes.append(record)
    all_codes = unique_codes
    print(f"Indexed code candidates after dedupe: {len(all_codes)}")
    _fail_if_required(strict and require_excel and len(all_codes) == 0, "Excel records are required but none were parsed")

    print("\n[3/5] Reading PDF explanations...")
    pdf_chunks = []
    for pdf_dir in pdf_dirs:
        if not pdf_dir.exists():
            print(f"  Skipping missing PDF dir: {_display(pdf_dir)}")
            continue
        chunks = extract_all_pdfs(pdf_dir)
        pdf_chunks.extend(chunks)
    print(f"PDF chunks extracted: {len(pdf_chunks)}")
    _fail_if_required(strict and require_pdf and len(pdf_chunks) == 0, "PDF chunks are required but none were extracted")

    if all_codes:
        print(f"\n[4/5] Embedding and indexing codes: {len(all_codes)}")
        code_texts = [record["full_text"] for record in all_codes]
        code_embeddings = embed_documents(code_texts, show_progress=not _flag("MOCK_EMBEDDER"))
        upsert_codes(client, all_codes, code_embeddings)

    if pdf_chunks:
        print(f"\n[4b/5] Embedding and indexing PDF chunks: {len(pdf_chunks)}")
        pdf_texts = [chunk.text for chunk in pdf_chunks]
        pdf_embeddings = embed_documents(pdf_texts, show_progress=not _flag("MOCK_EMBEDDER"))
        upsert_pdf_chunks(client, pdf_chunks, pdf_embeddings)

    print("\n[5/5] Final collection stats...")
    stats = get_collection_stats(client)
    codes_count = int(stats.get("tnved_codes", {}).get("points_count") or 0)
    pdf_chunks_count = int(stats.get("pdf_chunks", {}).get("points_count") or 0)

    print("=" * 72)
    print("TN VED KNOWLEDGE BASE BUILD COMPLETE")
    print("=" * 72)
    print(f"indexed codes: {codes_count}")
    print(f"indexed pdf_chunks: {pdf_chunks_count}")
    print(f"elapsed minutes: {(time.time() - start_total) / 60:.2f}")

    _fail_if_required(strict and require_excel and codes_count == 0, "No codes indexed")
    _fail_if_required(strict and require_pdf and pdf_chunks_count == 0, "No PDF chunks indexed")


if __name__ == "__main__":
    main()
