"""
GRU-based sequential recommendation model (Section 8: GRU Model).

Architecture (matches the spec in Section 8):

    Input News Embeddings (pretrained, frozen — from embeddings.py)
            |
            v
    Projection Layer (Linear: embedding_dim -> hidden_dim)
            |
            v
    GRU Layer(s)
            |
            v
    Dropout
            |
            v
    Dense Layer (hidden_dim -> embedding_dim)
            |
            v
    User Preference Representation (a vector in the same space as news
    embeddings, so it can be compared to candidate news via dot product /
    cosine similarity for ranking — see recommend.py)

All key hyperparameters are constructor arguments (Section 8: "Make the
following configurable"), sourced from app/config.py so they're set via
environment variables rather than hardcoded.
"""

from __future__ import annotations

import torch
import torch.nn as nn


class GRURecommender(nn.Module):
    """Sequential recommendation model: takes a sequence of news embeddings
    (a user's reading history) and predicts a "preference vector" used to
    score candidate news articles for next-item recommendation.
    """

    def __init__(
        self,
        embedding_dim: int = 384,
        hidden_dim: int = 128,
        num_layers: int = 2,
        dropout: float = 0.3,
    ):
        super().__init__()
        self.embedding_dim = embedding_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers

        # Projects raw news embeddings into the GRU's input space. Kept as a
        # separate learnable layer (rather than feeding embeddings directly)
        # so the model can learn task-specific feature scaling independent
        # of the frozen upstream embedding space.
        self.projection = nn.Linear(embedding_dim, hidden_dim)
        self.activation = nn.ReLU()

        self.gru = nn.GRU(
            input_size=hidden_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )

        self.dropout = nn.Dropout(dropout)

        # Dense layer maps the final GRU hidden state back into embedding
        # space, producing the "user preference representation" that is
        # compared against candidate news embeddings for ranking.
        self.dense = nn.Linear(hidden_dim, embedding_dim)

    def forward(self, sequence_embeddings: torch.Tensor, sequence_mask: torch.Tensor | None = None) -> torch.Tensor:
        """
        Args:
            sequence_embeddings: (batch, seq_len, embedding_dim) — the
                pretrained embeddings of each article in the user's recent
                reading sequence (oldest -> newest), with PAD positions
                zero-filled.
            sequence_mask: optional (batch, seq_len) boolean/0-1 tensor,
                True/1 for real (non-PAD) positions. If provided, the GRU's
                final hidden state is taken from each sequence's true last
                non-padded step rather than the last time step overall.

        Returns:
            user_preference: (batch, embedding_dim) — the predicted next-item
            preference vector, L2-normalized so it can be compared to
            candidate news embeddings via cosine similarity / dot product.
        """
        projected = self.activation(self.projection(sequence_embeddings))  # (B, T, H)
        gru_out, _ = self.gru(projected)  # (B, T, H)

        if sequence_mask is not None:
            # Gather the hidden state at each sequence's true last valid step.
            lengths = sequence_mask.sum(dim=1).clamp(min=1).long()  # (B,)
            last_indices = (lengths - 1).view(-1, 1, 1).expand(-1, 1, gru_out.size(-1))
            last_hidden = gru_out.gather(1, last_indices).squeeze(1)  # (B, H)
        else:
            last_hidden = gru_out[:, -1, :]  # (B, H)

        last_hidden = self.dropout(last_hidden)
        preference = self.dense(last_hidden)  # (B, embedding_dim)
        preference = nn.functional.normalize(preference, p=2, dim=-1)
        return preference

    def config_dict(self) -> dict:
        """Serializable hyperparameters, saved alongside model weights so
        the model can be reconstructed exactly at load time."""
        return {
            "embedding_dim": self.embedding_dim,
            "hidden_dim": self.hidden_dim,
            "num_layers": self.num_layers,
        }


def build_model_from_config(config: dict, dropout: float = 0.3) -> GRURecommender:
    """Reconstructs a GRURecommender from a saved config_dict()."""
    return GRURecommender(
        embedding_dim=config["embedding_dim"],
        hidden_dim=config["hidden_dim"],
        num_layers=config["num_layers"],
        dropout=dropout,
    )
