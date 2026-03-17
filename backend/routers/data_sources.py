import os
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.config import settings
from backend.services.mapillary_service import (
    download_image,
    fetch_images_in_bbox,
)

SAMPLE_IMAGES_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "sample_images")
)

router = APIRouter()


class BBoxRequest(BaseModel):
    bbox: List[float]
    limit: int = 100
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class FolderRequest(BaseModel):
    folder_path: str


@router.post("/data/mapillary/fetch")
async def fetch_mapillary_images(request: BBoxRequest):
    try:
        images = await fetch_images_in_bbox(
            bbox=request.bbox,
            limit=request.limit,
            access_token=settings.MAPILLARY_ACCESS_TOKEN,
        )
        demo = not settings.MAPILLARY_ACCESS_TOKEN
        return {"images": images, "count": len(images), "demo_mode": demo}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data/mapillary/image/{image_id}")
async def get_mapillary_image(image_id: str):
    try:
        local_path = await download_image(
            image_id=image_id,
            access_token=settings.MAPILLARY_ACCESS_TOKEN,
            cache_dir=settings.CACHE_DIR,
        )
        return {"image_id": image_id, "local_path": local_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/data/mapillary/coverage")
async def get_mapillary_coverage(request: BBoxRequest):
    try:
        images = await fetch_images_in_bbox(
            bbox=request.bbox,
            limit=request.limit,
            access_token=settings.MAPILLARY_ACCESS_TOKEN,
        )
        demo = not settings.MAPILLARY_ACCESS_TOKEN
        return {
            "bbox": request.bbox,
            "estimated_count": len(images),
            "demo_mode": demo,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/data/folder/load")
async def load_folder_images(request: FolderRequest):
    folder = request.folder_path
    if not os.path.isdir(folder):
        raise HTTPException(status_code=404, detail=f"Folder not found: {folder}")

    supported = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    images = []
    for fname in sorted(os.listdir(folder)):
        ext = os.path.splitext(fname)[1].lower()
        if ext in supported:
            full_path = os.path.join(folder, fname)
            images.append({
                "image_id": fname,
                "path": full_path,
                "filename": fname,
            })

    return {"images": images, "count": len(images)}


@router.get("/data/sample/list")
async def list_sample_images():
    """List available sample images from data/sample_images/."""
    if not os.path.isdir(SAMPLE_IMAGES_DIR):
        return {"images": [], "count": 0}
    supported = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    images = []
    for fname in sorted(os.listdir(SAMPLE_IMAGES_DIR)):
        if os.path.splitext(fname)[1].lower() in supported:
            images.append({
                "image_id": fname,
                "path": os.path.join(SAMPLE_IMAGES_DIR, fname),
                "filename": fname,
            })
    return {"images": images, "count": len(images)}


@router.get("/data/sample/image/{filename}")
async def get_sample_image(filename: str):
    """Serve a sample image file."""
    path = os.path.join(SAMPLE_IMAGES_DIR, filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path, media_type="image/jpeg")
