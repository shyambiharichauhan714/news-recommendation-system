"""Model endpoints (Section 12: MODEL — status, metrics, train, evaluate).

Training and evaluation are long-running (a full GRU training run over 40
epochs can take anywhere from seconds to minutes depending on dataset size
and hardware), so POST /api/model/train and POST /api/model/evaluate run in
a FastAPI BackgroundTask and return immediately with a status message. The
frontend polls GET /api/model/status to see when training completes.
"""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.model_metrics import ModelMetrics
from app.schemas.model import (
    ModelMetricsOut,
    ModelStatusOut,
    TrainRequest,
    TrainResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/model", tags=["model"])

_training_in_progress = {"value": False}


def _run_training(epochs: int | None, batch_size: int | None, learning_rate: float | None):
    from ml.train import train as run_train

    _training_in_progress["value"] = True
    try:
        run_train(epochs=epochs, batch_size=batch_size, learning_rate=learning_rate)
    except Exception:
        logger.exception("Background training run failed.")
    finally:
        _training_in_progress["value"] = False


def _run_evaluation():
    from ml.evaluate import run_full_evaluation

    try:
        run_full_evaluation()
    except Exception:
        logger.exception("Background evaluation run failed.")


@router.get("/status", response_model=ModelStatusOut)
def model_status():
    config_path = settings.saved_models_dir / "model_config.json"
    if _training_in_progress["value"]:
        current_status = "Training"
    elif config_path.exists():
        current_status = "Active"
    else:
        current_status = "Idle"

    config = {}
    if config_path.exists():
        with open(config_path) as f:
            config = json.load(f)

    return ModelStatusOut(
        model_name="GRU Sequential Recommendation Network",
        status=current_status,
        version="v1.0.0" if config else "unversioned",
        last_trained=config.get("trained_at"),
        device="CUDA" if _cuda_available() else "CPU",
        embedding_dim=config.get("embedding_dim", settings.embedding_dim),
        hidden_dim=config.get("hidden_dim", settings.gru_hidden_dim),
        num_layers=config.get("num_layers", settings.gru_num_layers),
        sequence_length=config.get("sequence_length", settings.sequence_length),
    )


def _cuda_available() -> bool:
    try:
        import torch

        return torch.cuda.is_available()
    except Exception:
        return False


@router.get("/metrics", response_model=ModelMetricsOut)
def model_metrics(db: Session = Depends(get_db)):
    latest = db.query(ModelMetrics).order_by(ModelMetrics.created_at.desc()).first()

    eval_path = settings.saved_models_dir / "evaluation_results.json"
    baseline = None
    if eval_path.exists():
        with open(eval_path) as f:
            eval_data = json.load(f)
        baseline = eval_data.get("baseline_comparison")

    if not latest:
        # No training/evaluation has run yet — return zeroed placeholder
        # metrics rather than a 404, so the frontend's Model Insights page
        # always has something to render.
        return ModelMetricsOut(
            model_name="GRU Sequential Recommendation Network",
            precision_at_5=0.0,
            recall_at_5=0.0,
            ndcg_at_5=0.0,
            hit_rate_at_5=0.0,
            mrr=0.0,
            train_loss=0.0,
            val_loss=0.0,
            created_at=datetime.now(timezone.utc),
            epochs_trained=0,
            baseline_comparison=baseline,
        )

    return ModelMetricsOut(
        model_name=latest.model_name,
        precision_at_5=latest.precision_at_k,
        recall_at_5=latest.recall_at_k,
        ndcg_at_5=latest.ndcg_at_k,
        hit_rate_at_5=latest.hit_rate,
        mrr=latest.mrr,
        train_loss=latest.train_loss,
        val_loss=latest.val_loss,
        created_at=latest.created_at,
        epochs_trained=latest.epochs_trained,
        baseline_comparison=baseline,
    )


@router.get("/loss-curve")
def loss_curve():
    """Per-epoch train/val loss, used by the AI Model Insights chart."""
    path = settings.saved_models_dir / "loss_history.json"
    if not path.exists():
        return []
    with open(path) as f:
        history = json.load(f)
    return [
        {"epoch": i + 1, "train_loss": t, "val_loss": v}
        for i, (t, v) in enumerate(zip(history["train_loss"], history["val_loss"]))
    ]


@router.post("/train", response_model=TrainResponse)
def train_model(payload: TrainRequest, background_tasks: BackgroundTasks):
    if _training_in_progress["value"]:
        return TrainResponse(status="already_training", message="A training run is already in progress.")

    background_tasks.add_task(_run_training, payload.epochs, payload.batch_size, payload.learning_rate)
    return TrainResponse(
        status="started",
        message="Training started in the background. Poll GET /api/model/status for progress.",
    )


@router.post("/evaluate", response_model=TrainResponse)
def evaluate_model(background_tasks: BackgroundTasks):
    config_path = settings.saved_models_dir / "model_config.json"
    if not config_path.exists():
        return TrainResponse(status="error", message="No trained model found. Run POST /api/model/train first.")

    background_tasks.add_task(_run_evaluation)
    return TrainResponse(
        status="started",
        message="Evaluation started in the background. Poll GET /api/model/metrics for results.",
    )
