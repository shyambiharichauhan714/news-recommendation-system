"""
NewsMind AI — FastAPI application entrypoint (Section 12: FastAPI Backend).

Run from the backend/ directory:
    uvicorn app.main:app --reload --port 8000

On first run, seed the database first:
    python -m data.seed_db
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import analytics, auth, interactions, model, news, recommendations, users

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("newsmind")

app = FastAPI(
    title=settings.app_name,
    description=(
        "Personalized News Recommendation API using Sequential User Behavior "
        "Modeling with GRU Networks. See /docs for the interactive API reference."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    logger.info("Initializing database (creating tables if they don't exist)...")
    init_db()
    logger.info("%s ready.", settings.app_name)


@app.get("/", tags=["health"])
def root():
    return {
        "service": settings.app_name,
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "healthy"}


# --- Routers (Section 12) ---
app.include_router(auth.router)
app.include_router(news.router)
app.include_router(users.router)
app.include_router(interactions.router)
app.include_router(recommendations.router)
app.include_router(analytics.router)
app.include_router(model.router)
