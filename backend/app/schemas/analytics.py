"""Pydantic schemas for analytics endpoints — mirrors frontend/types/index.ts
DashboardStats, AnalyticsData, TrendingTopic, InterestTrendPoint."""

from pydantic import BaseModel


class DashboardStatsOut(BaseModel):
    total_news_read: int
    recommendation_score: int
    top_category: str
    ai_confidence: int


class ReadingActivityPoint(BaseModel):
    date: str
    count: int


class CategoryBreakdownItem(BaseModel):
    category: str
    count: int
    percent: int


class AnalyticsOut(BaseModel):
    reading_activity: list[ReadingActivityPoint]
    category_breakdown: list[CategoryBreakdownItem]
    most_active_day: str
    most_active_hour: str
    total_interactions: int
    avg_reading_duration: float


class TrendingTopicOut(BaseModel):
    topic: str
    category: str
    read_count: int
    growth_percent: float


class InterestTrendPointOut(BaseModel):
    date: str
    # Additional category keys are added dynamically server-side; represented
    # as a flexible dict in the route handler's JSON response since Pydantic
    # models require fixed fields. See routers/analytics.py.
    model_config = {"extra": "allow"}
