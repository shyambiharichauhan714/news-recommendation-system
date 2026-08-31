"""Dataset generation and sequence building.

Two properties matter here. The generator must be deterministic, or a
re-seed silently invalidates an already-trained model. And personas must
keep unread articles inside their own categories, or the recommender is
forced off-persona simply because it has nothing left to suggest — a failure
that looks like a model bug but is really a data one.
"""

from __future__ import annotations

import pytest

from data.generate_dataset import generate_dataset, generate_news
from ml.sequence_builder import PAD_TOKEN, build_training_samples, build_user_sequences


# --- dataset generation ---------------------------------------------------


def test_generation_is_deterministic():
    first_articles, first_users = generate_dataset()
    second_articles, second_users = generate_dataset()

    assert [a.news_id for a in first_articles] == [a.news_id for a in second_articles]
    assert [a.title for a in first_articles] == [a.title for a in second_articles]
    assert [u.read_sequence for u in first_users] == [u.read_sequence for u in second_users]


def test_news_ids_are_unique():
    articles = generate_news()
    ids = [a.news_id for a in articles]
    assert len(ids) == len(set(ids))


def test_demo_personas_and_cohort_are_separable():
    _, users = generate_dataset()
    demo = [u for u in users if u.user_id.startswith("U")]
    cohort = [u for u in users if u.user_id.startswith("C")]
    assert len(demo) == 10
    assert len(cohort) > 100, "cohort must be large enough to fit a GRU"


def test_cohort_supplies_enough_training_samples():
    """10 personas alone yield ~1 sample at sequence_length 5 — far too few."""
    _, users = generate_dataset()
    sequences = {u.user_id: u.read_sequence for u in users}
    samples = build_training_samples(sequences, sequence_length=5)
    assert len(samples) > 1000, f"only {len(samples)} samples — training would collapse"


def test_personas_leave_unread_articles_in_their_categories():
    articles, users = generate_dataset()
    by_id = {a.news_id: a for a in articles}
    available = {}
    for a in articles:
        available[a.category] = available.get(a.category, 0) + 1

    for user in (u for u in users if u.user_id.startswith("U")):
        primary = user.preferred_categories[0]
        read_in_primary = len({n for n in user.read_sequence if by_id[n].category == primary})
        assert read_in_primary < available[primary], (
            f"{user.user_id} has read every {primary} article — "
            "the recommender would be pushed off-persona"
        )


def test_persona_reads_stay_within_preferred_categories():
    articles, users = generate_dataset()
    by_id = {a.news_id: a for a in articles}
    for user in (u for u in users if u.user_id.startswith("U")):
        categories = {by_id[n].category for n in user.read_sequence}
        assert categories <= set(user.preferred_categories), (
            f"{user.user_id} drifted into {categories - set(user.preferred_categories)}"
        )


# --- sequence builder -----------------------------------------------------


def test_consecutive_duplicates_collapse():
    interactions = [
        {"user_id": "U1", "news_id": "N1", "timestamp": 1},
        {"user_id": "U1", "news_id": "N1", "timestamp": 2},
        {"user_id": "U1", "news_id": "N2", "timestamp": 3},
        {"user_id": "U1", "news_id": "N1", "timestamp": 4},
    ]
    assert build_user_sequences(interactions)["U1"] == ["N1", "N2", "N1"]


def test_sequences_are_sorted_chronologically():
    interactions = [
        {"user_id": "U1", "news_id": "N3", "timestamp": 30},
        {"user_id": "U1", "news_id": "N1", "timestamp": 10},
        {"user_id": "U1", "news_id": "N2", "timestamp": 20},
    ]
    assert build_user_sequences(interactions)["U1"] == ["N1", "N2", "N3"]


def test_sliding_window_targets_the_next_article():
    samples = build_training_samples({"U1": ["A", "B", "C", "D", "E", "F"]}, sequence_length=3)
    assert [(s.input_sequence, s.target_news_id) for s in samples] == [
        (["A", "B", "C"], "D"),
        (["B", "C", "D"], "E"),
        (["C", "D", "E"], "F"),
    ]


def test_short_sequences_produce_no_samples():
    assert build_training_samples({"U1": ["A", "B"]}, sequence_length=5) == []


@pytest.mark.parametrize("sequence_length", [3, 5, 8])
def test_every_input_has_the_configured_length(sequence_length):
    samples = build_training_samples({"U1": [f"N{i}" for i in range(20)]}, sequence_length=sequence_length)
    assert samples
    assert all(len(s.input_sequence) == sequence_length for s in samples)
    assert all(PAD_TOKEN not in s.input_sequence for s in samples)
