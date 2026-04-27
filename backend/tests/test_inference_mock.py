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


def _make_request(source_type=DataSourceType.google_streetview, folder_path=None, limit=3):
    kwargs = dict(source_type=source_type, limit=limit)
    if source_type == DataSourceType.google_streetview:
        kwargs["bbox"] = [-87.66, 41.91, -87.62, 41.94]
    if folder_path is not None:
        kwargs["folder_path"] = folder_path
    return InferenceRequest(
        model=ModelInfo(
            model_id="nvidia/segformer-b0-finetuned-cityscapes-1024-1024",
            model_type=ModelType.segmentation,
            name="SegFormer B0",
        ),
        data_source=DataSourceConfig(**kwargs),
        classes=ClassConfig(classes=["road", "building"], source="prompt"),
    )


@pytest.mark.asyncio
async def test_missing_streetview_key_yields_error(monkeypatch):
    from backend.services import inference_service

    monkeypatch.setattr(inference_service.settings, "GOOGLE_MAPS_API_KEY", "")
    results = []
    async for r in run_batch_inference(_make_request()):
        results.append(r)
    assert len(results) == 1
    assert "error" in results[0]
    assert "API key" in results[0]["error"]


@pytest.mark.asyncio
async def test_missing_folder_yields_error():
    request = _make_request(source_type=DataSourceType.folder, folder_path="/nonexistent/path/xyz")
    results = []
    async for r in run_batch_inference(request):
        results.append(r)
    assert len(results) == 1
    assert "error" in results[0]
    assert "Folder not found" in results[0]["error"]
