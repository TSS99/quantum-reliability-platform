from fastapi.testclient import TestClient

from app.main import QRP_VERSION, app

client = TestClient(app)


def test_health_ok():
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["qrp_version"] == QRP_VERSION
