from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel


class ModelType(str, Enum):
    segmentation = "segmentation"
    detection = "detection"
    classification = "classification"


class DataSourceType(str, Enum):
    folder = "folder"
    mapillary = "mapillary"
    url = "url"


class ModelInfo(BaseModel):
    model_id: str
    model_type: ModelType
    name: str
    description: str = ""


class DataSourceConfig(BaseModel):
    source_type: DataSourceType
    folder_path: Optional[str] = None
    api_endpoint: Optional[str] = None
    bbox: Optional[List[float]] = None
    limit: int = 100


class ClassConfig(BaseModel):
    classes: List[str]
    source: str = "prompt"


class InferenceRequest(BaseModel):
    model: ModelInfo
    data_source: DataSourceConfig
    classes: ClassConfig


class SegmentationResult(BaseModel):
    image_id: str
    image_url: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    class_ratios: Dict[str, float] = {}


class DetectionResult(BaseModel):
    image_id: str
    image_url: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    detections: List[dict] = []
    object_counts: Dict[str, int] = {}


class InferenceResponse(BaseModel):
    job_id: str
    status: str
    total_images: int = 0
    processed: int = 0
    results: List[dict] = []
