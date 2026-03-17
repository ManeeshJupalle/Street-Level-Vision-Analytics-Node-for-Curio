import math
from typing import List, Tuple


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in meters between two lat/lon points."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def bbox_area_km2(bbox: List[float]) -> float:
    """Approximate area of a bounding box in km^2."""
    west, south, east, north = bbox
    width = haversine(south, west, south, east)
    height = haversine(south, west, north, west)
    return (width * height) / 1e6


def bbox_center(bbox: List[float]) -> Tuple[float, float]:
    """Return (lat, lon) center of a bbox."""
    west, south, east, north = bbox
    return ((south + north) / 2, (west + east) / 2)
