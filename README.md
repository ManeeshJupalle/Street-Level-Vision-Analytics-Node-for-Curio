# Street-Level Vision Analytics Node for Curio

A configurable computer vision node for [Curio](https://github.com/urban-toolkit/curio), an urban visual analytics platform. This node enables urban planners and city analysts to access street-level computer vision capabilities — selecting models, data sources, and target classes through an interactive interface — without writing code.

**CS 524: Big Data Visual Analytics — Group 13**

---

## Overview

Curio provides powerful top-down urban analytics, but lacks the ability to analyze what's happening at street level. Street-level imagery exists at scale (Mapillary: 2B+ images globally), and pre-trained CV models are freely available (HuggingFace: 100K+ models) — but there is no way for a non-technical analyst to configure, run, and explore CV results within an interactive visual analytics workflow.

This project introduces a **configurable CV node** that bridges that gap. The node operates within Curio's dataflow architecture and exposes three user-driven parameters:

1. **Model** — Select any CV model from HuggingFace (segmentation, detection, classification)
2. **Data source** — Point to a local image folder, sample images, or an API endpoint (e.g., Mapillary)
3. **Target classes** — Specify what to detect via text prompt or CSV upload

Results are displayed in an interactive gallery with filtering, inspection, error flagging, and spatial aggregation — then flow downstream to Curio's existing visualization nodes.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Curio Dataflow Platform                     │
│                                                             │
│  ┌──────────┐    ┌──────────────────────┐    ┌───────────┐ │
│  │ Upstream  │───▶│  Configurable CV Node │───▶│Downstream │ │
│  │   Node    │    │                      │    │   Node    │ │
│  └──────────┘    │  ┌──────────────────┐ │    └───────────┘ │
│                  │  │  Config Panel     │ │                  │
│                  │  │  • Model selector │ │   ┌────────────┐│
│                  │  │  • Data source    │ │   │ HuggingFace││
│                  │  │  • Target classes │ │◀──│ Models API  ││
│                  │  └──────────────────┘ │   └────────────┘│
│                  │  ┌────────┐ ┌───────┐ │   ┌────────────┐│
│                  │  │Infer-  │▶│Gallery│ │   │ Data Source ││
│                  │  │ence    │ │       │ │◀──│ Mapillary / ││
│                  │  └────────┘ └───────┘ │   │ Folder     ││
│                  │  ┌──────────────────┐ │   └────────────┘│
│                  │  │ Spatial Join     │ │                  │
│                  │  └──────────────────┘ │                  │
│                  └──────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Features

- **Model selection** — Browse and select HuggingFace models by task type (segmentation, detection, classification) with live search and download counts
- **Flexible data sources** — Fetch street-level imagery from Mapillary API, load from a local folder, or use bundled sample images for instant demo
- **Real CV inference** — Runs actual SegFormer semantic segmentation on CPU with per-pixel class predictions and colored overlay generation
- **Configurable target classes** — Specify classes via text prompt with suggestion chips (Cityscapes preset) or CSV upload
- **Results gallery** — Browse CV outputs in a responsive image grid with color-coded metric badges (green/amber/red)
- **Image inspector** — Full-size view with source photo, real segmentation overlay (composited from backend), side-by-side comparison, and per-class breakdown bar chart
- **Compound filtering** — Filter results by any attribute with configurable operators (e.g., "vegetation > 30%")
- **Error flagging** — Flag incorrect CV outputs for exclusion from aggregation
- **Spatial aggregation** — Attach per-image CV results to block-level geometry via GeoPandas spatial join
- **Demo mode** — Fully functional without API keys using simulated data, with a prominent banner indicating mock data is in use

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python, FastAPI, Uvicorn |
| CV inference | HuggingFace Transformers, SegFormer, Ultralytics YOLOv8 |
| Image data | Mapillary API v4, picsum.photos (sample images) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Spatial ops | GeoPandas, Shapely |
| Data format | GeoJSON, JSON, CSV |

---

## Project Structure

```
street-vision-node/
├── backend/              # FastAPI server + CV inference
│   ├── main.py           # App entry point with CORS
│   ├── config.py         # Environment config (pydantic-settings)
│   ├── routers/          # API endpoints (health, models, data, inference)
│   ├── services/         # Business logic (HF, Mapillary, inference, spatial, cache)
│   ├── models/           # Pydantic schemas
│   └── utils/            # Image and geo helpers
├── frontend/             # React + TypeScript UI (Vite)
│   └── src/
│       ├── components/   # ConfigPanel, Gallery, common components
│       ├── hooks/        # Custom React hooks (useModels, useInference, etc.)
│       ├── services/     # Axios API client
│       └── types/        # TypeScript interfaces
├── scripts/              # Utility scripts (download sample images)
├── data/                 # Sample images + class definitions
│   ├── sample_images/    # 15 pre-downloaded street-level images
│   ├── chicago_bbox.json # Chicago Lincoln Park bounding box
│   └── class_definitions/# Cityscapes 19-class, street furniture CSVs
├── evaluation/           # Case studies + task inventory
├── docs/                 # Documentation
└── report/               # IEEE VGTC paper + figures
```

---

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- (Optional) Mapillary API v4 access token ([get one here](https://www.mapillary.com/developer))
- (Optional) HuggingFace token for private models — public models work without one

### Backend

```bash
cd street-vision-node
python -m venv .venv
.venv/Scripts/activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
cp .env.example .env          # Add API keys if you have them
uvicorn backend.main:app --reload --port 8000
```

API docs available at `http://127.0.0.1:8000/docs`

### Frontend

```bash
cd street-vision-node/frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Download Sample Images

```bash
python scripts/download_samples.py
```

This downloads 15 street-level images to `data/sample_images/` for running real inference without a Mapillary token.

---

## Quick Demo

1. Start both servers (backend on port 8000, frontend on port 5173)
2. In the frontend, search for `segformer` and select a model (e.g., `nvidia/segformer-b2-finetuned-cityscapes-1024-1024`)
3. Select **Sample Images** as the data source
4. Click class chips: `vegetation`, `road`, `building`, `sidewalk`, `sky`
5. Click **Run Analysis** — watch the progress bar fill as real SegFormer inference runs
6. Browse results in the gallery — click any card to open the inspector with real segmentation overlay

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check + demo mode status |
| `/api/models/search` | GET | Search HuggingFace models by task and query |
| `/api/models/{id}/info` | GET | Get model metadata |
| `/api/models/load` | POST | Load a model into memory |
| `/api/data/mapillary/fetch` | POST | Fetch images in bounding box |
| `/api/data/mapillary/coverage` | POST | Check image count in bbox |
| `/api/data/folder/load` | POST | Load images from local folder |
| `/api/data/sample/list` | GET | List bundled sample images |
| `/api/data/sample/image/{name}` | GET | Serve a sample image |
| `/api/inference/run` | POST | Start inference job (async) |
| `/api/inference/status/{id}` | GET | Check job progress |
| `/api/inference/results/{id}` | GET | Get job results |
| `/api/inference/overlay/{id}` | GET | Get segmentation overlay PNG |

---

## Case Studies

### Chicago Greenery Assessment
- **Model:** SegFormer (semantic segmentation)
- **Data:** Mapillary API / sample images — Chicago Lincoln Park bounding box
- **Classes:** vegetation, sidewalk, road, building, sky
- **Output:** Per-image greenery percentage, per-block spatial aggregation

### Street Furniture Audit
- **Model:** YOLOv8 (object detection)
- **Data:** Mapillary API — same area
- **Classes:** bench, streetlight, ramp, sign
- **Output:** Furniture counts per block

### Vehicle Counting
- **Model:** YOLOv8 (object detection)
- **Data:** Local camera folder
- **Classes:** car, truck, motorcycle, bicycle
- **Output:** Vehicle counts over time

---

## Evaluation

Our evaluation focuses on **what new analytical tasks the node enables**, not CV model accuracy:

1. **Task inventory** — 5–7 specific tasks newly enabled by the node
2. **Case study walkthrough** — End-to-end Chicago greenery analysis
3. **Configuration generality** — Same node reconfigured for vehicle counting
4. **Pipeline performance** — Latency benchmarks at 500 / 1K / 2K images

---

## Team

- **L. Sravya Rachakonda**
- **Laxmi Sai Maneesh Reddy Jupalle**

CS 524: Big Data Visual Analytics — Spring 2026

---

## License

This project is developed for academic purposes as part of CS 524 at the University of Illinois Chicago.
