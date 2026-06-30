"""
build_knowledge_base.py — Одноразовый скрипт построения базы знаний.

Запускать ОДИН РАЗ после добавления/обновления документов:
  python build_knowledge_base.py

Что делает:
  1. Читает Excel с кодами ТН ВЭД из EXCEL_DIR
  2. Читает все PDF из PDF_DIRS (несколько директорий, разделённых запятой)
  3. Строит embeddings (multilingual-e5-base или MOCK_EMBEDDER=1)
  4. Сохраняет в Qdrant (embedded mode → qdrant_storage/)

Переменные окружения:
  DATA_DIR          — корневая папка данных (default: ./data)
  EXCEL_DIR         — папка с Excel-файлами (default: DATA_DIR/excel)
  PDF_DIRS          — список PDF-директорий через запятую (default: DATA_DIR/pdf)
  PDF_DIR           — одна PDF-директория (fallback если PDF_DIRS не задан)
  MOCK_EMBEDDER=1   — использовать детерминированный hash-embedder (dev/test)
  MOCK_LLM=1        — для тестирования без Ollama
  USE_EMBEDDED_QDRANT=1 — встроенный Qdrant (default для dev)
  STRICT_BUILD=1    — завершить с ошибкой если нет данных (prod)
  REQUIRE_EXCEL=1   — обязать наличие Excel (используется со STRICT_BUILD)
  REQUIRE_PDF=1     — обязать наличие PDF (используется со STRICT_BUILD)

Время выполнения (CPU, реальные данные):
  Excel (13 289 записей): ~5–10 мин
  PDF (100 файлов):       ~30–60 мин
  Итого:                  ~1 час без GPU
"""

import os
import sys
import time
import logging
from pathlib import Path
from collections import Counter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# Добавить backend/ в путь
sys.path.insert(0, str(Path(__file__).parent))

from ingestion.excel_parser import parse_excel
from ingestion.pdf_extractor import extract_all_pdfs_from_dirs
from ingestion.embedder import embed_documents
from store.qdrant_store import (
    get_client, init_collections,
    upsert_codes, upsert_pdf_chunks,
    get_collection_stats,
)


def _resolve_pdf_dirs(data_dir: Path) -> list[Path]:
    """
    Разрешить список PDF-директорий из переменных окружения.

    Приоритет:
      1. PDF_DIRS (разделённый запятой список)
      2. PDF_DIR (одна директория, устаревший вариант)
      3. data_dir/pdf (дефолт)

    Всегда показывает warning если docs/explanations существует, но не включён.
    """
    pdf_dirs_env = os.getenv("PDF_DIRS", "").strip()
    pdf_dir_env  = os.getenv("PDF_DIR",  "").strip()

    if pdf_dirs_env:
        dirs = [Path(d.strip()) for d in pdf_dirs_env.split(",") if d.strip()]
    elif pdf_dir_env:
        dirs = [Path(pdf_dir_env)]
    else:
        dirs = [data_dir / "pdf"]

    # Проверить docs/explanations — показать warning если не включён
    docs_expl = Path(__file__).parent.parent / "docs" / "explanations"
    dirs_resolved = [d.resolve() for d in dirs]
    if docs_expl.exists() and docs_expl.resolve() not in dirs_resolved:
        logger.warning(
            "⚠ docs/explanations существует (%d PDF), но НЕ включён в PDF_DIRS. "
            "Эти PDF не будут использованы.\n"
            "  Чтобы включить: export PDF_DIRS=./data/pdf,%s",
            len(list(docs_expl.glob("**/*.pdf"))),
            str(docs_expl),
        )

    return dirs


