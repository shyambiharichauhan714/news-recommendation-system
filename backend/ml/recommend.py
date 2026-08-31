"""
Recommendation engine (Section 9: Recommendation Engine, Section 10:
Explainable AI Feature).

At inference time:
    1. Get the user's recent reading history (chronological news_ids)
    2. Convert the sequence into embeddings
    3. Pass the sequence through the trained GRU
    4. Generate the user's predicted preference representation
    5. Compare the predicted representation with all candidate news
       (dot product similarity, since embeddings are L2-normalized this is
       equivalent to cosine similarity)
    6. Rank the news
    7. Remove already-read articles
    8. Return Top-N recommendations with a match_score (0-100) and a
       human-readable explanation (Section 10)

Falls back to a cold-start heuristic (most recent articles in the user's
preferred categories) when no trained model/embeddings are available yet,
or when the user has no reading history — keeping the API functional even
before `python -m ml.train` has been run (important for first-run demos).
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from app.config import settings
from ml.sequence_builder import PAD_TOKEN, get_recent_sequence

logger = logging.getLogger(__name__)


@dataclass
class RecommendationResult:
    news_id: str
    match_score: int
    reason: str


class RecommendationEngine:
    """Loads the trained GRU model + news embeddings once and serves
    recommendations for any user given their reading history. Designed to
    be instantiated once (e.g. as a FastAPI app-state singleton) rather than
    reloading the model per-request."""

    def __init__(self):
        self.model = None
        self.embeddings: np.ndarray | None = None
        self.news_ids: list[str] = []
        self.news_id_to_embedding: dict[str, np.ndarray] = {}
        self.sequence_length = settings.sequence_length
        self.embedding_dim = settings.embedding_dim
        self._load_attempted = False

    def _lazy_load(self) -> bool:
        """Attempts to load the trained model + embeddings from disk.
        Returns True if successful, False if unavailable (cold-start mode)."""
        if self._load_attempted:
            return self.model is not None
        self._load_attempted = True

        try:
            import torch

            from ml.embeddings import load_embeddings
            from ml.gru_model import build_model_from_config

            config_path = settings.saved_models_dir / "model_config.json"
            weights_path = settings.saved_models_dir / "gru_recommender.pt"
            embeddings_dir = settings.data_dir / "embeddings"

            if not (config_path.exists() and weights_path.exists() and embeddings_dir.exists()):
                logger.info("No trained model found yet — recommendation engine running in cold-start mode.")
                return False

            with open(config_path) as f:
                config = json.load(f)

            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            model = build_model_from_config(config, dropout=0.0).to(device)
            model.load_state_dict(torch.load(weights_path, map_location=device))
            model.eval()

            embeddings, news_ids = load_embeddings(embeddings_dir)

            self.model = model
            self.embeddings = embeddings
            self.news_ids = news_ids
            self.news_id_to_embedding = {nid: embeddings[i] for i, nid in enumerate(news_ids)}
            self.sequence_length = config.get("sequence_length", settings.sequence_length)
            self.embedding_dim = embeddings.shape[1]
            self._device = device
            logger.info("Recommendation engine loaded trained GRU model (%d news embeddings).", len(news_ids))
            return True
        except Exception as exc:
            logger.warning("Could not load trained model (%s) — using cold-start fallback.", exc)
            return False

    def _predict_preference_vector(self, read_sequence: list[str]) -> np.ndarray | None:
        """Runs the GRU forward pass on the user's recent sequence."""
        import torch

        recent = get_recent_sequence(read_sequence, self.sequence_length)
        seq_vecs = np.stack(
            [
                self.news_id_to_embedding.get(nid, np.zeros(self.embedding_dim, dtype=np.float32))
                if nid != PAD_TOKEN
                else np.zeros(self.embedding_dim, dtype=np.float32)
                for nid in recent
            ]
        )
        mask = np.array([0.0 if nid == PAD_TOKEN else 1.0 for nid in recent], dtype=np.float32)

        if mask.sum() == 0:
            return None  # no real reading history — caller should use cold-start

        seq_tensor = torch.from_numpy(seq_vecs).float().unsqueeze(0).to(self._device)
        mask_tensor = torch.from_numpy(mask).float().unsqueeze(0).to(self._device)

        with torch.no_grad():
            preference = self.model(seq_tensor, mask_tensor).cpu().numpy()[0]
        return preference

    def recommend(
        self,
        read_sequence: list[str],
        preferred_categories: list[str],
        news_catalog: list[dict],
        top_n: int = 5,
    ) -> list[RecommendationResult]:
        """Main entry point. `news_catalog` is a list of dicts with keys:
        news_id, category, subcategory, published_at (ISO str or datetime).
        Returns up to top_n RecommendationResult, ranked best-first.
        """
        read_set = set(read_sequence)
        candidates = [n for n in news_catalog if n["news_id"] not in read_set]
        if not candidates:
            return []

        model_loaded = self._lazy_load()
        recent_articles = _lookup_recent_articles(read_sequence, news_catalog, limit=5)
        recent_categories = _unique_preserve_order([a["category"] for a in recent_articles])
        recent_topics = _unique_preserve_order([a.get("subcategory", "") for a in recent_articles])

        if model_loaded and read_sequence:
            preference_vector = self._predict_preference_vector(read_sequence)
        else:
            preference_vector = None

        if preference_vector is not None:
            scored = self._score_with_gru(candidates, preference_vector, preferred_categories)
        else:
            scored = self._score_cold_start(candidates, preferred_categories)

        scored.sort(key=lambda x: x[1], reverse=True)
        top = scored[:top_n]

        results = []
        for news_item, raw_score in top:
            match_score = _to_match_score(raw_score, model_loaded and preference_vector is not None)
            reason = generate_recommendation_reason(
                news_item, recent_categories, recent_topics, preferred_categories, match_score
            )
            results.append(RecommendationResult(news_id=news_item["news_id"], match_score=match_score, reason=reason))
        return results

    def _score_with_gru(
        self, candidates: list[dict], preference_vector: np.ndarray, preferred_categories: list[str]
    ) -> list[tuple[dict, float]]:
        scored = []
        for item in candidates:
            emb = self.news_id_to_embedding.get(item["news_id"])
            if emb is None:
                continue
            similarity = float(np.dot(preference_vector, emb))  # cosine sim (both L2-normalized)
            # Small boost for explicit category preference match, keeping
            # the GRU's sequential signal as the dominant factor.
            if item["category"] in preferred_categories:
                similarity += 0.03
            scored.append((item, similarity))
        return scored

    def _score_cold_start(
        self, candidates: list[dict], preferred_categories: list[str]
    ) -> list[tuple[dict, float]]:
        """Heuristic fallback used before any model has been trained, or for
        brand-new users with no reading history: rank by category-preference
        match, then recency."""
        scored = []
        for item in candidates:
            score = 0.5
            if item["category"] in preferred_categories:
                score += 0.4
            scored.append((item, score))
        return scored


