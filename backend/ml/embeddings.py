"""
News embedding generation (Section 6: NLP Pipeline, Section 3: Architecture
"Transformer / Sentence-BERT Embeddings").

Primary path: sentence-transformers (all-MiniLM-L6-v2, 384-dim), which
produces semantic embeddings from the combined title+description text.

Fallback path: if sentence-transformers isn't installed or the model can't
be downloaded (no internet access), automatically falls back to a TF-IDF
vectorizer reduced to the same dimensionality via TruncatedSVD, so the rest
of the pipeline (GRU training, recommendation ranking) works unchanged
regardless of which embedding backend produced the vectors. This lets
Section 6's "Compare TF-IDF baseline vs Transformer+GRU" evaluation run
even in offline/constrained environments — see evaluate.py, which trains a
GRU on each embedding source independently.

All embeddings are L2-normalized so downstream cosine-similarity / dot
product ranking in recommend.py behaves consistently.
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 384  # matches all-MiniLM-L6-v2 output size; TF-IDF fallback is reduced to match


def l2_normalize(matrix: np.ndarray) -> np.ndarray:
    """Row-wise L2 normalization (Section 6, step 6: normalize embeddings)."""
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return matrix / norms


class TfidfEmbedder:
    """Fallback embedding backend using TF-IDF + TruncatedSVD dimensionality
    reduction, so its output shape matches the transformer embedder's and
    can be swapped in transparently (Section 6: TF-IDF baseline comparison)."""

    name = "tfidf_svd"

    def __init__(self, dim: int = EMBEDDING_DIM):
        from sklearn.decomposition import TruncatedSVD
        from sklearn.feature_extraction.text import TfidfVectorizer

        self.dim = dim
        self.vectorizer = TfidfVectorizer(max_features=20000, ngram_range=(1, 2))
        self.svd = TruncatedSVD(n_components=dim, random_state=42)
        self._fitted = False

    def fit_transform(self, texts: list[str]) -> np.ndarray:
        tfidf_matrix = self.vectorizer.fit_transform(texts)
        n_components = min(self.dim, tfidf_matrix.shape[1] - 1, tfidf_matrix.shape[0] - 1)
        n_components = max(n_components, 2)
        if n_components != self.svd.n_components:
            from sklearn.decomposition import TruncatedSVD

            self.svd = TruncatedSVD(n_components=n_components, random_state=42)
        reduced = self.svd.fit_transform(tfidf_matrix)
        self._fitted = True
        return l2_normalize(reduced.astype(np.float32))

    def raw_tfidf(self, texts: list[str]) -> np.ndarray:
        """Returns the un-reduced TF-IDF matrix (dense) — used by the TF-IDF
        *baseline* recommender in evaluate.py, kept separate from the
        SVD-reduced version used to feed the GRU when transformers are
        unavailable.

        Fits the vectorizer on first use. The baseline evaluator constructs a
        standalone embedder purely to score the corpus, so there is no prior
        fit_transform() call to piggyback on; without this it raises
        NotFittedError.
        """
        try:
            from sklearn.utils.validation import check_is_fitted

            check_is_fitted(self.vectorizer)
            matrix = self.vectorizer.transform(texts)
        except Exception:
            matrix = self.vectorizer.fit_transform(texts)
        return matrix.toarray().astype(np.float32)


class TransformerEmbedder:
    """Primary embedding backend using Sentence-Transformers (Section 6)."""

    name = "sentence-transformers"

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        from sentence_transformers import SentenceTransformer

        self.model = SentenceTransformer(model_name)
        self.dim = self.model.get_sentence_embedding_dimension()

    def fit_transform(self, texts: list[str]) -> np.ndarray:
        embeddings = self.model.encode(
            texts, batch_size=32, show_progress_bar=False, convert_to_numpy=True
        )
        return l2_normalize(embeddings.astype(np.float32))


def get_embedder(model_name: str = "sentence-transformers/all-MiniLM-L6-v2", dim: int = EMBEDDING_DIM):
    """Attempts to load the transformer embedder; falls back to TF-IDF+SVD
    if sentence-transformers isn't installed or the model can't be fetched
    (e.g. no internet). Logs which backend was actually used."""
    try:
        embedder = TransformerEmbedder(model_name)
        logger.info("Using TransformerEmbedder (%s, dim=%d)", model_name, embedder.dim)
        return embedder
    except Exception as exc:  # ImportError, OSError (no internet), etc.
        logger.warning(
            "sentence-transformers unavailable (%s). Falling back to TF-IDF + SVD embeddings.",
            exc,
        )
        embedder = TfidfEmbedder(dim=dim)
        return embedder


def generate_news_embeddings(
    df: pd.DataFrame,
    text_column: str = "combined_text",
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
) -> tuple[np.ndarray, str]:
    """Generates L2-normalized embeddings for every row in df[text_column].

    Returns (embeddings, backend_name) where backend_name is either
    "sentence-transformers" or "tfidf_svd" depending on what was available.
    """
    texts = df[text_column].fillna("").tolist()
    embedder = get_embedder(model_name)
    embeddings = embedder.fit_transform(texts)
    return embeddings, embedder.name


def save_embeddings(embeddings: np.ndarray, news_ids: list[str], out_dir: Path) -> None:
    """Persists the embedding matrix + aligned news_id index to disk
    (Section 6, step 7: store processed news representations)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    np.save(out_dir / "news_embeddings.npy", embeddings)
    with open(out_dir / "news_embedding_ids.txt", "w") as f:
        f.write("\n".join(news_ids))


def load_embeddings(out_dir: Path) -> tuple[np.ndarray, list[str]]:
    """Loads a previously-saved embedding matrix + news_id index."""
    embeddings = np.load(out_dir / "news_embeddings.npy")
    with open(out_dir / "news_embedding_ids.txt") as f:
        news_ids = [line.strip() for line in f if line.strip()]
    return embeddings, news_ids
