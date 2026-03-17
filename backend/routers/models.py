from fastapi import APIRouter, HTTPException

from backend.models.schemas import ModelInfo
from backend.services.huggingface_service import (
    get_model_info,
    load_model,
    search_models,
)

router = APIRouter()


@router.get("/models/search")
async def search_hf_models(task: str = "segmentation", query: str = "cityscapes"):
    try:
        results = search_models(task, query)
        return {"models": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/{model_id:path}/info")
async def get_hf_model_info(model_id: str):
    try:
        info = get_model_info(model_id)
        return info
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/models/load")
async def load_hf_model(model_info: ModelInfo):
    try:
        result = load_model(model_info.model_id, model_info.model_type)
        return {"status": "loaded", "model_id": model_info.model_id, "detail": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
