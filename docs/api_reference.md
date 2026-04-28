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
  "demo_mode": false,
  "has_google_api_key": true,
  "has_huggingface_token": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Always `"healthy"` if the server is running |
| `version` | string | API version |
| `demo_mode` | boolean | `true` iff no Google Maps API key is configured (equals `not has_google_api_key`) |
| `has_google_api_key` | boolean | Whether `GOOGLE_MAPS_API_KEY` is set |
| `has_huggingface_token` | boolean | Whether `HUGGINGFACE_TOKEN` is set |

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

### `POST /api/data/streetview/fetch`

Fetch Google Street View panorama metadata within a geographic bounding box. Requires `GOOGLE_MAPS_API_KEY`.

**Request Body:**

```json
{
  "bbox": [-87.66, 41.91, -87.62, 41.94],
  "limit": 20
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bbox` | float[4] | Yes | Bounding box: `[west, south, east, north]` |
| `limit` | integer | No | Max panoramas to return (default: 100) |

**Response:**

```json
{
  "images": [
    {
      "pano_id": "CAoSLEFGMVFpcE1...",
      "latitude": 41.925,
      "longitude": -87.645,
      "date": "2023-06",
      "image_url": "https://maps.googleapis.com/maps/api/streetview?size=640x640&pano=...&key=..."
    }
  ],
  "count": 20
}
```

**Errors:**

| Status | Description |
|--------|-------------|
| 400 | `GOOGLE_MAPS_API_KEY` not configured |
| 500 | Upstream Google API error |

---

### `POST /api/data/streetview/coverage`

Estimate how many Street View panoramas are available in a bounding box without consuming image quota (uses the Metadata API only).

**Request Body:** Same as `/data/streetview/fetch`.

**Response:**

```json
{
  "bbox": [-87.66, 41.91, -87.62, 41.94],
  "estimated_count": 150
}
```

**Errors:**

| Status | Description |
|--------|-------------|
| 400 | `GOOGLE_MAPS_API_KEY` not configured |

---

### `GET /api/data/streetview/search_place`

Geocode a free-text place name via Nominatim (OpenStreetMap) and return a bounding box suitable for feeding into the coverage / fetch endpoints.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Place name, e.g. `"Lincoln Park Chicago"` |

**Example:**

```
GET /api/data/streetview/search_place?query=Lincoln%20Park%20Chicago
```

**Response:**

```json
{
  "name": "Lincoln Park, Chicago, Cook County, Illinois, United States",
  "bbox": [-87.6601, 41.9100, -87.6200, 41.9400],
  "lat": 41.9254,
  "lon": -87.6386
}
```

**Errors:**

| Status | Description |
|--------|-------------|
| 404 | Place not found |

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

## Basemap

These endpoints back the Chicago **Map View** Vega-Lite template in Curio. The basemap covers all 98 community areas; the enrichment endpoint joins inference results onto it server-side so the Map View can color and label the matched polygons via a Vega-Lite `lookup` transform.

### `GET /api/data/basemap/chicago_neighborhoods.geojson`

Serve the bundled Chicago neighborhoods GeoJSON used as the base layer for the Map View template. Each feature is augmented in-memory (cached on first hit) with `centroid_lon` / `centroid_lat` in `properties` so the label layer can position neighborhood names without depending on Vega's brittle `geoCentroid` expression.

**Response:** `application/geo+json` `FeatureCollection`. Each feature looks like:

```json
{
  "type": "Feature",
  "geometry": { "type": "Polygon", "coordinates": [[[-87.65, 41.93], ...]] },
  "properties": {
    "name": "Lincoln Park",
    "centroid_lon": -87.64823,
    "centroid_lat": 41.92421
  }
}
```

**Headers:** `Cache-Control: public, max-age=86400`

**Errors:**

| Status | Description |
|--------|-------------|
| 404 | Basemap file missing on the backend |

---

### `POST /api/data/basemap/enrich_with_neighborhoods`

Tag each input point with the Chicago neighborhood polygon it falls inside, and return per-neighborhood aggregates (modal dominant class, mean dominance %, image count, top-3 class frequencies). Used by the CV Analysis node's `pushDownstream` so a Vega-Lite `lookup` transform can color the basemap polygons and the per-image points by the same dominant-class field.

