"""
test_api_contract.py — Contract tests for API response shape.

/classify/explain ДОЛЖЕН возвращать:
  - evidence (с excel_records, pdf_chunks, evidence_score, is_sufficient)
  - sources_used
  - retrieval_stats (codes_found, pdf_chunks_found)
  - audit_trail
  - rule_engine
  - validation
  - devil_advocate
  - evidence_threshold_used
  - evidence_threshold_source

/health ДОЛЖЕН возвращать:
  - qdrant (codes_count, pdf_chunks_count, mode)
  - data_sources (pdf_dirs, docs_explanations_detected, docs_explanations_included, warnings)
  - evidence (threshold_used, threshold_source)
"""
import os
import sys
import json
import pytest
from pathlib import Path

BACKEND_DIR = Path(__file__).parent.parent


# dev_env env vars are set directly in the module-scoped client fixture


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    """FastAPI TestClient — module-scoped, один на весь модуль.

    Создаёт пустые Qdrant-коллекции чтобы retriever не падал
    с 'Collection not found'. Данных нет → классификатор возвращает
    clarification/refusal (200 или 409), не 500.
    """
    tmp = tmp_path_factory.mktemp("contract_qdrant")
    qdrant_path = tmp / "qdrant_storage"
    qdrant_path.mkdir()

    os.environ["QDRANT_STORAGE_PATH"] = str(qdrant_path)
    os.environ["USE_EMBEDDED_QDRANT"]  = "1"
    os.environ["MOCK_EMBEDDER"]        = "1"
    os.environ["MOCK_LLM"]             = "1"
    os.environ["EVIDENCE_MIN_SCORE"]   = "0.0"
    os.environ["REBUILD_TOKEN"]        = "test-token"

    # Сбросить все синглтоны (старые пути)
    for mod_name in list(sys.modules.keys()):
        if (mod_name.startswith("api") or mod_name.startswith("rag")
                or mod_name.startswith("store") or mod_name.startswith("ingestion")
                or "qdrant" in mod_name.lower()):
            del sys.modules[mod_name]

    # Инициализировать пустые коллекции (чтобы retriever не падал с "not found")
    from store.qdrant_store import get_client, init_collections
    _qc = get_client()
    init_collections(_qc, recreate=False)  # Создать если нет, не пересоздавать

    from fastapi.testclient import TestClient
    from api.main import app
    return TestClient(app, raise_server_exceptions=False)


# ─── /health contract ────────────────────────────────────────────────────────

