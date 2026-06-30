"""
test_api_contract.py — контрактные тесты API через FastAPI TestClient.

Проверяет:
  1. Структуру ответов (поля, типы) — не качество классификации
  2. Работу в MOCK-режиме (MOCK_EMBEDDER=1, MOCK_LLM=1, USE_EMBEDDED_QDRANT=1)
  3. Валидацию входных данных (400 на слишком короткий запрос)
  4. /health endpoint
  5. /rebuild с неверным токеном → 403
  6. ExplainResponse содержит все обязательные поля
  7. /classify/audit содержит audit_trail

ВНИМАНИЕ: тесты используют MOCK-режим.
Они НЕ проверяют корректность классификации реальных товаров.
"""

from __future__ import annotations
import os
import sys
import unittest
import unittest.mock as mock

# ── Stub heavy ML deps before any import ──────────────────────────────────
os.environ.setdefault("MOCK_LLM", "1")
os.environ.setdefault("MOCK_EMBEDDER", "1")
os.environ.setdefault("USE_EMBEDDED_QDRANT", "1")
os.environ.setdefault("REBUILD_TOKEN", "test-token-123")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Stub sentence_transformers before import
sys.modules.setdefault("sentence_transformers", mock.MagicMock())

try:
    from fastapi.testclient import TestClient
    HAS_FASTAPI_TESTCLIENT = True
except ImportError:
    HAS_FASTAPI_TESTCLIENT = False

try:
    from httpx import Client as _  # noqa
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False


def _make_client():
    """Создать TestClient с мок-зависимостями."""
    # Stub qdrant and retriever
    qdrant_mock = mock.MagicMock()
    qdrant_mock.count.return_value = mock.MagicMock(count=500)
    qdrant_mock.get_collections.return_value = mock.MagicMock(
        collections=[
            mock.MagicMock(name="tnved_codes"),
            mock.MagicMock(name="pdf_chunks"),
        ]
    )

    with mock.patch("store.qdrant_store.get_client", return_value=qdrant_mock), \
         mock.patch("store.qdrant_store.get_health_info", return_value={
             "mode": "embedded",
             "codes_count": 500,
             "pdf_chunks_count": 0,
             "collections_exist": True,
             "collections": {},
         }):
        from api.main import app
        return TestClient(app, raise_server_exceptions=True)


@unittest.skipUnless(HAS_FASTAPI_TESTCLIENT, "fastapi[testclient] не установлен")
@unittest.skipUnless(HAS_HTTPX, "httpx не установлен (требуется для TestClient)")
class TestHealthEndpoint(unittest.TestCase):
    """Тест /health endpoint."""

    def setUp(self):
        self.client = _make_client()

    def test_health_returns_200(self):
        """GET /health должен вернуть 200."""
        r = self.client.get("/health")
        self.assertEqual(r.status_code, 200, r.text)

    def test_health_has_status_field(self):
        """GET /health должен содержать поле status."""
        r = self.client.get("/health")
        body = r.json()
        self.assertIn("status", body)

    def test_health_has_warnings_list(self):
        """GET /health должен содержать warnings: list."""
        r = self.client.get("/health")
        body = r.json()
        self.assertIn("warnings", body)
        self.assertIsInstance(body["warnings"], list)


@unittest.skipUnless(HAS_FASTAPI_TESTCLIENT, "fastapi[testclient] не установлен")
@unittest.skipUnless(HAS_HTTPX, "httpx не установлен (требуется для TestClient)")
class TestClassifyValidation(unittest.TestCase):
    """Тест валидации входных данных /classify."""

    def setUp(self):
        self.client = _make_client()

    def test_empty_description_returns_422(self):
        """POST /classify без description → 422 Unprocessable Entity."""
        r = self.client.post("/classify", json={})
        self.assertEqual(r.status_code, 422, r.text)

    def test_too_short_description_returns_422(self):
        """POST /classify с description < 5 символов → 422."""
        r = self.client.post("/classify", json={"description": "тест"})
        self.assertEqual(r.status_code, 422, r.text)

    def test_too_long_description_returns_422(self):
        """POST /classify с description > 2000 символов → 422."""
        r = self.client.post("/classify", json={"description": "а" * 2001})
        self.assertEqual(r.status_code, 422, r.text)


