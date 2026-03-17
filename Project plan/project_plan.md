# Street-Level Vision Analytics Node for Curio — Implementation Plan

## Project Overview

A configurable CV node for Curio that lets urban analysts:
1. Select a model (HuggingFace)
2. Choose a data source (folder or API like Mapillary)
3. Specify target classes (text prompt or CSV)
4. View results in a gallery (inspect, filter, flag)
5. Export enriched data to downstream Curio nodes

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend server | Python, FastAPI, Uvicorn |
| CV inference | HuggingFace Transformers, SegFormer, YOLOv8 (ultralytics) |
| Image data API | Mapillary API v4 (REST, OAuth token) |
| Frontend (Curio node) | React, TypeScript, React Flow (Curio's dataflow framework) |
| Gallery UI | React components (grid, overlay viewer, filter bar) |
| Spatial operations | GeoPandas, Shapely (spatial join) |
| Data format | GeoJSON for geometry, JSON/CSV for enriched attributes |
| Package management | pip (backend), npm (frontend) |
| Version control | Git + GitHub |

---

## Repository Structure

```
street-vision-node/
├── README.md
├── .gitignore
├── requirements.txt
├── package.json
│
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── config.py                  # Environment variables, API keys
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── inference.py           # POST /inference — run model on images
│   │   ├── models.py              # GET /models — list/search HuggingFace models
│   │   ├── data_sources.py        # GET/POST /data — fetch from Mapillary or folder
│   │   └── health.py              # GET /health — server status
│   ├── services/
│   │   ├── __init__.py
│   │   ├── huggingface_service.py # HuggingFace model search, download, load
│   │   ├── mapillary_service.py   # Mapillary API v4 integration
│   │   ├── inference_service.py   # Model inference (segmentation + detection)
│   │   ├── spatial_service.py     # Spatial join: attach CV results to geometry
│   │   └── cache_service.py       # Cache images and inference results
│   ├── models/
│   │   ├── __init__.py
│   │   ├── schemas.py             # Pydantic models for request/response
│   │   └── enums.py               # Enums for model types, data source types
│   └── utils/
│       ├── __init__.py
│       ├── image_utils.py         # Image loading, resizing, format conversion
│       └── geo_utils.py           # Bounding box, coordinate transforms
│
├── frontend/
│   ├── src/
│   │   ├── nodes/
│   │   │   ├── StreetVisionNode.tsx       # Main Curio node component
│   │   │   ├── StreetVisionNode.types.ts  # TypeScript interfaces
│   │   │   └── index.ts                   # Node registration
│   │   ├── components/
│   │   │   ├── ConfigPanel/
│   │   │   │   ├── ConfigPanel.tsx         # Main config panel
│   │   │   │   ├── ModelSelector.tsx       # HuggingFace model picker
│   │   │   │   ├── DataSourceSelector.tsx  # Folder / API toggle + config
│   │   │   │   ├── ClassSelector.tsx       # Text prompt / CSV upload
│   │   │   │   └── RunButton.tsx           # Execute analysis
│   │   │   ├── Gallery/
│   │   │   │   ├── Gallery.tsx             # Image grid with results
│   │   │   │   ├── GalleryItem.tsx         # Single image card
│   │   │   │   ├── ImageInspector.tsx      # Full-size view with overlay
│   │   │   │   ├── FilterBar.tsx           # Filter chips + add filter
│   │   │   │   ├── ClassBreakdown.tsx      # Per-image class percentages
│   │   │   │   └── FlagButton.tsx          # Flag errors on CV output
│   │   │   ├── Comparison/
│   │   │   │   └── ComparisonView.tsx      # Side-by-side neighborhood compare
│   │   │   └── common/
│   │   │       ├── LoadingSpinner.tsx
│   │   │       ├── ProgressBar.tsx
│   │   │       └── Badge.tsx
│   │   ├── hooks/
│   │   │   ├── useInference.ts            # API calls to backend
│   │   │   ├── useModels.ts               # HuggingFace model search
│   │   │   ├── useDataSource.ts           # Mapillary / folder data fetching
│   │   │   └── useFilters.ts              # Gallery filter state
│   │   ├── services/
│   │   │   └── api.ts                     # Axios/fetch wrapper for backend
│   │   └── types/
│   │       └── index.ts                   # Shared TypeScript types
│   └── public/
│
├── evaluation/
│   ├── case_studies/
│   │   ├── chicago_greenery/
│   │   │   ├── config.json                # Node configuration for this case
│   │   │   ├── results/                   # Output data, screenshots
│   │   │   └── analysis.md               # Findings writeup
│   │   └── vehicle_counting/
│   │       ├── config.json
│   │       ├── results/
│   │       └── analysis.md
│   ├── task_inventory.md                  # Before/after task analysis
│   ├── performance_benchmarks/
│   │   ├── benchmark.py                   # Latency tests at 500/1K/2K images
│   │   └── results.json
│   └── screenshots/                       # UI screenshots for report
│
├── data/
│   ├── sample_images/                     # Small sample for testing/demo
│   ├── chicago_bbox.json                  # Bounding box for case study area
│   └── class_definitions/
│       ├── cityscapes_19.csv              # Example class CSV
│       └── street_furniture.csv           # Example class CSV
│
├── docs/
│   ├── setup.md                           # How to install and run
│   ├── architecture.md                    # System architecture docs
│   └── api_reference.md                   # Backend API documentation
│
└── report/
    ├── ieee_vgtc_template/                # LaTeX template
    └── figures/                           # Figures for the report
```

---

## Implementation Phases

---

### PHASE 1: Foundation & Backend Core
**Goal:** Working FastAPI server that can load a model and run inference on a single image.

#### Batch 1.1: Project Setup
- [ ] Create GitHub repository
- [ ] Initialize project structure (directories as above)
- [ ] Create `.gitignore` (Python, Node, IDE files)
- [ ] Create `requirements.txt`:
  ```
  fastapi==0.109.0
  uvicorn==0.27.0
  python-multipart==0.0.6
  transformers==4.37.0
  torch==2.1.2
  torchvision==0.16.2
  ultralytics==8.1.0
  Pillow==10.2.0
  requests==2.31.0
  geopandas==0.14.2
  shapely==2.0.2
  numpy==1.26.3
  pydantic==2.5.3
  python-dotenv==1.0.0
  aiohttp==3.9.1
  aiofiles==23.2.1
  huggingface-hub==0.20.3
  ```
- [ ] Create `backend/config.py`:
  ```python
  from pydantic_settings import BaseSettings
  
  class Settings(BaseSettings):
      MAPILLARY_ACCESS_TOKEN: str = ""
      HUGGINGFACE_TOKEN: str = ""
      CACHE_DIR: str = "./cache"
      MAX_BATCH_SIZE: int = 32
      MODEL_CACHE_DIR: str = "./model_cache"
      
      class Config:
          env_file = ".env"
  
  settings = Settings()
  ```
- [ ] Create `.env.example` with placeholder keys
- [ ] Initial commit

#### Batch 1.2: FastAPI Server Skeleton
- [ ] `backend/main.py` — FastAPI app with CORS, lifespan, routers
  ```python
  from fastapi import FastAPI
  from fastapi.middleware.cors import CORSMiddleware
  from backend.routers import inference, models, data_sources, health
  
  app = FastAPI(title="Street Vision API", version="0.1.0")
  
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_methods=["*"],
      allow_headers=["*"],
  )
  
  app.include_router(health.router, prefix="/api", tags=["health"])
  app.include_router(models.router, prefix="/api", tags=["models"])
  app.include_router(data_sources.router, prefix="/api", tags=["data"])
  app.include_router(inference.router, prefix="/api", tags=["inference"])
  ```
- [ ] `backend/routers/health.py` — simple health check endpoint
- [ ] `backend/models/schemas.py` — Pydantic models:
  ```python
  from pydantic import BaseModel
  from typing import Optional, List
  from enum import Enum
  
  class ModelType(str, Enum):
      SEGMENTATION = "segmentation"
      DETECTION = "detection"
      CLASSIFICATION = "classification"
  
  class DataSourceType(str, Enum):
      FOLDER = "folder"
      MAPILLARY = "mapillary"
      URL = "url"
  
  class ModelInfo(BaseModel):
      model_id: str            # e.g. "nvidia/segformer-b2-finetuned-cityscapes-1024-1024"
      model_type: ModelType
      name: str
      description: Optional[str] = None
  
  class DataSourceConfig(BaseModel):
      source_type: DataSourceType
      folder_path: Optional[str] = None
      api_endpoint: Optional[str] = None
      bbox: Optional[List[float]] = None  # [west, south, east, north]
      limit: Optional[int] = 100
  
  class ClassConfig(BaseModel):
      classes: List[str]                   # ["vegetation", "sidewalk", "road"]
      source: str = "prompt"               # "prompt" or "csv"
  
  class InferenceRequest(BaseModel):
      model: ModelInfo
      data_source: DataSourceConfig
      classes: ClassConfig
  
  class SegmentationResult(BaseModel):
      image_id: str
      image_url: str
      latitude: Optional[float] = None
      longitude: Optional[float] = None
      class_ratios: dict                   # {"vegetation": 0.324, "sidewalk": 0.181, ...}
  
  class DetectionResult(BaseModel):
      image_id: str
      image_url: str
      latitude: Optional[float] = None
      longitude: Optional[float] = None
      detections: List[dict]               # [{"class": "bench", "confidence": 0.92, "bbox": [...]}]
      object_counts: dict                  # {"bench": 3, "streetlight": 7}
  
  class InferenceResponse(BaseModel):
      job_id: str
      status: str                          # "running", "completed", "failed"
      total_images: int
      processed: int
      results: List[dict] = []
  ```
- [ ] Verify server starts: `uvicorn backend.main:app --reload`
- [ ] Commit: "Add FastAPI skeleton with schemas"

#### Batch 1.3: HuggingFace Model Service
- [ ] `backend/services/huggingface_service.py`:
  - `search_models(task: str, query: str)` — search HuggingFace Hub by task type
    - Use `huggingface_hub.HfApi().list_models(filter=task, search=query, limit=20)`
    - Filter to models with task = "image-segmentation" or "object-detection"
    - Return list of `ModelInfo` objects
  - `load_model(model_id: str, model_type: ModelType)` — download and cache model
    - For segmentation: `AutoModelForSemanticSegmentation` + `AutoImageProcessor`
    - For detection: use `ultralytics.YOLO` or `AutoModelForObjectDetection`
    - Cache loaded models in memory dict for reuse
  - `get_model_info(model_id: str)` — get model card metadata
- [ ] `backend/routers/models.py`:
  - `GET /api/models/search?task=segmentation&query=cityscapes` → list of models
  - `GET /api/models/{model_id}/info` → model details
  - `POST /api/models/load` → preload a model into memory
- [ ] Test: search for segmentation models, load SegFormer
- [ ] Commit: "Add HuggingFace model search and loading"

#### Batch 1.4: Inference Service
- [ ] `backend/services/inference_service.py`:
  - `run_segmentation(model, processor, image, classes)`:
    - Load image with PIL
    - Preprocess with the model's processor
    - Run forward pass
    - Post-process: argmax on logits → class map
    - Compute pixel ratios for each requested class
    - Return `SegmentationResult`
  - `run_detection(model, image, classes)`:
    - Run YOLO inference
    - Filter detections to requested classes
    - Count objects per class
    - Return `DetectionResult`
  - `run_batch_inference(model_info, images, classes)`:
    - Process images in batches of `MAX_BATCH_SIZE`
    - Yield results progressively
    - Track progress (processed/total)
- [ ] `backend/routers/inference.py`:
  - `POST /api/inference/run` — accepts `InferenceRequest`, returns job_id
  - `GET /api/inference/status/{job_id}` — poll for progress + results
  - `GET /api/inference/results/{job_id}` — get all results
- [ ] Test: run SegFormer on a single Mapillary image, verify class ratios
- [ ] Test: run YOLOv8 on a single image, verify detections
- [ ] Commit: "Add inference service for segmentation and detection"

---

### PHASE 2: Data Source Integration
**Goal:** Working Mapillary API integration and folder-based loading.

#### Batch 2.1: Mapillary API Service
- [ ] Get Mapillary API v4 access token (free, Meta-owned)
- [ ] `backend/services/mapillary_service.py`:
  - `fetch_images_in_bbox(bbox, limit, start_date, end_date)`:
    - API endpoint: `https://graph.mapillary.com/images`
    - Query params: `bbox=west,south,east,north`, `fields=id,geometry,captured_at,compass_angle,thumb_2048_url`
    - Handle pagination (cursor-based)
    - Return list of image metadata dicts with GPS, timestamp, image URL
  - `download_image(image_id, resolution)`:
    - Fetch image bytes from `thumb_2048_url` or `thumb_1024_url`
    - Cache locally to avoid re-downloading
    - Return PIL Image
  - `get_coverage_density(bbox)`:
    - Count available images in area
    - Return count + sample positions for map preview
- [ ] `backend/routers/data_sources.py`:
  - `POST /api/data/mapillary/fetch` — bbox + filters → image metadata list
  - `GET /api/data/mapillary/image/{image_id}` — download single image
  - `POST /api/data/mapillary/coverage` — bbox → coverage count
- [ ] Store Chicago bounding box in `data/chicago_bbox.json`:
  ```json
  {
    "name": "Chicago - Lincoln Park area",
    "bbox": [-87.66, 41.91, -87.62, 41.94],
    "description": "Dense coverage area for case study"
  }
  ```
- [ ] Test: fetch 50 images from Chicago bbox, verify GPS + URLs
- [ ] Download 20 sample images to `data/sample_images/` for offline testing
- [ ] Commit: "Add Mapillary API v4 integration"

#### Batch 2.2: Folder Data Source
- [ ] Add folder loading to `backend/services/`:
  - `load_images_from_folder(folder_path, extensions=['.jpg', '.png'])`:
    - Scan directory for image files
    - Extract GPS from EXIF if available
    - Return same metadata format as Mapillary service
  - `load_images_from_urls(url_list)`:
    - Download images from a list of URLs
    - Return metadata list
- [ ] Update `backend/routers/data_sources.py`:
  - `POST /api/data/folder/load` — folder path → image metadata list
  - `POST /api/data/urls/load` — URL list → image metadata list
- [ ] Test: load sample images from folder
- [ ] Commit: "Add folder and URL data source support"

#### Batch 2.3: Cache Service
- [ ] `backend/services/cache_service.py`:
  - File-based cache in `./cache/` directory
  - `cache_image(image_id, image_bytes)` — save to disk
  - `get_cached_image(image_id)` — return from disk if exists
  - `cache_results(job_id, results)` — save inference results as JSON
  - `get_cached_results(job_id)` — return results if exists
  - `clear_cache(older_than_days)` — cleanup old cache
- [ ] Integrate cache into Mapillary service (check cache before downloading)
- [ ] Integrate cache into inference service (check cache before re-running)
- [ ] Commit: "Add caching layer for images and results"

---

### PHASE 3: End-to-End Pipeline
**Goal:** One command runs the full pipeline: fetch images → run inference → get structured results.

#### Batch 3.1: Pipeline Orchestrator
- [ ] `backend/services/pipeline_service.py`:
  - `run_pipeline(inference_request: InferenceRequest)`:
    1. Validate configuration (model exists, data source accessible, classes valid)
    2. Load/download model via HuggingFace service
    3. Fetch images via data source service (Mapillary or folder)
    4. Run batch inference
    5. Aggregate results (per-image → per-block if geometry provided)
    6. Return complete results with metadata
  - Progress tracking via job_id (store in memory dict)
  - Error handling at each stage with meaningful messages
- [ ] Update `POST /api/inference/run` to use pipeline orchestrator
- [ ] Test full pipeline: Mapillary → SegFormer → structured JSON results
- [ ] Test full pipeline: folder → YOLOv8 → structured JSON results
- [ ] Commit: "Add end-to-end pipeline orchestrator"

#### Batch 3.2: Spatial Join Service
- [ ] `backend/services/spatial_service.py`:
  - `aggregate_to_blocks(results, geometry_geojson)`:
    - Input: list of per-image results (each with lat/lon) + block geometry
    - For each block polygon:
      - Find all images whose GPS falls within the block
      - Average the class ratios across images in that block
      - Sum the object counts across images in that block
    - Return GeoJSON with enriched properties
  - `create_block_grid(bbox, cell_size_meters=100)`:
    - Generate a regular grid of square cells over the bounding box
    - Return as GeoJSON FeatureCollection
    - Used when no upstream geometry is provided
- [ ] `backend/routers/inference.py`:
  - `POST /api/inference/aggregate` — results + geometry → enriched GeoJSON
- [ ] Test: aggregate Chicago results to a 100m grid
- [ ] Commit: "Add spatial join and block-level aggregation"

#### Batch 3.3: Pipeline Testing & Validation
- [ ] Write integration test: full Chicago greenery pipeline
  - Config: SegFormer, Mapillary (Chicago bbox), classes = vegetation, sidewalk, road, building
  - Fetch 100 images
  - Run inference
  - Aggregate to 100m grid
  - Verify: output GeoJSON has blocks with greenery_pct, sidewalk_pct, etc.
- [ ] Write integration test: folder + YOLO pipeline
  - Config: YOLOv8, local sample folder, classes = car, truck, person
  - Run inference
  - Verify: output has per-image object counts
- [ ] Performance baseline: time the pipeline at 50, 100, 200 images
- [ ] Commit: "Add integration tests and performance baseline"

---

### PHASE 4: Frontend — Curio Node & Configuration Panel
**Goal:** Working React components for the node UI inside Curio.

#### Batch 4.1: Curio Setup & Node Registration
- [ ] Clone Curio repo, study existing node architecture
- [ ] Understand Curio's node registry pattern (how existing nodes are registered)
- [ ] Create `frontend/src/nodes/StreetVisionNode.tsx`:
  - Register as new node type in Curio's React Flow graph
  - Receives upstream geometry (bbox or feature collection)
  - Has input port (geometry) and output port (enriched data)
  - Renders the ConfigPanel when selected
- [ ] Create `frontend/src/nodes/index.ts` — node registration export
- [ ] Verify: node appears in Curio's node palette and can be placed on canvas
- [ ] Commit: "Register StreetVisionNode in Curio"

**FALLBACK (if Curio node API is too complex):**
- [ ] Create standalone React app (`npx create-react-app street-vision --template typescript`)
- [ ] Add React Flow for visual dataflow
- [ ] Create a simplified 3-node canvas: Data Source → Street Vision → Results
- [ ] This gives the same interaction design demo without Curio dependency

#### Batch 4.2: Configuration Panel — Model Selector
- [ ] `frontend/src/components/ConfigPanel/ModelSelector.tsx`:
  - Search input that queries `GET /api/models/search`
  - Dropdown showing model name, type (segmentation/detection), downloads count
  - Filter tabs: Segmentation | Detection | Classification
  - Selected model displayed as a card with model name + type badge
  - Loading state while searching
- [ ] `frontend/src/hooks/useModels.ts`:
  - `searchModels(task, query)` — debounced API call
  - `loadModel(modelId)` — trigger model preloading
  - State: `models`, `selectedModel`, `loading`, `error`
- [ ] Test: search "segformer", select a model, see it displayed
- [ ] Commit: "Add HuggingFace model selector component"

#### Batch 4.3: Configuration Panel — Data Source Selector
- [ ] `frontend/src/components/ConfigPanel/DataSourceSelector.tsx`:
  - Toggle: API Endpoint | Local Folder
  - **API mode:**
    - Dropdown: Mapillary (pre-configured), Custom URL
    - For Mapillary: bbox input (or "use upstream geometry" checkbox)
    - Date range filter (optional)
    - Image limit slider (50-2000)
    - Coverage preview button → shows count of available images
  - **Folder mode:**
    - Folder path text input
    - File count display after validation
  - Validation: show green check when source is accessible
- [ ] `frontend/src/hooks/useDataSource.ts`:
  - `fetchCoverage(bbox)` — check how many images available
  - `validateFolder(path)` — check folder exists and has images
  - State: `sourceType`, `config`, `coverage`, `valid`
- [ ] Test: configure Mapillary with Chicago bbox, see coverage count
- [ ] Commit: "Add data source selector component"

#### Batch 4.4: Configuration Panel — Class Selector
- [ ] `frontend/src/components/ConfigPanel/ClassSelector.tsx`:
  - Toggle: Text Prompt | Upload CSV
  - **Prompt mode:**
    - Text area for comma-separated class names
    - Suggestion chips based on selected model (e.g., Cityscapes classes for SegFormer)
    - Tag-style display of entered classes
  - **CSV mode:**
    - File upload button
    - Preview of parsed classes from CSV
    - Column selector if CSV has multiple columns
  - Class count badge
- [ ] Test: type classes, see tags appear; upload CSV, see parsed classes
- [ ] Commit: "Add class selector component"

#### Batch 4.5: Configuration Panel — Assembly & Run
- [ ] `frontend/src/components/ConfigPanel/ConfigPanel.tsx`:
  - Combines ModelSelector + DataSourceSelector + ClassSelector
  - Step indicator (1. Model → 2. Data → 3. Classes → Run)
  - Validation: all three must be configured before Run is enabled
  - "Run Analysis" button → calls `POST /api/inference/run`
  - Progress bar showing inference status (polls `/api/inference/status/{job_id}`)
- [ ] `frontend/src/components/ConfigPanel/RunButton.tsx`:
  - Disabled until config is complete
  - Shows spinner while running
  - Shows progress: "Processing 45/200 images..."
  - Shows completion with result count
- [ ] Test: configure all three params, hit Run, see progress, get results
- [ ] Commit: "Assemble config panel with run button and progress"

---

### PHASE 5: Frontend — Results Gallery
**Goal:** Interactive gallery to browse, filter, and inspect CV results.

#### Batch 5.1: Gallery Grid
- [ ] `frontend/src/components/Gallery/Gallery.tsx`:
  - Grid of image cards (responsive: 2-4 columns)
  - Each card shows: thumbnail + overlay badge (e.g., "veg: 42%")
  - Lazy loading for large result sets
  - Sort by: class ratio, object count, confidence, location
  - Total results count header
- [ ] `frontend/src/components/Gallery/GalleryItem.tsx`:
  - Thumbnail image
  - Badge with primary metric (configurable per analysis type)
  - Color coding: green (high veg), red (low veg), etc.
  - Click handler to open inspector
  - Flag icon in corner
- [ ] Test: display 50 results in grid with badges
- [ ] Commit: "Add gallery grid component"

#### Batch 5.2: Image Inspector
- [ ] `frontend/src/components/Gallery/ImageInspector.tsx`:
  - Full-size view panel (modal or split panel)
  - Tab or toggle: Source Photo | CV Overlay | Side-by-Side
  - **Source Photo:** original Mapillary image
  - **CV Overlay:** 
    - For segmentation: semi-transparent colored overlay per class
    - For detection: bounding boxes with class labels + confidence
  - **Side-by-Side:** source left, overlay right
  - Metadata display: GPS, timestamp, compass angle, camera type
- [ ] `frontend/src/components/Gallery/ClassBreakdown.tsx`:
  - Horizontal bar chart showing per-class percentages
  - Color-coded by class
  - Shows raw pixel counts + percentages
- [ ] `frontend/src/components/Gallery/FlagButton.tsx`:
  - Toggle button to flag an image as "incorrect CV output"
  - Flagged images get a visual indicator in gallery
  - Flagged images excluded from aggregation (optional toggle)
- [ ] Test: click image in gallery → see full inspector with overlay + breakdown
- [ ] Commit: "Add image inspector with overlay and class breakdown"

#### Batch 5.3: Filter Bar
- [ ] `frontend/src/components/Gallery/FilterBar.tsx`:
  - Filter chips showing active filters (e.g., "vegetation > 30%")
  - "+ Add filter" button → opens filter builder
  - Filter builder:
    - Select attribute (any class ratio or object count)
    - Select operator (>, <, =, >=, <=)
    - Enter value
  - Compound filters with AND logic
  - Clear all button
  - Result count updates in real-time as filters are applied
- [ ] `frontend/src/hooks/useFilters.ts`:
  - State: `filters[]`, `filteredResults[]`
  - `addFilter(attribute, operator, value)`
  - `removeFilter(index)`
  - `clearFilters()`
  - Memoized filtering computation
- [ ] Test: add filter "vegetation < 15%", see gallery update; add second filter "bench_count = 0", see compound filtering
- [ ] Commit: "Add filter bar with compound filter support"

---

### PHASE 6: Integration & Polish
**Goal:** Everything works together end-to-end.

#### Batch 6.1: Curio Integration (Downstream Data Flow)
- [ ] StreetVisionNode output port emits enriched GeoJSON
- [ ] Downstream Curio nodes can consume the data:
  - Map visualization node → shows heatmap from enriched data
  - Chart node → bar charts of class distributions
  - Table node → tabular view of block-level data
- [ ] Linked brushing: selecting a block on the map highlights it in the gallery
- [ ] Test: wire StreetVisionNode → Map node, see greenery heatmap
- [ ] Commit: "Wire downstream data flow in Curio"

**FALLBACK (standalone app):**
- [ ] Results panel shows both gallery and a simple map (Leaflet/Mapbox)
- [ ] Map renders enriched blocks with color coding
- [ ] Click block on map → highlights corresponding images in gallery
- [ ] Export button → download enriched GeoJSON

#### Batch 6.2: Comparison View
- [ ] `frontend/src/components/Comparison/ComparisonView.tsx`:
  - Select two areas/configurations to compare
  - Side-by-side aggregated metrics
  - Bar chart comparison for each class
  - "Area A has 35% avg greenery vs Area B with 12%"
- [ ] Accessible from gallery via "Compare" button
- [ ] Commit: "Add neighborhood comparison view"

#### Batch 6.3: UI Polish & Error Handling
- [ ] Loading states for all async operations
- [ ] Error messages for: model not found, API timeout, no images in area, etc.
- [ ] Empty states: "No results match your filters"
- [ ] Responsive layout testing
- [ ] Keyboard navigation in gallery
- [ ] Commit: "Polish UI, add error handling and empty states"

---

### PHASE 7: Evaluation & Case Studies
**Goal:** Evidence that the design works and enables new tasks.

#### Batch 7.1: Chicago Greenery Case Study
- [ ] Configuration:
  - Model: nvidia/segformer-b2-finetuned-cityscapes-1024-1024
  - Data: Mapillary API, Chicago Lincoln Park bbox
  - Classes: vegetation, sidewalk, road, building, sky
- [ ] Run pipeline on 500+ images
- [ ] Aggregate to block-level grid
- [ ] Document workflow: every click, every configuration step
- [ ] Take screenshots of each step for report
- [ ] Findings:
  - Which blocks have lowest greenery?
  - Correlation between greenery and sidewalk condition?
  - Any blocks with zero street furniture?
- [ ] Save all outputs to `evaluation/case_studies/chicago_greenery/`
- [ ] Commit: "Complete Chicago greenery case study"

#### Batch 7.2: Configuration Generality — Vehicle Counting
- [ ] Configuration:
  - Model: YOLOv8 (ultralytics/yolov8n)
  - Data: Same Mapillary images OR local folder
  - Classes: car, truck, bicycle, motorcycle
- [ ] Run pipeline, verify different outputs
- [ ] Document that the SAME node UI produced different analysis
- [ ] Save outputs to `evaluation/case_studies/vehicle_counting/`
- [ ] Commit: "Complete vehicle counting case study (generality proof)"

#### Batch 7.3: Task Inventory
- [ ] Create `evaluation/task_inventory.md`:
  - List 5-7 specific analytical tasks the node enables
  - For each task:
    - Task description
    - Who benefits (user role)
    - Before (how was this done without the node)
    - After (how the node enables it)
    - Time comparison (estimated)
  - Example tasks:
    1. Compare greenery across two neighborhoods
    2. Identify blocks with zero street furniture
    3. Verify CV classification against source image
    4. Find areas with poor sidewalk coverage
    5. Audit ADA compliance (ramp presence)
    6. Track seasonal changes in vegetation
    7. Correlate street-level attributes with census data
- [ ] Commit: "Complete task inventory evaluation"

#### Batch 7.4: Performance Benchmarks
- [ ] `evaluation/performance_benchmarks/benchmark.py`:
  - Test pipeline latency at: 100, 500, 1000, 2000 images
  - Measure: fetch time, inference time, aggregation time, total time
  - Measure: time to first visible result in gallery
  - Record GPU vs CPU performance
- [ ] Generate performance table + chart
- [ ] Commit: "Complete performance benchmarks"

---

### PHASE 8: Documentation & Final Deliverables
**Goal:** GitHub page, report, final presentation.

#### Batch 8.1: GitHub Project Page
- [ ] `README.md`:
  - Project title + one-paragraph description
  - Architecture diagram (embed image)
  - Key screenshots (config panel, gallery, inspector, comparison)
  - Setup instructions (step-by-step)
  - How to run the backend
  - How to run the frontend
  - How to reproduce case studies
  - Dataset access instructions (Mapillary API token)
  - Project structure overview
- [ ] `docs/setup.md` — detailed installation guide
- [ ] `docs/architecture.md` — system design docs
- [ ] `docs/api_reference.md` — all backend endpoints
- [ ] Add short demo GIF or video walkthrough
- [ ] Pin dependencies in requirements.txt and package-lock.json
- [ ] Commit: "Complete GitHub project documentation"

#### Batch 8.2: IEEE VGTC 4-Page Report
- [ ] Use LaTeX template from course
- [ ] Sections:
  1. Abstract (150-200 words)
  2. Introduction (problem + motivation + contributions)
  3. Related Work (~20 sources)
  4. Data & Tasks
  5. System Design (architecture + interactions)
  6. Evaluation (case studies + task inventory + performance)
  7. Discussion (lessons, limitations, tradeoffs)
  8. Conclusion & Future Work
- [ ] Figures:
  - System architecture diagram
  - Configuration panel screenshot
  - Gallery + inspector screenshot
  - Chicago greenery heatmap
  - Configuration generality comparison
  - Performance benchmark chart
- [ ] Submit as PDF

#### Batch 8.3: Final Presentation (M3)
- [ ] Update M2 slides with real screenshots and results
- [ ] Add live demo section
- [ ] Add evaluation results slides
- [ ] Add discussion + future work slide
- [ ] Rehearse to stay under 10 minutes
- [ ] Prepare for Q&A

---

## Batch Execution Summary

| Batch | Description | Estimated Time |
|-------|------------|----------------|
| 1.1 | Project setup | 1 hour |
| 1.2 | FastAPI skeleton | 2 hours |
| 1.3 | HuggingFace service | 3 hours |
| 1.4 | Inference service | 4 hours |
| 2.1 | Mapillary API | 3 hours |
| 2.2 | Folder data source | 1 hour |
| 2.3 | Cache service | 1 hour |
| 3.1 | Pipeline orchestrator | 3 hours |
| 3.2 | Spatial join | 2 hours |
| 3.3 | Pipeline testing | 2 hours |
| 4.1 | Curio node / standalone setup | 3 hours |
| 4.2 | Model selector UI | 3 hours |
| 4.3 | Data source selector UI | 2 hours |
| 4.4 | Class selector UI | 2 hours |
| 4.5 | Config panel assembly | 2 hours |
| 5.1 | Gallery grid | 3 hours |
| 5.2 | Image inspector | 3 hours |
| 5.3 | Filter bar | 2 hours |
| 6.1 | Curio/standalone integration | 3 hours |
| 6.2 | Comparison view | 2 hours |
| 6.3 | UI polish | 2 hours |
| 7.1 | Chicago case study | 3 hours |
| 7.2 | Vehicle counting case study | 2 hours |
| 7.3 | Task inventory | 2 hours |
| 7.4 | Performance benchmarks | 2 hours |
| 8.1 | GitHub docs | 3 hours |
| 8.2 | IEEE report | 6 hours |
| 8.3 | Final presentation | 3 hours |
| **TOTAL** | | **~65 hours** |

---

## Priority Order for Claude Code Sessions

**Session 1:** Batches 1.1 → 1.2 → 1.3 → 1.4 (Foundation + working inference)
**Session 2:** Batches 2.1 → 2.2 → 2.3 (Data sources working)
**Session 3:** Batches 3.1 → 3.2 → 3.3 (Full pipeline end-to-end)
**Session 4:** Batches 4.1 → 4.2 → 4.3 → 4.4 → 4.5 (Config panel complete)
**Session 5:** Batches 5.1 → 5.2 → 5.3 (Gallery complete)
**Session 6:** Batches 6.1 → 6.2 → 6.3 (Integration + polish)
**Session 7:** Batches 7.1 → 7.2 → 7.3 → 7.4 (All evaluation)
**Session 8:** Batches 8.1 → 8.2 → 8.3 (Final deliverables)
