import os
from typing import List, Optional

import aiohttp

MAPILLARY_GRAPH_URL = "https://graph.mapillary.com"
FIELDS = "id,geometry,captured_at,compass_angle,thumb_2048_url"


async def fetch_images_in_bbox(
    bbox: List[float],
    limit: int,
    access_token: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> List[dict]:
    """Fetch image metadata within a bounding box from Mapillary API.

    bbox: [west, south, east, north]
    """
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

            # Handle pagination
            paging = data.get("paging", {})
            url = paging.get("next")
            params = {}  # Next URL already has params

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

    # First get the image URL
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
