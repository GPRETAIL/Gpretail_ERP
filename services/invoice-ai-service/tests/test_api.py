from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_rejects_unsupported_file():
    response = client.post(
        "/api/v1/invoices/extract",
        files={"file": ("invoice.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 415
