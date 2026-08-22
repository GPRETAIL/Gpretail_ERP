from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_ready_requires_service_key_configuration(monkeypatch):
    monkeypatch.delenv("INVOICE_AI_API_KEY", raising=False)
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "not_ready"


def test_rejects_invalid_service_key(monkeypatch):
    monkeypatch.setenv("INVOICE_AI_API_KEY", "secret")
    response = client.post(
        "/api/v1/invoices/extract",
        headers={"X-API-Key": "wrong"},
        files={"file": ("invoice.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 401


def test_rejects_unsupported_file_after_auth(monkeypatch):
    monkeypatch.setenv("INVOICE_AI_API_KEY", "secret")
    response = client.post(
        "/api/v1/invoices/extract",
        headers={"X-API-Key": "secret"},
        files={"file": ("invoice.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 415
