"""
Deployment-facing FastAPI app (Section 20).

Serves the same routes as app/main.py but backed by the exported serving
bundle instead of SQLAlchemy + PyTorch, so it fits inside a serverless
function. The route contract is identical — the frontend cannot tell which
backend answered.

Not included here: auth and training endpoints. Both need writable state,
which a read-only serverless deployment cannot provide; they remain available
in the full local backend (app/main.py).
"""

from __future__ import annotations

import sys
from pathlib import Path

# Vercel invokes this from the repo root, so make `backend/` importable
# regardless of the working directory the platform chooses.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI, HTTPException, Query  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel  # noqa: E402

from serving.bundle import get_bundle  # noqa: E402

app = FastAPI(
    title="NewsMind AI API",
    description=(
        "Personalized news recommendation API using a GRU sequential model. "
        "This deployment runs NumPy inference over exported weights."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class InteractionIn(BaseModel):
    user_id: str
    news_id: str
    reading_duration: float | None = None


@app.get("/api/health", tags=["health"])
def health():
    bundle = get_bundle()
    return {
        "status": "healthy",
        "articles": len(bundle.articles),
        "inference": "numpy",
    }


@app.get("/", tags=["health"])
def root():
    return {"service": "NewsMind AI API", "status": "ok", "docs": "/docs"}


# --- news -----------------------------------------------------------------


@app.get("/api/news", tags=["news"])
def list_news():
    return get_bundle().news()


@app.get("/api/news/category/{category}", tags=["news"])
def news_by_category(category: str):
    return get_bundle().news_by_category(category)


@app.get("/api/news/{news_id}", tags=["news"])
def get_news(news_id: str):
    article = get_bundle().article(news_id)
    if not article:
        raise HTTPException(status_code=404, detail="News article not found")
    return article


# --- users ----------------------------------------------------------------


@app.get("/api/users/demo", tags=["users"])
def demo_users():
    return get_bundle().demo_users()


@app.get("/api/users/{user_id}/history", tags=["users"])
def user_history(user_id: str):
    return get_bundle().history(user_id)


@app.get("/api/users/{user_id}/preferences", tags=["users"])
def user_preferences(user_id: str):
    return get_bundle().user_preferences(user_id)


# --- interactions ---------------------------------------------------------


@app.post("/api/interactions/{interaction_type}", tags=["interactions"])
def record_interaction(interaction_type: str, payload: InteractionIn):
    """Accepted and acknowledged, but not persisted.

    This deployment is read-only; the frontend is the source of truth for
    live activity and keeps it in browser storage. Returning success keeps
    the client's optimistic update path identical across deployments.
    """
    return {"success": True, "persisted": False, "interaction_type": interaction_type}


# --- recommendations ------------------------------------------------------


@app.get("/api/recommendations/{user_id}", tags=["recommendations"])
def recommendations(user_id: str, top_n: int = Query(5, ge=1, le=50)):
    return get_bundle().recommendations(user_id, top_n=top_n)


@app.get("/api/recommendations/{user_id}/top-5", tags=["recommendations"])
def top_five(user_id: str):
    return get_bundle().recommendations(user_id, top_n=5)


# --- analytics ------------------------------------------------------------


@app.get("/api/analytics/dashboard/{user_id}", tags=["analytics"])
def dashboard(user_id: str):
    return get_bundle().dashboard_stats(user_id)


@app.get("/api/analytics/reading-behavior/{user_id}", tags=["analytics"])
def reading_behavior(user_id: str):
    return get_bundle().reading_behavior(user_id)


@app.get("/api/analytics/interests/{user_id}", tags=["analytics"])
def interests(user_id: str, days: int = Query(14, ge=1, le=90)):
    return get_bundle().interest_trends(user_id, days=days)


@app.get("/api/analytics/trending", tags=["analytics"])
def trending(limit: int = Query(8, ge=1, le=50)):
    return get_bundle().trending(limit=limit)


# --- model ----------------------------------------------------------------


@app.get("/api/model/status", tags=["model"])
def model_status():
    return get_bundle().model_status()


@app.get("/api/model/metrics", tags=["model"])
def model_metrics():
    return get_bundle().model_metrics()


@app.get("/api/model/loss-curve", tags=["model"])
def loss_curve():
    path = get_bundle().dir.parent / "saved_models" / "loss_history.json"
    if not path.exists():
        return []
    import json

    return json.loads(path.read_text())
