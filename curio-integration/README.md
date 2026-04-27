# Curio Integration

Files needed to register the **Street Vision** and **CV Analysis** nodes inside a [Curio](https://github.com/urban-toolkit/curio) instance.

## Files

| File | What it is |
|---|---|
| `streetVisionLifecycle.tsx` | Lifecycle hook for the Street Vision node — model search, place lookup, GSV inference, push payload to downstream nodes. Drop into `curio/utk_curio/frontend/urban-workflows/src/adapters/box/`. |
| `cvAnalysisLifecycle.tsx` | Lifecycle hook for the CV Analysis node — receives JSON payload from Street Vision, renders gallery + per-class stats, pushes a column-oriented geodataframe via `/curio_export`. Drop into the same `adapters/box/` folder. |
| `curio-fork.patch` | Unified diff against upstream Curio (`urban-toolkit/curio` @ `main`) covering every other change required for the two nodes to render and route data correctly: descriptor registrations, BoxType enum entries, adapter index exports, the Flask `/api/streetvision/*` proxy, the default Vega-Lite spec for the demo, and a one-line null-coalesce fix in `WidgetsEditor.tsx` so the play button doesn't crash when no grammar has been authored. |

## Apply

```bash
# 1. Clone Curio next to this repo
git clone https://github.com/urban-toolkit/curio.git
cd curio

# 2. Drop the two lifecycle files in
cp ../curio-integration/streetVisionLifecycle.tsx utk_curio/frontend/urban-workflows/src/adapters/box/
cp ../curio-integration/cvAnalysisLifecycle.tsx  utk_curio/frontend/urban-workflows/src/adapters/box/

# 3. Apply the rest of the wiring
git apply ../curio-integration/curio-fork.patch

# 4. Install + run as usual (see docs/setup.md in the parent repo)
```

The Street Vision FastAPI backend on port 8000 is reached via Curio's Flask proxy at `/api/streetvision/*` — the proxy lives in `utk_curio/backend/app/__init__.py` and is part of the patch. No CORS workaround needed.
