"""Pydantic schemas for model status/metrics endpoints — mirrors
frontend/types/index.ts ModelStatus, ModelMetrics."""

from datetime import datetime

from pydantic import BaseModel


class ModelStatusOut(BaseModel):
    model_name: str
    status: str  # "Active" | "Training" | "Idle" | "Error"
    version: str
    last_trained: datetime | None
    device: str
    embedding_dim: int
    hidden_dim: int
    num_layers: int
    sequence_length: int


class BaselineComparison(BaseModel):
    tfidf_precision_at_5: float
    tfidf_recall_at_5: float
    tfidf_ndcg_at_5: float
    tfidf_hit_rate_at_5: float


class ModelMetricsOut(BaseModel):
    model_name: str
    precision_at_5: float
    recall_at_5: float
    ndcg_at_5: float
    hit_rate_at_5: float
    mrr: float
    train_loss: float
    val_loss: float
    created_at: datetime
    epochs_trained: int
    baseline_comparison: BaselineComparison | None = None


class TrainRequest(BaseModel):
    epochs: int | None = None
    learning_rate: float | None = None
    batch_size: int | None = None


class TrainResponse(BaseModel):
    status: str
    message: str
