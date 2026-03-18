# API Reference

All endpoints are prefixed with `/api`. The backend runs on `http://localhost:8000` by default.

Interactive Swagger docs are available at `http://localhost:8000/docs`.

---

## Health

### `GET /api/health`

Check backend status and configuration.

**Response:**

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "demo_mode": true,
  "has_mapillary_token": false,
  "has_huggingface_token": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Always `"healthy"` if the server is running |
| `version` | string | API version |
| `demo_mode` | boolean | `true` if no Mapillary token is configured |
| `has_mapillary_token` | boolean | Whether a Mapillary token is set |
| `has_huggingface_token` | boolean | Whether a HuggingFace token is set |

---

## Models

### `GET /api/models/search`

Search for models on HuggingFace Hub.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `task` | string | `"segmentation"` | Model task: `segmentation`, `detection`, or `classification` |
| `query` | string | `"cityscapes"` | Search query |

**Example:**

```
GET /api/models/search?task=segmentation&query=cityscapes
```

**Response:**

```json
{
  "models": [
    {
      "model_id": "nvidia/segformer-b2-finetuned-cityscapes-1024-1024",
      "name": "segformer-b2-finetuned-cityscapes-1024-1024",
      "pipeline_tag": "image-segmentation",
      "downloads": 125000,
      "likes": 42,
      "tags": ["pytorch", "segformer", "cityscapes"]
    }
  ]
}
```

---

### `GET /api/models/{model_id}/info`

Get detailed metadata for a specific model.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `model_id` | string | Full HuggingFace model ID (e.g., `nvidia/segformer-b2-finetuned-cityscapes-1024-1024`) |

**Example:**

```
GET /api/models/nvidia/segformer-b2-finetuned-cityscapes-1024-1024/info
```

**Response:**

```json
{
  "model_id": "nvidia/segformer-b2-finetuned-cityscapes-1024-1024",
  "pipeline_tag": "image-segmentation",
  "downloads": 125000,
  "likes": 42,
  "tags": ["pytorch", "segformer", "cityscapes"]
}
```

**Errors:**

| Status | Description |
|--------|-------------|
| 404 | Model not found on HuggingFace |

---

### `POST /api/models/load`

Load a model into memory for inference.

**Request Body:**

```json
{
  "model_id": "nvidia/segformer-b2-finetuned-cityscapes-1024-1024",
  "model_type": "segmentation",
  "name": "SegFormer B2 Cityscapes",
  "description": "Semantic segmentation model"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model_id` | string | Yes | HuggingFace model ID |
| `model_type` | string | Yes | One of: `segmentation`, `detection`, `classification` |
| `name` | string | Yes | Display name |
| `description` | string | No | Optional description |

**Response:**

```json
{
  "status": "loaded",
  "model_id": "nvidia/segformer-b2-finetuned-cityscapes-1024-1024",
  "detail": "Model loaded successfully"
}
```

---

## Data Sources

### `POST /api/data/mapillary/fetch`

Fetch street-level images within a geographic bounding box.

**Request Body:**

```json
{
  "bbox": [-87.66, 41.91, -87.62, 41.94],
  "limit": 20,
  "start_date": null,
  "end_date": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bbox` | float[4] | Yes | Bounding box: `[west, south, east, north]` |
| `limit` | integer | No | Max images to return (default: 100) |
| `start_date` | string | No | Filter by capture date (ISO format) |
| `end_date` | string | No | Filter by capture date (ISO format) |

**Response:**

```json
{
  "images": [
    {
      "image_id": "123456789",
      "latitude": 41.925,
      "longitude": -87.645,
      "captured_at": "2023-06-15T14:30:00Z",
      "thumb_url": "https://..."
    }
  ],
  "count": 20,
  "demo_mode": false
}
```

---

### `POST /api/data/mapillary/coverage`

Check how many images are available in a bounding box without downloading them.

**Request Body:** Same as `/data/mapillary/fetch`.

**Response:**

```json
{
  "bbox": [-87.66, 41.91, -87.62, 41.94],
  "estimated_count": 150,
  "demo_mode": false
}
```

---

### `GET /api/data/mapillary/image/{image_id}`

Download a specific Mapillary image (cached locally).

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `image_id` | string | Mapillary image ID |

**Response:**

```json
{
  "image_id": "123456789",
  "local_path": "./cache/123456789.jpg"
}
```

---

### `POST /api/data/folder/load`

Load images from a local file system folder.

**Request Body:**

```json
{
  "folder_path": "/path/to/images"
}
```

**Response:**

```json
{
  "images": [
    {
      "image_id": "street_001.jpg",
      "path": "/path/to/images/street_001.jpg",
      "filename": "street_001.jpg"
    }
  ],
  "count": 15
}
```

**Supported formats:** `.jpg`, `.jpeg`, `.png`, `.bmp`, `.webp`

**Errors:**

| Status | Description |
|--------|-------------|
| 404 | Folder not found |

---

### `GET /api/data/sample/list`

List bundled sample images from `data/sample_images/`.

**Response:**

```json
{
  "images": [
    {
      "image_id": "nyc_times_square_01.jpg",
      "path": "/absolute/path/to/data/sample_images/nyc_times_square_01.jpg",
      "filename": "nyc_times_square_01.jpg"
    }
  ],
  "count": 20
}
```

