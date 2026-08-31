"""Analytics endpoints (Section 12: ANALYTICS)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.analytics import AnalyticsOut, DashboardStatsOut, TrendingTopicOut
from app.services import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _ensure_user_exists(db: Session, user_id: str) -> None:
    if not db.query(User.id).filter(User.id == user_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found")


@router.get("/dashboard/{user_id}", response_model=DashboardStatsOut)
def dashboard_stats(user_id: str, db: Session = Depends(get_db)):
    _ensure_user_exists(db, user_id)
    return analytics_service.get_dashboard_stats(db, user_id)


@router.get("/interests/{user_id}")
def interest_trends(user_id: str, db: Session = Depends(get_db)):
    _ensure_user_exists(db, user_id)
    # Returned as raw list[dict] (not a fixed Pydantic model) since each
    # point has dynamic category keys — see schemas/analytics.py note.
    return analytics_service.get_interest_trends(db, user_id)


@router.get("/reading-behavior/{user_id}", response_model=AnalyticsOut)
def reading_behavior(user_id: str, db: Session = Depends(get_db)):
    _ensure_user_exists(db, user_id)
    return analytics_service.get_reading_behavior(db, user_id)


@router.get("/trending", response_model=list[TrendingTopicOut])
def trending_topics(db: Session = Depends(get_db)):
    return analytics_service.get_trending_topics(db)
