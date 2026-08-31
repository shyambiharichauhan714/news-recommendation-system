"""Pydantic schemas for UserPreferences — mirrors frontend/types/index.ts UserPreferences."""

from pydantic import BaseModel


class PreferencesOut(BaseModel):
    user_id: str
    preferred_categories: list[str]
    preferred_topics: list[str]


class PreferencesUpdate(BaseModel):
    preferred_categories: list[str] | None = None
    preferred_topics: list[str] | None = None
