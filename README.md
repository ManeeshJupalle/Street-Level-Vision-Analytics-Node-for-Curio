# Street Vision Node

A configurable computer vision node for urban street-level image analysis, built for CS 524 Big Data Visual Analytics.

## Overview

Street Vision Node provides a FastAPI backend that lets you:

- **Search and load** CV models from Hugging Face (segmentation, detection, classification)
- **Fetch street-level imagery** from Mapillary or local folders
- **Run batch inference** with progress tracking
- **Aggregate results spatially** to grid cells for visualization

## Setup

1. **Create virtual environment**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # or .venv\Scripts\activate on Windows
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API tokens
   ```

4. **Run the server**:
   ```bash
   cd street-vision-node
   uvicorn backend.main:app --reload
   ```

5. **Open API docs**: Visit `http://127.0.0.1:8000/docs`

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/models/search` | GET | Search HuggingFace models |
| `/api/models/{id}/info` | GET | Get model info |
| `/api/models/load` | POST | Load a model |
| `/api/data/mapillary/fetch` | POST | Fetch images in bounding box |
| `/api/data/folder/load` | POST | Load images from local folder |
| `/api/inference/run` | POST | Start inference job |
| `/api/inference/status/{id}` | GET | Check job progress |
| `/api/inference/results/{id}` | GET | Get job results |

## Project Structure

```
street-vision-node/
├── backend/          # FastAPI application
│   ├── routers/      # API route handlers
│   ├── services/     # Business logic (HF, Mapillary, inference)
│   ├── models/       # Pydantic schemas
│   └── utils/        # Image and geo utilities
├── data/             # Sample data and class definitions
├── evaluation/       # Case studies and results
├── docs/             # Documentation
└── report/           # Final report and figures
```
