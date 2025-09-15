from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_nodes_endpoint():
    r = client.get("/api/nodes")
    assert r.status_code == 200
    assert "nodes" in r.json()