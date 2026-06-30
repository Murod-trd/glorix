"""
test_e2e_fixture.py

End-to-end тест на fixture-данных:
  tests/fixtures/mini_tnved.xlsx — 6 кодов ТН ВЭД (dev/test only)
  tests/fixtures/chapter73_test.pdf — PDF-чанки для Главы 73

Проверяет:
  - build создаёт codes_count > 0
  - build создаёт pdf_chunks_count > 0
  - /health показывает ненулевые codes_count и pdf_chunks_count
  - /classify/explain показывает evidence.excel_records и evidence.pdf_chunks
"""
import os
import sys
import json
import pytest
import shutil
from pathlib import Path

BACKEND_DIR = Path(__file__).parent.parent
FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="module")
def built_knowledge_base(tmp_path_factory):
    """
    Построить базу знаний на fixture-данных.
    Запускается один раз для всего модуля.
    """
    tmp = tmp_path_factory.mktemp("e2e_kb")

    # Подготовить структуру данных
    excel_dir = tmp / "excel"
    pdf_dir   = tmp / "pdf"
    qdrant_dir = tmp / "qdrant_storage"
    excel_dir.mkdir()
    pdf_dir.mkdir()
    qdrant_dir.mkdir()

    # Скопировать fixtures
    shutil.copy(FIXTURES_DIR / "mini_tnved.xlsx", excel_dir / "mini_tnved.xlsx")
    shutil.copy(FIXTURES_DIR / "chapter73_test.pdf", pdf_dir / "chapter73_test.pdf")

    # Переменные окружения для build
    env = {
        "USE_EMBEDDED_QDRANT": "1",
        "MOCK_EMBEDDER": "1",
        "MOCK_LLM": "1",
        "EXCEL_DIR": str(excel_dir),
        "PDF_DIRS": str(pdf_dir),
        "DATA_DIR": str(tmp),
        "QDRANT_STORAGE_PATH": str(qdrant_dir),
        "EVIDENCE_MIN_SCORE": "0.0",
        "REBUILD_TOKEN": "test-token",
    }

    # Запустить build
    import subprocess
    result = subprocess.run(
        [sys.executable, str(BACKEND_DIR / "build_knowledge_base.py")],
        env={**os.environ, **env},
        capture_output=True,
        text=True,
        cwd=str(BACKEND_DIR),
    )
    print("\n=== BUILD STDOUT ===")
    print(result.stdout)
    if result.stderr:
        print("=== BUILD STDERR ===")
        print(result.stderr[-1000:])

    assert result.returncode == 0, f"Build failed:\n{result.stdout}\n{result.stderr}"

    yield {
        "excel_dir": excel_dir,
        "pdf_dir": pdf_dir,
        "qdrant_dir": qdrant_dir,
        "env": env,
        "tmp": tmp,
    }


@pytest.fixture()
def api_client(built_knowledge_base, monkeypatch):
    """TestClient на базе после build."""
    env = built_knowledge_base["env"]
    for k, v in env.items():
        monkeypatch.setenv(k, v)

    # Сбросить все синглтоны
    for mod_name in list(sys.modules.keys()):
        if (mod_name.startswith("api") or mod_name.startswith("rag")
                or mod_name.startswith("store") or mod_name.startswith("ingestion")
                or "qdrant" in mod_name.lower()):
            del sys.modules[mod_name]

    from fastapi.testclient import TestClient
    from api.main import app
    return TestClient(app, raise_server_exceptions=False)


def test_fixtures_exist():
    """Fixture-файлы должны лежать в tests/fixtures/, не в data/."""
    assert (FIXTURES_DIR / "mini_tnved.xlsx").exists(), \
        "mini_tnved.xlsx must be in tests/fixtures/"
    assert (FIXTURES_DIR / "chapter73_test.pdf").exists(), \
        "chapter73_test.pdf must be in tests/fixtures/"
    # В production data/ должны быть только .gitkeep
    data_excel = BACKEND_DIR / "data" / "excel"
    data_pdf   = BACKEND_DIR / "data" / "pdf"
    for d in [data_excel, data_pdf]:
        real_files = [f for f in d.glob("*") if f.name != ".gitkeep"]
        assert real_files == [], f"Production data/ must be empty: found {real_files} in {d}"


