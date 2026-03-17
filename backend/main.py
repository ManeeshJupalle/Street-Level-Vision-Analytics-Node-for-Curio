from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import data_sources, health, inference, models

app = FastAPI(title="Street Vision API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(models.router, prefix="/api", tags=["models"])
app.include_router(data_sources.router, prefix="/api", tags=["data_sources"])
app.include_router(inference.router, prefix="/api", tags=["inference"])
