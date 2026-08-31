"""
SQLAlchemy engine, session factory, and declarative base.

Designed so the only thing that changes when moving from SQLite (this
academic project) to PostgreSQL (production) is the DATABASE_URL setting —
no model or query code needs to change, since we use SQLAlchemy's ORM
throughout rather than raw SQLite-specific SQL.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

# `connect_args` is only needed for SQLite (allows use across FastAPI's
# threaded request handling). It's a no-op / omitted for PostgreSQL.
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all ORM models (see app/models/)."""

    pass


def get_db():
    """FastAPI dependency that yields a DB session and ensures it's closed."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables. Called on startup and by the seed script."""
    # Import models so they're registered on Base.metadata before create_all.
    from app.models import (  # noqa: F401
        news,
        user,
        user_interaction,
        user_preferences,
        model_metrics,
    )

    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.saved_models_dir.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
