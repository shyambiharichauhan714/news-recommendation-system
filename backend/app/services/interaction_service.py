"""Business logic for logging user interactions (Section 16: User Interaction
Logic — save to DB, update reading history/behavior sequence)."""

from sqlalchemy.orm import Session

from app.models.user_interaction import UserInteraction


def log_interaction(
    db: Session,
    user_id: str,
    news_id: str,
    interaction_type: str,
    reading_duration: float | None = None,
) -> UserInteraction:
    interaction = UserInteraction(
        user_id=user_id,
        news_id=news_id,
        interaction_type=interaction_type,
        reading_duration=reading_duration,
    )
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction


def get_user_history(db: Session, user_id: str, limit: int = 200) -> list[UserInteraction]:
    return (
        db.query(UserInteraction)
        .filter(UserInteraction.user_id == user_id)
        .order_by(UserInteraction.timestamp.asc())
        .limit(limit)
        .all()
    )


def get_read_sequence(db: Session, user_id: str) -> list[str]:
    """Returns the chronological list of news_ids this user has interacted
    with (deduplicating consecutive repeats) — the input to the GRU
    recommendation engine (Section 16, step 5)."""
    history = get_user_history(db, user_id, limit=1000)
    sequence: list[str] = []
    for h in history:
        if not sequence or sequence[-1] != h.news_id:
            sequence.append(h.news_id)
    return sequence
