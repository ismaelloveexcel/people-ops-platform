"""
Employee Portal — FastAPI Backend
Standalone, lightweight request input system.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import get_settings
from app.routers import auth, employees, requests, grievances, suggestions

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"🚀 Employee Portal starting — env={settings.app_env}")
    yield
    logger.info("🔴 Employee Portal shutting down")


app = FastAPI(
    title="Employee Portal API",
    description=(
        "Standalone employee portal for request submission and status tracking. "
        "Works independently — no external system dependencies required."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.app_env == "development" else None,
    redoc_url="/redoc" if settings.app_env == "development" else None,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,         prefix="/api/v1")
app.include_router(employees.router,    prefix="/api/v1")
app.include_router(requests.router,     prefix="/api/v1")
app.include_router(grievances.router,   prefix="/api/v1")
app.include_router(suggestions.router,  prefix="/api/v1")


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "service": "employee-portal", "version": app.version}


# ── Root ─────────────────────────────────────────────────────────────────────
@app.get("/", tags=["System"])
async def root():
    return {
        "service": "Employee Portal API",
        "docs": "/docs",
        "health": "/health",
    }
