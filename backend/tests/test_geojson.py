import asyncio
import uuid

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.models.schemas import (
    ClassConfig,
    DataSourceConfig,
    DataSourceType,
    InferenceRequest,
    ModelInfo,
    ModelType,
)
from backend.routers.inference import jobs

client = TestClient(app)


def _seed_job(num_results=3, model_type="segmentation"):
    """Seed a completed job directly into the jobs dict for testing."""
    job_id = str(uuid.uuid4())
    results = []
    for i in range(num_results):
        if model_type == "segmentation":
            results.append({
                "image_id": f"test_{i:03d}.jpg",
                "image_url": f"/api/data/sample/image/test_{i:03d}.jpg",
                "latitude": 41.91 + i * 0.01,
                "longitude": -87.65 + i * 0.005,
                "class_ratios": {"vegetation": 0.35, "road": 0.30, "building": 0.20},
            })
        else:
            results.append({
                "image_id": f"test_{i:03d}.jpg",
                "image_url": f"/api/data/sample/image/test_{i:03d}.jpg",
                "latitude": 41.91 + i * 0.01,
                "longitude": -87.65 + i * 0.005,
                "detections": [
                    {"label": "car", "confidence": 0.9, "bbox": [100, 200, 300, 400]},
                ],
                "object_counts": {"car": 1},
            })
    jobs[job_id] = {
        "job_id": job_id,
        "status": "completed",
        "total_images": num_results,
        "processed": num_results,
        "results": results,
    }
    return job_id


def test_geojson_returns_200():
    job_id = _seed_job()
    response = client.get(f"/api/inference/results/{job_id}/geojson")
    assert response.status_code == 200


def test_geojson_is_feature_collection():
    job_id = _seed_job()
    data = client.get(f"/api/inference/results/{job_id}/geojson").json()
    assert data["type"] == "FeatureCollection"
    assert "features" in data
    assert "metadata" in data


def test_geojson_feature_count():
    job_id = _seed_job(num_results=5)
    data = client.get(f"/api/inference/results/{job_id}/geojson").json()
    assert len(data["features"]) == 5


def test_geojson_feature_structure():
    job_id = _seed_job(num_results=1)
    data = client.get(f"/api/inference/results/{job_id}/geojson").json()
    feature = data["features"][0]
    assert feature["type"] == "Feature"
    assert feature["geometry"]["type"] == "Point"
    assert len(feature["geometry"]["coordinates"]) == 2
    assert "image_id" in feature["properties"]
    assert "image_url" in feature["properties"]


def test_geojson_coordinates_order():
    job_id = _seed_job(num_results=1)
    data = client.get(f"/api/inference/results/{job_id}/geojson").json()
    coords = data["features"][0]["geometry"]["coordinates"]
    lon, lat = coords
    assert -180 <= lon <= 180
    assert -90 <= lat <= 90


def test_geojson_segmentation_properties():
    job_id = _seed_job(num_results=1, model_type="segmentation")
    data = client.get(f"/api/inference/results/{job_id}/geojson").json()
    props = data["features"][0]["properties"]
    assert "class_ratios" in props
    assert props["analysis_type"] == "segmentation"


def test_geojson_detection_properties():
    job_id = _seed_job(num_results=1, model_type="detection")
    data = client.get(f"/api/inference/results/{job_id}/geojson").json()
    props = data["features"][0]["properties"]
    assert "object_counts" in props
    assert "detections" in props
    assert props["analysis_type"] == "detection"


def test_geojson_metadata():
    job_id = _seed_job(num_results=3)
    data = client.get(f"/api/inference/results/{job_id}/geojson").json()
    meta = data["metadata"]
    assert meta["job_id"] == job_id
    assert meta["status"] == "completed"
    assert meta["total_images"] == 3
    assert meta["processed"] == 3


def test_geojson_404_for_missing_job():
    response = client.get("/api/inference/results/nonexistent-id/geojson")
    assert response.status_code == 404
