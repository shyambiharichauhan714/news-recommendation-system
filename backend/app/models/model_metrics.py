"""ModelMetrics table (Section 4 & 11: Database Design + Model Evaluation).

Every training/evaluation run (train.py + evaluate.py) inserts one row here,
giving a historical log of model performance over time — useful for the
academic writeup to show how metrics improved across training iterations.
"""

from datetime import datetime, timezone

from sqlalchemy import String, Float, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ModelMetrics(Base):
    __tablename__ = "model_metrics"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    model_name: Mapped[str] = mapped_column(String(200), nullable=False)
    precision_at_k: Mapped[float] = mapped_column(Float, default=0.0)
    recall_at_k: Mapped[float] = mapped_column(Float, default=0.0)
    ndcg_at_k: Mapped[float] = mapped_column(Float, default=0.0)
    hit_rate: Mapped[float] = mapped_column(Float, default=0.0)
    mrr: Mapped[float] = mapped_column(Float, default=0.0)
    train_loss: Mapped[float] = mapped_column(Float, default=0.0)
    val_loss: Mapped[float] = mapped_column(Float, default=0.0)
    epochs_trained: Mapped[int] = mapped_column(Integer, default=0)
    k: Mapped[int] = mapped_column(Integer, default=5)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
