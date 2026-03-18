# Setup Guide

Detailed installation and configuration instructions for the Street-Level Vision Analytics Node.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Python | 3.10+ | Required for backend |
| Node.js | 18+ | Required for frontend |
| pip | Latest | Comes with Python |
| npm | 9+ | Comes with Node.js |
| Git | Any | For cloning the repository |

### Optional API Tokens

| Token | Purpose | Required? |
|-------|---------|-----------|
| Mapillary API v4 | Real street-level image fetching | No — demo mode works without it |
| HuggingFace | Access private models | No — public models work without it |

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/ManeeshJupalle/Street-Level-Vision-Analytics-Node-for-Curio.git
cd Street-Level-Vision-Analytics-Node-for-Curio
```

---

## Step 2: Backend Setup

### Create a Virtual Environment

```bash
python -m venv .venv
```

Activate it:

```bash
# macOS / Linux
source .venv/bin/activate

# Windows (Command Prompt)
.venv\Scripts\activate

# Windows (PowerShell)
.venv\Scripts\Activate.ps1
```

### Install Python Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- **FastAPI + Uvicorn** — web server
- **transformers + torch** — HuggingFace model inference (SegFormer)
- **ultralytics** — YOLOv8 object detection
- **geopandas + shapely** — spatial processing
- **Pillow + numpy** — image processing
- **aiohttp** — async HTTP for Mapillary API
- **pydantic-settings + python-dotenv** — configuration management

### Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your tokens (both are optional):

```env
MAPILLARY_ACCESS_TOKEN=MLY|your_token_here
HUGGINGFACE_TOKEN=hf_your_token_here
```

### Start the Backend Server

```bash
uvicorn backend.main:app --reload --port 8000
```

Verify it's running:
- Health check: `http://127.0.0.1:8000/api/health`
- Swagger docs: `http://127.0.0.1:8000/docs`

You should see:

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "demo_mode": true,
  "has_mapillary_token": false,
  "has_huggingface_token": false
}
```

---

## Step 3: Frontend Setup

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:5173`. It connects to the backend at `http://localhost:8000/api`.

---

## Step 4: Download Sample Images (Optional)

To use the bundled sample image data source:

```bash
python scripts/download_samples.py
```

This downloads 20 real Mapillary street-level images to `data/sample_images/` from:
- New York City (Times Square, Central Park)
- Chicago (Lincoln Park)
- San Francisco
- Paris
- London

---

## Step 5: Mapillary API Token (Optional)

To fetch real street-level images by geographic bounding box:

1. Go to [mapillary.com](https://www.mapillary.com/) and create a free account
2. Navigate to [Developer settings](https://www.mapillary.com/developer)
3. Register a new application
4. Copy the **Client Token** (starts with `MLY|`)
5. Add it to your `.env`:
   ```env
   MAPILLARY_ACCESS_TOKEN=MLY|your_token_here
   ```
6. Restart the backend — the health endpoint will show `"demo_mode": false`

---

## Step 6: HuggingFace Token (Optional)

Only needed if you want to access private or gated models:

1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create a new token with `read` access
3. Add it to your `.env`:
   ```env
   HUGGINGFACE_TOKEN=hf_your_token_here
   ```

Public models (like `nvidia/segformer-b2-finetuned-cityscapes-1024-1024`) work without a token.

---

## Running with Curio

To integrate with the full Curio platform, you need four terminals:

### Terminal 1 — Curio Flask Backend (port 5002)

```bash
cd curio
python -c "from utk_curio.backend.app import create_app; app=create_app(); app.run(host='localhost', port=5002)"
```

### Terminal 2 — Street Vision Backend (port 8000)

```bash
cd Street-Level-Vision-Analytics-Node-for-Curio
source .venv/bin/activate
uvicorn backend.main:app --reload --port 8000
```

### Terminal 3 — Street Vision Frontend (port 5173)

```bash
cd Street-Level-Vision-Analytics-Node-for-Curio/frontend
npm run dev
```

### Terminal 4 — Curio Frontend (port 3000)

```bash
cd curio/utk_curio/frontend/urban-workflows
npx webpack serve --mode development --port 3000
```

Then open `http://localhost:3000` and drag the "Street Vision" node from the palette.

---

## Troubleshooting

### Backend won't start

- **`ModuleNotFoundError`** — Make sure your virtual environment is activated and dependencies are installed
- **Port 8000 in use** — Use `uvicorn backend.main:app --reload --port 8001` and update `frontend/src/services/api.ts` accordingly

### Frontend can't connect to backend

- Verify the backend is running at `http://localhost:8000`
- Check the browser console for CORS errors — the backend enables CORS for all origins by default

### Model loading is slow

- First-time model downloads from HuggingFace can take several minutes depending on model size
- Models are cached locally in `model_cache/` after the first download

### Demo mode is always active

- Check that your `.env` file exists in the project root (not in `backend/`)
- Verify the token format: `MAPILLARY_ACCESS_TOKEN=MLY|...`
- Restart the backend after changing `.env`

### torch installation issues

- On macOS with Apple Silicon, install the CPU-only version: `pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu`
- On systems without a GPU, the CPU version is sufficient for inference