---

### `GET /api/data/sample/image/{filename}`

Serve a sample image file.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `filename` | string | Image filename from the sample list |

**Response:** JPEG image file (`Content-Type: image/jpeg`).

**Errors:**

| Status | Description |
|--------|-------------|
| 404 | Image not found |

---

## Inference

### `POST /api/inference/run`

Start an asynchronous inference job.

**Request Body:**

```json
{
  "model": {
    "model_id": "nvidia/segformer-b2-finetuned-cityscapes-1024-1024",
    "model_type": "segmentation",
    "name": "SegFormer B2 Cityscapes",
    "description": ""
  },
  "data_source": {
    "source_type": "folder",
    "folder_path": "__sample_images__",
    "bbox": null,
    "limit": 20
  },
  "classes": {
    "classes": ["vegetation", "road", "building", "sidewalk", "sky"],
    "source": "prompt"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `model` | ModelInfo | Model to use (see Models section) |
| `data_source` | DataSourceConfig | Where to get images |
| `data_source.source_type` | string | `"folder"`, `"mapillary"`, or `"url"` |
| `data_source.folder_path` | string | Path to folder, or `"__sample_images__"` for samples |
| `data_source.bbox` | float[4] | Bounding box for Mapillary source |
| `data_source.limit` | integer | Max images to process |
| `classes` | ClassConfig | Target classes for analysis |
| `classes.classes` | string[] | List of class names |
| `classes.source` | string | `"prompt"` or `"csv"` |

**Response:**

```json
{
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "queued",
  "total_images": 20,
  "processed": 0,
  "results": []
}
```

The job runs in the background. Poll `/inference/results/{job_id}` for progress.

---

### `GET /api/inference/status/{job_id}`

Check job progress without fetching results.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `job_id` | string | UUID returned by `/inference/run` |

**Response:**

```json
{
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "running",
  "total_images": 20,
  "processed": 12,
  "results": []
}
```

| Status | Description |
|--------|-------------|
| `queued` | Job accepted, waiting to start |
| `running` | Inference in progress |
| `completed` | All images processed |
| `failed` | An error occurred |

---

### `GET /api/inference/results/{job_id}`

Get job results including all processed images.

**Response (segmentation):**

```json
{
  "job_id": "a1b2c3d4-...",
  "status": "completed",
  "total_images": 20,
  "processed": 20,
  "results": [
    {
      "image_id": "nyc_times_square_01.jpg",
      "image_url": "/api/data/sample/image/nyc_times_square_01.jpg",
      "latitude": 40.758,
      "longitude": -73.9855,
      "class_ratios": {
        "road": 0.32,
        "building": 0.25,
        "vegetation": 0.18,
        "sky": 0.15,
        "sidewalk": 0.10
      }
    }
  ]
}
```

**Response (detection):**

```json
{
  "job_id": "a1b2c3d4-...",
  "status": "completed",
  "total_images": 20,
  "processed": 20,
  "results": [
    {
      "image_id": "chicago_lincoln_park_01.jpg",
      "image_url": "/api/data/sample/image/chicago_lincoln_park_01.jpg",
      "latitude": 41.925,
      "longitude": -87.645,
      "detections": [
        {
          "class": "car",
          "confidence": 0.92,
          "bbox": [120, 340, 280, 420]
        }
      ],
      "object_counts": {
        "car": 5,
        "truck": 1,
        "bicycle": 2
      }
    }
  ]
}
```

**Errors:**

| Status | Description |
|--------|-------------|
| 404 | Job ID not found |

---

### `GET /api/inference/overlay/{image_id}`

Get the segmentation overlay PNG for a processed image.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `image_id` | string | Image ID from inference results |

**Response:** PNG image file (`Content-Type: image/png`) — a color-coded segmentation mask using the Cityscapes palette.

**Errors:**

| Status | Description |
|--------|-------------|
| 404 | Overlay not found (image not yet processed or detection-only) |

---

### `GET /api/inference/results/{job_id}/geojson`

Export inference results as a GeoJSON FeatureCollection.

**Response:**

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-73.9855, 40.758]
      },
      "properties": {
        "image_id": "nyc_times_square_01.jpg",
        "image_url": "/api/data/sample/image/nyc_times_square_01.jpg",
        "analysis_type": "segmentation",
        "class_ratios": {
          "road": 0.32,
          "building": 0.25,
          "vegetation": 0.18
        }
      }
    }
  ],
  "metadata": {
    "job_id": "a1b2c3d4-...",
    "status": "completed",
    "total_images": 20,
    "processed": 20
  }
}
```

This format is directly consumable by Curio's map and chart nodes.

---

### `GET /api/inference/latest`

Get the status of the most recent inference job.

**Response:**

```json
{
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "completed",
  "total_images": 20,
  "processed": 20
}
```

If no jobs have been run:

```json
{
  "job_id": null,
  "status": "idle",
  "total_images": 0,
  "processed": 0
}
```

---

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "detail": "Description of what went wrong"
}
```

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 404 | Resource not found (model, job, image, folder) |
| 500 | Internal server error (model loading failure, API error) |
