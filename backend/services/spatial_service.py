from typing import List

import geopandas as gpd
import numpy as np
from shapely.geometry import box, mapping


def create_block_grid(bbox: List[float], cell_size_meters: float = 100) -> dict:
    """Create a GeoJSON grid of cells over the bounding box.

    bbox: [west, south, east, north]
    cell_size_meters: approximate cell size in meters
    """
    west, south, east, north = bbox

    # Approximate degrees per meter at this latitude
    lat_mid = (south + north) / 2
    deg_per_m_lat = 1 / 111_320
    deg_per_m_lon = 1 / (111_320 * np.cos(np.radians(lat_mid)))

    cell_lat = cell_size_meters * deg_per_m_lat
    cell_lon = cell_size_meters * deg_per_m_lon

    cells = []
    y = south
    while y < north:
        x = west
        while x < east:
            cell = box(x, y, min(x + cell_lon, east), min(y + cell_lat, north))
            cells.append(cell)
            x += cell_lon
        y += cell_lat

    gdf = gpd.GeoDataFrame(geometry=cells, crs="EPSG:4326")
    gdf["cell_id"] = range(len(gdf))
    return gdf.__geo_interface__


def aggregate_to_blocks(results: List[dict], geometry_geojson: dict) -> dict:
    """Spatially join inference results to grid cells."""
    if not results:
        return geometry_geojson

    # Build points from results
    points = []
    for r in results:
        lat = r.get("latitude")
        lon = r.get("longitude")
        if lat is not None and lon is not None:
            from shapely.geometry import Point
            points.append({"geometry": Point(lon, lat), **r})

    if not points:
        return geometry_geojson

    points_gdf = gpd.GeoDataFrame(points, crs="EPSG:4326")
    grid_gdf = gpd.GeoDataFrame.from_features(
        geometry_geojson["features"], crs="EPSG:4326"
    )

    joined = gpd.sjoin(grid_gdf, points_gdf, how="left", predicate="contains")
    return joined.__geo_interface__
