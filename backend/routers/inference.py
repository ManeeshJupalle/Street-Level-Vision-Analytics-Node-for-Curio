import asyncio
import hashlib
import json
import os
import time
import uuid
import zlib
from pathlib import Path
from typing import Dict

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from backend.models.schemas import InferenceRequest, InferenceResponse
from backend.services.inference_service import get_overlay_path, run_batch_inference

router = APIRouter()

jobs: Dict[str, dict] = {}


async def _run_inference_job(job_id: str, request: InferenceRequest):
    jobs[job_id]["status"] = "running"
    try:
        results = []
        async for result in run_batch_inference(request):
            results.append(result)
            jobs[job_id]["processed"] = len(results)
            jobs[job_id]["results"] = results
        jobs[job_id]["status"] = "completed"
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)


@router.post("/inference/run")
async def start_inference(request: InferenceRequest):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "total_images": request.data_source.limit,
        "processed": 0,
        "results": [],
    }
    asyncio.create_task(_run_inference_job(job_id, request))
    return InferenceResponse(
        job_id=job_id,
        status="queued",
        total_images=request.data_source.limit,
    )


@router.get("/inference/status/{job_id}")
async def get_inference_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    job = jobs[job_id]
    return InferenceResponse(
        job_id=job_id,
        status=job["status"],
        total_images=job["total_images"],
        processed=job["processed"],
    )


@router.get("/inference/overlay/{image_id}")
async def get_overlay_image(image_id: str):
    """Return the segmentation overlay PNG for a given image."""
    path = get_overlay_path(image_id)
    if not path:
        raise HTTPException(status_code=404, detail="Overlay not found")
    return FileResponse(path, media_type="image/png")


# NOTE: These specific sub-path routes MUST be defined before the generic
# /inference/results/{job_id} route, otherwise FastAPI matches {job_id}
# greedily and never reaches these.

@router.get("/inference/results/{job_id}/geojson")
async def get_inference_geojson(job_id: str):
    """Return inference results as a GeoJSON FeatureCollection."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    job = jobs[job_id]
    features = []
    for r in job.get("results", []):
        lat = r.get("latitude")
        lon = r.get("longitude")
        geometry = (
            {"type": "Point", "coordinates": [lon, lat]}
            if lat is not None and lon is not None
            else None
        )
        props = {
            "image_id": r.get("image_id", ""),
            "image_url": r.get("image_url", ""),
        }
        if "class_ratios" in r:
            props["class_ratios"] = r["class_ratios"]
            props["analysis_type"] = "segmentation"
        if "object_counts" in r:
            props["object_counts"] = r["object_counts"]
            props["detections"] = r.get("detections", [])
            props["analysis_type"] = "detection"
        features.append({
            "type": "Feature",
            "geometry": geometry,
            "properties": props,
        })
    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "job_id": job_id,
            "status": job["status"],
            "total_images": job["total_images"],
            "processed": job["processed"],
        },
    }


@router.get("/inference/results/{job_id}/curio_export")
async def export_for_curio(job_id: str):
    """Save inference results as a Curio-compatible .data file and return the reference."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    job = jobs[job_id]

    # Build GeoJSON FeatureCollection
    features = []
    for r in job.get("results", []):
        lat = r.get("latitude")
        lon = r.get("longitude")
        geometry = (
            {"type": "Point", "coordinates": [lon, lat]}
            if lat is not None and lon is not None
            else None
        )
        props = {
            "image_id": r.get("image_id", ""),
            "image_url": r.get("image_url", ""),
        }
        if "class_ratios" in r:
            for k, v in r["class_ratios"].items():
                props[k] = v
            props["analysis_type"] = "segmentation"
        if "object_counts" in r:
            for k, v in r["object_counts"].items():
                props[k] = v
            props["analysis_type"] = "detection"
        features.append({
            "type": "Feature",
            "geometry": geometry,
            "properties": props,
        })

    # Build data in Curio's expected format: {data: {...columns...}, dataType: "geodataframe"}
    # Curio stores GeoDataFrames as column-oriented dicts
    columns: Dict[str, list] = {"geometry": []}
    for feat in features:
        columns["geometry"].append(json.dumps(feat["geometry"]) if feat["geometry"] else None)
        for key, val in feat.get("properties", {}).items():
            if key not in columns:
                columns[key] = [None] * (len(columns["geometry"]) - 1)
            columns[key].append(val)
        # Pad any missing keys
        for key in columns:
            if key != "geometry" and len(columns[key]) < len(columns["geometry"]):
                columns[key].append(None)

    # UTK requires metadata.name on each geojson layer
    columns["metadata"] = {"name": "street_vision_results"}
    curio_data = {"data": columns, "dataType": "geodataframe"}

    # Save to Curio's shared data directory
    curio_data_dir = os.environ.get("CURIO_SHARED_DATA", "")
    if not curio_data_dir:
        # Try to find it relative to the curio project
        candidate = Path(__file__).resolve().parents[3] / "curio" / ".curio" / "data"
        if candidate.exists():
            curio_data_dir = str(candidate)
        else:
            # Fallback: create alongside the project
            curio_data_dir = str(Path(__file__).resolve().parents[2] / ".curio" / "data")

    save_dir = Path(curio_data_dir).resolve()
    os.makedirs(save_dir, exist_ok=True)

    # Generate unique filename matching Curio's convention
    json_bytes = json.dumps(curio_data, ensure_ascii=False).encode("utf-8")
    input_hash = hashlib.sha256(json_bytes[:1024]).digest()[:4].hex()
    timestamp = str(int(time.time()))
    unique_filename = f"{timestamp}_{input_hash[:25]}.data"

    curio_data["filename"] = unique_filename
    json_bytes = json.dumps(curio_data, ensure_ascii=False).encode("utf-8")
    compressed = zlib.compress(json_bytes)

    full_path = save_dir / unique_filename
    with open(full_path, "wb") as f:
        f.write(compressed)

    return {
        "path": unique_filename,
        "dataType": "geodataframe",
        "filename": unique_filename,
        "feature_count": len(features),
    }


# Generic results route — MUST come after the specific sub-path routes above
@router.get("/inference/results/{job_id}")
async def get_inference_results(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    job = jobs[job_id]
    return InferenceResponse(
        job_id=job_id,
        status=job["status"],
        total_images=job["total_images"],
        processed=job["processed"],
        results=job["results"],
    )


@router.get("/inference/latest")
async def get_latest_job():
    """Return the most recent job's status and ID."""
    if not jobs:
        return {"job_id": None, "status": "idle", "total_images": 0, "processed": 0}
    latest_id = list(jobs.keys())[-1]
    job = jobs[latest_id]
    return {
        "job_id": latest_id,
        "status": job["status"],
        "total_images": job["total_images"],
        "processed": job["processed"],
    }
