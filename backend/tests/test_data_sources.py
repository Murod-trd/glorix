"""
test_data_sources.py

Проверяет: /health показывает корректную информацию о data_sources,
в том числе docs_explanations_detected и docs_explanations_included.
"""
import os
import sys
import json
import pytest
from pathlib import Path
from unittest.mock import patch


BACKEND_DIR = Path(__file__).parent.parent


@pytest.fixture(autouse=True)
def base_env(monkeypatch, tmp_path):
    """Базовые переменные окружения для тестов."""
    monkeypatch.setenv("USE_EMBEDDED_QDRANT", "1")
    monkeypatch.setenv("MOCK_EMBEDDER", "1")
    monkeypatch.setenv("MOCK_LLM", "1")
    monkeypatch.setenv("EVIDENCE_MIN_SCORE", "0.0")
    qdrant_path = tmp_path / "qdrant_storage"
    qdrant_path.mkdir()
    monkeypatch.setenv("QDRANT_STORAGE_PATH", str(qdrant_path))


def _fresh_client():
    """Получить TestClient с чистым импортом."""
    for mod_name in list(sys.modules.keys()):
        if mod_name.startswith("api") or "qdrant" in mod_name.lower():
            del sys.modules[mod_name]
    from fastapi.testclient import TestClient
    from api.main import app
    return TestClient(app, raise_server_exceptions=False)


def test_health_returns_pdf_dirs(monkeypatch, tmp_path):
    """
    /health должен возвращать pdf_dirs в data_sources.
    """
    pdf_dir = tmp_path / "pdfs"
    pdf_dir.mkdir()
    monkeypatch.setenv("PDF_DIRS", str(pdf_dir))
    monkeypatch.setenv("EXCEL_DIR", str(tmp_path / "excel"))
    (tmp_path / "excel").mkdir()

    client = _fresh_client()
    resp = client.get("/health")
    body = resp.json()

    assert "data_sources" in body, f"data_sources missing. Body: {json.dumps(body, indent=2)}"
    ds = body["data_sources"]
    assert "pdf_dirs" in ds, f"pdf_dirs missing in data_sources: {ds}"
    assert len(ds["pdf_dirs"]) >= 1


def test_health_docs_explanations_detected_true(monkeypatch, tmp_path):
    """
    Если docs/explanations существует и включён в PDF_DIRS,
    docs_explanations_detected=true и docs_explanations_included=true.
    """
    docs_expl = tmp_path / "docs" / "explanations"
    docs_expl.mkdir(parents=True)
    # Создать один PDF-файл (пустой, для обнаружения)
    (docs_expl / "test.pdf").write_bytes(b"%PDF-1.4")

    monkeypatch.setenv("PDF_DIRS", str(docs_expl))
    monkeypatch.setenv("EXCEL_DIR", str(tmp_path / "excel"))
    (tmp_path / "excel").mkdir(exist_ok=True)

    # Monkey-patch DOCS_EXPL_PATH в api.main чтобы он смотрел в tmp_path
    with patch("api.main._DOCS_EXPL_PATH", docs_expl):
        client = _fresh_client()
        resp = client.get("/health")
        body = resp.json()

    ds = body.get("data_sources", {})
    assert ds.get("docs_explanations_detected") is True or ds.get("docs_explanations_detected") == True, \
        f"Expected docs_explanations_detected=true, got: {ds}"


def test_health_docs_explanations_included_false_when_not_in_pdf_dirs(monkeypatch, tmp_path):
    """
    Если docs/explanations существует, но не включён в PDF_DIRS,
    docs_explanations_included=false и warnings содержит предупреждение.
    """
    docs_expl = tmp_path / "docs" / "explanations"
    docs_expl.mkdir(parents=True)
    (docs_expl / "test.pdf").write_bytes(b"%PDF-1.4")

    # PDF_DIRS НЕ содержит docs/explanations
    other_pdf_dir = tmp_path / "other_pdfs"
    other_pdf_dir.mkdir()
    monkeypatch.setenv("PDF_DIRS", str(other_pdf_dir))
    monkeypatch.setenv("EXCEL_DIR", str(tmp_path / "excel"))
    (tmp_path / "excel").mkdir(exist_ok=True)

    with patch("api.main._DOCS_EXPL_PATH", docs_expl):
        client = _fresh_client()
        resp = client.get("/health")
        body = resp.json()

    ds = body.get("data_sources", {})
    # docs/explanations существует → detected=true
    assert ds.get("docs_explanations_detected") is True, \
        f"Expected detected=true, got: {ds}"
    # Но не включён → included=false
    assert ds.get("docs_explanations_included") is False, \
        f"Expected included=false, got: {ds}"
    # warnings должен содержать предупреждение
    warnings = ds.get("warnings", [])
    assert any("docs/explanations" in w for w in warnings), \
        f"Expected warning about docs/explanations not in PDF_DIRS, got: {warnings}"


def test_health_multiple_pdf_dirs_shown(monkeypatch, tmp_path):
    """
    Несколько директорий в PDF_DIRS должны отображаться в /health.
    """
    dir1 = tmp_path / "pdf1"
    dir2 = tmp_path / "pdf2"
    dir1.mkdir()
    dir2.mkdir()
    monkeypatch.setenv("PDF_DIRS", f"{dir1},{dir2}")
    monkeypatch.setenv("EXCEL_DIR", str(tmp_path / "excel"))
    (tmp_path / "excel").mkdir()

    client = _fresh_client()
    resp = client.get("/health")
    body = resp.json()

    ds = body.get("data_sources", {})
    pdf_dirs = ds.get("pdf_dirs", [])
    assert len(pdf_dirs) >= 2, f"Expected >=2 pdf_dirs, got: {pdf_dirs}"
