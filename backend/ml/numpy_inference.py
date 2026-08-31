"""
Torch-free inference for the trained GRU recommender (Section 20: Deployment).

This mirrors GRURecommender.forward() exactly, in NumPy:

    projected   = ReLU(x @ Wp.T + bp)
    gru_out     = GRU(projected)              # num_layers, batch_first
    last_hidden = gru_out[last valid step]
    preference  = normalize(last_hidden @ Wd.T + bd)

Dropout is a no-op at inference, so it is simply omitted.

The point of this module is deployment size: `numpy` is ~20MB where a PyTorch
install is closer to 2GB, which is the difference between fitting in a
serverless function and not. Correctness against the PyTorch implementation is
covered by tests/test_numpy_inference.py, which asserts the two agree to
within float tolerance.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np


def _sigmoid(x: np.ndarray) -> np.ndarray:
    # Branchless-stable sigmoid: exp() is evaluated on non-positive input on
    # both sides, so large-magnitude activations can't overflow.
    out = np.empty_like(x)
    pos = x >= 0
    out[pos] = 1.0 / (1.0 + np.exp(-x[pos]))
    exp_x = np.exp(x[~pos])
    out[~pos] = exp_x / (1.0 + exp_x)
    return out


class NumpyGRURecommender:
    """Loads a serving bundle produced by ml/export_for_serving.py."""

    def __init__(self, bundle_dir: Path):
        self.bundle_dir = Path(bundle_dir)
        weights = np.load(self.bundle_dir / "weights.npz")
        self.w = {k: weights[k] for k in weights.files}

        manifest = json.loads((self.bundle_dir / "manifest.json").read_text())
        self.embedding_dim: int = manifest["embedding_dim"]
        self.hidden_dim: int = manifest["hidden_dim"]
        self.num_layers: int = manifest["num_layers"]
        self.sequence_length: int = manifest["sequence_length"]
        self.manifest = manifest

        self.embeddings: np.ndarray = np.load(self.bundle_dir / "embeddings.npy")
        self.news_ids: list[str] = json.loads((self.bundle_dir / "news_ids.json").read_text())
        self.index_of = {nid: i for i, nid in enumerate(self.news_ids)}

    # --- layers -----------------------------------------------------------

    def _project(self, x: np.ndarray) -> np.ndarray:
        """Linear(embedding_dim -> hidden_dim) followed by ReLU."""
        out = x @ self.w["projection.weight"].T + self.w["projection.bias"]
        return np.maximum(out, 0.0)

    def _gru_layer(self, x: np.ndarray, layer: int) -> np.ndarray:
        """One batch-first GRU layer over a (T, H) sequence.

        PyTorch packs the reset/update/new gates into a single tensor on axis
        0, in that order, for both the input-hidden and hidden-hidden weights.
        The `new` gate applies the reset gate to the *pre-activation* hidden
        term (r * (W_hn h + b_hn)), which is PyTorch's convention and differs
        from the original GRU paper — getting this wrong is the classic way
        a reimplementation silently diverges.
        """
        w_ih = self.w[f"gru.weight_ih_l{layer}"]
        w_hh = self.w[f"gru.weight_hh_l{layer}"]
        b_ih = self.w[f"gru.bias_ih_l{layer}"]
        b_hh = self.w[f"gru.bias_hh_l{layer}"]

        h_size = self.hidden_dim
        gi_all = x @ w_ih.T + b_ih  # (T, 3H)

        h = np.zeros(h_size, dtype=np.float32)
        outputs = np.empty((x.shape[0], h_size), dtype=np.float32)

        for t in range(x.shape[0]):
            gi = gi_all[t]
            gh = h @ w_hh.T + b_hh

            i_r, i_z, i_n = gi[:h_size], gi[h_size : 2 * h_size], gi[2 * h_size :]
            h_r, h_z, h_n = gh[:h_size], gh[h_size : 2 * h_size], gh[2 * h_size :]

            r = _sigmoid(i_r + h_r)
            z = _sigmoid(i_z + h_z)
            n = np.tanh(i_n + r * h_n)
            h = (1.0 - z) * n + z * h
            outputs[t] = h

        return outputs

    # --- public API -------------------------------------------------------

    def preference_vector(self, sequence_embeddings: np.ndarray) -> np.ndarray:
        """Maps one reading sequence (T, embedding_dim) to a preference vector.

        The caller passes only real (non-padded) steps, so the "last valid
        step" is simply the last row and no mask is needed.
        """
        if sequence_embeddings.ndim != 2 or sequence_embeddings.shape[0] == 0:
            raise ValueError("sequence_embeddings must be a non-empty (T, D) array")

        x = self._project(sequence_embeddings.astype(np.float32))
        for layer in range(self.num_layers):
            x = self._gru_layer(x, layer)

        last_hidden = x[-1]
        preference = last_hidden @ self.w["dense.weight"].T + self.w["dense.bias"]
        norm = np.linalg.norm(preference)
        return preference / norm if norm > 0 else preference

    def embed_sequence(self, news_ids: list[str]) -> np.ndarray | None:
        """Looks up embeddings for a history, keeping only the last
        `sequence_length` known articles. Returns None if none are known."""
        rows = [self.embeddings[self.index_of[n]] for n in news_ids if n in self.index_of]
        if not rows:
            return None
        return np.stack(rows[-self.sequence_length :])

    def rank(
        self,
        history: list[str],
        exclude: set[str] | None = None,
        top_n: int = 5,
    ) -> list[tuple[str, float]]:
        """Scores every candidate against the user's preference vector.

        Returns (news_id, similarity) pairs, best first. Similarity is a dot
        product; since both sides are L2-normalised it is cosine similarity,
        bounded to [-1, 1].
        """
        sequence = self.embed_sequence(history)
        if sequence is None:
            return []

        preference = self.preference_vector(sequence)
        scores = self.embeddings @ preference

        excluded = set(exclude or ()) | set(history)
        ranked = [
            (nid, float(scores[i]))
            for i, nid in enumerate(self.news_ids)
            if nid not in excluded
        ]
        ranked.sort(key=lambda pair: pair[1], reverse=True)
        return ranked[:top_n]


def similarity_to_match_score(similarity: float) -> int:
    """Maps cosine similarity in [-1, 1] onto a 0-100 display score.

    Kept identical to the PyTorch serving path so the number a user sees
    doesn't shift depending on which backend answered.
    """
    return int(round(max(0.0, min(1.0, (similarity + 1.0) / 2.0)) * 100))
