"""UserInteraction table (Section 4: Database Design).

This is the core table that user behavior sequences are built from
(Section 7). Every view/click/read/like/bookmark event is logged here with
a timestamp, and ml/sequence_builder.py orders these chronologically per
user to construct GRU training samples.
"""

from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import String, DateTime, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class InteractionType(str, Enum):
    VIEW = "view"
    CLICK = "click"
    READ = "read"
    LIKE = "like"
    BOOKMARK = "bookmark"


class UserInteraction(Base):
    __tablename__ = "user_interactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    news_id: Mapped[str] = mapped_column(ForeignKey("news.id"), index=True, nullable=False)
    interaction_type: Mapped[str] = mapped_column(String(20), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )
    reading_duration: Mapped[float] = mapped_column(Float, nullable=True)  # seconds

    user = relationship("User", back_populates="interactions")
    news = relationship("News", back_populates="interactions")
