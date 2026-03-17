import asyncio
import uuid
from typing import Dict

from fastapi import APIRouter, HTTPException

from backend.models.schemas import InferenceRequest, InferenceResponse
from backend.services.inference_service import run_batch_inference

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
