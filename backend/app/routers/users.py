"""User endpoints (Section 12: USER — GET /api/users/me, /api/users/{id}/history,
/api/users/{id}/preferences). Also exposes GET /api/users/demo for the
frontend's demo-mode user switcher (Section 18)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.user_preferences import UserPreferences
from app.schemas.interaction import InteractionOut
from app.schemas.preferences import PreferencesOut, PreferencesUpdate
from app.schemas.user import UserOut
from app.services import interaction_service
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/demo", response_model=list[UserOut])
def list_demo_users(db: Session = Depends(get_db)):
    """Returns the named demo personas, ordered by id, for the frontend's
    persona switcher (Section 18: Demo Mode).

    Only "U"-prefixed ids are returned: the seed also inserts a large
    "C"-prefixed training cohort (see data/generate_dataset.py) which exists
    to fit the GRU and must not show up as a selectable persona.
    """
    return (
        db.query(User)
        .filter(User.id.like("U%"))
        .order_by(User.id.asc())
        .all()
    )


@router.get("/{user_id}/history", response_model=list[InteractionOut])
def get_user_history(user_id: str, db: Session = Depends(get_db)):
    return interaction_service.get_user_history(db, user_id)


@router.get("/{user_id}/preferences", response_model=PreferencesOut)
def get_user_preferences(user_id: str, db: Session = Depends(get_db)):
    prefs = db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()
    if not prefs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preferences not found")
    return PreferencesOut(
        user_id=user_id,
        preferred_categories=prefs.categories_list(),
        preferred_topics=prefs.topics_list(),
    )


@router.put("/{user_id}/preferences", response_model=PreferencesOut)
def update_user_preferences(user_id: str, payload: PreferencesUpdate, db: Session = Depends(get_db)):
    prefs = db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()
    if not prefs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preferences not found")

    if payload.preferred_categories is not None:
        prefs.preferred_categories = ",".join(payload.preferred_categories)
    if payload.preferred_topics is not None:
        prefs.preferred_topics = ",".join(payload.preferred_topics)
    db.commit()
    db.refresh(prefs)

    return PreferencesOut(
        user_id=user_id,
        preferred_categories=prefs.categories_list(),
        preferred_topics=prefs.topics_list(),
    )
