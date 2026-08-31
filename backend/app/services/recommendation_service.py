"""Bridges the DB (news catalog + user history) to the ML recommendation
engine in ml/recommend.py (Section 9: Recommendation Engine)."""

from sqlalchemy.orm import Session

from app.models.news import News
from app.models.user_preferences import UserPreferences
from app.schemas.news import NewsOut, RecommendedNewsOut
from app.services import interaction_service
from ml.recommend import get_recommendation_engine


def _catalog_as_dicts(db: Session) -> list[dict]:
    rows = db.query(News).all()
    return [
        {
            "news_id": n.id,
            "category": n.category,
            "subcategory": n.subcategory,
            "published_at": n.published_at,
        }
        for n in rows
    ]


def get_recommendations(db: Session, user_id: str, top_n: int = 5) -> list[RecommendedNewsOut]:
    read_sequence = interaction_service.get_read_sequence(db, user_id)

    prefs = db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()
    preferred_categories = prefs.categories_list() if prefs else []

    catalog = _catalog_as_dicts(db)
    engine = get_recommendation_engine()
    results = engine.recommend(
        read_sequence=read_sequence,
        preferred_categories=preferred_categories,
        news_catalog=catalog,
        top_n=top_n,
    )

    news_by_id = {n.id: n for n in db.query(News).filter(News.id.in_([r.news_id for r in results])).all()}

    output = []
    for r in results:
        news_row = news_by_id.get(r.news_id)
        if not news_row:
            continue
        # Build the base NewsOut explicitly (not RecommendedNewsOut.from_orm_news,
        # which would try to construct a RecommendedNewsOut missing the
        # required match_score/reason fields and raise a ValidationError).
        base = NewsOut.from_orm_news(news_row)
        output.append(
            RecommendedNewsOut(
                **base.model_dump(),
                match_score=r.match_score,
                reason=r.reason,
            )
        )
    return output
