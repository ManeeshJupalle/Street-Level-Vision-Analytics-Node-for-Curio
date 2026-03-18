# System Architecture

The Street-Level Vision Analytics Node uses a **3-layer architecture** that separates the Curio platform integration, the standalone user interface, and the backend inference engine.

---

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Curio Node (curio-integration/)                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ streetVisionLifecycle.tsx                              │  │
│  │ • Compact control panel inside Curio canvas            │  │
│  │ • "Configure & Run" opens standalone frontend          │  │
│  │ • "Fetch Results" pushes GeoJSON to downstream nodes   │  │
│  └───────────────┬───────────────────────────┬───────────┘  │
│                  │                           │               │
│                  ▼                           ▼               │
│  ┌───────────────────────┐   ┌──────────────────────────┐   │
│  │ Layer 2: Frontend     │   │ GeoJSON Output            │   │
│  │ (frontend/)           │   │ → Map / Chart / Table     │   │
│  │ React + TypeScript    │   │   nodes in Curio          │   │
│  └───────────┬───────────┘   └──────────────────────────┘   │
│              │ HTTP (Axios)                                   │
│              ▼                                                │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Layer 3: Backend API (backend/)                        │   │
│  │ FastAPI + Python                                       │   │
│  │ ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌────────┐ │   │
│  │ │ Models   │ │ Data      │ │ Inference  │ │ Spatial│ │   │
│  │ │ Router   │ │ Router    │ │ Router     │ │Service │ │   │
│  │ └────┬─────┘ └─────┬─────┘ └─────┬──────┘ └────────┘ │   │
│  │      │             │             │                     │   │
│  │      ▼             ▼             ▼                     │   │
│  │ HuggingFace   Mapillary    SegFormer / YOLOv8          │   │
│  │ Hub API       API v4       (torch inference)            │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Curio Node

**Directory:** `curio-integration/`

The Curio integration layer registers the Street Vision node as a first-class citizen in the Curio dataflow platform.

### Components

| File | Purpose |
|------|---------|
| `streetVisionLifecycle.tsx` | React lifecycle hook rendered inside the Curio canvas. Provides a compact control panel with backend status, a button to open the standalone frontend, job progress tracking, and a "Fetch Results as GeoJSON" action. |

### How It Works

1. The node appears in Curio's palette under the "Computation" category with a `faStreetView` icon
2. When placed on the canvas, the lifecycle hook renders a minimal control panel
3. Clicking "Configure & Run Analysis" opens the standalone frontend (`localhost:5173`) in a new window
4. The lifecycle hook polls `GET /api/inference/latest` to track job progress
5. When results are ready, "Fetch Results as GeoJSON" calls `GET /api/inference/results/{job_id}/geojson` and pushes the FeatureCollection to downstream nodes via `data.outputCallback()`

### Output Ports

- **GEODATAFRAME** — GeoJSON FeatureCollection with Point geometries and CV result properties
- **JSON** — Raw inference results as JSON

---

## Layer 2: Standalone Frontend

**Directory:** `frontend/`

The React frontend provides the full interactive experience for configuring analysis and exploring results.

### Component Hierarchy

```
App
├── ConfigPanel (sidebar, 380px)
│   ├── ModelSelector        — Task pills, HF search, model list
│   ├── DataSourceSelector   — Sample / Mapillary / Folder modes
│   ├── ClassSelector        — Class chips, text input, CSV
│   └── RunButton            — Execute analysis, progress bar
└── Gallery (main area)
    ├── FilterBar            — Compound attribute filters
    ├── GalleryItem[]        — Responsive image grid (2–4 columns)
    └── ImageInspector       — Full-size modal (3 tabs)
        ├── Source photo
        ├── CV overlay
        ├── Side-by-side comparison
        └── ClassBreakdown   — Horizontal bar chart
```

### Custom Hooks

| Hook | Responsibility |
|------|---------------|
| `useModels` | Search HuggingFace models, manage loading state |
| `useInference` | Start jobs, poll status every 2s, accumulate results |
| `useDataSource` | Check Mapillary coverage in a bounding box |
| `useFilters` | Apply compound filter rules (attribute + operator + value) |

### State Flow

