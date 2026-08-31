"""Business logic for news retrieval (Section 12: NEWS endpoints)."""

from sqlalchemy.orm import Session

from app.models.news import News
from app.schemas.news import NewsOut


def list_news(db: Session, limit: int = 200) -> list[NewsOut]:
    rows = db.query(News).order_by(News.published_at.desc()).limit(limit).all()
    return [NewsOut.from_orm_news(n) for n in rows]


def get_news_by_id(db: Session, news_id: str) -> NewsOut | None:
    row = db.query(News).filter(News.id == news_id).first()
    return NewsOut.from_orm_news(row) if row else None


def list_news_by_category(db: Session, category: str, limit: int = 100) -> list[NewsOut]:
    rows = (
        db.query(News)
        .filter(News.category == category)
        .order_by(News.published_at.desc())
        .limit(limit)
        .all()
    )
    return [NewsOut.from_orm_news(n) for n in rows]
