import os
from pathlib import Path
from typing import List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
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

# Lazy-loaded neighborhood polygons + spatial index (built once on first
# enrichment request, reused across runs). Using shapely's STRtree gives us
# O(log n) candidate lookup instead of O(n) brute force, so even at 50 points
# × 98 polygons the server-side join finishes in <50 ms.
_NBHD_POLYGONS: list = []
_NBHD_NAMES: list = []
_NBHD_TREE = None
# Cached copy of the basemap GeoJSON with centroid_lon / centroid_lat injected
# into each feature's properties. Vega-Lite's labelLayer reads these directly
# instead of relying on the geoCentroid() expression, which behaves
# inconsistently across Vega-Lite versions.
_NBHD_GEOJSON_AUGMENTED: Optional[dict] = None


def _load_neighborhoods_index() -> None:
    global _NBHD_POLYGONS, _NBHD_NAMES, _NBHD_TREE
    if _NBHD_TREE is not None:
        return
    from shapely.geometry import shape
    from shapely.strtree import STRtree
    import json as _json
    path = _DATA_DIR / "chicago_neighborhoods.geojson"
    with open(path, "r", encoding="utf-8") as f:
        data = _json.load(f)
    polys, names = [], []
    for feat in data.get("features", []):
        try:
            polys.append(shape(feat["geometry"]))
            names.append(feat.get("properties", {}).get("name", "Unknown"))
        except Exception:
            continue
    _NBHD_POLYGONS = polys
    _NBHD_NAMES = names
    _NBHD_TREE = STRtree(polys)


@router.get("/data/basemap/chicago_neighborhoods.geojson")
async def get_chicago_neighborhoods():
    """Serve the bundled Chicago neighborhoods GeoJSON for the Map View
    Vega-Lite template's basemap layer. Each feature is augmented with
    centroid_lon / centroid_lat in properties so the label layer can position
    text without depending on Vega's geoCentroid expression. Cached in memory
    on first hit."""
    global _NBHD_GEOJSON_AUGMENTED
    if _NBHD_GEOJSON_AUGMENTED is None:
        import json as _json
        from shapely.geometry import shape
        path = _DATA_DIR / "chicago_neighborhoods.geojson"
        if not path.exists():
            raise HTTPException(status_code=404, detail="Basemap not found")
        with open(path, "r", encoding="utf-8") as f:
            data = _json.load(f)
        for feat in data.get("features", []):
            try:
                geom = shape(feat["geometry"])
                c = geom.centroid
                feat.setdefault("properties", {})
                feat["properties"]["centroid_lon"] = round(c.x, 5)
                feat["properties"]["centroid_lat"] = round(c.y, 5)
            except Exception:
                continue
        _NBHD_GEOJSON_AUGMENTED = data
    return JSONResponse(
        content=_NBHD_GEOJSON_AUGMENTED,
        media_type="application/geo+json",
        headers={"Cache-Control": "public, max-age=86400"},
    )


class EnrichPoint(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_id: Optional[str] = None
    dominant_class: Optional[str] = None
    dominant_pct: Optional[float] = None


class EnrichRequest(BaseModel):
    points: List[EnrichPoint]


@router.post("/data/basemap/enrich_with_neighborhoods")
async def enrich_with_neighborhoods(request: EnrichRequest):
    """Tag each input point with the Chicago neighborhood polygon it falls in
    and compute per-neighborhood aggregates (modal dominant class, mean %,
    image count, top-3 class frequencies).

    Returns:
      points: same order as input, augmented with `neighborhood_name`,
              `nbhd_dominant_class`, `nbhd_dominant_pct`, `nbhd_image_count`.
              If a point falls outside any Chicago polygon, neighborhood_name
              is null and the nbhd_* fields are null.
      aggregates: per-neighborhood roll-up.

    Used by CV Analysis's pushDownstream so Vega-Lite's `lookup` transform
    can color polygons by dominant class.
    """
    from collections import Counter
    from shapely.geometry import Point

    _load_neighborhoods_index()

    raw_points = [p.model_dump() for p in request.points]
    enriched: list = []
    nbhd_groups: dict = {}

    for p in raw_points:
        lat, lon = p.get("latitude"), p.get("longitude")
        nbhd = None
        if lat is not None and lon is not None:
            pt = Point(lon, lat)
            if _NBHD_TREE is not None:
                # STRtree.query returns indices (shapely 2.x)
                for idx in _NBHD_TREE.query(pt):
                    if _NBHD_POLYGONS[idx].contains(pt):
                        nbhd = _NBHD_NAMES[idx]
                        break
        ep = {**p, "neighborhood_name": nbhd}
        enriched.append(ep)
        if nbhd:
            nbhd_groups.setdefault(nbhd, []).append(p)

    aggregates: list = []
    for name, group in nbhd_groups.items():
        classes = [g.get("dominant_class") for g in group if g.get("dominant_class")]
        if not classes:
            continue
        counter = Counter(classes)
        top_class, _ = counter.most_common(1)[0]
        relevant_pcts = [
            g.get("dominant_pct", 0) for g in group if g.get("dominant_class") == top_class
        ]
        avg_pct = sum(relevant_pcts) / max(len(relevant_pcts), 1)
        top3 = [{"class": c, "count": cnt} for c, cnt in counter.most_common(3)]
        aggregates.append({
            "neighborhood_name": name,
            "image_count": len(group),
            "dominant_class": top_class,
            "dominant_pct": round(avg_pct, 2),
            "top3": top3,
        })

    # Project each enriched point's neighborhood aggregate back onto the
    # point itself so a Vega-Lite `lookup` (basemap.name → point.neighborhood_name)
    # can pick up these fields without us shipping a separate dataset.
    agg_lookup = {a["neighborhood_name"]: a for a in aggregates}
    for ep in enriched:
        nm = ep.get("neighborhood_name")
        if nm and nm in agg_lookup:
            a = agg_lookup[nm]
            ep["nbhd_dominant_class"] = a["dominant_class"]
            ep["nbhd_dominant_pct"] = a["dominant_pct"]
            ep["nbhd_image_count"] = a["image_count"]
        else:
            ep["nbhd_dominant_class"] = None
            ep["nbhd_dominant_pct"] = None
            ep["nbhd_image_count"] = None

    return {"points": enriched, "aggregates": aggregates}


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
