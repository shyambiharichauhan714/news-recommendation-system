"""News endpoints (Section 12: NEWS — GET /api/news, /api/news/{id}, /api/news/category/{category})."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.news import NewsOut
from app.services import news_service

router = APIRouter(prefix="/api/news", tags=["news"])


@router.get("", response_model=list[NewsOut])
def get_all_news(db: Session = Depends(get_db)):
    return news_service.list_news(db)


@router.get("/category/{category}", response_model=list[NewsOut])
def get_news_by_category(category: str, db: Session = Depends(get_db)):
    return news_service.list_news_by_category(db, category)


@router.get("/{news_id}", response_model=NewsOut)
def get_news_detail(news_id: str, db: Session = Depends(get_db)):
    article = news_service.get_news_by_id(db, news_id)
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="News article not found")
    return article
