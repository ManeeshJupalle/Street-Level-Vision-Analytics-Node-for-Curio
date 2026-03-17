import os
import random
from typing import List, Optional

import aiohttp

MAPILLARY_GRAPH_URL = "https://graph.mapillary.com"
FIELDS = "id,geometry,captured_at,compass_angle,thumb_2048_url"


def _generate_demo_images(bbox: List[float], limit: int) -> List[dict]:
    """Generate mock image entries with real Chicago GPS coords for demo mode."""
    west, south, east, north = bbox
    random.seed(42)  # Deterministic for consistent demos
    images = []
    count = min(limit, 20)
    for i in range(count):
        lat = south + (north - south) * random.random()
        lon = west + (east - west) * random.random()
        images.append({
            "id": f"demo_{i:04d}",
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
            "captured_at": f"2024-06-{10 + (i % 20):02d}T10:{i % 60:02d}:00Z",
            "compass_angle": round(random.uniform(0, 360), 1),
            "thumb_2048_url": f"https://picsum.photos/seed/street{i}/2048/1024",
            "is_demo": True,
        })
    return images


async def fetch_images_in_bbox(
    bbox: List[float],
    limit: int,
    access_token: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> List[dict]:
    """Fetch image metadata within a bounding box from Mapillary API.
    Falls back to demo data if no access token is provided.

    bbox: [west, south, east, north]
    """
    if not access_token:
        return _generate_demo_images(bbox, limit)

    params = {
        "access_token": access_token,
        "fields": FIELDS,
        "bbox": ",".join(str(c) for c in bbox),
        "limit": min(limit, 2000),
    }
    if start_date:
        params["start_captured_at"] = start_date
    if end_date:
        params["end_captured_at"] = end_date

    all_images = []
    url = f"{MAPILLARY_GRAPH_URL}/images"

    async with aiohttp.ClientSession() as session:
        while url and len(all_images) < limit:
            async with session.get(url, params=params) as resp:
                resp.raise_for_status()
                data = await resp.json()

            features = data.get("data", [])
            for feat in features:
                geometry = feat.get("geometry", {})
                coords = geometry.get("coordinates", [None, None])
                all_images.append({
                    "id": feat["id"],
                    "latitude": coords[1],
                    "longitude": coords[0],
                    "captured_at": feat.get("captured_at"),
                    "compass_angle": feat.get("compass_angle"),
                    "thumb_2048_url": feat.get("thumb_2048_url"),
                })
                if len(all_images) >= limit:
                    break

            paging = data.get("paging", {})
            url = paging.get("next")
            params = {}

    return all_images


async def download_image(
    image_id: str,
    access_token: str,
    cache_dir: str,
) -> str:
    """Download an image by ID, caching locally."""
    os.makedirs(cache_dir, exist_ok=True)
    local_path = os.path.join(cache_dir, f"{image_id}.jpg")

    if os.path.exists(local_path):
        return local_path

    # Demo mode: return a placeholder path
    if not access_token or image_id.startswith("demo_"):
        return f"https://picsum.photos/seed/{image_id}/2048/1024"

    url = f"{MAPILLARY_GRAPH_URL}/{image_id}"
    params = {"access_token": access_token, "fields": "thumb_2048_url"}

    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params) as resp:
            resp.raise_for_status()
            data = await resp.json()

        thumb_url = data.get("thumb_2048_url")
        if not thumb_url:
            raise ValueError(f"No thumbnail URL for image {image_id}")

        async with session.get(thumb_url) as resp:
            resp.raise_for_status()
            content = await resp.read()

    with open(local_path, "wb") as f:
        f.write(content)

    return local_path
