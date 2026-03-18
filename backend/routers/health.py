from fastapi import APIRouter

from backend.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    demo_mode = not settings.MAPILLARY_ACCESS_TOKEN
    return {
        "status": "healthy",
        "version": "0.1.0",
        "demo_mode": demo_mode,
        "has_mapillary_token": bool(settings.MAPILLARY_ACCESS_TOKEN),
        "has_huggingface_token": bool(settings.HUGGINGFACE_TOKEN),
    }
