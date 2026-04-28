# System Architecture

The Street-Level Vision Analytics Node uses a **3-layer architecture** that separates the Curio platform integration, the standalone user interface, and the backend inference engine. Within the Curio layer, computation is split across **two nodes** so the workload spans a dataflow graph rather than a single monolith.

---

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Curio Nodes (curio/.../adapters/box/)             │
│  ┌─────────────────────┐     ┌──────────────────────────┐   │
│  │ STREET_VISION node  │ JSON│ CV_ANALYSIS node         │   │
│  │ streetVisionLife…   │────▶│ cvAnalysisLifecycle.tsx  │   │
│  │ • Data acquisition  │     │ • Results viz            │   │
│  │ • Runs inference    │     │ • Vega-Lite charts       │   │
│  │ • Output: JSON      │     │ • Output: GeoDataFrame / │   │
│  └──────────┬──────────┘     │   DataFrame              │   │
│             │                 └────────────┬─────────────┘   │
│             ▼                              ▼                  │
│  ┌───────────────────────┐     ┌──────────────────────┐      │
│  │ Layer 2: Frontend     │     │ Map / Chart / Table  │      │
│  │ (frontend/)           │     │ nodes in Curio       │      │
│  │ React + TypeScript    │     └──────────────────────┘      │
│  └───────────┬───────────┘                                    │
│              │ HTTP (Axios, resolved via apiBase.ts)          │
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
│  │ HuggingFace   Google Street  SegFormer / YOLOv8        │   │
│  │ Hub API       View +         (torch inference)         │   │
│  │               Nominatim                                  │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Curio Nodes

**Directory:** `curio/utk_curio/frontend/urban-workflows/src/`

The Curio integration layer registers **two** first-class nodes. Splitting data acquisition from results analysis satisfies the requirement that computation spans a dataflow graph rather than one monolith — each node is independently wireable to other Curio boxes.

### Components

| File | Purpose |
|------|---------|
| `adapters/box/streetVisionLifecycle.tsx` | Lifecycle hook for the **STREET_VISION** node. Renders a compact control panel with backend status, a button to open the standalone frontend, job progress tracking (polls `/api/inference/latest`), and a "Fetch Results" action that emits JSON downstream. |
| `adapters/box/cvAnalysisLifecycle.tsx` | Lifecycle hook for the **CV_ANALYSIS** node. Consumes JSON from the STREET_VISION node, fetches the dataframe / curio-export from the backend, and emits a `geodataframe` (or `dataframe`) for downstream visualization nodes. |
| `registry/descriptors.ts` (lines 466–515) | Descriptors that register both nodes with the Curio palette, declaring their input/output port types. |

### Dataflow Between the Two Nodes

```
[ STREET_VISION ] --JSON--> [ CV_ANALYSIS ] --GEODATAFRAME--> [ Map / Chart / Table ]
```

1. **STREET_VISION** runs under the "Computation" category with a `faStreetView` icon. Its lifecycle hook opens the standalone frontend (`localhost:5173`) for configuration, polls `GET /api/inference/latest` for progress, and emits the job handle as JSON.
2. **CV_ANALYSIS** receives that JSON, calls `GET /api/inference/results/{job_id}/dataframe` (for Vega-Lite charts) or `GET /api/inference/results/{job_id}/curio_export` (for a compressed `.data` file that downstream Map / Table nodes consume as a native GeoDataFrame).

### Output Ports

- **STREET_VISION** → JSON (job handle)
- **CV_ANALYSIS** → GEODATAFRAME (via `curio_export`) / DATAFRAME (via `dataframe` endpoint, for Vega-Lite)

### Built-in Vega-Lite Templates

`providers/templates.ts` registers two ready-to-use Vega-Lite specs that downstream Vega-Lite nodes can pick from a **Templates** dropdown without authoring grammar by hand:

| Template | What it shows |
|----------|---------------|
| Default stacked bar (auto-seeded by `vegaLifecycle.ts`) | Per-image class composition. Bars are sorted west → east via a `window: row_number` over longitude, the X axis uses integer image indices `1..N`, and the Y axis is fixed to `[0, 100]` so partial-coverage bars still anchor against the same baseline. |
| **Street Vision — Map View** | A multi-layer Mercator projection of Chicago. Layer 1 paints the full neighborhood basemap in neutral slate so the city footprint is always visible; Layer 1b labels matched neighborhoods using the centroids the backend injects into each feature (see Layer 3 / Basemap). Layer 2 overlays per-image points colored by `dominant_class`. Auto-fit projection so the entire city stays in view regardless of where the queried points fall. |

Both templates rely on the same `CITYSCAPES_CLASSES` / `CITYSCAPES_COLORS` palette as the backend overlay generator, so a "vegetation" pixel in a SegFormer overlay, a green segment in the bar chart, and a green polygon in the Map View all match.

---

## Layer 2: Standalone Frontend

**Directory:** `frontend/`

The React frontend provides the full interactive experience for configuring analysis and exploring results.

### Component Hierarchy

