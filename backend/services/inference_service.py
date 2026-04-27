import asyncio
import os
from typing import AsyncIterator, Dict, List, Tuple

import numpy as np

from backend.config import settings
from backend.models.schemas import (
    DetectionResult,
    InferenceRequest,
    ModelType,
    SegmentationResult,
)

# Cityscapes color palette (class_id -> RGB)
# Must match frontend/src/constants/classColors.ts
CITYSCAPES_COLORS: Dict[int, Tuple[int, int, int]] = {
    0: (74, 144, 217),    # road        #4A90D9
    1: (231, 76, 139),    # sidewalk    #E74C8B
    2: (46, 204, 113),    # building    #2ECC71
    3: (189, 195, 199),   # wall        #BDC3C7
    4: (155, 89, 182),    # fence       #9B59B6
    5: (0, 188, 212),     # pole        #00BCD4
    6: (241, 196, 15),    # traffic light #F1C40F
    7: (241, 196, 15),    # traffic sign  #F1C40F
    8: (245, 166, 35),    # vegetation  #F5A623
    9: (141, 110, 99),    # terrain     #8D6E63
    10: (133, 193, 233),  # sky         #85C1E9
    11: (255, 105, 180),  # person      #FF69B4
    12: (255, 105, 180),  # rider       #FF69B4
    13: (231, 76, 60),    # car         #E74C3C
    14: (255, 107, 53),   # truck       #FF6B35
    15: (211, 84, 0),     # bus         #D35400
    16: (127, 140, 141),  # train       #7F8C8D
    17: (192, 57, 43),    # motorcycle  #C0392B
    18: (26, 188, 156),   # bicycle     #1ABC9C
}

OVERLAY_DIR = os.path.join(settings.CACHE_DIR, "overlays")


def _ensure_overlay_dir():
    os.makedirs(OVERLAY_DIR, exist_ok=True)


def get_overlay_path(image_id: str) -> str:
    """Return the path to a saved overlay image, or empty string if not found."""
    stem = os.path.splitext(image_id)[0]
    path = os.path.join(OVERLAY_DIR, f"{stem}_overlay.png")
    return path if os.path.exists(path) else ""


def _run_real_segmentation(
    model, processor, image_path: str, classes: List[str], image_id: str
) -> dict:
    """Run semantic segmentation on a single image.

    Handles SegFormer-style models (direct `logits` head) and Mask2Former /
    OneFormer-style models (post_process_semantic_segmentation required).
    """
    import torch
    from PIL import Image as PILImage

    image = PILImage.open(image_path).convert("RGB")
    orig_w, orig_h = image.size

    inputs = processor(images=image, return_tensors="pt")

    with torch.no_grad():
        outputs = model(**inputs)

    # Prefer the processor's post_process — it handles Mask2Former, OneFormer,
    # MaskFormer, SegFormer uniformly and returns a (H, W) class-id map.
    if hasattr(processor, "post_process_semantic_segmentation"):
        seg_maps = processor.post_process_semantic_segmentation(
            outputs, target_sizes=[(orig_h, orig_w)]
        )
        pred = seg_maps[0].cpu().numpy()
    elif hasattr(outputs, "logits"):
        upsampled = torch.nn.functional.interpolate(
            outputs.logits, size=(orig_h, orig_w), mode="bilinear", align_corners=False
        )
        pred = upsampled.argmax(dim=1).squeeze().cpu().numpy()
    else:
        raise ValueError(
            f"Cannot extract semantic segmentation from outputs of type "
            f"{type(outputs).__name__} — model is not a supported semantic seg head"
        )

    # Compute per-class pixel ratios
    total_pixels = pred.size
    unique, counts = np.unique(pred, return_counts=True)

    id2label = getattr(model.config, "id2label", {})
    class_ratios = {}
    for cls_id, count in zip(unique, counts):
        label = id2label.get(int(cls_id), f"class_{cls_id}")
        class_ratios[label] = round(float(count / total_pixels), 4)

    # Generate colored overlay image
    _ensure_overlay_dir()
    overlay = np.zeros((orig_h, orig_w, 3), dtype=np.uint8)
    for cls_id in np.unique(pred):
        color = CITYSCAPES_COLORS.get(int(cls_id), (128, 128, 128))
        overlay[pred == cls_id] = color

    stem = os.path.splitext(image_id)[0]
    overlay_path = os.path.join(OVERLAY_DIR, f"{stem}_overlay.png")
    PILImage.fromarray(overlay).save(overlay_path)

    # Filter to requested classes if specified
    if classes:
        class_ratios = {k: v for k, v in class_ratios.items() if k in classes}
        # Normalize filtered ratios
        total = sum(class_ratios.values())
        if total > 0:
            class_ratios = {k: round(v / total, 4) for k, v in class_ratios.items()}

    return SegmentationResult(
        image_id=image_id,
        image_url=image_path,
        class_ratios=class_ratios,
    ).model_dump()


# ── Main batch inference ──


