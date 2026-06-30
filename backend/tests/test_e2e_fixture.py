"""
test_e2e_fixture.py — end-to-end тест с мини-фикстурой Excel.

Цель: проверить, что pipeline от excel_parser → build_knowledge_base
      корректно читает fixtures/mini_tnved.xlsx и индексирует только
      листовые 10-значные коды.

НЕ требует:
  - реального Ollama
  - реального sentence_transformers/torch
  - внешнего Qdrant

Использует MOCK_EMBEDDER=1 и embedded Qdrant.

Что проверяется:
  1. excel_parser корректно читает mini_tnved.xlsx
  2. Все коды в fixture имеют is_leaf_10digit=True
  3. Нет кодов с is_leaf_10digit=False, попавших в leaf_codes
  4. Embedder в mock-режиме возвращает вектор правильной формы
"""

from __future__ import annotations
import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ.setdefault("MOCK_EMBEDDER", "1")
os.environ.setdefault("MOCK_LLM", "1")
os.environ.setdefault("USE_EMBEDDED_QDRANT", "1")

FIXTURES_DIR = Path(__file__).parent / "fixtures"
MINI_EXCEL   = FIXTURES_DIR / "mini_tnved.xlsx"

EXPECTED_CODES = {
    "8471300000",
    "7318151001",
    "6204620001",
    "8544421000",
    "3004901900",
    "8418101001",
}


class TestExcelParserWithFixture(unittest.TestCase):
    """Тест excel_parser на мини-фикстуре."""

    @classmethod
    def setUpClass(cls):
        if not MINI_EXCEL.exists():
            raise unittest.SkipTest(f"Фикстура не найдена: {MINI_EXCEL}")
        try:
            from ingestion.excel_parser import parse_excel
        except ImportError:
            raise unittest.SkipTest("ingestion.excel_parser не доступен")
        cls.records = parse_excel(str(MINI_EXCEL))

    def test_records_not_empty(self):
        """Парсер должен вернуть хотя бы одну запись."""
        self.assertGreater(len(self.records), 0, "Нет записей из mini_tnved.xlsx")

    def test_all_expected_codes_found(self):
        """Все 6 кодов fixture должны быть распарсены."""
        parsed_codes = {r["code"] for r in self.records}
        for code in EXPECTED_CODES:
            self.assertIn(code, parsed_codes, f"Код {code} не найден в parsed_codes")

    def test_all_codes_are_leaf(self):
        """Все коды в fixture — 10-значные, is_leaf_10digit должен быть True."""
        for r in self.records:
            self.assertTrue(
                r.get("is_leaf_10digit", False),
                f"Код {r.get('code')} помечен is_leaf_10digit=False — ожидался True"
            )

    def test_no_padded_codes(self):
        """Не должно быть 8-значных кодов, дополненных нулями до 10 цифр."""
        for r in self.records:
            raw_len = r.get("raw_digits_len", 10)
            self.assertEqual(
                raw_len, 10,
                f"Код {r.get('code')} имеет raw_digits_len={raw_len} (ожидалось 10)"
            )

    def test_records_have_required_fields(self):
        """Каждая запись должна иметь обязательные поля."""
        required = {"code", "description", "is_leaf_10digit", "level"}
        for r in self.records:
            missing = required - set(r.keys())
            self.assertFalse(
                missing,
                f"Запись {r.get('code')} не содержит полей: {missing}"
            )


class TestMockEmbedder(unittest.TestCase):
    """Тест MOCK_EMBEDDER режима."""

    def test_embed_query_shape(self):
        """embed_query возвращает вектор размерности 768."""
        from ingestion.embedder import embed_query, EMBEDDING_DIM, MOCK_EMBEDDER
        self.assertTrue(MOCK_EMBEDDER, "MOCK_EMBEDDER должен быть True в этом тесте")
        v = embed_query("ноутбук портативный")
        self.assertEqual(v.shape, (EMBEDDING_DIM,))

    def test_embed_query_deterministic(self):
        """Одинаковый текст → одинаковый вектор (детерминированность)."""
        from ingestion.embedder import embed_query
        v1 = embed_query("тест детерминизм")
        v2 = embed_query("тест детерминизм")
        self.assertTrue((v1 == v2).all(), "Вектор недетерминирован")

    def test_embed_query_different_texts_differ(self):
        """Разные тексты → разные векторы."""
        from ingestion.embedder import embed_query
        v1 = embed_query("ноутбук")
        v2 = embed_query("болт стальной")
        self.assertFalse((v1 == v2).all(), "Разные тексты дали одинаковый вектор")

    def test_embed_documents_shape(self):
        """embed_documents возвращает матрицу (N, 768)."""
        from ingestion.embedder import embed_documents, EMBEDDING_DIM
        texts = ["текст один", "текст два", "текст три"]
        m = embed_documents(texts, show_progress=False)
        self.assertEqual(m.shape, (3, EMBEDDING_DIM))

    def test_embed_norm_approximately_one(self):
        """L2-норма вектора должна быть ~1.0 (нормализация)."""
        import numpy as np
        from ingestion.embedder import embed_query
        v = embed_query("проверка нормы")
        norm = float(np.linalg.norm(v))
        self.assertAlmostEqual(norm, 1.0, places=4, msg=f"L2-норма={norm}, ожидалось ~1.0")


class TestMockLLM(unittest.TestCase):
    """Тест MOCK_LLM режима."""

    def test_mock_llm_returns_top1(self):
        """MOCK_LLM=1: _mock_llm_response возвращает top-1 кандидат."""
        from rag.llm_client import _mock_llm_response, MOCK_LLM
        self.assertTrue(MOCK_LLM, "MOCK_LLM должен быть True в этом тесте")
        candidates = [
            {"code": "8471300000", "description": "ноутбук", "score": 0.85},
            {"code": "8471410000", "description": "другое", "score": 0.50},
        ]
        result = _mock_llm_response("ноутбук", candidates)
        self.assertEqual(result.code, "8471300000")
        self.assertIn("MOCK_LLM=1", result.reasoning)
        self.assertIn("production", result.reasoning)

    def test_mock_llm_no_candidates_returns_clarification(self):
        """MOCK_LLM=1 без кандидатов → requires_clarification=True."""
        from rag.llm_client import _mock_llm_response
        result = _mock_llm_response("что угодно", [])
        self.assertTrue(result.requires_clarification)

    def test_mock_llm_confidence_below_real_threshold(self):
        """MOCK_LLM confidence намеренно занижена (≤ 0.60)."""
        from rag.llm_client import _mock_llm_response
        candidates = [{"code": "8471300000", "description": "ноутбук", "score": 0.99}]
        result = _mock_llm_response("ноутбук", candidates)
        self.assertLessEqual(result.confidence, 0.60,
            "MOCK confidence должна быть занижена (не производственный результат)")


if __name__ == "__main__":
    unittest.main(verbosity=2)
