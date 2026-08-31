"""Interaction endpoints (Section 12: INTERACTIONS — POST /api/interactions/{type}).

Each of these logs a UserInteraction row (Section 16: User Interaction
Logic — step 1: save interaction to database, step 2: save timestamp).
The updated interaction history is then picked up automatically the next
time /api/recommendations/{user_id} is called, since that endpoint always
re-reads the latest interaction history to build the current sequence
(Section 16, steps 4-6: update behavior sequence, use latest sequence,
refresh recommendations).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.news import News
from app.models.user import User
from app.schemas.interaction import InteractionCreate, InteractionOut
from app.services import interaction_service

router = APIRouter(prefix="/api/interactions", tags=["interactions"])


def _validate_refs(db: Session, user_id: str, news_id: str) -> None:
    if not db.query(User.id).filter(User.id == user_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found")
    if not db.query(News.id).filter(News.id == news_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"News article {news_id} not found")


def _make_handler(interaction_type: str):
    def handler(payload: InteractionCreate, db: Session = Depends(get_db)):
        _validate_refs(db, payload.user_id, payload.news_id)
        interaction = interaction_service.log_interaction(
            db,
            user_id=payload.user_id,
            news_id=payload.news_id,
            interaction_type=interaction_type,
            reading_duration=payload.reading_duration,
        )
        return interaction

    return handler


router.add_api_route(
    "/view", _make_handler("view"), methods=["POST"], response_model=InteractionOut,
    status_code=status.HTTP_201_CREATED,
)
router.add_api_route(
    "/click", _make_handler("click"), methods=["POST"], response_model=InteractionOut,
    status_code=status.HTTP_201_CREATED,
)
router.add_api_route(
    "/read", _make_handler("read"), methods=["POST"], response_model=InteractionOut,
    status_code=status.HTTP_201_CREATED,
)
router.add_api_route(
    "/like", _make_handler("like"), methods=["POST"], response_model=InteractionOut,
    status_code=status.HTTP_201_CREATED,
)
router.add_api_route(
    "/bookmark", _make_handler("bookmark"), methods=["POST"], response_model=InteractionOut,
    status_code=status.HTTP_201_CREATED,
)
