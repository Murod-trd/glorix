"""
GLORIX — Генератор семантических эмбеддингов ТН ВЭД
=====================================================
Запустить ОДИН РАЗ на машине с интернетом:

    pip install sentence-transformers torch
    python scripts/generate_embeddings.py

Что делает скрипт:
  1. Скачивает модель paraphrase-multilingual-MiniLM-L6-v2 (~120 МБ)
     с HuggingFace (один раз, потом кешируется)
  2. Читает все 13 289 кодов ТН ВЭД + Пояснений из SQLite
  3. Генерирует 384-мерные смысловые векторы для каждого кода
  4. Сохраняет в public/tnved_docvecs.bin и public/tnved_codes.json
  5. Сохраняет список кодов в public/tnved_semcodes.json

После этого:
    git add public/tnved_docvecs.bin public/tnved_semcodes.json
    git push
"""

import sqlite3, json, struct, os, sys
import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH  = os.path.join(PROJECT_DIR, 'public', 'tnved_complete.db')
OUT_VECS = os.path.join(PROJECT_DIR, 'public', 'tnved_docvecs.bin')
OUT_CODES= os.path.join(PROJECT_DIR, 'public', 'tnved_semcodes.json')

MODEL_NAME = 'sentence-transformers/paraphrase-multilingual-MiniLM-L6-v2'

print("=" * 60)
print("GLORIX Semantic Embeddings Generator")
print("=" * 60)

# ── Загрузка модели ──────────────────────────────────────────
print(f"\n[1/4] Загрузка модели: {MODEL_NAME}")
print("      Первый запуск: ~120 МБ скачивается с HuggingFace...")
try:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(MODEL_NAME)
    print(f"      ✓ Модель загружена | размерность: {model.get_sentence_embedding_dimension()}")
except ImportError:
    print("\n❌ Установите библиотеку:")
    print("   pip install sentence-transformers torch")
    sys.exit(1)

DIMS = model.get_sentence_embedding_dimension()

# ── Чтение базы данных ───────────────────────────────────────
print(f"\n[2/4] Чтение базы ТН ВЭД...")
conn = sqlite3.connect(DB_PATH)
rows = conn.execute(
    "SELECT code, desc, explanation FROM tnved ORDER BY code"
).fetchall()
conn.close()
print(f"      ✓ Загружено кодов: {len(rows)}")

# ── Генерация эмбеддингов ────────────────────────────────────
print(f"\n[3/4] Генерация семантических векторов ({DIMS}-мерных)...")
print("      Ожидаемое время: 5–15 минут (CPU) / 1–2 мин (GPU)")

codes = [r[0] for r in rows]
texts = []
for code, desc, expl in rows:
    # Объединяем описание + начало пояснения для богатого контекста
    text = (desc or '').strip()
    if expl:
        text += ' | ' + expl[:300].strip()
    texts.append(text)

BATCH = 64
embeddings = model.encode(
    texts,
    batch_size=BATCH,
    show_progress_bar=True,
    normalize_embeddings=True,   # L2-нормализация → косинус = скалярное произведение
    convert_to_numpy=True,
)

print(f"      ✓ Матрица: {embeddings.shape} float32")

# ── Сохранение ───────────────────────────────────────────────
print(f"\n[4/4] Сохранение индекса...")

# Binary: header(N, DIMS) + float32 matrix
mat = embeddings.astype(np.float32)
with open(OUT_VECS, 'wb') as f:
    f.write(struct.pack('<II', len(codes), DIMS))
    f.write(mat.tobytes())

with open(OUT_CODES, 'w', encoding='utf-8') as f:
    json.dump(codes, f, separators=(',', ':'))

size_mb = os.path.getsize(OUT_VECS) / 1024 / 1024
print(f"      ✓ {OUT_VECS} ({size_mb:.1f} МБ)")
print(f"      ✓ {OUT_CODES}")

print("\n" + "=" * 60)
print("✅ ГОТОВО! Теперь выполни:")
print()
print("   git add public/tnved_docvecs.bin public/tnved_semcodes.json")
print("   git commit -m 'feat: semantic embeddings index'")
print("   git push")
print("=" * 60)