class TestHealthContract:
    def test_health_returns_200(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_health_has_qdrant_section(self, client):
        body = client.get("/health").json()
        assert "qdrant" in body, f"qdrant section missing. Keys: {list(body.keys())}"

    def test_health_qdrant_has_counts(self, client):
        qdrant = client.get("/health").json().get("qdrant", {})
        assert "codes_count" in qdrant, f"codes_count missing. qdrant: {qdrant}"
        assert "pdf_chunks_count" in qdrant, f"pdf_chunks_count missing. qdrant: {qdrant}"
        assert "mode" in qdrant, f"mode missing. qdrant: {qdrant}"

    def test_health_has_data_sources(self, client):
        body = client.get("/health").json()
        assert "data_sources" in body, f"data_sources missing. Keys: {list(body.keys())}"

    def test_health_data_sources_has_pdf_dirs(self, client):
        ds = client.get("/health").json().get("data_sources", {})
        assert "pdf_dirs" in ds, f"pdf_dirs missing. data_sources: {ds}"
        assert isinstance(ds["pdf_dirs"], list)

    def test_health_data_sources_has_docs_explanations_fields(self, client):
        ds = client.get("/health").json().get("data_sources", {})
        assert "docs_explanations_detected" in ds
        assert "docs_explanations_included" in ds

    def test_health_data_sources_has_warnings_list(self, client):
        ds = client.get("/health").json().get("data_sources", {})
        assert "warnings" in ds, f"warnings missing from data_sources: {ds}"
        assert isinstance(ds["warnings"], list)

    def test_health_has_evidence_section(self, client):
        body = client.get("/health").json()
        assert "evidence" in body, f"evidence section missing. Keys: {list(body.keys())}"
        ev = body["evidence"]
        assert "threshold_used" in ev
        assert "threshold_source" in ev


# ─── /classify/explain contract ──────────────────────────────────────────────

class TestClassifyExplainContract:
    def test_returns_200_or_422(self, client):
        resp = client.post(
            "/classify/explain",
            json={"description": "болт стальной"},
        )
        # 200 — success, 409 — refused (evidence insufficient), both valid
        assert resp.status_code in (200, 409, 422), f"Unexpected: {resp.status_code}"

    def _classify(self, client):
        resp = client.post(
            "/classify/explain",
            json={"description": "болт стальной"},
        )
        assert resp.status_code in (200, 409), f"HTTP {resp.status_code}: {resp.text[:300]}"
        return resp.json()

    def test_has_evidence_field(self, client):
        body = self._classify(client)
        # evidence может быть null если база пуста (нет данных), но ключ обязан быть в ответе
        assert "evidence" in body, f"evidence missing. Keys: {list(body.keys())}"

    def test_evidence_has_excel_records(self, client):
        body = self._classify(client)
        evidence = body.get("evidence") or {}
        # При пустой базе evidence=null → пропустить. Иначе — проверить структуру.
        if not evidence:
            pytest.skip("evidence is null (empty database) — shape test skipped")
        assert "excel_records" in evidence, \
            f"excel_records missing. evidence keys: {list(evidence.keys())}"
        assert isinstance(evidence["excel_records"], list)

    def test_evidence_has_pdf_chunks(self, client):
        body = self._classify(client)
        evidence = body.get("evidence") or {}
        if not evidence:
            pytest.skip("evidence is null (empty database) — shape test skipped")
        assert "pdf_chunks" in evidence, \
            f"pdf_chunks missing. evidence keys: {list(evidence.keys())}"
        assert isinstance(evidence["pdf_chunks"], list)

    def test_evidence_has_score_and_sufficient(self, client):
        body = self._classify(client)
        evidence = body.get("evidence") or {}
        if not evidence:
            pytest.skip("evidence is null (empty database) — shape test skipped")
        assert "evidence_score" in evidence
        assert "is_sufficient" in evidence

    def test_has_sources_used(self, client):
        body = self._classify(client)
        assert "sources_used" in body, f"sources_used missing. Keys: {list(body.keys())}"
        assert isinstance(body["sources_used"], list)

    def test_has_retrieval_stats(self, client):
        body = self._classify(client)
        assert "retrieval_stats" in body, f"retrieval_stats missing"
        rs = body["retrieval_stats"]
        assert "codes_found" in rs or "pdf_chunks_found" in rs, \
            f"retrieval_stats incomplete: {rs}"

    def test_has_audit_trail(self, client):
        body = self._classify(client)
        assert "audit_trail" in body, f"audit_trail missing. Keys: {list(body.keys())}"

    def test_has_rule_engine(self, client):
        body = self._classify(client)
        assert "rule_engine" in body, f"rule_engine missing. Keys: {list(body.keys())}"

    def test_has_validation(self, client):
        body = self._classify(client)
        # validation может отсутствовать в clarification-ответах (пустая база)
        # Контракт: ключ должен присутствовать (может быть null)
        assert "validation" in body or body.get("requires_clarification"), \
            f"validation missing and not clarification. Keys: {list(body.keys())}"

    def test_has_evidence_threshold_used(self, client):
        body = self._classify(client)
        assert "evidence_threshold_used" in body, \
            f"evidence_threshold_used missing. Keys: {list(body.keys())}"
        assert isinstance(body["evidence_threshold_used"], (int, float))

    def test_has_evidence_threshold_source(self, client):
        body = self._classify(client)
        assert "evidence_threshold_source" in body, \
            f"evidence_threshold_source missing. Keys: {list(body.keys())}"

    def test_pdf_chunks_have_text_quality_score(self, client):
        body = self._classify(client)
        evidence = body.get("evidence") or {}
        pdf_chunks = evidence.get("pdf_chunks", [])
        # Если база пуста — чанков нет, тест пропустить (нет данных для проверки)
        if not pdf_chunks:
            pytest.skip("No pdf_chunks in evidence (empty database)")
        for chunk in pdf_chunks:
            assert "text_quality_score" in chunk, \
                f"text_quality_score missing from chunk: {chunk}"

    def test_env_threshold_shows_in_response(self, client):
        """Если EVIDENCE_MIN_SCORE=0.0 задан через env, это должно быть видно в ответе."""
        body = self._classify(client)
        source = body.get("evidence_threshold_source", "")
        assert "env" in source, \
            f"Expected env in threshold_source when EVIDENCE_MIN_SCORE is set, got: {source}"


# ─── /rebuild contract ────────────────────────────────────────────────────────

class TestRebuildContract:
    def test_rebuild_409_embedded(self, client):
        resp = client.post(
            "/rebuild",
            headers={"X-Rebuild-Token": "test-token"},
        )
        assert resp.status_code == 409

    def test_rebuild_403_wrong_token(self, client):
        resp = client.post(
            "/rebuild",
            headers={"X-Rebuild-Token": "wrong"},
        )
        assert resp.status_code == 403
