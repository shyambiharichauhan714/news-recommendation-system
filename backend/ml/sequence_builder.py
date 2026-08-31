"""
User behavior sequence builder (Section 7: User Behavior Sequence — "the
most important part of the project").

Converts raw UserInteraction rows into chronological per-user sequences of
news_ids, then produces (input_sequence, target) training samples using a
sliding window of configurable SEQUENCE_LENGTH.

Example (SEQUENCE_LENGTH=3):
    User 1 sequence: N001 -> N015 -> N032 -> N087 -> N054
    Samples:
        input=[N001, N015, N032] -> target=N087
        input=[N015, N032, N087] -> target=N054

Sequences shorter than SEQUENCE_LENGTH + 1 are left-padded with a special
PAD token so every batch has uniform shape, and padding is masked out in
the GRU forward pass (see gru_model.py).
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

PAD_TOKEN = "<PAD>"

DEFAULT_SEQUENCE_LENGTH = 5


@dataclass
class TrainingSample:
    user_id: str
    input_sequence: list[str]  # length == sequence_length, oldest -> newest, PAD-left-padded
    target_news_id: str


def build_user_sequences(interactions: list[dict]) -> dict[str, list[str]]:
    """Groups interactions by user_id and sorts each group chronologically
    by timestamp, returning {user_id: [news_id, news_id, ...]}.

    `interactions` is a list of dicts with keys: user_id, news_id, timestamp
    (any sortable value — datetime or ISO string).
    Consecutive duplicate news_ids (e.g. a 'view' immediately followed by a
    'read' of the same article) are collapsed to a single sequence entry,
    since we're modeling *which articles* a user engages with in order, not
    every individual interaction event.
    """
    grouped: dict[str, list[dict]] = defaultdict(list)
    for interaction in interactions:
        grouped[interaction["user_id"]].append(interaction)

    sequences: dict[str, list[str]] = {}
    for user_id, events in grouped.items():
        events_sorted = sorted(events, key=lambda e: e["timestamp"])
        seq: list[str] = []
        for e in events_sorted:
            if not seq or seq[-1] != e["news_id"]:
                seq.append(e["news_id"])
        sequences[user_id] = seq
    return sequences


def build_training_samples(
    sequences: dict[str, list[str]],
    sequence_length: int = DEFAULT_SEQUENCE_LENGTH,
) -> list[TrainingSample]:
    """Slides a window of `sequence_length` over each user's sequence to
    produce (input, target) samples (Section 7).

    For a sequence of length N, this produces max(0, N - sequence_length)
    samples. Sequences with fewer than sequence_length + 1 items are
    skipped (not enough signal for a meaningful next-item prediction),
    matching standard sequential-recommendation practice.
    """
    samples: list[TrainingSample] = []
    for user_id, seq in sequences.items():
        if len(seq) < sequence_length + 1:
            continue
        for i in range(len(seq) - sequence_length):
            window = seq[i : i + sequence_length]
            target = seq[i + sequence_length]
            samples.append(TrainingSample(user_id=user_id, input_sequence=window, target_news_id=target))
    return samples


def get_recent_sequence(
    full_sequence: list[str],
    sequence_length: int = DEFAULT_SEQUENCE_LENGTH,
) -> list[str]:
    """Returns the most recent `sequence_length` items from a user's full
    read history, left-padded with PAD_TOKEN if shorter. Used at inference
    time by recommend.py to build the input for the trained GRU."""
    recent = full_sequence[-sequence_length:]
    if len(recent) < sequence_length:
        recent = [PAD_TOKEN] * (sequence_length - len(recent)) + recent
    return recent


def train_val_split(
    samples: list[TrainingSample], val_ratio: float = 0.15, seed: int = 42
) -> tuple[list[TrainingSample], list[TrainingSample]]:
    """Splits training samples into train/validation sets. Uses a fixed
    seed for reproducibility (important for the academic report's reported
    metrics to be consistent across re-runs)."""
    import random

    rng = random.Random(seed)
    shuffled = samples.copy()
    rng.shuffle(shuffled)
    split_idx = int(len(shuffled) * (1 - val_ratio))
    return shuffled[:split_idx], shuffled[split_idx:]
