import asyncio
import os
import random
from typing import AsyncIterator, List

from backend.config import settings
from backend.models.schemas import (
    DetectionResult,
    InferenceRequest,
    ModelType,
    SegmentationResult,
)


def _is_demo_mode() -> bool:
    """Check if we should use demo/mock inference (no GPU or no real model)."""
    return not settings.HUGGINGFACE_TOKEN


def _demo_segmentation(image_id: str, classes: List[str], lat: float, lon: float) -> dict:
    """Generate realistic-looking mock segmentation results."""
    # Define plausible ranges for common classes
    ranges = {
        "vegetation": (0.15, 0.45), "road": (0.20, 0.40),
        "building": (0.10, 0.30), "sidewalk": (0.05, 0.15),
        "sky": (0.05, 0.20), "car": (0.02, 0.10),
        "person": (0.01, 0.05), "terrain": (0.02, 0.08),
        "pole": (0.01, 0.03), "fence": (0.01, 0.04),
        "truck": (0.01, 0.05), "bus": (0.005, 0.03),
        "bicycle": (0.005, 0.02), "wall": (0.02, 0.08),
        "traffic sign": (0.005, 0.02),
    }

    target_classes = classes if classes else ["vegetation", "road", "building", "sidewalk", "sky"]
    raw = {}
    for cls in target_classes:
        lo, hi = ranges.get(cls, (0.02, 0.10))
        raw[cls] = random.uniform(lo, hi)

    # Normalize to sum to 1.0
    total = sum(raw.values())
    class_ratios = {k: round(v / total, 4) for k, v in raw.items()}

    return SegmentationResult(
        image_id=image_id,
        image_url=f"https://picsum.photos/seed/{image_id}/2048/1024",
        latitude=lat,
        longitude=lon,
        class_ratios=class_ratios,
    ).model_dump()


def _demo_detection(image_id: str, classes: List[str], lat: float, lon: float) -> dict:
    """Generate mock detection results with random bounding boxes."""
    target_classes = classes if classes else ["car", "person", "truck", "bicycle"]
    num_dets = random.randint(3, 10)
    detections = []
    object_counts: dict = {}

    for _ in range(num_dets):
        label = random.choice(target_classes)
        conf = round(random.uniform(0.4, 0.95), 4)
        x1 = random.uniform(50, 1500)
        y1 = random.uniform(50, 800)
        w = random.uniform(40, 300)
        h = random.uniform(40, 300)
        detections.append({
            "label": label,
            "confidence": conf,
            "bbox": [round(x1, 1), round(y1, 1), round(x1 + w, 1), round(y1 + h, 1)],
        })
        object_counts[label] = object_counts.get(label, 0) + 1

    return DetectionResult(
        image_id=image_id,
        image_url=f"https://picsum.photos/seed/{image_id}/2048/1024",
        latitude=lat,
        longitude=lon,
        detections=detections,
        object_counts=object_counts,
    ).model_dump()


async def run_batch_inference(request: InferenceRequest) -> AsyncIterator[dict]:
    """Run inference on a batch of images, yielding results progressively.
    Falls back to demo mode if no real model/GPU is available.
    """
    model_type = request.model.model_type
    classes = request.classes.classes
    bbox = request.data_source.bbox or [-87.66, 41.91, -87.62, 41.94]
    limit = min(request.data_source.limit, 200)

    if _is_demo_mode() or request.data_source.source_type.value == "mapillary":
        # Demo mode: generate mock results with realistic delays
        random.seed(hash(request.model.model_id))
        west, south, east, north = bbox
        count = min(limit, 20)

        for i in range(count):
            lat = south + (north - south) * random.random()
            lon = west + (east - west) * random.random()
            image_id = f"demo_{i:04d}"

            if model_type == ModelType.segmentation:
                result = _demo_segmentation(image_id, classes, lat, lon)
            elif model_type == ModelType.detection:
                result = _demo_detection(image_id, classes, lat, lon)
            else:
                continue

            result["demo_mode"] = True
            yield result
            await asyncio.sleep(0.3)  # Simulate processing time
        return

    # Real inference path
    import numpy as np
    import torch
    from PIL import Image as PILImage

    from backend.services.huggingface_service import get_cached_model, load_model

    model_id = request.model.model_id

    cached = get_cached_model(model_id)
    if cached is None:
        load_model(model_id, model_type)
        cached = get_cached_model(model_id)

    model, processor, _ = cached

    image_paths = []
    if request.data_source.source_type.value == "folder" and request.data_source.folder_path:
        folder = request.data_source.folder_path
        supported = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
        for fname in sorted(os.listdir(folder)):
            if os.path.splitext(fname)[1].lower() in supported:
                image_paths.append(os.path.join(folder, fname))
                if len(image_paths) >= request.data_source.limit:
                    break

    for img_path in image_paths:
        try:
            if model_type == ModelType.segmentation:
                result = _run_segmentation(model, processor, img_path, classes)
            elif model_type == ModelType.detection:
                result = _run_detection(model, img_path, classes)
            else:
                continue
            yield result
        except Exception as e:
            yield {"image_id": os.path.basename(img_path), "error": str(e)}


def _run_segmentation(model, processor, image_path: str, classes: List[str]) -> dict:
    """Run semantic segmentation on a single image."""
    import numpy as np
    import torch
    from PIL import Image as PILImage

    image = PILImage.open(image_path).convert("RGB")
    inputs = processor(images=image, return_tensors="pt")

    with torch.no_grad():
        outputs = model(**inputs)

    logits = outputs.logits
    pred = torch.argmax(logits, dim=1).squeeze().cpu().numpy()

    total_pixels = pred.size
    unique, counts = np.unique(pred, return_counts=True)

    id2label = getattr(model.config, "id2label", {})
    class_ratios = {}
    for cls_id, count in zip(unique, counts):
        label = id2label.get(int(cls_id), f"class_{cls_id}")
        if not classes or label in classes:
            class_ratios[label] = round(float(count / total_pixels), 4)

    return SegmentationResult(
        image_id=os.path.basename(image_path),
        image_url=image_path,
        class_ratios=class_ratios,
    ).model_dump()


def _run_detection(model, image_path: str, classes: List[str]) -> dict:
    """Run object detection (YOLO) on a single image."""
    results = model(image_path, verbose=False)
    result = results[0]

    detections = []
    object_counts: dict = {}

    for box in result.boxes:
        cls_id = int(box.cls[0])
        label = result.names.get(cls_id, f"class_{cls_id}")
        conf = float(box.conf[0])
        xyxy = box.xyxy[0].tolist()

        if classes and label not in classes:
            continue

        detections.append({
            "label": label,
            "confidence": round(conf, 4),
            "bbox": [round(c, 1) for c in xyxy],
        })
        object_counts[label] = object_counts.get(label, 0) + 1

    return DetectionResult(
        image_id=os.path.basename(image_path),
        image_url=image_path,
        detections=detections,
        object_counts=object_counts,
    ).model_dump()
