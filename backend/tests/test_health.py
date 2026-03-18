import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_health_returns_200():
    response = client.get("/api/health")
    assert response.status_code == 200


def test_health_response_structure():
    response = client.get("/api/health")
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "0.1.0"
    assert "demo_mode" in data
    assert "has_mapillary_token" in data
    assert "has_huggingface_token" in data


def test_health_demo_mode_type():
    response = client.get("/api/health")
    data = response.json()
    assert isinstance(data["demo_mode"], bool)
    assert isinstance(data["has_mapillary_token"], bool)
    assert isinstance(data["has_huggingface_token"], bool)
