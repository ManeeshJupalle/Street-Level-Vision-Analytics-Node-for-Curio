import asyncio

import pytest

from backend.models.schemas import (
    ClassConfig,
    DataSourceConfig,
    DataSourceType,
    InferenceRequest,
    ModelInfo,
    ModelType,
)
from backend.services.inference_service import run_batch_inference


def _make_request(model_type=ModelType.segmentation, classes=None, limit=5):
    if classes is None:
        classes = ["vegetation", "road", "building", "sidewalk", "sky"]
    return InferenceRequest(
        model=ModelInfo(
            model_id="test/demo-model",
            model_type=model_type,
            name="Demo Model",
        ),
        data_source=DataSourceConfig(
            source_type=DataSourceType.mapillary,
            bbox=[-87.66, 41.91, -87.62, 41.94],
            limit=limit,
        ),
        classes=ClassConfig(classes=classes, source="prompt"),
    )


@pytest.mark.asyncio
async def test_demo_segmentation_returns_results():
    request = _make_request(ModelType.segmentation)
    results = []
    async for result in run_batch_inference(request):
        results.append(result)
    assert len(results) == 5


@pytest.mark.asyncio
async def test_demo_segmentation_result_structure():
    request = _make_request(ModelType.segmentation, limit=1)
    results = []
    async for result in run_batch_inference(request):
        results.append(result)
    r = results[0]
    assert "image_id" in r
    assert "class_ratios" in r
    assert "latitude" in r
    assert "longitude" in r
    assert r["demo_mode"] is True


@pytest.mark.asyncio
async def test_demo_segmentation_class_ratios_sum_to_one():
    request = _make_request(ModelType.segmentation, limit=3)
    async for result in run_batch_inference(request):
        ratios = result["class_ratios"]
        total = sum(ratios.values())
        assert abs(total - 1.0) < 0.01, f"Ratios sum to {total}, expected ~1.0"


@pytest.mark.asyncio
async def test_demo_segmentation_respects_requested_classes():
    classes = ["vegetation", "road"]
    request = _make_request(ModelType.segmentation, classes=classes, limit=3)
    async for result in run_batch_inference(request):
        for key in result["class_ratios"]:
            assert key in classes


@pytest.mark.asyncio
async def test_demo_segmentation_coordinates_in_bbox():
    bbox = [-87.66, 41.91, -87.62, 41.94]
    request = _make_request(ModelType.segmentation, limit=5)
    async for result in run_batch_inference(request):
        assert bbox[1] <= result["latitude"] <= bbox[3]
        assert bbox[0] <= result["longitude"] <= bbox[2]


@pytest.mark.asyncio
async def test_demo_detection_returns_results():
    request = _make_request(ModelType.detection, classes=["car", "truck", "bicycle"])
    results = []
    async for result in run_batch_inference(request):
        results.append(result)
    assert len(results) == 5


@pytest.mark.asyncio
async def test_demo_detection_result_structure():
    request = _make_request(
        ModelType.detection, classes=["car", "truck"], limit=1
    )
    results = []
    async for result in run_batch_inference(request):
        results.append(result)
    r = results[0]
    assert "image_id" in r
    assert "detections" in r
    assert "object_counts" in r
    assert r["demo_mode"] is True


@pytest.mark.asyncio
async def test_demo_detection_bbox_format():
    request = _make_request(
        ModelType.detection, classes=["car", "person"], limit=2
    )
    async for result in run_batch_inference(request):
        for det in result["detections"]:
            assert "label" in det
            assert "confidence" in det
            assert "bbox" in det
            assert len(det["bbox"]) == 4
            assert 0 < det["confidence"] <= 1.0


@pytest.mark.asyncio
async def test_demo_is_deterministic():
    request = _make_request(ModelType.segmentation, limit=3)
    run1 = []
    async for result in run_batch_inference(request):
        run1.append(result)
    run2 = []
    async for result in run_batch_inference(request):
        run2.append(result)
    for r1, r2 in zip(run1, run2):
        assert r1["image_id"] == r2["image_id"]
        assert r1["class_ratios"] == r2["class_ratios"]
