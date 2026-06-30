"""
Qdrant Store — векторная база знаний.

Две коллекции:
  tnved_codes  — коды ТН ВЭД из Excel (13 289 записей)
  pdf_chunks   — смысловые блоки из PDF-пояснений (~100 000–300 000 записей)

Режим: embedded (файлы в папке qdrant_storage, без Docker).
"""

from __future__ import annotations
import os
from pathlib import Path
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue, MatchAny,
)
import numpy as np
import uuid

COLLECTION_CODES = "tnved_codes"
COLLECTION_PDF = "pdf_chunks"
CODES_COLLECTION = COLLECTION_CODES
PDF_COLLECTION = COLLECTION_PDF
VECTOR_DIM = 768  # multilingual-e5-base


def _env_flag(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


def _backend_dir() -> Path:
    return Path(__file__).resolve().parent.parent


def _resolve_backend_path(value: str | Path) -> Path:
    path = Path(value)
    if not path.is_absolute():
        path = _backend_dir() / path
    return path.resolve()


def get_storage_path() -> Path:
    configured = os.getenv("QDRANT_PATH")
    if configured:
        return _resolve_backend_path(configured)
    data_dir = _resolve_backend_path(os.getenv("DATA_DIR", "./data"))
    return data_dir / "qdrant_storage"


def get_client() -> QdrantClient:
    """Получить Qdrant client. Embedded mode is the default for local/dev."""
    qdrant_url = os.getenv("QDRANT_URL")
    if qdrant_url and not _env_flag("USE_EMBEDDED_QDRANT"):
        return QdrantClient(url=qdrant_url)

    storage_path = get_storage_path()
    storage_path.mkdir(parents=True, exist_ok=True)
    return QdrantClient(path=str(storage_path))


def init_collections(client: QdrantClient, recreate: bool = False):
    """Создать коллекции (или пересоздать при rebuild)."""
    for name in [COLLECTION_CODES, COLLECTION_PDF]:
        if recreate:
            client.recreate_collection(
                collection_name=name,
                vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
            )
            print(f"[Qdrant] Коллекция {name} пересоздана (dim={VECTOR_DIM})")
        elif not client.collection_exists(name):
            client.create_collection(
                collection_name=name,
                vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
            )
            print(f"[Qdrant] Коллекция {name} создана (dim={VECTOR_DIM})")


def upsert_codes(client: QdrantClient, records: list[dict], embeddings: np.ndarray):
    """Загрузить коды ТН ВЭД в коллекцию."""
    assert len(records) == len(embeddings), "Несовпадение записей и векторов"

    batch_size = 256
    for i in range(0, len(records), batch_size):
        batch_records = records[i:i + batch_size]
        batch_vectors = embeddings[i:i + batch_size]

        points = []
        for rec, vec in zip(batch_records, batch_vectors):
            points.append(PointStruct(
                id=str(uuid.uuid5(uuid.NAMESPACE_DNS, rec["code"])),
                vector=vec.tolist(),
                payload={
                    "code": rec["code"],
                    "description": rec["description"],
                    "full_text": rec["full_text"],
                    "chapter": rec.get("chapter", ""),
                    "section": rec.get("section", "")[:200],
                    "level": rec.get("level", "code"),
                },
            ))
        client.upsert(collection_name=COLLECTION_CODES, points=points)
    print(f"[Qdrant] Загружено {len(records)} кодов")


def upsert_pdf_chunks(client: QdrantClient, chunks: list, embeddings: np.ndarray):
    """Загрузить PDF-чанки в коллекцию."""
    from ingestion.pdf_extractor import PdfChunk
    assert len(chunks) == len(embeddings)

    batch_size = 256
    for i in range(0, len(chunks), batch_size):
        batch_chunks = chunks[i:i + batch_size]
        batch_vectors = embeddings[i:i + batch_size]

        points = []
        for chunk, vec in zip(batch_chunks, batch_vectors):
            chunk_key = f"{chunk.source_file}|{chunk.page_num}|{chunk.text[:200]}"
            chunk_id = str(uuid.uuid5(uuid.NAMESPACE_URL, chunk_key))
            points.append(PointStruct(
                id=chunk_id,
                vector=vec.tolist(),
                payload={
                    "text": chunk.text,
                    "chunk_type": chunk.chunk_type,
                    "source_file": chunk.source_file,
                    "page_num": chunk.page_num,
                    "chapter": chunk.chapter,
                    "section": chunk.section,
                    "heading": chunk.heading,
                },
            ))
        client.upsert(collection_name=COLLECTION_PDF, points=points)
    print(f"[Qdrant] Загружено {len(chunks)} PDF-чанков")


def search_codes(
    client: QdrantClient,
    query_vector: np.ndarray,
    top_k: int = 20,
    chapter_filter: Optional[str] = None,
) -> list[dict]:
    """
    Семантический поиск по кодам ТН ВЭД.
    Опционально: ограничить поиск конкретной главой.
    """
    search_filter = None
    if chapter_filter:
        search_filter = Filter(
            must=[FieldCondition(key="chapter", match=MatchValue(value=chapter_filter))]
        )

    results = client.search(
        collection_name=COLLECTION_CODES,
        query_vector=query_vector.tolist(),
        limit=top_k,
        query_filter=search_filter,
        with_payload=True,
    )
    return [{"score": r.score, **r.payload} for r in results]


def search_pdf_chunks(
    client: QdrantClient,
    query_vector: np.ndarray,
    top_k: int = 20,
    chapter_filter: Optional[str] = None,
    chunk_types: Optional[list[str]] = None,
) -> list[dict]:
    """
    Семантический поиск по PDF-чанкам.
    Можно фильтровать по типу чанка (note, exclusion, example, definition).
    """
    must_conditions = []
    if chapter_filter:
        must_conditions.append(
            FieldCondition(key="chapter", match=MatchValue(value=chapter_filter))
        )
    if chunk_types:
        must_conditions.append(
            FieldCondition(key="chunk_type", match=MatchAny(any=chunk_types))
        )

    search_filter = Filter(must=must_conditions) if must_conditions else None

    results = client.search(
        collection_name=COLLECTION_PDF,
        query_vector=query_vector.tolist(),
        limit=top_k,
        query_filter=search_filter,
        with_payload=True,
    )
    return [{"score": r.score, **r.payload} for r in results]


def get_collection_stats(client: QdrantClient) -> dict:
    """Статистика коллекций."""
    stats = {}
    for name in [COLLECTION_CODES, COLLECTION_PDF]:
        try:
            info = client.get_collection(name)
            stats[name] = {
                "vectors_count": info.vectors_count,
                "points_count": info.points_count,
                "status": info.status,
            }
        except Exception:
            stats[name] = {"status": "не существует"}
    return stats
