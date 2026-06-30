"""
Hybrid Retriever — объединяет семантический (dense) и лексический (BM25) поиск.

ИЗМЕНЕНИЯ v2 (критически важные):
- chapter_hint УБРАН как фильтр Qdrant (ранее ограничивал поиск — это было опасно).
- Введён boost_chapter: после RRF-слияния применяет +15% к оценкам кодов из
  подсказанной главы. Коды других глав НИКОГДА не исключаются.
- top_k увеличен с 15 до 20 по умолчанию.

Алгоритм:
1. Dense search: query embedding → Qdrant cosine similarity (ВСЯ база, без фильтра)
2. Sparse search: BM25 по всем текстам кодов и чанков
3. RRF (Reciprocal Rank Fusion)
4. Soft boost: коды из подсказанной главы получают +15% к RRF-оценке
5. Вернуть топ-K
"""

from __future__ import annotations
from typing import Optional

import logging
import numpy as np

# Lazy BM25 import — rank_bm25 — необязательная зависимость.
# Без неё система работает только на dense-поиске (Qdrant).
try:
    from rank_bm25 import BM25Okapi
    _BM25_AVAILABLE = True
except Exception:
    BM25Okapi = None  # type: ignore
    _BM25_AVAILABLE = False
    logging.getLogger(__name__).warning(
        "[Retriever] rank_bm25 не установлен — BM25 sparse search отключён. "
        "Установите: pip install rank-bm25"
    )

from ingestion.embedder import embed_query
from store.qdrant_store import (
    get_client, search_codes, search_pdf_chunks,
    COLLECTION_CODES, COLLECTION_PDF,
)

RRF_K = 60
try:
    from config import CHAPTER_BOOST_FACTOR
except ImportError:
    CHAPTER_BOOST_FACTOR = 1.15  # fallback only for isolated tests without config


