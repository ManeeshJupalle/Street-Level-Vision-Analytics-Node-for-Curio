import os
from pathlib import Path
from typing import List

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.config import settings
from backend.services.google_streetview_service import (
    estimate_coverage,
    fetch_images_in_bbox,
    get_image_url_by_pano,
)

router = APIRouter()


class BBoxRequest(BaseModel):
    bbox: List[float]
    limit: int = 100


class FolderRequest(BaseModel):
    folder_path: str


# ── Google Street View endpoints ─────────────────────────────────────

@router.post("/data/streetview/fetch")
async def fetch_streetview_images(request: BBoxRequest):
    """Fetch Street View image metadata within a bounding box."""
    api_key = settings.GOOGLE_MAPS_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="Google Maps API key required. Set GOOGLE_MAPS_API_KEY in .env",
        )
    try:
        images = await fetch_images_in_bbox(
            bbox=request.bbox,
            limit=request.limit,
            api_key=api_key,
        )
        for img in images:
            img["image_url"] = get_image_url_by_pano(
                img["pano_id"], api_key, heading=0,
            )
        return {"images": images, "count": len(images)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/data/streetview/coverage")
async def get_streetview_coverage(request: BBoxRequest):
    """Estimate Street View coverage in a bounding box (uses metadata API, no image quota)."""
    api_key = settings.GOOGLE_MAPS_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="Google Maps API key required.",
        )
    try:
        estimated = await estimate_coverage(
            bbox=request.bbox,
            api_key=api_key,
        )
        return {
            "bbox": request.bbox,
            "estimated_count": estimated,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data/streetview/search_place")
async def search_place(query: str = Query(..., min_length=1)):
    """Geocode a place name and return a bbox suitable for Street View queries."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1},
            headers={"User-Agent": "StreetVisionNode/1.0"},
        )
        resp.raise_for_status()
        results = resp.json()
    if not results:
        raise HTTPException(status_code=404, detail="Place not found")
    place = results[0]
    bbox = [float(place["boundingbox"][2]), float(place["boundingbox"][0]),
            float(place["boundingbox"][3]), float(place["boundingbox"][1])]
    return {
        "name": place.get("display_name", query),
        "bbox": bbox,
        "lat": float(place["lat"]),
        "lon": float(place["lon"]),
    }


# ── Folder endpoint ─────────────────────────────────────────────────

_DATA_DIR = Path(__file__).resolve().parents[2] / "data"


@router.get("/data/basemap/chicago_neighborhoods.geojson")
async def get_chicago_neighborhoods():
    """Serve the bundled Chicago neighborhoods GeoJSON for the Map View
    Vega-Lite template's basemap layer. Static file; cached aggressively."""
    path = _DATA_DIR / "chicago_neighborhoods.geojson"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Basemap not found")
    return FileResponse(
        path,
        media_type="application/geo+json",
        headers={"Cache-Control": "public, max-age=86400"},
    )


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
