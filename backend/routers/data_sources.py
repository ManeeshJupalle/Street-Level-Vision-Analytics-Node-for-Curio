import os
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.config import settings
from backend.services.mapillary_service import (
    download_image,
    fetch_images_in_bbox,
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
    if not settings.MAPILLARY_ACCESS_TOKEN:
        raise HTTPException(status_code=400, detail="MAPILLARY_ACCESS_TOKEN not configured")
    try:
        images = await fetch_images_in_bbox(
            bbox=request.bbox,
            limit=request.limit,
            access_token=settings.MAPILLARY_ACCESS_TOKEN,
        )
        return {"images": images, "count": len(images)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data/mapillary/image/{image_id}")
async def get_mapillary_image(image_id: str):
    if not settings.MAPILLARY_ACCESS_TOKEN:
        raise HTTPException(status_code=400, detail="MAPILLARY_ACCESS_TOKEN not configured")
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
    if not settings.MAPILLARY_ACCESS_TOKEN:
        raise HTTPException(status_code=400, detail="MAPILLARY_ACCESS_TOKEN not configured")
    try:
        images = await fetch_images_in_bbox(
            bbox=request.bbox,
            limit=1,
            access_token=settings.MAPILLARY_ACCESS_TOKEN,
        )
        return {"bbox": request.bbox, "estimated_count": len(images)}
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
