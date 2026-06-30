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
import hashlib
import os
import re
import numpy as np
from typing import Any

# Singleton — не загружать модель повторно
_model: Any | None = None

MODEL_NAME = "intfloat/multilingual-e5-base"
EMBEDDING_DIM = 768
BATCH_SIZE = 32  # для CPU оптимально 16–64


def get_model() -> Any:
    """Загрузить модель (один раз)."""
    global _model
    if _env_flag("MOCK_EMBEDDER"):
        raise RuntimeError("MOCK_EMBEDDER=1 disables the real SentenceTransformer model")

    if _model is None:
        from sentence_transformers import SentenceTransformer

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
    if _env_flag("MOCK_EMBEDDER"):
        return _mock_embeddings(texts)

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
    if _env_flag("MOCK_EMBEDDER"):
        return _mock_embeddings([text])[0]

    model = get_model()
    embedding = model.encode(
        f"query: {text}",
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    return embedding.astype(np.float32)


def embed_queries(texts: list[str]) -> np.ndarray:
    """Batch embed для нескольких запросов."""
    if _env_flag("MOCK_EMBEDDER"):
        return _mock_embeddings(texts)

    model = get_model()
    prefixed = [f"query: {t}" for t in texts]
    return model.encode(
        prefixed,
        batch_size=BATCH_SIZE,
        convert_to_numpy=True,
        normalize_embeddings=True,
    ).astype(np.float32)


def _env_flag(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


def _mock_embeddings(texts: list[str]) -> np.ndarray:
    """Deterministic lexical dev/test embeddings with the production vector dimension."""
    vectors = np.zeros((len(texts), EMBEDDING_DIM), dtype=np.float32)
    for row, text in enumerate(texts):
        tokens = re.findall(r"[0-9a-zа-яё]{2,}", text.lower())
        features: list[str] = []
        for token in tokens:
            features.append(token)
            if len(token) >= 4:
                features.extend(token[i:i + 3] for i in range(len(token) - 2))
        if not features:
            features = [text[:64]]
        for feature in features:
            digest = hashlib.sha256(feature.encode("utf-8", errors="ignore")).digest()
            idx = int.from_bytes(digest[:4], "little") % EMBEDDING_DIM
            sign = 1.0 if digest[4] & 1 else -1.0
            vectors[row, idx] += sign
        norm = np.linalg.norm(vectors[row])
        if norm:
            vectors[row] /= norm
    return vectors
