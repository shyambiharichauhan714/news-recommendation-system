"""News table (Section 4: Database Design)."""

from datetime import datetime, timezone

from sqlalchemy import String, Text, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class News(Base):
    __tablename__ = "news"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)  # e.g. "N001"
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    content: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    subcategory: Mapped[str] = mapped_column(String(100), default="")
    image_url: Mapped[str] = mapped_column(String(500), default="")
    author: Mapped[str] = mapped_column(String(120), default="")
    published_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    read_time_minutes: Mapped[int] = mapped_column(Integer, default=4)

    # Reference to the row's embedding in the on-disk embedding matrix
    # (backend/data/embeddings/news_embeddings.npy) rather than storing the
    # 384-dim float vector inline in SQLite. `embedding_index` is the row
    # index into that matrix; see ml/embeddings.py.
    embedding_index: Mapped[int] = mapped_column(Integer, nullable=True)

    interactions = relationship("UserInteraction", back_populates="news")
