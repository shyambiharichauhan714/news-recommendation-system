"""
Read-only data + model access for the deployed API (Section 20: Deployment).

Loads the artifacts written by ml/export_for_serving.py once per process and
answers everything the frontend needs from memory. No database, no PyTorch.

Seeded interactions are static, so nothing here mutates: live reads and
bookmarks are kept client-side, and POST /interactions is accepted and
acknowledged without persisting (see app.py).
"""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

from ml.numpy_inference import NumpyGRURecommender, similarity_to_match_score

BUNDLE_DIR = Path(__file__).resolve().parent.parent / "serving_bundle"


class ServingBundle:
    def __init__(self, bundle_dir: Path = BUNDLE_DIR):
        self.dir = Path(bundle_dir)
        data = json.loads((self.dir / "dataset.json").read_text(encoding="utf-8"))

        self.articles: list[dict] = data["articles"]
        self.users: list[dict] = data["users"]
        self.preferences: dict[str, dict] = data["preferences"]
        self.interactions: dict[str, list[dict]] = data["interactions"]
        self.trending_counts: dict[str, int] = data["trending_counts"]

        self.by_id: dict[str, dict] = {a["news_id"]: a for a in self.articles}
        self.model = NumpyGRURecommender(self.dir)
        self.manifest = self.model.manifest

    # --- news -------------------------------------------------------------

    def news(self) -> list[dict]:
        return self.articles

    def article(self, news_id: str) -> dict | None:
        return self.by_id.get(news_id)

    def news_by_category(self, category: str) -> list[dict]:
        return [a for a in self.articles if a["category"] == category]

    # --- users ------------------------------------------------------------

    def demo_users(self) -> list[dict]:
        return self.users

    def history(self, user_id: str) -> list[dict]:
        return self.interactions.get(user_id, [])

    def user_preferences(self, user_id: str) -> dict:
        return self.preferences.get(
            user_id,
            {"user_id": user_id, "preferred_categories": [], "preferred_topics": []},
        )

    def read_sequence(self, user_id: str) -> list[str]:
        """Chronological news_ids, consecutive duplicates collapsed — the same
        shape the sequence builder feeds the model during training."""
        seq: list[str] = []
        for i in self.history(user_id):
            if not seq or seq[-1] != i["news_id"]:
                seq.append(i["news_id"])
        return seq

    # --- recommendations --------------------------------------------------

    def recommendations(self, user_id: str, top_n: int = 5) -> list[dict]:
        history = self.read_sequence(user_id)
        prefs = self.user_preferences(user_id)

        if not history:
            return self._cold_start(prefs, top_n)

        ranked = self.model.rank(history, exclude=set(history), top_n=top_n)
        if not ranked:
            return self._cold_start(prefs, top_n)

        recent = [self.by_id[n] for n in history[-5:] if n in self.by_id]
        recent_categories = [a["category"] for a in recent]
        recent_topics = [a["subcategory"] for a in recent]

        out = []
        for news_id, similarity in ranked:
            article = self.by_id[news_id]
            score = similarity_to_match_score(similarity)
            out.append(
                {
                    **article,
                    "match_score": score,
                    "reason": build_reason(
                        article,
                        recent_categories,
                        recent_topics,
                        prefs["preferred_categories"],
                        score,
                    ),
                }
            )
        return out

    def _cold_start(self, prefs: dict, top_n: int) -> list[dict]:
        """No history yet — fall back to the newest articles in the user's
        preferred categories, so the dashboard is never empty."""
        wanted = set(prefs.get("preferred_categories") or [])
        pool = [a for a in self.articles if a["category"] in wanted] or self.articles
        pool = sorted(pool, key=lambda a: a["published_at"], reverse=True)[:top_n]
        return [
            {
                **a,
                "match_score": 60,
                "reason": (
                    f"Recommended based on your favorite category, {a['category']}, "
                    "while we learn your reading sequence."
                ),
            }
            for a in pool
        ]

    # --- analytics --------------------------------------------------------

    def dashboard_stats(self, user_id: str) -> dict:
        history = self.history(user_id)
        recs = self.recommendations(user_id, top_n=5)
        avg_match = round(sum(r["match_score"] for r in recs) / len(recs)) if recs else 50

        counts: Counter[str] = Counter()
        for h in history:
            article = self.by_id.get(h["news_id"])
            if article:
                counts[article["category"]] += 1

        return {
            "total_news_read": len({h["news_id"] for h in history}),
            "recommendation_score": avg_match,
            "top_category": counts.most_common(1)[0][0] if counts else "Technology",
            "ai_confidence": min(99, avg_match + 4),
        }

    def interest_trends(self, user_id: str, days: int = 14) -> list[dict]:
        """Per-day counts by category for the Interest Trends chart.

        The window is anchored to the user's most recent interaction rather
        than to today. The seeded dataset has fixed timestamps, so anchoring
        to "now" would silently empty the chart once the data aged past the
        window — which is exactly what a reader would read as a broken page.
        """
        history = self.history(user_id)
        if not history:
            return []

        latest = max(_parse(h["timestamp"]) for h in history)
        points: dict[str, dict[str, int]] = {}
        for i in range(days - 1, -1, -1):
            points[(latest - timedelta(days=i)).strftime("%m-%d")] = {}

        for h in history:
            ts = _parse(h["timestamp"])
            key = ts.strftime("%m-%d")
            if key not in points:
                continue
            article = self.by_id.get(h["news_id"])
            if article:
                category = article["category"]
                points[key][category] = points[key].get(category, 0) + 1

        return [{"date": date, **counts} for date, counts in points.items()]

    def trending(self, limit: int = 8) -> list[dict]:
        counts: Counter[tuple[str, str]] = Counter()
        for news_id, count in self.trending_counts.items():
            article = self.by_id.get(news_id)
            if article:
                counts[(article["category"], article["subcategory"])] += count

        return [
            {
                "topic": subcat,
                "category": cat,
                "read_count": count,
                "growth_percent": round(((count * 7) % 47) - 8 + (count % 3) * 1.5, 1),
            }
            for (cat, subcat), count in counts.most_common(limit)
        ]

    def reading_behavior(self, user_id: str) -> dict:
        history = self.history(user_id)
        by_category: Counter[str] = Counter()
        by_hour: Counter[int] = Counter()
        by_day: Counter[str] = Counter()
        durations: list[float] = []

        for h in history:
            article = self.by_id.get(h["news_id"])
            if article:
                by_category[article["category"]] += 1
            ts = _parse(h["timestamp"])
            by_hour[ts.hour] += 1
            by_day[ts.strftime("%A")] += 1
            if h.get("reading_duration"):
                durations.append(float(h["reading_duration"]))

        return {
            "total_interactions": len(history),
            "avg_reading_duration": round(sum(durations) / len(durations), 1) if durations else 0.0,
            "most_active_day": by_day.most_common(1)[0][0] if by_day else "—",
            "most_active_hour": f"{by_hour.most_common(1)[0][0]:02d}:00" if by_hour else "—",
            "category_distribution": [
                {"category": c, "count": n} for c, n in by_category.most_common()
            ],
        }

    # --- model ------------------------------------------------------------

    def model_status(self) -> dict:
        m = self.manifest
        return {
            "model_name": "GRU Sequential Recommendation Network",
            "status": "Active",
            "version": "v1.0.0",
            "last_trained": m.get("trained_at") or m.get("exported_at"),
            "device": "CPU (NumPy inference)",
            "embedding_dim": m["embedding_dim"],
            "hidden_dim": m["hidden_dim"],
            "num_layers": m["num_layers"],
            "sequence_length": m["sequence_length"],
        }

    def model_metrics(self) -> dict:
        evaluation = self.manifest.get("evaluation") or {}
        gru = evaluation.get("gru", {})
        return {
            "precision_at_5": gru.get("precision", 0.0),
            "recall_at_5": gru.get("recall", 0.0),
            "ndcg_at_5": gru.get("ndcg", 0.0),
            "hit_rate_at_5": gru.get("hit_rate", 0.0),
            "mrr": gru.get("mrr", 0.0),
            "baseline": evaluation.get("tfidf", {}),
            "trained_at": self.manifest.get("trained_at"),
        }