def main():
    start_total = time.time()

    DATA_DIR  = Path(os.getenv("DATA_DIR",  Path(__file__).parent / "data")).resolve()
    EXCEL_DIR = Path(os.getenv("EXCEL_DIR", DATA_DIR / "excel")).resolve()
    pdf_dirs  = _resolve_pdf_dirs(DATA_DIR)

    print("=" * 65)
    print("ПОСТРОЕНИЕ БАЗЫ ЗНАНИЙ ТН ВЭД")
    print("=" * 65)
    print(f"  EXCEL_DIR : {EXCEL_DIR}")
    print(f"  PDF_DIRS  : {[str(d) for d in pdf_dirs]}")
    print(f"  MOCK_EMB  : {os.getenv('MOCK_EMBEDDER','0')}")
    print(f"  MOCK_LLM  : {os.getenv('MOCK_LLM','0')}")
    print(f"  QDRANT    : {'embedded' if os.getenv('USE_EMBEDDED_QDRANT','0')=='1' else 'external'}")
    print("=" * 65)

    # ── [1] Qdrant ────────────────────────────────────────────────
    print("\n[1/5] Инициализация векторной базы...")
    client = get_client()
    init_collections(client, recreate=True)
    print("      OK")

    # ── [2] Excel ─────────────────────────────────────────────────
    print(f"\n[2/5] Обработка Excel из {EXCEL_DIR} ...")
    excel_files = sorted(EXCEL_DIR.glob("*.xlsx")) + sorted(EXCEL_DIR.glob("*.xls"))
    if not excel_files:
        strict   = os.getenv("STRICT_BUILD",  "0") == "1"
        req_xlsx = os.getenv("REQUIRE_EXCEL", "0") == "1"
        if strict and req_xlsx:
            print(f"ERROR: Excel files not found. Put TN VED Excel into EXCEL_DIR ({EXCEL_DIR}).")
            sys.exit(1)
        print(f"  ВНИМАНИЕ: Excel не найден в {EXCEL_DIR}")
        print("  Добавьте полный Excel с кодами ТН ВЭД в data/excel/")
        all_codes = []
    else:
        all_codes = []
        for ef in excel_files:
            print(f"  → {ef.name}")
            codes = parse_excel(ef)
            all_codes.extend(codes)
        seen: set[str] = set()
        unique_codes = []
        for rec in all_codes:
            if rec["code"] not in seen:
                seen.add(rec["code"])
                unique_codes.append(rec)
        all_codes = unique_codes
        print(f"  Найдено Excel-файлов : {len(excel_files)}")
        print(f"  Уникальных кодов      : {len(all_codes)}")

    # ── [3] PDF ───────────────────────────────────────────────────
    print(f"\n[3/5] Обработка PDF из {len(pdf_dirs)} директорий...")
    pdf_chunks_all, dir_stats = extract_all_pdfs_from_dirs(pdf_dirs)

    total_pdfs  = sum(s.get("pdf_count", 0) for s in dir_stats.values())
    total_chunks = len(pdf_chunks_all)
    with_chapter = sum(1 for c in pdf_chunks_all if c.chapter)
    without_chapter = total_chunks - with_chapter
    low_quality  = sum(1 for c in pdf_chunks_all if c.text_quality_score < 0.40)

    print(f"  {'Директория':<55} {'PDF':>5}  {'Chunks':>7}")
    print(f"  {'-'*55} {'-'*5}  {'-'*7}")
    for dir_path, s in dir_stats.items():
        exists_mark = "✓" if s.get("exists") else "✗ (нет)"
        print(f"  {exists_mark} {dir_path[-52:]:<54} {s.get('pdf_count',0):>5}  {s.get('chunk_count',0):>7}")
    print(f"  {'ИТОГО':<55} {total_pdfs:>5}  {total_chunks:>7}")
    print(f"  Chunks с главой ТН ВЭД    : {with_chapter}")
    print(f"  Chunks без главы           : {without_chapter}")
    print(f"  Chunks с низким качеством  : {low_quality}  (text_quality_score < 0.40)")

    if total_chunks == 0:
        strict  = os.getenv("STRICT_BUILD", "0") == "1"
        req_pdf = os.getenv("REQUIRE_PDF",  "0") == "1"
        if strict and req_pdf:
            print("ERROR: PDF files not found. Set PDF_DIRS to include docs/explanations.")
            sys.exit(1)
        print("  ВНИМАНИЕ: PDF не найдены. Классификатор будет работать только на Excel.")
        print(f"  Для подключения пояснений: export PDF_DIRS=./data/pdf,<путь к docs/explanations>")

    # ── [4] Embeddings для кодов ──────────────────────────────────
    if all_codes:
        leaf_codes = [
            r for r in all_codes
            if r.get("is_leaf_10digit") is True
            or (r.get("is_leaf_10digit") is None
                and r.get("level") == "code" and len(r.get("code", "")) == 10)
        ]
        skipped = len(all_codes) - len(leaf_codes)
        print(f"\n[4/5] Embeddings для {len(leaf_codes)} leaf-кодов"
              f"{f' (пропущено нелистовых: {skipped})' if skipped else ''} ...")
        t0 = time.time()
        code_texts = [r["full_text"] for r in leaf_codes]
        code_embeddings = embed_documents(code_texts, show_progress=True)
        upsert_codes(client, leaf_codes, code_embeddings)
        print(f"      Готово за {time.time() - t0:.0f} сек")

    # ── [4b] Embeddings для PDF ───────────────────────────────────
    if pdf_chunks_all:
        print(f"\n[4b/5] Embeddings для {total_chunks} PDF-чанков...")
        t0 = time.time()
        pdf_texts = [c.text for c in pdf_chunks_all]
        pdf_embeddings = embed_documents(pdf_texts, show_progress=True)
        upsert_pdf_chunks(client, pdf_chunks_all, pdf_embeddings)
        print(f"       Готово за {time.time() - t0:.0f} сек")

    # ── [5] Финальная статистика ──────────────────────────────────
    print("\n[5/5] Проверка базы знаний...")
    # Используем count() напрямую — get_collection_stats может возвращать 0 из-за qdrant_client версии
    from store.qdrant_store import COLLECTION_CODES, COLLECTION_PDF
    try:
        codes_indexed = client.count(COLLECTION_CODES).count
        pdf_indexed   = client.count(COLLECTION_PDF).count
    except Exception:
        stats = get_collection_stats(client)
        codes_indexed = stats["tnved_codes"].get("points_count", 0)
        pdf_indexed   = stats["pdf_chunks"].get("points_count", 0)

    elapsed = (time.time() - start_total) / 60
    print()
    print("=" * 65)
    print("БАЗА ЗНАНИЙ ПОСТРОЕНА")
    print("=" * 65)
    print(f"  Коды ТН ВЭД (indexed)  : {codes_indexed:,}")
    print(f"  PDF-чанки (indexed)    : {pdf_indexed:,}")
    print(f"  Chunks с главой        : {with_chapter}")
    print(f"  Chunks без главы       : {without_chapter}")
    print(f"  Chunks низкое качество : {low_quality}")
    print(f"  Общее время            : {elapsed:.1f} мин")
    print()

    # Отчёт по PDF-директориям
    for dir_path, s in dir_stats.items():
        if s.get("exists") and s.get("pdf_count", 0) > 0:
            print(f"  PDF из {dir_path}: {s['pdf_count']} файлов → {s['chunk_count']} чанков")

    if codes_indexed == 0:
        print()
        print("  ⚠ ВНИМАНИЕ: Коды не проиндексированы!")
        print("    Убедитесь, что Excel с кодами ТН ВЭД находится в data/excel/")
    if pdf_indexed == 0:
        print()
        print("  ℹ PDF не проиндексированы.")
        print("    Система будет работать только на Excel-данных.")
        print("    Для включения пояснений к ТН ВЭД:")
        print("    export PDF_DIRS=./data/pdf,../docs/explanations")
        print("    python build_knowledge_base.py")

    print()
    print("Следующий шаг:")
    print("  ollama pull qwen2.5:7b-instruct-q4_K_M")
    print("  uvicorn api.main:app --host 0.0.0.0 --port 8000")
    print("=" * 65)


if __name__ == "__main__":
    main()
