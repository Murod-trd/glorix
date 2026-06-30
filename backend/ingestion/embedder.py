"""
Embedder — строит векторные представления текстов.

Реальная модель: intfloat/multilingual-e5-base (dimension=768)
  - требует sentence_transformers + torch (~2 ГБ)
  - CPU-friendly, поддерживает русский язык

Dev-mode (MOCK_EMBEDDER=1):
  - Не требует sentence_transformers или torch
  - Возвращает детерминированный mock-вектор одинаковой размерности
  - ЗАПРЕЩЕНО использовать для production-оценки качества
  - В логах явно указывается: [Embedder] MOCK MODE (MOCK_EMBEDDER=1)
"""

from __future__ import annotations
import hashlib
import os
import numpy as np

MOCK_EMBEDDER: bool = os.getenv("MOCK_EMBEDDER", "0") == "1"
MODEL_NAME = "intfloat/multilingual-e5-base"
EMBEDDING_DIM = 768
BATCH_SIZE = 32

_model = None  # singleton, загружается только в real-mode


# ── Real mode ──────────────────────────────────────────────────────────────

def _get_real_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError:
            raise RuntimeError(
                "sentence_transformers не установлен. "
                "Установите зависимости: pip install -r requirements.txt\n"
                "Или включите dev-mode: export MOCK_EMBEDDER=1"
            )
        print(f"[Embedder] REAL MODE — загрузка модели {MODEL_NAME}...")
        _model = SentenceTransformer(MODEL_NAME)
        _model.eval()
        print(f"[Embedder] Модель загружена. Device: {_model.device}")
    return _model


def _real_embed_documents(texts: list[str], show_progress: bool = True) -> np.ndarray:
    try:
        from tqdm import tqdm  # optional
    except ImportError:
        pass
    model = _get_real_model()
    prefixed = [f"passage: {t}" for t in texts]
    embeddings = model.encode(
        prefixed,
        batch_size=BATCH_SIZE,
        show_progress_bar=show_progress,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    return embeddings.astype(np.float32)


def _real_embed_query(text: str) -> np.ndarray:
    model = _get_real_model()
    embedding = model.encode(
        f"query: {text}",
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    return embedding.astype(np.float32)


# ── Mock mode ──────────────────────────────────────────────────────────────

def _mock_vector(text: str) -> np.ndarray:
    """
    Детерминированный mock-вектор: SHA-256 хэш текста → float32 вектор.
    Размерность совпадает с реальной моделью (EMBEDDING_DIM=768).
    НЕ отражает семантическое сходство — только для проверки pipeline.
    """
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    # Расширить 32 байта до EMBEDDING_DIM путём повторения (uint8 → float, без overflow)
    repeats = (EMBEDDING_DIM + len(digest) - 1) // len(digest)
    raw = np.frombuffer((digest * repeats)[:EMBEDDING_DIM], dtype=np.uint8).astype(np.float32)
    norm = float(np.linalg.norm(raw))
    return (raw / norm if norm > 0 else raw).astype(np.float32)


def _mock_embed_documents(texts: list[str], show_progress: bool = True) -> np.ndarray:
    print(f"[Embedder] MOCK MODE (MOCK_EMBEDDER=1) — {len(texts)} документов. "
          "НЕ использовать для production.")
    return np.stack([_mock_vector(t) for t in texts])


def _mock_embed_query(text: str) -> np.ndarray:
    return _mock_vector(text)


# ── Public API ─────────────────────────────────────────────────────────────

def embed_documents(texts: list[str], show_progress: bool = True) -> np.ndarray:
    """Построить embeddings для документов (passage prefix)."""
    if MOCK_EMBEDDER:
        return _mock_embed_documents(texts, show_progress)
    return _real_embed_documents(texts, show_progress)


def embed_query(text: str) -> np.ndarray:
    """Построить embedding для одного запроса (query prefix)."""
    if MOCK_EMBEDDER:
        return _mock_embed_query(text)
    return _real_embed_query(text)


def embed_queries(texts: list[str]) -> np.ndarray:
    """Batch embed для нескольких запросов."""
    if MOCK_EMBEDDER:
        return np.stack([_mock_embed_query(t) for t in texts])
    model = _get_real_model()
    prefixed = [f"query: {t}" for t in texts]
    return model.encode(
        prefixed,
        batch_size=BATCH_SIZE,
        convert_to_numpy=True,
        normalize_embeddings=True,
    ).astype(np.float32)
