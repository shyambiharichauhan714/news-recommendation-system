"""Contract tests for the deployed API.

The frontend consumes these routes directly, and a shape change here breaks
the dashboard with no build error to catch it — so each test asserts the
fields the UI actually reads, not just a 200.
"""

from __future__ import annotations

import pytest

DEMO_USER = "U001"


def test_health(client):
    body = client.get("/api/health").json()
    assert body["status"] == "healthy"
    assert body["inference"] == "numpy"
    assert body["articles"] > 0


def test_news_list_shape(client):
    articles = client.get("/api/news").json()
    assert len(articles) > 0
    required = {
        "news_id", "title", "description", "content", "category",
        "subcategory", "author", "published_at", "read_time_minutes",
    }
    assert required <= set(articles[0])


def test_single_article_and_404(client):
    first = client.get("/api/news").json()[0]
    assert client.get(f"/api/news/{first['news_id']}").json()["title"] == first["title"]
    assert client.get("/api/news/NOPE-404").status_code == 404


def test_demo_users_exclude_training_cohort(client):
    """The cohort exists to fit the model; only personas are selectable."""
    users = client.get("/api/users/demo").json()
    assert len(users) > 0
    assert all(u["id"].startswith("U") for u in users), "cohort ids leaked into the switcher"


def test_recommendations_shape_and_bounds(client):
    recs = client.get(f"/api/recommendations/{DEMO_USER}?top_n=4").json()
    assert len(recs) == 4
    for r in recs:
        assert 0 <= r["match_score"] <= 100
        assert r["reason"], "every recommendation must carry an explanation"
        assert {"news_id", "title", "category"} <= set(r)


def test_recommendations_are_ranked_descending(client):
    scores = [r["match_score"] for r in client.get(f"/api/recommendations/{DEMO_USER}?top_n=8").json()]
    assert scores == sorted(scores, reverse=True)


def test_recommendations_exclude_already_read(client, bundle):
    already_read = set(bundle.read_sequence(DEMO_USER))
    recs = client.get(f"/api/recommendations/{DEMO_USER}?top_n=10").json()
    assert not ({r["news_id"] for r in recs} & already_read)


def test_recommendations_match_user_persona(client):
    """A persona's top recommendation should sit inside their stated interests.

    This is the check that catches a corrupted or mis-ordered reading history:
    the model is only as good as the sequence it is fed.
    """
    for user in client.get("/api/users/demo").json():
        prefs = client.get(f"/api/users/{user['id']}/preferences").json()
        categories = set(prefs["preferred_categories"])
        if not categories:
            continue
        top = client.get(f"/api/recommendations/{user['id']}?top_n=1").json()
        assert top, f"{user['id']} got no recommendations"
        assert top[0]["category"] in categories, (
            f"{user['id']} ({user['persona']}) was recommended "
            f"{top[0]['category']}, outside {sorted(categories)}"
        )


def test_dashboard_stats(client):
    stats = client.get(f"/api/analytics/dashboard/{DEMO_USER}").json()
    assert stats["total_news_read"] >= 0
    assert 0 <= stats["recommendation_score"] <= 100
    assert 0 <= stats["ai_confidence"] <= 99
    assert stats["top_category"]


def test_interest_trends_window(client):
    points = client.get(f"/api/analytics/interests/{DEMO_USER}?days=14").json()
    assert len(points) == 14
    assert all("date" in p for p in points)
    # Anchored to the latest interaction, so a static dataset never empties out.
    assert any(len(p) > 1 for p in points), "every day is empty — window anchoring is wrong"


def test_trending_topics(client):
    topics = client.get("/api/analytics/trending?limit=6").json()
    assert len(topics) == 6
    counts = [t["read_count"] for t in topics]
    assert counts == sorted(counts, reverse=True)
    assert all({"topic", "category", "read_count", "growth_percent"} <= set(t) for t in topics)


def test_model_status(client):
    status = client.get("/api/model/status").json()
    assert status["status"] == "Active"
    assert status["embedding_dim"] > 0
    assert status["sequence_length"] > 0


def test_interaction_accepted_but_not_persisted(client):
    """The deployment is read-only; the client owns live activity."""
    body = client.post(
        "/api/interactions/read",
        json={"user_id": DEMO_USER, "news_id": "N001", "reading_duration": 42.0},
    ).json()
    assert body["success"] is True
    assert body["persisted"] is False


@pytest.mark.parametrize("path", [
    "/api/news",
    "/api/users/demo",
    f"/api/users/{DEMO_USER}/history",
    f"/api/users/{DEMO_USER}/preferences",
    f"/api/recommendations/{DEMO_USER}",
    f"/api/analytics/dashboard/{DEMO_USER}",
    f"/api/analytics/interests/{DEMO_USER}",
    "/api/analytics/trending",
    "/api/model/status",
    "/api/model/metrics",
])
def test_every_frontend_route_responds(client, path):
    """Guards the full set of paths services/api.ts calls."""
    assert client.get(path).status_code == 200
