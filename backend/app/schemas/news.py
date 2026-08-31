"""Pydantic schemas for News — mirrors frontend/types/index.ts NewsArticle."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NewsBase(BaseModel):
    title: str
    description: str
    content: str
    category: str
    subcategory: str
    image_url: str
    author: str
    read_time_minutes: int = 4


class NewsCreate(NewsBase):
    news_id: str


class NewsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    news_id: str
    title: str
    description: str
    content: str
    category: str
    subcategory: str
    image_url: str
    author: str
    published_at: datetime
    read_time_minutes: int

    @classmethod
    def from_orm_news(cls, news) -> "NewsOut":
        """Maps the ORM's `id` column to the API's `news_id` field."""
        return cls(
            news_id=news.id,
            title=news.title,
            description=news.description,
            content=news.content,
            category=news.category,
            subcategory=news.subcategory,
            image_url=news.image_url,
            author=news.author,
            published_at=news.published_at,
            read_time_minutes=news.read_time_minutes,
        )


class RecommendedNewsOut(NewsOut):
    match_score: int
    reason: str
