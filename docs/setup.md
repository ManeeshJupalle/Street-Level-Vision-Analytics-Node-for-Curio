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
| Google Maps API key | — | Required for Street View data — must have **Street View Static API** and **Street View Metadata API** enabled |

### Optional API Tokens

| Token | Purpose | Required? |
|-------|---------|-----------|
| HuggingFace | Access private or gated models | No — public models work without it |

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/ManeeshJupalle/Street-Level-Vision-Analytics-Node-for-Curio.git
cd Street-Level-Vision-Analytics-Node-for-Curio
```

---

## Step 2: Backend Setup

### Create a Virtual Environment

Create the venv at the **repository root** (not inside a subfolder):

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
- **httpx / aiohttp** — async HTTP for Google Street View + Nominatim APIs
- **pydantic-settings + python-dotenv** — configuration management

### Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your Google Maps API key (required for real Street View data):

```env
GOOGLE_MAPS_API_KEY=AIza...your_key_here
HUGGINGFACE_TOKEN=hf_your_token_here
```

> **Note:** There is no "demo mode" fallback for imagery anymore. If `GOOGLE_MAPS_API_KEY` is not set, the Street View endpoints return HTTP 400. You can still use the **Folder** data source (local images) without any API key.

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
  "demo_mode": false,
  "has_google_api_key": true,
  "has_huggingface_token": false
}
```

`demo_mode` is simply `not has_google_api_key` — it will be `true` only if the Google Maps API key is missing.

---

## Step 3: Frontend Setup

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:5173`. It connects to the backend at `http://localhost:8000/api` (the exact base is resolved at runtime by `frontend/src/utils/apiBase.ts`, which handles both standalone Vite and webpack/Curio embedding contexts).

---

## Step 4: Google Maps API Key

To fetch real street-level images by geographic bounding box or by place name:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create (or select) a project
2. Under **APIs & Services → Library**, enable both:
   - **Street View Static API**
   - **Street View Publish API / Metadata API** (the metadata endpoint is used for free coverage checks)
3. Under **APIs & Services → Credentials**, create an **API key**
4. (Recommended) Restrict the key to the two APIs above
5. Add it to your `.env`:
   ```env
   GOOGLE_MAPS_API_KEY=AIza...your_key_here
   ```
6. Restart the backend — the health endpoint will show `"has_google_api_key": true` and `"demo_mode": false`

---

## Step 5: HuggingFace Token (Optional)

Only needed if you want to access private or gated models:

1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create a new token with `read` access
3. Add it to your `.env`:
   ```env
   HUGGINGFACE_TOKEN=hf_your_token_here
   ```

Public models (like `nvidia/segformer-b2-finetuned-cityscapes-1024-1024`) work without a token.

---

## Quick-Start Demo Flow

Once the backend and frontend are running:

1. **Select a model** — pick a segmentation or detection model from the list (e.g., SegFormer B2 Cityscapes).
2. **Search a place** — in the Data Source panel, type a place name (e.g. *"Lincoln Park Chicago"*), pick a result from the dropdown, then click **Check Coverage** to see how many Street View panos are available in that bounding box.
3. **Pick target classes** — use the chip selector or paste a CSV.
4. **Run Analysis** — watch results stream in as each image is processed.

(There are no bundled sample images. If you want to run against local photos, use the **Folder** data source and point it at any directory of `.jpg/.png/.webp` files.)

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

Then open `http://localhost:3000` and drag the **Street Vision** node and the **CV Analysis** node from the palette — connect the Street Vision JSON output to the CV Analysis JSON input.

---

## Troubleshooting

### Backend won't start

- **`ModuleNotFoundError`** — Make sure your virtual environment is activated and dependencies are installed
- **Port 8000 in use** — Use `uvicorn backend.main:app --reload --port 8001` and update the frontend API base accordingly

### Frontend can't connect to backend

- Verify the backend is running at `http://localhost:8000`
- Check the browser console for CORS errors — the backend enables CORS for all origins by default

### Model loading is slow

- First-time model downloads from HuggingFace can take several minutes depending on model size
- Models are cached locally in `model_cache/` after the first download

### Street View endpoints return 400

- Check that your `.env` file exists in the project root (not in `backend/`)
- Verify the key starts with `AIza` and that **Street View Static API** + **Street View Metadata API** are enabled in Google Cloud Console
- Restart the backend after changing `.env`

### torch installation issues

- On macOS with Apple Silicon, install the CPU-only version: `pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu`
- On systems without a GPU, the CPU version is sufficient for inference
