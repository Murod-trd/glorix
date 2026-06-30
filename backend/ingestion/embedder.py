"""
Embedder — строит векторные представления текстов.

Модель: intfloat/multilingual-e5-base
  - 278M параметров, CPU-friendly
  - dimension = 768
  - Обязателен prefix: "query: " для запросов, "passage: " для документов
  - Поддерживает русский язык

Загружается один раз при старте, кэшируется в памяти.
"""

from __future__ import annotations
import numpy as np
from sentence_transformers import SentenceTransformer
from tqdm import tqdm
import torch

# Singleton — не загружать модель повторно
_model: SentenceTransformer | None = None

MODEL_NAME = "intfloat/multilingual-e5-base"
EMBEDDING_DIM = 768
BATCH_SIZE = 32  # для CPU оптимально 16–64


def get_model() -> SentenceTransformer:
    """Загрузить модель (один раз)."""
    global _model
    if _model is None:
        print(f"[Embedder] Загрузка модели {MODEL_NAME}...")
        _model = SentenceTransformer(MODEL_NAME)
        # Для CPU: отключить автокаст
        _model.eval()
        print(f"[Embedder] Модель загружена. Device: {_model.device}")
    return _model


def embed_documents(texts: list[str], show_progress: bool = True) -> np.ndarray:
    """
    Построить embeddings для документов.
    Добавляет prefix "passage: " согласно архитектуре E5.
    """
    model = get_model()
    prefixed = [f"passage: {t}" for t in texts]
    embeddings = model.encode(
        prefixed,
        batch_size=BATCH_SIZE,
        show_progress_bar=show_progress,
        convert_to_numpy=True,
        normalize_embeddings=True,  # L2-нормализация → cosine = dot product
    )
    return embeddings.astype(np.float32)


def embed_query(text: str) -> np.ndarray:
    """
    Построить embedding для одного запроса.
    Добавляет prefix "query: " согласно архитектуре E5.
    """
    model = get_model()
    embedding = model.encode(
        f"query: {text}",
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    return embedding.astype(np.float32)


def embed_queries(texts: list[str]) -> np.ndarray:
    """Batch embed для нескольких запросов."""
    model = get_model()
    prefixed = [f"query: {t}" for t in texts]
    return model.encode(
        prefixed,
        batch_size=BATCH_SIZE,
        convert_to_numpy=True,
        normalize_embeddings=True,
    ).astype(np.float32)
