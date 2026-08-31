"""
Database seed script (Section 5 & 18: News Dataset + Demo Mode).

Populates the SQLite database with:
  - The synthetic news catalog (generate_dataset.generate_news)
  - Demo users with hashed passwords (default password: "demo1234")
  - UserPreferences rows derived from each persona
  - UserInteraction rows built from each persona's chronological read_sequence
    (spaced 3 hours apart, ending "now", alternating read/bookmark types)

Run from the backend/ directory:
    python -m data.seed_db

Safe to re-run: it clears existing rows in the affected tables first so the
dataset stays consistent with generate_dataset.py after edits.
"""

from __future__ import annotations

import sys
from datetime import timedelta
from pathlib import Path

# Allow running as `python -m data.seed_db` or `python data/seed_db.py` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal, init_db  # noqa: E402
from app.models.news import News  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.user_interaction import UserInteraction  # noqa: E402
from app.models.user_preferences import UserPreferences  # noqa: E402
from app.utils.security import hash_password  # noqa: E402
from data.generate_dataset import NOW, generate_dataset  # noqa: E402

DEFAULT_DEMO_PASSWORD = "demo1234"


def seed() -> None:
    init_db()
    db = SessionLocal()
    try:
        print("Clearing existing data...")
        db.query(UserInteraction).delete()
        db.query(UserPreferences).delete()
        db.query(News).delete()
        db.query(User).delete()
        db.commit()

        print("Generating synthetic dataset...")
        articles, users = generate_dataset()

        print(f"Inserting {len(articles)} news articles...")
        for a in articles:
            db.add(
                News(
                    id=a.news_id,
                    title=a.title,
                    description=a.description,
                    content=a.content,
                    category=a.category,
                    subcategory=a.subcategory,
                    image_url=a.image_url,
                    author=a.author,
                    published_at=a.published_at,
                    read_time_minutes=a.read_time_minutes,
                )
            )
        db.commit()

        demo_users = [u for u in users if u.user_id.startswith("U")]
        cohort_users = [u for u in users if not u.user_id.startswith("U")]
        print(
            f"Inserting {len(demo_users)} demo personas + {len(cohort_users)} "
            f"training-cohort readers, with preferences and interactions..."
        )
        # One bcrypt hash reused for every row: hashing 400+ times would
        # dominate the seed runtime for no benefit in a demo dataset.
        hashed_default_pw = hash_password(DEFAULT_DEMO_PASSWORD)
        pending_interactions: list[UserInteraction] = []

        for u in users:
            db.add(
                User(
                    id=u.user_id,
                    name=u.name,
                    email=u.email,
                    password_hash=hashed_default_pw,
                    profile_image=u.profile_image,
                    preferred_language=u.preferred_language,
                    persona=u.persona,
                )
            )
            db.add(
                UserPreferences(
                    user_id=u.user_id,
                    preferred_categories=",".join(u.preferred_categories),
                    preferred_topics=",".join(u.preferred_topics),
                )
            )

            # Build chronological interactions ending at NOW, 3 hours apart.
            n = len(u.read_sequence)
            for idx, news_id in enumerate(u.read_sequence):
                timestamp = NOW - timedelta(hours=3 * (n - idx))
                interaction_type = "bookmark" if idx % 4 == 0 else "read"
                pending_interactions.append(
                    UserInteraction(
                        user_id=u.user_id,
                        news_id=news_id,
                        interaction_type=interaction_type,
                        timestamp=timestamp,
                        reading_duration=60.0 + (idx * 17) % 240,
                    )
                )

        db.bulk_save_objects(pending_interactions)
        db.commit()
        print("Seed complete.")
        print(f"  News articles:      {len(articles)}")
        print(f"  Users:              {len(users)} ({len(demo_users)} demo personas)")
        print(f"  Interactions:       {len(pending_interactions)}")
        print(f"  Demo login password for all personas: {DEFAULT_DEMO_PASSWORD}")
        print("  Demo emails: " + ", ".join(u.email for u in demo_users))
    finally:
        db.close()


if __name__ == "__main__":
    seed()
