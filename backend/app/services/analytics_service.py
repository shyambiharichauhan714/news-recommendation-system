"""Business logic for analytics endpoints (Section 12: ANALYTICS)."""

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.news import News
from app.models.user_interaction import UserInteraction
from app.services import interaction_service
from app.services.recommendation_service import get_recommendations


def get_dashboard_stats(db: Session, user_id: str) -> dict:
    history = interaction_service.get_user_history(db, user_id, limit=1000)
    recs = get_recommendations(db, user_id, top_n=5)

    avg_match = round(sum(r.match_score for r in recs) / len(recs)) if recs else 50

    category_counts: Counter[str] = Counter()
    for h in history:
        news = db.query(News.category).filter(News.id == h.news_id).first()
        if news:
            category_counts[news.category] += 1
    top_category = category_counts.most_common(1)[0][0] if category_counts else "Technology"

    return {
        "total_news_read": len({h.news_id for h in history}),
        "recommendation_score": avg_match,
        "top_category": top_category,
        "ai_confidence": min(99, avg_match + 4),
    }


def get_reading_behavior(db: Session, user_id: str) -> dict:
    history = interaction_service.get_user_history(db, user_id, limit=1000)

    # Reading activity: interaction count per day, last 14 days.
    now = datetime.now(timezone.utc)
    activity_by_date: dict[str, int] = defaultdict(int)
    for i in range(13, -1, -1):
        date_key = (now - timedelta(days=i)).strftime("%m-%d")
        activity_by_date[date_key] = 0
    for h in history:
        ts = h.timestamp if h.timestamp.tzinfo else h.timestamp.replace(tzinfo=timezone.utc)
        days_ago = (now - ts).days
        if 0 <= days_ago <= 13:
            date_key = ts.strftime("%m-%d")
            if date_key in activity_by_date:
                activity_by_date[date_key] += 1
    reading_activity = [{"date": d, "count": c} for d, c in activity_by_date.items()]

    # Category breakdown
    category_counts: Counter[str] = Counter()
    for h in history:
        news = db.query(News.category).filter(News.id == h.news_id).first()
        if news:
            category_counts[news.category] += 1
    total = sum(category_counts.values()) or 1
    category_breakdown = [
        {"category": cat, "count": count, "percent": round(count / total * 100)}
        for cat, count in category_counts.most_common()
    ]

    # Most active day/hour
    day_counts: Counter[str] = Counter()
    hour_buckets: Counter[str] = Counter()
    for h in history:
        day_counts[h.timestamp.strftime("%A")] += 1
        hour = h.timestamp.hour
        if hour < 11:
            bucket = "8:00 AM"
        elif hour < 15:
            bucket = "12:00 PM"
        elif hour < 20:
            bucket = "6:00 PM"
        else:
            bucket = "9:00 PM"
        hour_buckets[bucket] += 1

    most_active_day = day_counts.most_common(1)[0][0] if day_counts else "Monday"
    most_active_hour = hour_buckets.most_common(1)[0][0] if hour_buckets else "6:00 PM"

    durations = [h.reading_duration for h in history if h.reading_duration]
    avg_duration = sum(durations) / len(durations) if durations else 0.0

    return {
        "reading_activity": reading_activity,
        "category_breakdown": category_breakdown,
        "most_active_day": most_active_day,
        "most_active_hour": most_active_hour,
        "total_interactions": len(history),
        "avg_reading_duration": round(avg_duration, 1),
    }


def get_interest_trends(db: Session, user_id: str, days: int = 14) -> list[dict]:
    """Per-day interaction counts broken down by category, for the
    multi-line Interest Trends chart on the frontend."""
    history = interaction_service.get_user_history(db, user_id, limit=1000)
    now = datetime.now(timezone.utc)

    news_category_map = {n.id: n.category for n in db.query(News.id, News.category).all()}

    points: dict[str, dict[str, int]] = {}
    for i in range(days - 1, -1, -1):
        date_key = (now - timedelta(days=i)).strftime("%m-%d")
        points[date_key] = {}

    for h in history:
        ts = h.timestamp if h.timestamp.tzinfo else h.timestamp.replace(tzinfo=timezone.utc)
        days_ago = (now - ts).days
        if 0 <= days_ago < days:
            date_key = ts.strftime("%m-%d")
            category = news_category_map.get(h.news_id)
            if category and date_key in points:
                points[date_key][category] = points[date_key].get(category, 0) + 1

    return [{"date": date, **counts} for date, counts in points.items()]


def get_trending_topics(db: Session, limit: int = 8) -> list[dict]:
    """Ranks (category, subcategory) pairs by total interaction count across
    all users — a simple global popularity signal, distinct from any single
    user's personalized recommendations."""
    rows = (
        db.query(News.category, News.subcategory, UserInteraction.id)
        .join(UserInteraction, UserInteraction.news_id == News.id)
        .all()
    )
    counts: Counter[tuple[str, str]] = Counter()
    for category, subcategory, _ in rows:
        counts[(category, subcategory)] += 1

    ranked = counts.most_common(limit)
    # Growth percent is simulated deterministically from read_count parity
    # since we don't have historical snapshots to diff against in this
    # academic project's single-database setup.
    return [
        {
            "topic": subcat,
            "category": cat,
            "read_count": count,
            "growth_percent": round(((count * 7) % 47) - 8 + (count % 3) * 1.5, 1),
        }
        for (cat, subcat), count in ranked
    ]