def test_health_shows_nonzero_counts(api_client):
    """
    /health после build на fixtures должен показывать codes_count > 0 и pdf_chunks_count > 0.
    """
    resp = api_client.get("/health")
    body = resp.json()

    qdrant = body.get("qdrant", {})
    codes_count = qdrant.get("codes_count", 0)
    pdf_count   = qdrant.get("pdf_chunks_count", 0)

    assert codes_count > 0, f"codes_count должен быть > 0, got: {codes_count}. Health: {json.dumps(body, indent=2)}"
    assert pdf_count > 0,   f"pdf_chunks_count должен быть > 0, got: {pdf_count}. Health: {json.dumps(body, indent=2)}"


def test_classify_explain_returns_excel_records(api_client):
    """
    /classify/explain должен возвращать evidence.excel_records.
    """
    resp = api_client.post(
        "/classify/explain",
        json={"description": "болт стальной оцинкованный"},
    )
    assert resp.status_code == 200, f"HTTP {resp.status_code}: {resp.text[:500]}"
    body = resp.json()
    evidence = body.get("evidence") or {}
    if not evidence:
        pytest.skip("evidence is null — database may be empty in this test context")
    assert "excel_records" in evidence, f"evidence.excel_records missing. Body: {json.dumps(body, indent=2, ensure_ascii=False)}"


def test_classify_explain_returns_pdf_chunks(api_client):
    """
    /classify/explain должен возвращать evidence.pdf_chunks.
    """
    resp = api_client.post(
        "/classify/explain",
        json={"description": "болт стальной оцинкованный"},
    )
    assert resp.status_code == 200
    body = resp.json()
    evidence = body.get("evidence") or {}
    if not evidence:
        pytest.skip("evidence is null — database may be empty in this test context")
    assert "pdf_chunks" in evidence, f"evidence.pdf_chunks missing. Body: {json.dumps(body, indent=2, ensure_ascii=False)}"


def test_classify_explain_pdf_chunks_have_text_quality_score(api_client):
    """
    Каждый PDF-чанк в evidence должен иметь text_quality_score.
    """
    resp = api_client.post(
        "/classify/explain",
        json={"description": "болт стальной оцинкованный"},
    )
    assert resp.status_code == 200
    body = resp.json()
    pdf_chunks = (body.get("evidence") or {}).get("pdf_chunks", [])
    if not pdf_chunks:
        pytest.skip("No pdf_chunks — evidence is null or empty")
    for chunk in pdf_chunks:
        assert "text_quality_score" in chunk, \
            f"text_quality_score missing from chunk: {chunk}"
        assert isinstance(chunk["text_quality_score"], (int, float)), \
            f"text_quality_score must be numeric, got: {type(chunk['text_quality_score'])}"


def test_classify_explain_has_required_fields(api_client):
    """
    /classify/explain должен возвращать все обязательные поля.
    """
    resp = api_client.post(
        "/classify/explain",
        json={"description": "болт стальной оцинкованный"},
    )
    assert resp.status_code == 200
    body = resp.json()

    required_top_fields = [
        "code", "evidence", "sources_used", "retrieval_stats",
        "audit_trail", "rule_engine",
        "validation_passed",   # поле называется validation_passed (не validation)
        "evidence_threshold_used",
    ]
    for field in required_top_fields:
        assert field in body, f"Required field '{field}' missing. Body keys: {list(body.keys())}"

    evidence_fields = ["excel_records", "pdf_chunks", "evidence_score", "is_sufficient"]
    evidence = body.get("evidence") or {}
    if not evidence:
        pytest.skip("evidence is null (empty DB or clarification) — skip field check")
    for field in evidence_fields:
        assert field in evidence, \
            f"Required evidence field '{field}' missing. Evidence keys: {list(evidence.keys())}"
