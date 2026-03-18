import pytest
from pydantic import ValidationError

from backend.models.schemas import (
    ClassConfig,
    DataSourceConfig,
    DataSourceType,
    DetectionResult,
    InferenceRequest,
    InferenceResponse,
    ModelInfo,
    ModelType,
    SegmentationResult,
)


class TestModelInfo:
    def test_valid_segmentation_model(self):
        model = ModelInfo(
            model_id="nvidia/segformer-b2-finetuned-cityscapes-1024-1024",
            model_type=ModelType.segmentation,
            name="SegFormer B2",
        )
        assert model.model_type == ModelType.segmentation
        assert model.description == ""

    def test_valid_detection_model(self):
        model = ModelInfo(
            model_id="ultralytics/yolov8n",
            model_type=ModelType.detection,
            name="YOLOv8 Nano",
            description="Lightweight detection model",
        )
        assert model.model_type == ModelType.detection
        assert model.description == "Lightweight detection model"

    def test_valid_classification_model(self):
        model = ModelInfo(
            model_id="google/vit-base-patch16-224",
            model_type=ModelType.classification,
            name="ViT Base",
        )
        assert model.model_type == ModelType.classification

    def test_missing_required_fields(self):
        with pytest.raises(ValidationError):
            ModelInfo(model_id="test/model")


class TestDataSourceConfig:
    def test_folder_source(self):
        config = DataSourceConfig(
            source_type=DataSourceType.folder,
            folder_path="/path/to/images",
            limit=50,
        )
        assert config.source_type == DataSourceType.folder
        assert config.folder_path == "/path/to/images"
        assert config.limit == 50

    def test_mapillary_source(self):
        config = DataSourceConfig(
            source_type=DataSourceType.mapillary,
            bbox=[-87.66, 41.91, -87.62, 41.94],
            limit=100,
        )
        assert config.source_type == DataSourceType.mapillary
        assert len(config.bbox) == 4

    def test_default_limit(self):
        config = DataSourceConfig(source_type=DataSourceType.folder)
        assert config.limit == 100

    def test_optional_fields_default_none(self):
        config = DataSourceConfig(source_type=DataSourceType.folder)
        assert config.folder_path is None
        assert config.bbox is None
        assert config.api_endpoint is None


class TestClassConfig:
    def test_prompt_source(self):
        config = ClassConfig(
            classes=["vegetation", "road", "building"],
            source="prompt",
        )
        assert len(config.classes) == 3
        assert config.source == "prompt"

    def test_csv_source(self):
        config = ClassConfig(
            classes=["bench", "streetlight", "trash_can"],
            source="csv",
        )
        assert config.source == "csv"

    def test_default_source(self):
        config = ClassConfig(classes=["car", "truck"])
        assert config.source == "prompt"

    def test_empty_classes_list(self):
        config = ClassConfig(classes=[])
        assert config.classes == []


class TestSegmentationResult:
    def test_full_result(self):
        result = SegmentationResult(
            image_id="test_001.jpg",
            image_url="/api/data/sample/image/test_001.jpg",
            latitude=41.925,
            longitude=-87.645,
            class_ratios={"vegetation": 0.35, "road": 0.30, "building": 0.20},
        )
        assert result.image_id == "test_001.jpg"
        assert result.latitude == 41.925
        assert sum(result.class_ratios.values()) == pytest.approx(0.85)

    def test_minimal_result(self):
        result = SegmentationResult(image_id="test.jpg")
        assert result.image_url == ""
        assert result.latitude is None
        assert result.class_ratios == {}


class TestDetectionResult:
    def test_full_result(self):
        result = DetectionResult(
            image_id="test_002.jpg",
            image_url="/api/data/sample/image/test_002.jpg",
            latitude=41.88,
            longitude=-87.63,
            detections=[
                {"label": "car", "confidence": 0.92, "bbox": [100, 200, 300, 400]},
                {"label": "truck", "confidence": 0.85, "bbox": [500, 200, 700, 450]},
            ],
            object_counts={"car": 1, "truck": 1},
        )
        assert len(result.detections) == 2
        assert result.object_counts["car"] == 1

    def test_minimal_result(self):
        result = DetectionResult(image_id="test.jpg")
        assert result.detections == []
        assert result.object_counts == {}


class TestInferenceRequest:
    def test_full_request(self):
        request = InferenceRequest(
            model=ModelInfo(
                model_id="nvidia/segformer-b2-finetuned-cityscapes-1024-1024",
                model_type=ModelType.segmentation,
                name="SegFormer B2",
            ),
            data_source=DataSourceConfig(
                source_type=DataSourceType.folder,
                folder_path="__sample_images__",
                limit=20,
            ),
            classes=ClassConfig(
                classes=["vegetation", "road", "building"],
                source="prompt",
            ),
        )
        assert request.model.model_type == ModelType.segmentation
        assert request.data_source.limit == 20
        assert len(request.classes.classes) == 3


class TestInferenceResponse:
    def test_queued_response(self):
        response = InferenceResponse(
            job_id="abc-123",
            status="queued",
            total_images=20,
        )
        assert response.status == "queued"
        assert response.processed == 0
        assert response.results == []

    def test_completed_response_with_results(self):
        response = InferenceResponse(
            job_id="abc-123",
            status="completed",
            total_images=2,
            processed=2,
            results=[
                {"image_id": "img1.jpg", "class_ratios": {"road": 0.5}},
                {"image_id": "img2.jpg", "class_ratios": {"road": 0.6}},
            ],
        )
        assert response.processed == 2
        assert len(response.results) == 2
