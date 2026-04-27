from fastapi import APIRouter

from backend.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    has_api_key = bool(settings.GOOGLE_MAPS_API_KEY)
    return {
        "status": "healthy",
        "version": "0.1.0",
        "demo_mode": not has_api_key,
        "has_google_api_key": has_api_key,
        "has_huggingface_token": bool(settings.HUGGINGFACE_TOKEN),
    }
