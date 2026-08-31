"""Pydantic schemas for UserInteraction — mirrors frontend/types/index.ts UserInteraction."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class InteractionCreate(BaseModel):
    user_id: str
    news_id: str
    reading_duration: float | None = None


class InteractionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    news_id: str
    interaction_type: str
    timestamp: datetime
    reading_duration: float | None = None
