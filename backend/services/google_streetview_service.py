"""Google Street View service.

Uses the Street View Static API to fetch street-level imagery by coordinates.
Metadata API is used to check image availability without consuming image quota.

API docs: https://developers.google.com/maps/documentation/streetview
"""

import hashlib
import os
import random
from typing import List, Optional, Tuple

import aiohttp

STREETVIEW_BASE = "https://maps.googleapis.com/maps/api/streetview"
METADATA_BASE = f"{STREETVIEW_BASE}/metadata"

# Default image size (max 640x640 for free tier)
DEFAULT_SIZE = "640x480"
DEFAULT_FOV = 90
HEADINGS = [0, 90, 180, 270]  # N, E, S, W


async def check_coverage(
    lat: float,
    lon: float,
    api_key: str,
    radius: int = 50,
) -> Optional[dict]:
    """Check if Street View imagery exists near a coordinate.
    Returns metadata dict if available, None otherwise.
    Does NOT consume image quota.
    """
    params = {
        "location": f"{lat},{lon}",
        "radius": radius,
        "source": "outdoor",
        "key": api_key,
    }
    async with aiohttp.ClientSession() as session:
        async with session.get(METADATA_BASE, params=params) as resp:
            data = await resp.json()
            if data.get("status") == "OK":
                return {
                    "pano_id": data.get("pano_id", ""),
                    "latitude": data["location"]["lat"],
                    "longitude": data["location"]["lng"],
                    "date": data.get("date", ""),
                    "status": "OK",
                }
            return None


async def fetch_images_in_bbox(
    bbox: List[float],
    limit: int,
    api_key: str,
    grid_density: int = 0,
) -> List[dict]:
    """Sample points within a bounding box and check for Street View coverage.

    bbox: [west, south, east, north] (lon_min, lat_min, lon_max, lat_max)
    Returns list of image metadata dicts for locations with coverage.
    """
    if not api_key:
        raise ValueError("Google Maps API key required.")

    west, south, east, north = bbox
    # Compute grid density if not specified
    if grid_density <= 0:
        # Aim for ~4x the limit to account for locations without coverage
        grid_density = max(int((limit * 4) ** 0.5), 4)

    # Generate evenly-spaced grid points within the bbox
    lat_step = (north - south) / grid_density
    lon_step = (east - west) / grid_density

    candidates: List[Tuple[float, float]] = []
    for i in range(grid_density):
        for j in range(grid_density):
            lat = south + lat_step * (i + 0.5)
            lon = west + lon_step * (j + 0.5)
            candidates.append((lat, lon))

    # Shuffle to avoid spatial bias when we hit the limit
    random.shuffle(candidates)

    results: List[dict] = []
    async with aiohttp.ClientSession() as session:
        for lat, lon in candidates:
            if len(results) >= limit:
                break

            params = {
                "location": f"{lat},{lon}",
                "radius": 100,
                "source": "outdoor",
                "key": api_key,
            }
            try:
                async with session.get(METADATA_BASE, params=params) as resp:
                    data = await resp.json()
                    if data.get("status") == "OK":
                        pano_id = data.get("pano_id", "")
                        # Skip duplicates (same pano from nearby grid points)
                        if any(r["pano_id"] == pano_id for r in results):
                            continue
                        results.append({
                            "pano_id": pano_id,
                            "latitude": data["location"]["lat"],
                            "longitude": data["location"]["lng"],
                            "date": data.get("date", ""),
                        })
            except Exception:
                continue

    return results


def get_image_url(
    lat: float,
    lon: float,
    api_key: str,
    heading: int = 0,
    size: str = DEFAULT_SIZE,
    fov: int = DEFAULT_FOV,
    pitch: int = 0,
) -> str:
    """Build a Google Street View Static API image URL."""
    return (
        f"{STREETVIEW_BASE}"
        f"?size={size}"
        f"&location={lat},{lon}"
        f"&heading={heading}"
        f"&fov={fov}"
        f"&pitch={pitch}"
        f"&key={api_key}"
    )


def get_image_url_by_pano(
    pano_id: str,
    api_key: str,
    heading: int = 0,
    size: str = DEFAULT_SIZE,
    fov: int = DEFAULT_FOV,
    pitch: int = 0,
) -> str:
    """Build a Street View image URL using a panorama ID (more stable)."""
    return (
        f"{STREETVIEW_BASE}"
        f"?size={size}"
        f"&pano={pano_id}"
        f"&heading={heading}"
        f"&fov={fov}"
        f"&pitch={pitch}"
        f"&key={api_key}"
    )


async def download_image(
    pano_id: str,
    api_key: str,
    cache_dir: str,
    heading: int = 0,
    size: str = DEFAULT_SIZE,
    fov: int = DEFAULT_FOV,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> str:
    """Download a Street View image, caching locally. Returns local file path."""
    os.makedirs(cache_dir, exist_ok=True)

    # Generate a stable filename from pano_id + heading
    key = f"{pano_id}_{heading}_{size}"
    file_hash = hashlib.md5(key.encode()).hexdigest()[:12]
    local_path = os.path.join(cache_dir, f"gsv_{file_hash}.jpg")

    if os.path.exists(local_path):
        return local_path

    # Use pano_id if available, else fall back to lat/lon
    if pano_id:
        url = get_image_url_by_pano(pano_id, api_key, heading=heading, size=size, fov=fov)
    elif lat is not None and lon is not None:
        url = get_image_url(lat, lon, api_key, heading=heading, size=size, fov=fov)
    else:
        raise ValueError("Either pano_id or lat/lon required")

    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            if resp.status != 200:
                raise ValueError(f"Street View API returned status {resp.status}")
            content = await resp.read()
            # Google returns a gray placeholder if no image; check content size
            if len(content) < 5000:
                raise ValueError(f"No Street View image available for {pano_id}")

    with open(local_path, "wb") as f:
        f.write(content)

    return local_path


async def estimate_coverage(
    bbox: List[float],
    api_key: str,
    sample_count: int = 16,
) -> int:
    """Quickly estimate how many Street View images are available in a bbox.
    Samples a small grid and extrapolates.
    """
    west, south, east, north = bbox
    grid_size = max(int(sample_count ** 0.5), 2)
    lat_step = (north - south) / grid_size
    lon_step = (east - west) / grid_size

    hits = 0
    total = 0
    async with aiohttp.ClientSession() as session:
        for i in range(grid_size):
            for j in range(grid_size):
                lat = south + lat_step * (i + 0.5)
                lon = west + lon_step * (j + 0.5)
                total += 1
                params = {
                    "location": f"{lat},{lon}",
                    "radius": 100,
                    "source": "outdoor",
                    "key": api_key,
                }
                try:
                    async with session.get(METADATA_BASE, params=params) as resp:
                        data = await resp.json()
                        if data.get("status") == "OK":
                            hits += 1
                except Exception:
                    continue

    if total == 0:
        return 0
    # Extrapolate: ratio of hits * total possible grid points
    coverage_ratio = hits / total
    # Estimate total based on a denser grid
    full_grid = grid_size * 5  # assume 5x denser would be practical
    return int(coverage_ratio * full_grid * full_grid)