The point-in-polygon join is backed by a lazily-built [shapely `STRtree`](https://shapely.readthedocs.io/en/stable/strtree.html), which makes the lookup `O(log n)` per point — even at 50 points × 98 polygons the join finishes in well under 50 ms.

**Request Body:**

```json
{
  "points": [
    {
      "latitude": 41.925,
      "longitude": -87.645,
      "image_id": "CAoSLEFGMVFpcE1...",
      "dominant_class": "vegetation",
      "dominant_pct": 38.4
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `points` | array | Yes | Per-image records produced by CV Analysis |
| `points[].latitude` | float | No | WGS84 latitude — points without coordinates skip the join |
| `points[].longitude` | float | No | WGS84 longitude |
| `points[].image_id` | string | No | Pass-through identifier |
| `points[].dominant_class` | string | No | Cityscapes class with the highest pixel ratio for this image |
| `points[].dominant_pct` | float | No | Pixel ratio (%) for `dominant_class` |

**Response:**

```json
{
  "points": [
    {
      "latitude": 41.925,
      "longitude": -87.645,
      "image_id": "CAoSLEFGMVFpcE1...",
      "dominant_class": "vegetation",
      "dominant_pct": 38.4,
      "neighborhood_name": "Lincoln Park",
      "nbhd_dominant_class": "vegetation",
      "nbhd_dominant_pct": 35.7,
      "nbhd_image_count": 12
    }
  ],
  "aggregates": [
    {
      "neighborhood_name": "Lincoln Park",
      "image_count": 12,
      "dominant_class": "vegetation",
      "dominant_pct": 35.7,
      "top3": [
        { "class": "vegetation", "count": 7 },
        { "class": "building", "count": 3 },
        { "class": "road", "count": 2 }
      ]
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `points` | array | Same length and order as the input. Each point is augmented with `neighborhood_name` (or `null` if outside Chicago) and the `nbhd_*` aggregate fields for its containing neighborhood (or `null` when the point is unmatched). |
| `aggregates` | array | One record per neighborhood that contains at least one matched point with a non-empty `dominant_class`. |
| `aggregates[].image_count` | integer | Number of points that fall inside the neighborhood. |
| `aggregates[].dominant_class` | string | Modal `dominant_class` across the neighborhood's points. |
| `aggregates[].dominant_pct` | float | Mean `dominant_pct` across the points whose `dominant_class` matches the modal class. |
| `aggregates[].top3` | array | Top three classes by count within the neighborhood. |

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
    "source_type": "google_streetview",
    "folder_path": null,
    "bbox": [-87.66, 41.91, -87.62, 41.94],
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
| `data_source.source_type` | string | `"folder"` or `"google_streetview"` |
| `data_source.folder_path` | string | Path to folder (required when `source_type == "folder"`) |
| `data_source.bbox` | float[4] | Bounding box for `google_streetview` source: `[west, south, east, north]` |
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
      "image_id": "CAoSLEFGMVFpcE1...",
      "image_url": "https://maps.googleapis.com/maps/api/streetview?...",
      "latitude": 41.925,
      "longitude": -87.645,
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
      "image_id": "CAoSLEFGMVFpcE1...",
      "image_url": "https://maps.googleapis.com/maps/api/streetview?...",
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
        "coordinates": [-87.645, 41.925]
      },
      "properties": {
        "image_id": "CAoSLEFGMVFpcE1...",
        "image_url": "https://maps.googleapis.com/maps/api/streetview?...",
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

### `GET /api/inference/results/{job_id}/dataframe`

Return results in a flat, column-oriented format ready for Vega-Lite consumption (used by the CV_ANALYSIS Curio node for in-canvas charts).

**Response:**

```json
{
  "columns": {
    "image_id": ["CAoSLEFG...", "CAoSLEFH..."],
    "latitude": [41.925, 41.926],
    "longitude": [-87.645, -87.644],
    "analysis_type": ["segmentation", "segmentation"],
    "building": [0.25, 0.22],
    "road": [0.32, 0.30],
    "vegetation": [0.18, 0.21]
  },
  "rows": [
    {
      "image_id": "CAoSLEFG...",
      "latitude": 41.925,
      "longitude": -87.645,
      "analysis_type": "segmentation",
      "building": 0.25,
      "road": 0.32,
      "vegetation": 0.18
    }
  ],
  "total": 2,
  "class_keys": ["building", "road", "vegetation"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `columns` | object | Column-oriented arrays — each key maps to a list of per-image values |
| `rows` | array | Row-oriented records (Vega-Lite `values` format) |
| `total` | integer | Number of rows / images |
| `class_keys` | string[] | Sorted list of class/detection keys that appear as columns |

**Errors:**

| Status | Description |
|--------|-------------|
| 404 | Job ID not found |

---

### `GET /api/inference/results/{job_id}/curio_export`

Write a Curio-native compressed `.data` file (zlib-compressed JSON wrapping a column-oriented GeoDataFrame) into Curio's shared data directory and return a reference the CV_ANALYSIS node can feed directly to downstream Map / Table nodes.

**Response:**

```json
{
  "path": "1713450000_1a2b3c4d5e6f7890abcd1234.data",
  "dataType": "geodataframe",
  "filename": "1713450000_1a2b3c4d5e6f7890abcd1234.data",
  "feature_count": 20
}
```

| Field | Type | Description |
|-------|------|-------------|
| `path` | string | Filename (Curio resolves this against its shared data directory) |
| `dataType` | string | Always `"geodataframe"` |
| `filename` | string | Same as `path`, convenience duplicate |
| `feature_count` | integer | Number of features written |

**Errors:**

| Status | Description |
|--------|-------------|
| 404 | Job ID not found |

---

### `GET /api/inference/latest`

Get the status of the most recent inference job. Used by the STREET_VISION Curio node for progress polling.

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
| 400 | Missing required configuration (e.g., `GOOGLE_MAPS_API_KEY`) |
| 404 | Resource not found (model, job, image, folder, place) |
| 500 | Internal server error (model loading failure, upstream API error) |