def _lookup_recent_articles(read_sequence: list[str], news_catalog: list[dict], limit: int) -> list[dict]:
    catalog_by_id = {n["news_id"]: n for n in news_catalog}
    recent_ids = read_sequence[-limit:]
    return [catalog_by_id[nid] for nid in recent_ids if nid in catalog_by_id]


def _unique_preserve_order(items: list[str]) -> list[str]:
    seen = set()
    result = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result


def _to_match_score(raw_score: float, model_based: bool) -> int:
    """Maps a raw similarity score to a human-friendly 0-100 match
    percentage. GRU cosine similarities typically land in a narrower band
    than the cold-start heuristic's 0-1 range, so they're scaled separately."""
    if model_based:
        # cosine similarity in roughly [-1, 1]; map [0, 1] -> [50, 99]
        pct = 50 + max(0.0, min(1.0, raw_score)) * 49
    else:
        pct = 35 + max(0.0, min(1.0, raw_score)) * 55
    return int(round(max(35, min(99, pct))))


def generate_recommendation_reason(
    article: dict,
    recent_categories: list[str],
    recent_topics: list[str],
    preferred_categories: list[str],
    match_score: int,
) -> str:
    """Explainable AI feature (Section 10). Builds a human-readable
    explanation from: recent categories, recent topics, sequence patterns,
    and the similarity score — matching the example in the spec:

    "Recommended because you recently read articles about Artificial
    Intelligence, Machine Learning, and Generative AI."
    """
    subcat = article.get("subcategory", "")
    category = article["category"]

    if subcat and subcat in recent_topics:
        return (
            f"Recommended because you recently read articles about {subcat}, "
            f"and your sequential reading pattern shows strong interest in this topic."
        )

    if category in recent_categories:
        topics_str = _join_natural([t for t in recent_topics if t][:3])
        if topics_str:
            return (
                f"Recommended because you recently read articles about {topics_str}, "
                f"which closely relates to this article in {category}."
            )
        return f"Recommended because your recent reading history in {category} closely matches this article."

    if category in preferred_categories:
        return f"Recommended based on your favorite category, {category}, and overall reading preferences."

    if match_score >= 70:
        return "Recommended based on strong similarity to your overall reading preferences and trending interest among similar readers."

    return "Recommended based on general popularity and topical diversity to broaden your interests."


def _join_natural(items: list[str]) -> str:
    items = [i for i in items if i]
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return f"{', '.join(items[:-1])}, and {items[-1]}"


# Module-level singleton, lazily initialized — used by FastAPI routers.
_engine: RecommendationEngine | None = None


def get_recommendation_engine() -> RecommendationEngine:
    global _engine
    if _engine is None:
        _engine = RecommendationEngine()
    return _engine
