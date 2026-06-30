"""
build_knowledge_base.py — Одноразовый скрипт построения базы знаний.

Запускать ОДИН РАЗ после добавления/обновления документов:
  python build_knowledge_base.py

Что делает:
  1. Читает Excel с кодами ТН ВЭД из data/excel/
  2. Читает все PDF из data/pdf/
  3. Строит embeddings (multilingual-e5-base)
  4. Сохраняет в Qdrant (embedded mode → папка qdrant_storage/)

Время выполнения (CPU):
  - Excel (13 289 записей): ~5–10 мин
  - PDF (100 файлов, ~50 000 чанков): ~30–60 мин
  - Итого: ~1 час на CPU без GPU
"""

import sys
import time
from pathlib import Path

# Добавить backend/ в путь
sys.path.insert(0, str(Path(__file__).parent))

from ingestion.excel_parser import parse_excel
from ingestion.pdf_extractor import extract_all_pdfs
from ingestion.embedder import embed_documents
from store.qdrant_store import (
    get_client, init_collections,
    upsert_codes, upsert_pdf_chunks,
    get_collection_stats,
)

DATA_DIR = Path(__file__).parent.parent / "data"
EXCEL_DIR = DATA_DIR / "excel"
PDF_DIR = DATA_DIR / "pdf"


def main():
    start_total = time.time()
    print("=" * 60)
    print("ПОСТРОЕНИЕ БАЗЫ ЗНАНИЙ ТН ВЭД")
    print("=" * 60)

    # ── Инициализация Qdrant ──────────────────────────────────────
    print("\n[1/5] Инициализация векторной базы...")
    client = get_client()
    init_collections(client, recreate=True)  # пересоздать при rebuild

    # ── Excel ─────────────────────────────────────────────────────
    print("\n[2/5] Обработка Excel с кодами ТН ВЭД...")
    excel_files = list(EXCEL_DIR.glob("*.xlsx")) + list(EXCEL_DIR.glob("*.xls"))
    if not excel_files:
        print(f"ВНИМАНИЕ: Excel файлы не найдены в {EXCEL_DIR}")
        print("Создайте папку data/excel/ и добавьте Excel с кодами ТН ВЭД.")
        all_codes = []
    else:
        all_codes = []
        for excel_file in excel_files:
            print(f"  Обрабатываю: {excel_file.name}")
            codes = parse_excel(excel_file)
            all_codes.extend(codes)
        # Дедупликация по коду
        seen = set()
        unique_codes = []
        for rec in all_codes:
            if rec["code"] not in seen:
                seen.add(rec["code"])
                unique_codes.append(rec)
        all_codes = unique_codes
        print(f"  Итого уникальных кодов: {len(all_codes)}")

    # ── PDF ───────────────────────────────────────────────────────
    print("\n[3/5] Обработка PDF с пояснениями...")
    if not PDF_DIR.exists() or not list(PDF_DIR.glob("**/*.pdf")):
        print(f"ВНИМАНИЕ: PDF файлы не найдены в {PDF_DIR}")
        print("Классификатор будет работать только на данных Excel.")
        pdf_chunks = []
    else:
        pdf_chunks = extract_all_pdfs(PDF_DIR)
        print(f"  Итого чанков: {len(pdf_chunks)}")
        # Статистика по типам
        from collections import Counter
        type_counts = Counter(c.chunk_type for c in pdf_chunks)
        for ctype, count in sorted(type_counts.items()):
            print(f"    {ctype}: {count}")

    # ── Embeddings для кодов ──────────────────────────────────────
    if all_codes:
        print(f"\n[4/5] Построение embeddings для {len(all_codes)} кодов...")
        print("      (это займёт 5–15 минут на CPU)")
        t0 = time.time()
        code_texts = [r["full_text"] for r in all_codes]
        code_embeddings = embed_documents(code_texts, show_progress=True)
        upsert_codes(client, all_codes, code_embeddings)
        print(f"      Готово за {(time.time() - t0):.0f} сек")

    # ── Embeddings для PDF ────────────────────────────────────────
    if pdf_chunks:
        print(f"\n[4b/5] Построение embeddings для {len(pdf_chunks)} PDF-чанков...")
        print("      (это займёт 20–60 минут на CPU)")
        t0 = time.time()
        pdf_texts = [c.text for c in pdf_chunks]
        pdf_embeddings = embed_documents(pdf_texts, show_progress=True)
        upsert_pdf_chunks(client, pdf_chunks, pdf_embeddings)
        print(f"      Готово за {(time.time() - t0):.0f} сек")

    # ── Финальная статистика ──────────────────────────────────────
    print("\n[5/5] Проверка базы знаний...")
    stats = get_collection_stats(client)
    print("\n" + "=" * 60)
    print("БАЗА ЗНАНИЙ УСПЕШНО ПОСТРОЕНА")
    print("=" * 60)
    print(f"  Коды ТН ВЭД:   {stats['tnved_codes'].get('points_count', 0):,}")
    print(f"  PDF-чанки:     {stats['pdf_chunks'].get('points_count', 0):,}")
    print(f"  Общее время:   {(time.time() - start_total) / 60:.1f} мин")
    print()
    print("Следующий шаг:")
    print("  1. Установите Ollama: https://ollama.ai/download")
    print("  2. Загрузите модель: ollama pull qwen2.5:7b-instruct-q4_K_M")
    print("  3. Запустите API:    uvicorn api.main:app --host 0.0.0.0 --port 8000")
    print("=" * 60)


if __name__ == "__main__":
    main()
