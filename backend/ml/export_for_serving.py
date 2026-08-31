"""
Exports the trained model into a torch-free serving bundle (Section 20:
Deployment).

Training needs PyTorch, Sentence-Transformers and a database. Serving does
not: a GRU forward pass is a handful of matrix multiplications, and the news
embeddings are already computed and frozen. This script writes everything the
API needs at inference time as plain NumPy/JSON, so the deployed backend can
run on `numpy` alone — small enough for a serverless platform, where a
~2GB PyTorch install would not fit.

Run after `python -m ml.train`:

    python -m ml.export_for_serving

Outputs to backend/serving_bundle/:
    weights.npz        GRU + projection + dense parameters
    embeddings.npy     news embedding matrix (aligned to news_ids.json)
    news_ids.json      embedding row order
    dataset.json       articles, demo users, preferences, seeded interactions
    manifest.json      dims, sequence length, provenance
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("export")

OUT_DIR = Path(__file__).resolve().parent.parent / "serving_bundle"


def export_weights(out_dir: Path) -> dict:
    """Pulls every learnable tensor out of the checkpoint into a flat npz.

    PyTorch stores GRU parameters as weight_ih_l{k} / weight_hh_l{k} with the
    reset/update/new gates concatenated on axis 0. We keep that layout as-is
    and let the NumPy implementation slice it, so the two stay in lockstep.
    """
    import torch

    weights_path = settings.saved_models_dir / "gru_recommender.pt"
    config_path = settings.saved_models_dir / "model_config.json"
    if not weights_path.exists():
        raise SystemExit(f"No trained model at {weights_path} — run `python -m ml.train` first.")

    checkpoint = torch.load(weights_path, map_location="cpu", weights_only=False)
    state = checkpoint.get("model_state_dict", checkpoint)
    config = json.loads(config_path.read_text()) if config_path.exists() else {}

    arrays = {k: v.detach().cpu().numpy().astype(np.float32) for k, v in state.items()}
    np.savez_compressed(out_dir / "weights.npz", **arrays)
    logger.info("Wrote %d weight tensors (%d params)", len(arrays), sum(a.size for a in arrays.values()))
    return config


def export_embeddings(out_dir: Path) -> int:
    embeddings, news_ids = _load_embeddings()
    np.save(out_dir / "embeddings.npy", embeddings.astype(np.float32))
    (out_dir / "news_ids.json").write_text(json.dumps(news_ids))
    logger.info("Wrote embeddings %s", embeddings.shape)
    return embeddings.shape[1]


def _load_embeddings() -> tuple[np.ndarray, list[str]]:
    from ml.embeddings import load_embeddings

    return load_embeddings(settings.data_dir / "embeddings")


def export_dataset(out_dir: Path) -> dict:
    """Snapshots the seeded database as JSON.

    The demo dataset is static — it only changes when seed_db is re-run — so
    serving it from a file removes the database from the deployment entirely.
    Live user activity is kept client-side, so nothing here needs to be
    writable.
    """
    from app.database import SessionLocal
    from app.models.news import News
    from app.models.user import User
    from app.models.user_interaction import UserInteraction
    from app.models.user_preferences import UserPreferences

    db = SessionLocal()
    try:
        articles = [
            {
                "news_id": n.id,
                "title": n.title,
                "description": n.description,
                "content": n.content,
                "category": n.category,
                "subcategory": n.subcategory,
                "image_url": n.image_url,
                "author": n.author,
                "published_at": n.published_at.isoformat(),
                "read_time_minutes": n.read_time_minutes,
            }
            for n in db.query(News).order_by(News.id).all()
        ]

        # Only the named demo personas are exposed; the training cohort exists
        # to fit the model and would swamp the persona switcher.
        users = [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "profile_image": u.profile_image,
                "preferred_language": u.preferred_language,
                "persona": u.persona,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in db.query(User).filter(User.id.like("U%")).order_by(User.id).all()
        ]
        demo_ids = {u["id"] for u in users}

        preferences = {
            p.user_id: {
                "user_id": p.user_id,
                "preferred_categories": [c for c in (p.preferred_categories or "").split(",") if c],
                "preferred_topics": [t for t in (p.preferred_topics or "").split(",") if t],
            }
            for p in db.query(UserPreferences).all()
            if p.user_id in demo_ids
        }

        interactions: dict[str, list] = {uid: [] for uid in demo_ids}
        for i in (
            db.query(UserInteraction)
            .filter(UserInteraction.user_id.in_(demo_ids))
            .order_by(UserInteraction.timestamp)
            .all()
        ):
            interactions[i.user_id].append(
                {
                    "id": i.id,
                    "user_id": i.user_id,
                    "news_id": i.news_id,
                    "interaction_type": i.interaction_type,
                    "timestamp": i.timestamp.isoformat(),
                    "reading_duration": i.reading_duration,
                }
            )

        # Global read counts drive the trending endpoint, and those should
        # reflect the whole cohort, not just the ten demo personas.
        trending_counts: dict[str, int] = {}
        for news_id, count in (
            db.query(UserInteraction.news_id, __import__("sqlalchemy").func.count())
            .group_by(UserInteraction.news_id)
            .all()
        ):
            trending_counts[news_id] = count

        payload = {
            "articles": articles,
            "users": users,
            "preferences": preferences,
            "interactions": interactions,
            "trending_counts": trending_counts,
        }
        (out_dir / "dataset.json").write_text(json.dumps(payload), encoding="utf-8")
        logger.info(
            "Wrote dataset: %d articles, %d demo users, %d interactions",
            len(articles),
            len(users),
            sum(len(v) for v in interactions.values()),
        )
        return payload
    finally:
        db.close()


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    config = export_weights(OUT_DIR)
    embedding_dim = export_embeddings(OUT_DIR)
    dataset = export_dataset(OUT_DIR)

    metrics_path = settings.saved_models_dir / "evaluation_results.json"
    manifest = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "embedding_dim": embedding_dim,
        "hidden_dim": config.get("hidden_dim", settings.gru_hidden_dim),
        "num_layers": config.get("num_layers", settings.gru_num_layers),
        "sequence_length": config.get("sequence_length", settings.sequence_length),
        "embedding_backend": config.get("embedding_backend", "unknown"),
        "trained_at": config.get("trained_at"),
        "article_count": len(dataset["articles"]),
        "demo_user_count": len(dataset["users"]),
        "evaluation": json.loads(metrics_path.read_text()) if metrics_path.exists() else None,
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2))

    total = sum(f.stat().st_size for f in OUT_DIR.iterdir() if f.is_file())
    logger.info("Serving bundle ready at %s (%.1f MB)", OUT_DIR, total / 1_048_576)


if __name__ == "__main__":
    main()