class HybridRetriever:
    """
    Гибридный ретривер: dense + BM25 + RRF.

    ПРИНЦИПИАЛЬНОЕ ИЗМЕНЕНИЕ v2:
      boost_chapter — это подсказка для ранжирования.
      Поиск ВСЕГДА выполняется по всей базе целиком.
      Коды других глав никогда не исключаются.
    """

    def __init__(self):
        self._client = None
        self._bm25_codes: Optional[BM25Okapi] = None
        self._bm25_codes_meta: list[dict] = []
        self._bm25_pdf: Optional[BM25Okapi] = None
        self._bm25_pdf_meta: list[dict] = []
        self._initialized = False

    def initialize(self):
        """Загрузить все документы из Qdrant и построить BM25-индексы.

        Если коллекции не найдены (база не построена) — не падает, возвращает
        пустые индексы. Используйте build_knowledge_base.py для заполнения.
        """
        self._client = get_client()
        print("[Retriever] Загрузка данных из Qdrant для BM25...")

        batch_size = 1000

        # Коды ТН ВЭД
        offset, all_codes = None, []
        try:
         while True:
            result, offset = self._client.scroll(
                collection_name=COLLECTION_CODES,
                limit=batch_size, offset=offset,
                with_payload=True, with_vectors=False,
            )
            all_codes.extend([r.payload for r in result])
            if offset is None:
                break
        except Exception as _e:
            print(f"[Retriever] Коллекция кодов не найдена или пуста: {_e}")
            all_codes = []
        self._bm25_codes_meta = all_codes
        if _BM25_AVAILABLE and all_codes:
            self._bm25_codes = BM25Okapi([
                self._tokenize(r.get("full_text", "") + " " + r.get("description", ""))
                for r in all_codes
            ])
        else:
            self._bm25_codes = None
        print(f"[Retriever] BM25 коды: {len(all_codes)} записей (BM25={'ON' if self._bm25_codes else 'OFF'})")

        # PDF-чанки
        offset, all_pdf = None, []
        try:
         while True:
            result, offset = self._client.scroll(
                collection_name=COLLECTION_PDF,
                limit=batch_size, offset=offset,
                with_payload=True, with_vectors=False,
            )
            all_pdf.extend([r.payload for r in result])
            if offset is None:
                break
        except Exception as _e:
            print(f"[Retriever] Коллекция PDF не найдена или пуста: {_e}")
            all_pdf = []
        self._bm25_pdf_meta = all_pdf
        if _BM25_AVAILABLE and all_pdf:
            self._bm25_pdf = BM25Okapi([
                self._tokenize(r.get("text", ""))
                for r in all_pdf
            ])
        else:
            self._bm25_pdf = None
        print(f"[Retriever] BM25 PDF: {len(all_pdf)} записей (BM25={'ON' if self._bm25_pdf else 'OFF'})")
        self._initialized = True

    def retrieve(
        self,
        query: str,
        top_k: int = 20,
        boost_chapter: Optional[str] = None,
    ) -> dict:
        """
        Гибридный поиск по всей базе.

        Args:
            query: Описание товара
            top_k: Количество результатов (увеличено с 15 до 20)
            boost_chapter: МЯГКАЯ подсказка по главе — только для ранжирования.
                           +15% к оценке совпадающих кодов.
                           Никакой фильтрации — никогда.

        Returns:
            {"codes": [...], "pdf_chunks": [...]}
        """
        if not self._initialized:
            raise RuntimeError("Retriever не инициализирован. Вызовите initialize().")

        query_vec = embed_query(query)

        # Dense search — БЕЗ chapter_filter (принципиально)
        dense_codes = search_codes(
            self._client, query_vec,
            top_k=top_k * 2,
            chapter_filter=None,    # ← Всегда None. Никаких ограничений.
        )
        dense_pdf = search_pdf_chunks(
            self._client, query_vec,
            top_k=top_k * 2,
            chapter_filter=None,    # ← То же для PDF.
        )

        # BM25 sparse search (пропускается если rank_bm25 не установлен)
        sparse_codes, sparse_pdf = [], []
        if self._bm25_codes is not None or self._bm25_pdf is not None:
            query_tokens = self._tokenize(query)

        if self._bm25_codes is not None:
            bm25_code_scores = self._bm25_codes.get_scores(query_tokens)
            top_code_idx = np.argsort(bm25_code_scores)[::-1][:top_k * 2]
            sparse_codes = [
                {**self._bm25_codes_meta[i], "bm25_score": float(bm25_code_scores[i])}
                for i in top_code_idx if bm25_code_scores[i] > 0
            ]

        if self._bm25_pdf is not None:
            bm25_pdf_scores = self._bm25_pdf.get_scores(query_tokens)
            top_pdf_idx = np.argsort(bm25_pdf_scores)[::-1][:top_k * 2]
            sparse_pdf = [
                {**self._bm25_pdf_meta[i], "bm25_score": float(bm25_pdf_scores[i])}
                for i in top_pdf_idx if bm25_pdf_scores[i] > 0
            ]

        # RRF fusion
        fused_codes = self._rrf_fuse(dense_codes, sparse_codes, "code", top_k * 2)
        fused_pdf = self._rrf_fuse(dense_pdf, sparse_pdf, "text", top_k * 2)

        # Soft chapter boost — ПОСЛЕ слияния, только как сигнал ранжирования
        if boost_chapter:
            for doc in fused_codes:
                if doc.get("chapter", "") == boost_chapter:
                    doc["rrf_score"] = doc.get("rrf_score", 0) * CHAPTER_BOOST_FACTOR
                    doc["chapter_boosted"] = True
            fused_codes.sort(key=lambda d: -d.get("rrf_score", 0))

        # Примечания и исключения идут первыми среди PDF-чанков
        priority_pdf = [c for c in fused_pdf if c.get("chunk_type") in ("note", "exclusion", "definition")]
        other_pdf = [c for c in fused_pdf if c.get("chunk_type") not in ("note", "exclusion", "definition")]
        ordered_pdf = priority_pdf[:6] + other_pdf[:max(0, top_k - len(priority_pdf[:6]))]

        return {
            "codes": fused_codes[:top_k],
            "pdf_chunks": ordered_pdf[:top_k],
        }

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        import re
        tokens = re.findall(r"[а-яёa-z0-9]{2,}", text.lower())
        return tokens or [""]

    @staticmethod
    def _rrf_fuse(
        dense_results: list[dict],
        sparse_results: list[dict],
        key_field: str,
        top_k: int,
    ) -> list[dict]:
        scores: dict[str, float] = {}
        meta: dict[str, dict] = {}

        for rank, doc in enumerate(dense_results):
            key = str(doc.get(key_field, rank))[:120]
            scores[key] = scores.get(key, 0) + 1.0 / (RRF_K + rank + 1)
            if key not in meta:
                meta[key] = doc

        for rank, doc in enumerate(sparse_results):
            key = str(doc.get(key_field, rank))[:120]
            scores[key] = scores.get(key, 0) + 1.0 / (RRF_K + rank + 1)
            if key not in meta:
                meta[key] = doc

        sorted_keys = sorted(scores, key=lambda k: -scores[k])
        results = []
        for key in sorted_keys[:top_k]:
            doc = meta[key].copy()
            doc["rrf_score"] = round(scores[key], 6)
            results.append(doc)
        return results


_retriever: Optional[HybridRetriever] = None


def get_retriever() -> HybridRetriever:
    global _retriever
    if _retriever is None:
        _retriever = HybridRetriever()
        _retriever.initialize()
    return _retriever