@unittest.skipUnless(HAS_FASTAPI_TESTCLIENT, "fastapi[testclient] не установлен")
@unittest.skipUnless(HAS_HTTPX, "httpx не установлен (требуется для TestClient)")
class TestRebuildAuth(unittest.TestCase):
    """Тест авторизации /rebuild."""

    def setUp(self):
        self.client = _make_client()

    def test_rebuild_wrong_token_returns_403(self):
        """POST /rebuild с неверным токеном → 403."""
        r = self.client.post(
            "/rebuild",
            headers={"X-Rebuild-Token": "wrong-token"},
        )
        self.assertEqual(r.status_code, 403, r.text)

    def test_rebuild_no_token_returns_422(self):
        """POST /rebuild без заголовка X-Rebuild-Token → 422."""
        r = self.client.post("/rebuild")
        self.assertEqual(r.status_code, 422, r.text)


@unittest.skipUnless(HAS_FASTAPI_TESTCLIENT, "fastapi[testclient] не установлен")
@unittest.skipUnless(HAS_HTTPX, "httpx не установлен (требуется для TestClient)")
class TestClassifyResponseContract(unittest.TestCase):
    """
    Контрактный тест: структура ответа /classify.
    Не проверяет правильность кода — только наличие обязательных полей.
    """

    @classmethod
    def setUpClass(cls):
        cls.client = _make_client()
        # Заглушка для classify — не требует реального Qdrant/Ollama
        with mock.patch("rag.classifier.classify") as m:
            from rag.classifier import ClassificationResult
            from rag.evidence_builder import Evidence
            m.return_value = ClassificationResult(
                code="8471300000",
                confidence=0.55,
                requires_clarification=False,
                reasoning="MOCK",
                opi_rule_applied="MOCK",
                sources_used=["mock"],
                processing_time_ms=10,
                audit_trail=[{"step": "retrieval", "codes_found": 1, "pdf_chunks_found": 0}],
            )
            r = cls.client.post("/classify", json={"description": "ноутбук портативный"})
            cls.status = r.status_code
            cls.body = r.json() if r.status_code == 200 else {}

    def test_status_200(self):
        self.assertEqual(self.status, 200, self.body)

    def test_has_code_field(self):
        self.assertIn("code", self.body)

    def test_has_confidence_field(self):
        self.assertIn("confidence", self.body)
        if self.body.get("confidence") is not None:
            self.assertIsInstance(self.body["confidence"], float)

    def test_has_requires_clarification(self):
        self.assertIn("requires_clarification", self.body)
        self.assertIsInstance(self.body["requires_clarification"], bool)

    def test_has_reasoning(self):
        self.assertIn("reasoning", self.body)

    def test_has_sources_used(self):
        self.assertIn("sources_used", self.body)
        self.assertIsInstance(self.body["sources_used"], list)

    def test_has_meta_block(self):
        self.assertIn("meta", self.body)
        meta = self.body["meta"]
        self.assertIn("model", meta)
        self.assertIn("processing_time_ms", meta)


@unittest.skipUnless(HAS_FASTAPI_TESTCLIENT, "fastapi[testclient] не установлен")
@unittest.skipUnless(HAS_HTTPX, "httpx не установлен (требуется для TestClient)")
class TestAuditEndpointContract(unittest.TestCase):
    """Тест /classify/audit — должен содержать audit_trail."""

    @classmethod
    def setUpClass(cls):
        cls.client = _make_client()
        with mock.patch("rag.classifier.classify") as m:
            from rag.classifier import ClassificationResult
            m.return_value = ClassificationResult(
                code="8471300000",
                confidence=0.55,
                requires_clarification=False,
                reasoning="MOCK",
                sources_used=[],
                audit_trail=[
                    {"step": "retrieval", "codes_found": 1, "pdf_chunks_found": 0},
                    {"step": "llm_primary", "proposed_code": "8471300000"},
                ],
            )
            r = cls.client.post("/classify/audit", json={"description": "ноутбук портативный"})
            cls.status = r.status_code
            cls.body = r.json() if r.status_code == 200 else {}

    def test_status_200(self):
        self.assertEqual(self.status, 200, self.body)

    def test_has_audit_trail(self):
        self.assertIn("audit_trail", self.body)
        self.assertIsNotNone(self.body["audit_trail"])
        self.assertIsInstance(self.body["audit_trail"], list)

    def test_audit_trail_not_empty(self):
        self.assertGreater(len(self.body.get("audit_trail", [])), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
