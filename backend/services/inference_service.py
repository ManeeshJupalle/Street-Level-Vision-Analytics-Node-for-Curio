import os
from typing import AsyncIterator, List

import numpy as np
import torch
from PIL import Image

from backend.models.schemas import (
    DetectionResult,
    InferenceRequest,
    ModelType,
    SegmentationResult,
)
from backend.services.huggingface_service import get_cached_model, load_model


def run_segmentation(model, processor, image_path: str, classes: List[str]) -> dict:
    """Run semantic segmentation on a single image."""
    image = Image.open(image_path).convert("RGB")
    inputs = processor(images=image, return_tensors="pt")

    with torch.no_grad():
        outputs = model(**inputs)

    logits = outputs.logits
    pred = torch.argmax(logits, dim=1).squeeze().cpu().numpy()

    # Compute per-class pixel ratios
    total_pixels = pred.size
    unique, counts = np.unique(pred, return_counts=True)

    # Map class IDs to names using model config
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


def run_detection(model, image_path: str, classes: List[str]) -> dict:
    """Run object detection (YOLO) on a single image."""
    results = model(image_path, verbose=False)
    result = results[0]

    detections = []
    object_counts = {}

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


async def run_batch_inference(request: InferenceRequest) -> AsyncIterator[dict]:
    """Run inference on a batch of images, yielding results progressively."""
    model_id = request.model.model_id
    model_type = request.model.model_type
    classes = request.classes.classes

    # Ensure model is loaded
    cached = get_cached_model(model_id)
    if cached is None:
        load_model(model_id, model_type)
        cached = get_cached_model(model_id)

    model, processor, _ = cached

    # Gather image paths based on data source
    image_paths = []
    if request.data_source.source_type.value == "folder" and request.data_source.folder_path:
        folder = request.data_source.folder_path
        supported = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
        for fname in sorted(os.listdir(folder)):
            if os.path.splitext(fname)[1].lower() in supported:
                image_paths.append(os.path.join(folder, fname))
                if len(image_paths) >= request.data_source.limit:
                    break

    # Process each image
    for img_path in image_paths:
        try:
            if model_type == ModelType.segmentation:
                result = run_segmentation(model, processor, img_path, classes)
            elif model_type == ModelType.detection:
                result = run_detection(model, img_path, classes)
            else:
                continue
            yield result
        except Exception as e:
            yield {"image_id": os.path.basename(img_path), "error": str(e)}
