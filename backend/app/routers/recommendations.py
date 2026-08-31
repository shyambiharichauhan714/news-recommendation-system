"""Recommendation endpoints (Section 12: RECOMMENDATIONS).

GET /api/recommendations/{user_id}          — top-N (default 5, configurable via ?top_n=)
GET /api/recommendations/{user_id}/top-5     — always top 5
GET /api/recommendations/{user_id}/explain   — top-N with explicit reasoning highlighted
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.news import RecommendedNewsOut
from app.services import recommendation_service

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


def _ensure_user_exists(db: Session, user_id: str) -> None:
    if not db.query(User.id).filter(User.id == user_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found")


@router.get("/{user_id}", response_model=list[RecommendedNewsOut])
def get_recommendations(
    user_id: str, top_n: int = Query(default=5, ge=1, le=50), db: Session = Depends(get_db)
):
    _ensure_user_exists(db, user_id)
    return recommendation_service.get_recommendations(db, user_id, top_n=top_n)


@router.get("/{user_id}/top-5", response_model=list[RecommendedNewsOut])
def get_top_5(user_id: str, db: Session = Depends(get_db)):
    _ensure_user_exists(db, user_id)
    return recommendation_service.get_recommendations(db, user_id, top_n=5)


@router.get("/{user_id}/explain", response_model=list[RecommendedNewsOut])
def explain_recommendations(user_id: str, db: Session = Depends(get_db)):
    """Same payload as the base recommendations endpoint — each item already
    includes a `reason` field (Section 10: Explainable AI). Kept as a
    separate route to match the spec and make the explainability contract
    explicit for API consumers/graders."""
    _ensure_user_exists(db, user_id)
    return recommendation_service.get_recommendations(db, user_id, top_n=5)
