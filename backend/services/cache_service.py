import json
import os
from typing import Optional


class CacheService:
    def __init__(self, cache_dir: str = "./cache"):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)

    def _path(self, key: str, ext: str = ".json") -> str:
        safe_key = key.replace("/", "_").replace("\\", "_")
        return os.path.join(self.cache_dir, f"{safe_key}{ext}")

    def get_json(self, key: str) -> Optional[dict]:
        path = self._path(key)
        if os.path.exists(path):
            with open(path, "r") as f:
                return json.load(f)
        return None

    def set_json(self, key: str, data: dict) -> None:
        path = self._path(key)
        with open(path, "w") as f:
            json.dump(data, f, indent=2)

    def has_image(self, image_id: str) -> bool:
        path = self._path(image_id, ext=".jpg")
        return os.path.exists(path)

    def get_image_path(self, image_id: str) -> Optional[str]:
        path = self._path(image_id, ext=".jpg")
        return path if os.path.exists(path) else None

    def save_image(self, image_id: str, data: bytes) -> str:
        path = self._path(image_id, ext=".jpg")
        with open(path, "wb") as f:
            f.write(data)
        return path
