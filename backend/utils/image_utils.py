import os
from typing import List

from PIL import Image


def load_image(path: str) -> Image.Image:
    return Image.open(path).convert("RGB")


def list_images_in_folder(folder: str) -> List[str]:
    supported = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    paths = []
    for fname in sorted(os.listdir(folder)):
        if os.path.splitext(fname)[1].lower() in supported:
            paths.append(os.path.join(folder, fname))
    return paths


def resize_if_needed(image: Image.Image, max_size: int = 2048) -> Image.Image:
    w, h = image.size
    if max(w, h) > max_size:
        scale = max_size / max(w, h)
        new_w, new_h = int(w * scale), int(h * scale)
        return image.resize((new_w, new_h), Image.LANCZOS)
    return image