async def run_batch_inference(request: InferenceRequest) -> AsyncIterator[dict]:
    """Run inference on images from folder/sample or Google Street View sources."""
    model_type = request.model.model_type
    classes = request.classes.classes
    bbox = request.data_source.bbox or [-87.66, 41.91, -87.62, 41.94]
    limit = min(request.data_source.limit, 200)
    source = request.data_source.source_type.value

    # ── Real inference for folder source ──
    if source in ("folder",):
        folder = request.data_source.folder_path or ""

        if not os.path.isdir(folder):
            yield {"error": f"Folder not found: {folder}"}
            return

        # Collect image paths
        supported = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
        image_paths = []
        for fname in sorted(os.listdir(folder)):
            if os.path.splitext(fname)[1].lower() in supported:
                image_paths.append(os.path.join(folder, fname))
                if len(image_paths) >= limit:
                    break

        if model_type == ModelType.segmentation:
            # Load real model (off the event loop — model downloads can take >30s)
            from backend.services.huggingface_service import get_cached_model, load_model

            model_id = request.model.model_id
            cached = get_cached_model(model_id)
            if cached is None:
                await asyncio.get_event_loop().run_in_executor(
                    None, load_model, model_id, model_type,
                )
                cached = get_cached_model(model_id)
            model, processor, _ = cached

            for img_path in image_paths:
                image_id = os.path.basename(img_path)
                try:
                    result = await asyncio.get_event_loop().run_in_executor(
                        None,
                        _run_real_segmentation,
                        model, processor, img_path, classes, image_id,
                    )
                    yield result
                except Exception as e:
                    yield {"image_id": image_id, "error": str(e)}

        elif model_type == ModelType.detection:
            from backend.services.huggingface_service import get_cached_model, load_model

            cached = get_cached_model(request.model.model_id)
            if cached is None:
                await asyncio.get_event_loop().run_in_executor(
                    None, load_model, request.model.model_id, model_type,
                )
                cached = get_cached_model(request.model.model_id)
            model, _, _ = cached

            for img_path in image_paths:
                image_id = os.path.basename(img_path)
                try:
                    result = await asyncio.get_event_loop().run_in_executor(
                        None, _run_detection, model, img_path, classes,
                    )
                    yield result
                except Exception as e:
                    yield {"image_id": image_id, "error": str(e)}
        return

    # ── Google Street View: fetch real images and run inference ──
    if source == "google_streetview":
        from backend.services.google_streetview_service import (
            fetch_images_in_bbox,
            download_image,
            get_image_url_by_pano,
        )

        api_key = settings.GOOGLE_MAPS_API_KEY
        if not api_key:
            yield {"error": "Google Maps API key required. Set GOOGLE_MAPS_API_KEY in .env"}
            return

        # Fetch image metadata via Street View Metadata API
        images = await fetch_images_in_bbox(bbox=bbox, limit=limit, api_key=api_key)
        if not images:
            yield {"error": "No Street View images found in this area. Try a different location."}
            return

        # Load model (off the event loop — model downloads can take >30s)
        if model_type == ModelType.segmentation:
            from backend.services.huggingface_service import get_cached_model, load_model as hf_load
            model_id = request.model.model_id
            cached = get_cached_model(model_id)
            if cached is None:
                await asyncio.get_event_loop().run_in_executor(
                    None, hf_load, model_id, model_type,
                )
                cached = get_cached_model(model_id)
            model, processor, _ = cached

        elif model_type == ModelType.detection:
            from backend.services.huggingface_service import get_cached_model, load_model as hf_load
            cached = get_cached_model(request.model.model_id)
            if cached is None:
                await asyncio.get_event_loop().run_in_executor(
                    None, hf_load, request.model.model_id, model_type,
                )
                cached = get_cached_model(request.model.model_id)
            model, _, _ = cached
        else:
            yield {"error": f"Unsupported model type: {model_type}"}
            return

        for img_meta in images:
            pano_id = img_meta["pano_id"]
            image_id = pano_id
            lat = img_meta.get("latitude")
            lon = img_meta.get("longitude")
            display_url = get_image_url_by_pano(pano_id, api_key, heading=0)

            try:
                # Download image locally for inference
                local_path = await download_image(
                    pano_id=pano_id,
                    api_key=api_key,
                    cache_dir=settings.CACHE_DIR,
                    lat=lat,
                    lon=lon,
                )

                if model_type == ModelType.segmentation:
                    result = await asyncio.get_event_loop().run_in_executor(
                        None,
                        _run_real_segmentation,
                        model, processor, local_path, classes, image_id,
                    )
                else:
                    result = await asyncio.get_event_loop().run_in_executor(
                        None, _run_detection, model, local_path, classes,
                    )

                result["image_url"] = display_url
                result["latitude"] = lat
                result["longitude"] = lon
                yield result
            except Exception as e:
                yield {"image_id": image_id, "error": str(e)}
        return

    # ── Unknown source — error ──
    yield {"error": f"Unknown data source type: {source}"}


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
            "label": label, "confidence": round(conf, 4),
            "bbox": [round(c, 1) for c in xyxy],
        })
        object_counts[label] = object_counts.get(label, 0) + 1
    return DetectionResult(
        image_id=os.path.basename(image_path), image_url=image_path,
        detections=detections, object_counts=object_counts,
    ).model_dump()
