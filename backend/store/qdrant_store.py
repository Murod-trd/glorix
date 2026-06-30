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

STORAGE_PATH = Path(os.getenv("QDRANT_STORAGE_PATH", Path(__file__).parent.parent / "qdrant_storage"))

COLLECTION_CODES = "tnved_codes"
COLLECTION_PDF = "pdf_chunks"
VECTOR_DIM = 768  # multilingual-e5-base

_CLIENT: QdrantClient | None = None
_CLIENT_KEY: tuple | None = None


def get_client() -> QdrantClient:
    """Получить Qdrant-клиент (singleton для embedded-режима).

    В embedded-режиме Qdrant local storage не допускает несколько клиентов
    к одной папке внутри одного процесса. Поэтому клиент кэшируется как
    singleton. Для concurrent/multi-process deployment используйте внешний
    Qdrant server (USE_EMBEDDED_QDRANT=0).
    """
    global _CLIENT, _CLIENT_KEY

    mode = "embedded" if os.getenv("USE_EMBEDDED_QDRANT", "0") == "1" else "external"
    if mode == "embedded":
        STORAGE_PATH.mkdir(parents=True, exist_ok=True)
        key = (mode, str(STORAGE_PATH.resolve()))
        if _CLIENT is None or _CLIENT_KEY != key:
            _CLIENT = QdrantClient(path=str(STORAGE_PATH))
            _CLIENT_KEY = key
        return _CLIENT

    host = os.getenv("QDRANT_HOST", "localhost")
    port = int(os.getenv("QDRANT_PORT", "6333"))
    key = (mode, host, port)
    if _CLIENT is None or _CLIENT_KEY != key:
        _CLIENT = QdrantClient(host=host, port=port)
        _CLIENT_KEY = key
    return _CLIENT


def init_collections(client: QdrantClient, recreate: bool = False):
    """Создать коллекции (или пересоздать при rebuild)."""
    existing = [c.name for c in client.get_collections().collections]

    for name in [COLLECTION_CODES, COLLECTION_PDF]:
        if name in existing and recreate:
            client.delete_collection(name)
            print(f"[Qdrant] Коллекция {name} удалена")
        if name not in existing or recreate:
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
            chunk_id = str(uuid.uuid4())
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
                    "text_quality_score": getattr(chunk, "text_quality_score", 1.0),
                    "text_quality_warning": getattr(chunk, "text_quality_warning", ""),
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

    results = client.query_points(
        collection_name=COLLECTION_CODES,
        query=query_vector.tolist(),
        limit=top_k,
        query_filter=search_filter,
        with_payload=True,
    ).points
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

    results = client.query_points(
        collection_name=COLLECTION_PDF,
        query=query_vector.tolist(),
        limit=top_k,
        query_filter=search_filter,
        with_payload=True,
    ).points
    return [{"score": r.score, **r.payload} for r in results]



def get_health_info(client: QdrantClient) -> dict:
    """
    Вернуть статус Qdrant для /health endpoint.
    Включает: режим (embedded/external), наличие коллекций, счётчики.
    """
    qdrant_mode = "embedded" if os.getenv("USE_EMBEDDED_QDRANT", "0") == "1" else "external"
    info: dict = {"mode": qdrant_mode, "collections": {}}

    existing = {c.name for c in client.get_collections().collections}
    for name in [COLLECTION_CODES, COLLECTION_PDF]:
        exists = name in existing
        entry: dict = {"exists": exists}
        if exists:
            try:
                count = client.count(name).count
                entry["count"] = count
            except Exception as e:
                entry["count_error"] = str(e)
        info["collections"][name] = entry

    codes_count = info["collections"].get(COLLECTION_CODES, {}).get("count", 0)
    pdf_count   = info["collections"].get(COLLECTION_PDF,   {}).get("count", 0)
    info["codes_count"] = codes_count
    info["pdf_chunks_count"] = pdf_count
    info["collections_exist"] = all(
        info["collections"][n]["exists"] for n in [COLLECTION_CODES, COLLECTION_PDF]
    )
    return info

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
