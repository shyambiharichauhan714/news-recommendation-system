"""
PyTorch Dataset/DataLoader utilities bridging sequence_builder.TrainingSample
objects (lists of news_ids) to embedding tensors consumable by GRURecommender.

Kept separate from sequence_builder.py (which is embedding-agnostic, pure
Python) so the same sequences can be re-embedded under different backends
(transformer vs TF-IDF) without rebuilding the sequences themselves —
exactly what evaluate.py needs to run the "TF-IDF vs Transformer+GRU"
comparison from Section 6.
"""

from __future__ import annotations

import numpy as np
import torch
from torch.utils.data import Dataset

from ml.sequence_builder import PAD_TOKEN, TrainingSample


class SequenceEmbeddingDataset(Dataset):
    """Wraps a list of TrainingSample, resolving each news_id to its
    embedding vector via a {news_id: embedding} lookup, with PAD_TOKEN
    mapped to a zero vector."""

    def __init__(
        self,
        samples: list[TrainingSample],
        news_id_to_embedding: dict[str, np.ndarray],
        embedding_dim: int,
    ):
        self.samples = samples
        self.embeddings = news_id_to_embedding
        self.embedding_dim = embedding_dim
        self.zero_vec = np.zeros(embedding_dim, dtype=np.float32)

        # Precompute a stable ordering of news_ids for target classification
        # (used only for reporting; ranking itself is done via similarity).
        self.news_ids = sorted(news_id_to_embedding.keys())
        self.news_id_to_index = {nid: i for i, nid in enumerate(self.news_ids)}

    def __len__(self) -> int:
        return len(self.samples)

    def _lookup(self, news_id: str) -> np.ndarray:
        if news_id == PAD_TOKEN:
            return self.zero_vec
        return self.embeddings.get(news_id, self.zero_vec)

    def __getitem__(self, idx: int):
        sample = self.samples[idx]
        seq_embeddings = np.stack([self._lookup(nid) for nid in sample.input_sequence])
        mask = np.array(
            [0.0 if nid == PAD_TOKEN else 1.0 for nid in sample.input_sequence], dtype=np.float32
        )
        target_embedding = self._lookup(sample.target_news_id)
        target_index = self.news_id_to_index.get(sample.target_news_id, -1)

        return {
            "sequence": torch.from_numpy(seq_embeddings).float(),
            "mask": torch.from_numpy(mask).float(),
            "target_embedding": torch.from_numpy(target_embedding).float(),
            "target_news_id": sample.target_news_id,
            "target_index": target_index,
            "user_id": sample.user_id,
        }


def collate_batch(batch: list[dict]) -> dict:
    """Default collation works fine here since all sequences share the same
    fixed length (from sequence_builder's sliding window), but this wrapper
    keeps non-tensor fields (news_id strings) as plain lists rather than
    letting PyTorch's default_collate mangle them."""
    return {
        "sequence": torch.stack([b["sequence"] for b in batch]),
        "mask": torch.stack([b["mask"] for b in batch]),
        "target_embedding": torch.stack([b["target_embedding"] for b in batch]),
        "target_news_id": [b["target_news_id"] for b in batch],
        "target_index": torch.tensor([b["target_index"] for b in batch], dtype=torch.long),
        "user_id": [b["user_id"] for b in batch],
    }
