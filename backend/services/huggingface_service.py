from typing import Dict, Optional, Tuple

from huggingface_hub import HfApi

from backend.config import settings
from backend.models.schemas import ModelType

_model_cache: Dict[str, Tuple] = {}

TASK_MAP = {
    "segmentation": "image-segmentation",
    "detection": "object-detection",
    "classification": "image-classification",
}


def search_models(task: str, query: str, limit: int = 20) -> list:
    api = HfApi()
    hf_task = TASK_MAP.get(task, task)
    models = api.list_models(
        filter=hf_task,
        search=query,
        sort="downloads",
        limit=limit,
    )
    results = []
    for m in models:
        results.append({
            "model_id": m.id,
            "name": m.id.split("/")[-1],
            "downloads": m.downloads,
            "likes": m.likes,
            "task": hf_task,
        })
    return results


def get_model_info(model_id: str) -> dict:
    api = HfApi()
    info = api.model_info(model_id)
    return {
        "model_id": info.id,
        "name": info.id.split("/")[-1],
        "pipeline_tag": info.pipeline_tag,
        "downloads": info.downloads,
        "likes": info.likes,
        "tags": info.tags,
    }


def load_model(model_id: str, model_type: ModelType) -> str:
    if model_id in _model_cache:
        return f"Model {model_id} already loaded (cached)"

    if model_type == ModelType.segmentation:
        from transformers import AutoImageProcessor, AutoModelForSemanticSegmentation

        token = settings.HUGGINGFACE_TOKEN or None
        processor = AutoImageProcessor.from_pretrained(
            model_id, token=token, cache_dir=settings.MODEL_CACHE_DIR,
        )
        model = AutoModelForSemanticSegmentation.from_pretrained(
            model_id, token=token, cache_dir=settings.MODEL_CACHE_DIR,
        )
        model.eval()
        _model_cache[model_id] = (model, processor, model_type)

    elif model_type == ModelType.detection:
        from ultralytics import YOLO

        model = YOLO(model_id)
        _model_cache[model_id] = (model, None, model_type)

    elif model_type == ModelType.classification:
        from transformers import AutoImageProcessor, AutoModelForImageClassification

        processor = AutoImageProcessor.from_pretrained(
            model_id,
            token=settings.HUGGINGFACE_TOKEN or None,
            cache_dir=settings.MODEL_CACHE_DIR,
        )
        model = AutoModelForImageClassification.from_pretrained(
            model_id,
            token=settings.HUGGINGFACE_TOKEN or None,
            cache_dir=settings.MODEL_CACHE_DIR,
        )
        _model_cache[model_id] = (model, processor, model_type)

    else:
        raise ValueError(f"Unsupported model type: {model_type}")

    return f"Model {model_id} loaded successfully"


def get_cached_model(model_id: str) -> Optional[Tuple]:
    return _model_cache.get(model_id)
