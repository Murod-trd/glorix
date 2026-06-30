"""
conftest.py — Общие pytest fixtures для всех тестов glorix.

Автоматически сбрасывает Qdrant и Retriever синглтоны между тестами,
чтобы каждый тест получал чистое состояние.
"""
import os
import sys
import pytest


@pytest.fixture(autouse=True)
def reset_singletons():
    """
    Сбросить все module-level синглтоны перед каждым тестом.

    Без этого embedded Qdrant клиент и Retriever BM25 сохраняют
    состояние между тестами, что приводит к конфликтам блокировок.
    """
    # Сбрасываем ПЕРЕД тестом
    _clear_singletons()
    yield
    # Сбрасываем ПОСЛЕ теста
    _clear_singletons()


def _clear_singletons():
    """Сбросить все синглтоны в store/ и rag/."""
    # store.qdrant_store — _CLIENT singleton
    if "store.qdrant_store" in sys.modules:
        mod = sys.modules["store.qdrant_store"]
        if hasattr(mod, "_CLIENT"):
            try:
                if mod._CLIENT is not None:
                    mod._CLIENT.close()
            except Exception:
                pass
            mod._CLIENT = None
            mod._CLIENT_KEY = None

    # rag.retriever — _retriever singleton
    if "rag.retriever" in sys.modules:
        mod = sys.modules["rag.retriever"]
        if hasattr(mod, "_retriever"):
            mod._retriever = None
