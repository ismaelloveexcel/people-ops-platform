"""
People Operations Platform — FastAPI Backend
Mauritius SME · Blueprint v3
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import get_settings
from app.routers import auth, employees, requests, grievances, disciplinary, acting_md, suggestions, ai_agent

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"🚀 People Ops Platform starting — env={settings.app_env}")
    yield
    logger.info("🔴 People Ops Platform shutting down")


app = FastAPI(
    title="People Operations Platform",
    description=(
        "HR platform for Mauritius SME. "
        "3 operational roles: Employee · Manager · MD. "
        "AI-assisted, manager-led, MD-governed."
    ),
    version="1.0.0",
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
app.include_router(disciplinary.router, prefix="/api/v1")
app.include_router(acting_md.router,    prefix="/api/v1")
app.include_router(suggestions.router,  prefix="/api/v1")
app.include_router(ai_agent.router,     prefix="/api/v1")


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "service": "people-ops-platform", "version": "1.0.0"}


# ── Root ─────────────────────────────────────────────────────────────────────
@app.get("/", tags=["System"])
async def root():
    return {
        "service": "People Operations Platform API",
        "docs": "/docs",
        "health": "/health",
    }
