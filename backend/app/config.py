"""
Centralized application configuration.

All settings are loaded from environment variables (with sensible defaults
for local development), following 12-factor app principles (Section 19:
Code Quality — environment variables, no unnecessary hardcoding).

The DATABASE_URL is the single place that determines which database engine
SQLAlchemy talks to. Swapping SQLite for PostgreSQL later only requires
changing this one value — see database.py.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(BASE_DIR / ".env"), extra="ignore")

    # --- App ---
    app_name: str = "NewsMind AI API"
    debug: bool = True

    # --- Database ---
    # SQLite for the academic project; swap to a PostgreSQL DSN (e.g.
    # "postgresql://user:pass@host:5432/db") in production without any
    # code changes elsewhere — SQLAlchemy abstracts the dialect.
    database_url: str = f"sqlite:///{BASE_DIR / 'data' / 'newsmind.db'}"

    # --- Auth ---
    secret_key: str = "dev-only-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # --- CORS ---
    cors_origins: str = "http://localhost:3000"

    # --- ML / NLP ---
    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 384
    sequence_length: int = 5
    gru_hidden_dim: int = 128
    gru_num_layers: int = 2
    gru_dropout: float = 0.3
    learning_rate: float = 0.001
    batch_size: int = 32
    epochs: int = 40

    # --- Paths ---
    data_dir: Path = BASE_DIR / "data"
    saved_models_dir: Path = BASE_DIR / "saved_models"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton — avoids re-parsing env vars on every call."""
    return Settings()


settings = get_settings()