1. User selections in `ConfigPanel` are lifted to `App` state
2. `RunButton` triggers `useInference.startJob()` with the current config
3. The hook polls `GET /api/inference/results/{job_id}` and appends new results to state
4. `Gallery` re-renders with each new result (streaming UX)
5. `FilterBar` applies client-side filters via `useFilters`

---

## Layer 3: Backend API

**Directory:** `backend/`

The FastAPI backend handles model management, data fetching, CV inference, and spatial processing.

### Module Structure

```
backend/
├── main.py              # FastAPI app, CORS middleware, router registration
├── config.py            # Settings via pydantic-settings (.env file)
├── routers/
│   ├── health.py        # GET /api/health
│   ├── models.py        # Model search, info, loading
│   ├── data_sources.py  # Mapillary, folder, sample image endpoints
│   └── inference.py     # Job management, results, overlay, GeoJSON
├── services/
│   ├── huggingface_service.py  # HfApi integration, model caching
│   ├── inference_service.py    # Batch inference (SegFormer + YOLO)
│   ├── mapillary_service.py    # Async Mapillary API client
│   ├── spatial_service.py      # Grid creation, spatial joins
│   └── cache_service.py        # JSON + image file caching
├── models/
│   └── schemas.py       # Pydantic models (request/response types)
└── utils/
    ├── geo_utils.py     # Haversine distance, bbox helpers
    └── image_utils.py   # Image loading, listing, resizing
```

### Services

#### HuggingFace Service

- **search_models(task, query)** — Queries the HuggingFace Hub API, returns models sorted by downloads
- **get_model_info(model_id)** — Fetches metadata (pipeline_tag, likes, downloads, tags)
- **load_model(model_id, type)** — Downloads and caches the model locally
  - Segmentation: `AutoImageProcessor` + `AutoModelForSemanticSegmentation`
  - Detection: `YOLO` from ultralytics
  - Classification: `AutoImageProcessor` + `AutoModelForImageClassification`

#### Inference Service

The core engine that processes images through CV models:

1. Loads the cached model
2. For each image in the batch:
   - **Segmentation:** Preprocesses → runs SegFormer → upsamples logits → generates colored overlay PNG → computes per-class pixel ratios
   - **Detection:** Runs YOLO.predict() → extracts bounding boxes with confidence → filters by target classes → counts objects
3. Yields results one-by-one as an async generator (enables streaming to the frontend)

**Demo mode fallback:** When no Mapillary token is configured, generates deterministic synthetic results with realistic value ranges, seeded by model ID for reproducibility.

#### Mapillary Service

- Async HTTP client using `aiohttp`
- Fetches image metadata within a geographic bounding box
- Downloads and caches images locally
- Falls back to demo data generation without a token

#### Spatial Service

- Creates rectangular grid cells over a bounding box (meters → degrees conversion)
- Performs spatial joins (`sjoin`) to associate image-level results with grid cells
- Enables block-level aggregation for downstream visualization

#### Cache Service

- Caches downloaded images and JSON metadata to disk
- Prevents redundant Mapillary API calls and model re-downloads

---

## Key Design Decisions

### Async Job Pattern

Inference runs as a background `asyncio` task. The frontend starts a job via `POST /inference/run`, receives a `job_id`, and polls for results. This avoids HTTP timeouts on large batches and enables real-time progress updates.

### Demo Mode

The entire system works without any API tokens. Demo mode generates synthetic but realistic data, allowing users to explore the full UI and workflow before configuring external services. A banner in the frontend clearly indicates when demo data is in use.

### Shared Color Palette

Both the backend (overlay generation) and frontend (UI chips, bar charts) use the same Cityscapes 19-class color mapping. This ensures visual consistency between segmentation overlays and the class breakdown charts.

### GeoJSON as Integration Format

Results are exported as standard GeoJSON FeatureCollections. This is the native format for Curio's map nodes and is widely supported by geospatial tools, making the output portable beyond Curio.

---

## Deployment Topology

```
                   Browser
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
   localhost:5173          localhost:3000
   (Vite dev server)      (Curio webpack)
         │                       │
         └───────────┬───────────┘
                     ▼
              localhost:8000
              (FastAPI / Uvicorn)
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
    HuggingFace   Mapillary   Local files
    Hub API       API v4      (sample_images/)
```

All three servers run locally during development. The backend is the single point of contact for external services.
