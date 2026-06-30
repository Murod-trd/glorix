"""
test_rebuild_embedded_mode.py

Проверяет: /rebuild возвращает HTTP 409 Conflict если USE_EMBEDDED_QDRANT=1.

Требования:
  - Endpoint НЕ запускает subprocess
  - Ответ содержит reason с "Embedded Qdrant does not support rebuild"
  - HTTP status = 409
"""
import os
import pytest
import importlib
import sys
from unittest.mock import patch


@pytest.fixture(autouse=True)
def embedded_env(monkeypatch, tmp_path):
    """Установить переменные окружения для embedded mode."""
    monkeypatch.setenv("USE_EMBEDDED_QDRANT", "1")
    monkeypatch.setenv("MOCK_EMBEDDER", "1")
    monkeypatch.setenv("MOCK_LLM", "1")
    monkeypatch.setenv("REBUILD_TOKEN", "test-token")
    monkeypatch.setenv("EVIDENCE_MIN_SCORE", "0.0")
    qdrant_path = tmp_path / "qdrant_storage"
    qdrant_path.mkdir()
    monkeypatch.setenv("QDRANT_STORAGE_PATH", str(qdrant_path))


def _get_test_client():
    """Создать TestClient с чистым импортом api.main."""
    # Сбросить синглтоны
    for mod_name in list(sys.modules.keys()):
        if "qdrant" in mod_name.lower() or "store.qdrant" in mod_name:
            del sys.modules[mod_name]

    from fastapi.testclient import TestClient

    if "api.main" in sys.modules:
        del sys.modules["api.main"]
    if "api" in sys.modules:
        del sys.modules["api"]

    from api.main import app
    return TestClient(app, raise_server_exceptions=False)


def test_rebuild_returns_409_in_embedded_mode():
    """
    /rebuild должен вернуть HTTP 409 если USE_EMBEDDED_QDRANT=1.
    """
    client = _get_test_client()

    response = client.post(
        "/rebuild",
        headers={"X-Rebuild-Token": "test-token"},
    )
    assert response.status_code == 409, (
        f"Expected 409, got {response.status_code}: {response.text}"
    )


def test_rebuild_409_contains_embedded_qdrant_reason():
    """
    Ответ 409 должен содержать описание причины с 'Embedded Qdrant does not support rebuild'.
    """
    client = _get_test_client()

    response = client.post(
        "/rebuild",
        headers={"X-Rebuild-Token": "test-token"},
    )
    assert response.status_code == 409
    body = response.json()
    # FastAPI оборачивает HTTPException.detail в {"detail": ...}
    detail = body.get("detail", body)
    if isinstance(detail, dict):
        reason = detail.get("reason", "")
    else:
        reason = str(detail)
    assert "Embedded Qdrant does not support rebuild" in reason, (
        f"Expected 'Embedded Qdrant does not support rebuild' in reason, got: {reason}"
    )


def test_rebuild_does_not_launch_subprocess():
    """
    /rebuild в embedded mode НЕ должен запускать subprocess.
    """
    import subprocess as subprocess_module

    client = _get_test_client()

    with patch.object(subprocess_module, "run") as mock_run:
        response = client.post(
            "/rebuild",
            headers={"X-Rebuild-Token": "test-token"},
        )
        assert response.status_code == 409
        mock_run.assert_not_called(), "subprocess.run не должен вызываться в embedded mode"


def test_rebuild_requires_valid_token():
    """
    /rebuild должен вернуть 403 при неверном токене (до проверки embedded mode).
    """
    client = _get_test_client()

    response = client.post(
        "/rebuild",
        headers={"X-Rebuild-Token": "wrong-token"},
    )
    assert response.status_code == 403
