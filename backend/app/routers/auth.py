"""Auth endpoints (Section 12: AUTH — POST /api/auth/register, POST /api/auth/login)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.user_preferences import UserPreferences
from app.schemas.user import TokenOut, UserLogin, UserOut, UserRegister
from app.utils.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user_id = f"U{uuid.uuid4().hex[:8].upper()}"
    user = User(
        id=user_id,
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        profile_image=f"https://picsum.photos/seed/{user_id.lower()}/200/200",
        preferred_language=payload.preferred_language,
        persona="",
    )
    db.add(user)
    db.add(UserPreferences(user_id=user_id, preferred_categories="", preferred_topics=""))
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(subject=user.id)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))