```
App
├── ConfigPanel (sidebar, 380px)
│   ├── ModelSelector        — Task pills, HF search, model list
│   ├── DataSourceSelector   — Google Street View / Folder modes
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
| `useDataSource` | Search a place via Nominatim and check Google Street View coverage in a bounding box |
| `useFilters` | Apply compound filter rules (attribute + operator + value) |

### Runtime API Base

`frontend/src/utils/apiBase.ts` resolves the backend URL at runtime so the same bundle works both as a Vite-served standalone app **and** when embedded inside a Curio webpack build.

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
│   ├── data_sources.py  # Google Street View, folder, place search, Chicago basemap, neighborhood enrichment
│   └── inference.py     # Job management, results, overlay, GeoJSON, dataframe, curio_export
├── services/
│   ├── huggingface_service.py        # HfApi integration, model caching
│   ├── inference_service.py          # Batch inference (SegFormer + YOLO)
│   ├── google_streetview_service.py  # Async Google Street View API client
│   ├── spatial_service.py            # Grid creation, spatial joins
│   └── cache_service.py              # JSON + image file caching
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

#### Google Street View Service

- Async HTTP client using `httpx` / `aiohttp`
- Queries the Google **Street View Metadata API** to discover panoramas in a bounding box (no image-fetch quota cost)
- Uses the **Street View Static API** to produce image URLs that the frontend/Curio nodes load directly — there is no server-side proxy endpoint for images
- If `GOOGLE_MAPS_API_KEY` is unset, both `/data/streetview/fetch` and `/data/streetview/coverage` return **HTTP 400**. There is no demo-mode fallback for imagery.

#### Place Search (Nominatim)

- The `GET /api/data/streetview/search_place` endpoint geocodes a free-text place name via the public **Nominatim (OpenStreetMap)** API
- Returns `{"name", "bbox": [w,s,e,n], "lat", "lon"}` — the `bbox` is then fed straight into `/data/streetview/coverage` or `/data/streetview/fetch`

#### Spatial Service

- Creates rectangular grid cells over a bounding box (meters → degrees conversion)
- Performs spatial joins (`sjoin`) to associate image-level results with grid cells
- Enables block-level aggregation for downstream visualization

#### Basemap & Neighborhood Enrichment (`routers/data_sources.py`)

Two endpoints back the Chicago Map View Vega-Lite template:

- **`GET /api/data/basemap/chicago_neighborhoods.geojson`** — serves the bundled 98-polygon basemap. On first hit the router walks every feature with `shapely.geometry.shape(...).centroid` and writes `centroid_lon` / `centroid_lat` into `properties`, then caches the augmented `FeatureCollection` in memory. The Map View's label layer reads those fields directly, sidestepping Vega's `geoCentroid` expression which behaves inconsistently across Vega-Lite versions.
- **`POST /api/data/basemap/enrich_with_neighborhoods`** — accepts a list of CV Analysis points and tags each one with the neighborhood polygon it falls inside, plus per-neighborhood roll-ups (modal class, mean dominance %, image count, top-3 frequencies). The point-in-polygon join is backed by a lazily-built `shapely.strtree.STRtree`, giving `O(log n)` candidate lookup so 50 points × 98 polygons resolves in well under 50 ms. Results are written back onto each point as `nbhd_dominant_class` / `nbhd_dominant_pct` / `nbhd_image_count` so a single Vega-Lite `lookup` (basemap.name → point.neighborhood_name) is enough to drive both polygon coloring and per-point tooltips.

#### Cache Service

- Caches JSON metadata and any locally-resolved images to disk
- Prevents redundant HuggingFace model re-downloads

---

## Key Design Decisions

### Two-Node Dataflow (Professor Feedback)

The Curio integration deliberately splits work across **STREET_VISION** (data acquisition + inference) and **CV_ANALYSIS** (results visualization). This spreads computation across the dataflow graph — each node can be rewired independently, and downstream consumers (Map / Chart / Table) see a clean typed boundary.

### Async Job Pattern

Inference runs as a background `asyncio` task. The frontend starts a job via `POST /inference/run`, receives a `job_id`, and polls for results. This avoids HTTP timeouts on large batches and enables real-time progress updates.

### Strict API-Key Requirement

Unlike the earlier prototype, the system no longer silently falls back to synthetic data when the imagery provider is unavailable. If the Google Maps API key is missing, Street View endpoints return `400` with a clear error, forcing the user to either configure the key or pick the **Folder** data source. This prevents accidentally reporting demo numbers as real.

### Shared Color Palette

Both the backend (overlay generation) and frontend (UI chips, bar charts) use the same Cityscapes 19-class color mapping. This ensures visual consistency between segmentation overlays and the class breakdown charts.

### Multiple Integration Formats

Results are available in three shapes, each suited to a different consumer:

- **GeoJSON FeatureCollection** (`/geojson`) — portable, works anywhere
- **Column-oriented DataFrame** (`/dataframe`) — Vega-Lite–ready for in-node charts
- **Curio-native `.data` file** (`/curio_export`) — zlib-compressed GeoDataFrame that Curio's Map / Table nodes load directly

### Server-side Spatial Enrichment

The CV Analysis node calls `/data/basemap/enrich_with_neighborhoods` before pushing data downstream so the heavy lifting (polygon-membership tests, per-neighborhood aggregation) happens once on the backend instead of being recomputed in every downstream Vega-Lite spec. Each point goes downstream pre-tagged with its neighborhood plus the aggregate fields, which means the Map View template only needs a `lookup` transform — no per-spec spatial logic — to color polygons by their dominant Cityscapes class.

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
         ┌───────────┼─────────────┬───────────────┐
         ▼           ▼             ▼               ▼
    HuggingFace   Google       Nominatim       Local files
    Hub API       Street View  (OSM geocoder)  (folder source)
                  (Static +
                   Metadata)
```

All servers run locally during development. The backend is the single point of contact for external services.
