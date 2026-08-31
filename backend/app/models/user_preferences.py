"""UserPreferences table (Section 4: Database Design).

preferred_categories / preferred_topics are stored as comma-separated
strings for SQLite simplicity (avoids a separate join table for this
academic project's scope). The Pydantic schema layer (schemas/preferences.py)
converts to/from list[str] at the API boundary.
"""

from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    preferred_categories: Mapped[str] = mapped_column(String(500), default="")  # comma-separated
    preferred_topics: Mapped[str] = mapped_column(String(1000), default="")  # comma-separated

    user = relationship("User", back_populates="preferences")

    def categories_list(self) -> list[str]:
        return [c.strip() for c in self.preferred_categories.split(",") if c.strip()]

    def topics_list(self) -> list[str]:
        return [t.strip() for t in self.preferred_topics.split(",") if t.strip()]