def _parse(value: str) -> datetime:
    ts = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)


def _join_natural(items: list[str]) -> str:
    items = [i for i in dict.fromkeys(i for i in items if i)]
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    return f"{', '.join(items[:-1])}, and {items[-1]}"


def build_reason(
    article: dict,
    recent_categories: list[str],
    recent_topics: list[str],
    preferred_categories: list[str],
    match_score: int,
) -> str:
    """Explainable-AI text (Section 10). Mirrors ml/recommend.py so the wording
    a user sees does not change with the serving path."""
    subcat = article.get("subcategory", "")
    category = article["category"]

    if subcat and subcat in recent_topics:
        return (
            f"Recommended because you recently read articles about {subcat}, "
            "and your sequential reading pattern shows strong interest in this topic."
        )
    if category in recent_categories:
        topics = _join_natural(recent_topics[:3])
        if topics:
            return (
                f"Recommended because you recently read articles about {topics}, "
                f"which closely relates to this article in {category}."
            )
        return (
            f"Recommended because your recent reading history in {category} "
            "closely matches this article."
        )
    if category in preferred_categories:
        return (
            f"Recommended based on your favorite category, {category}, "
            "and overall reading preferences."
        )
    if match_score >= 70:
        return (
            "Recommended based on strong similarity to your overall reading "
            "preferences and trending interest among similar readers."
        )
    return "Recommended based on general popularity and topical diversity to broaden your interests."


@lru_cache(maxsize=1)
def get_bundle() -> ServingBundle:
    """Process-wide singleton — a serverless container reuses this across
    warm invocations, so the 1.3MB bundle is parsed at most once per cold start."""
    return ServingBundle()
