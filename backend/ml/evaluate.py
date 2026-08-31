"""
Recommendation model evaluation (Section 11: Model Evaluation).

Computes standard top-K recommendation metrics on the held-out validation
samples produced by sequence_builder / train.py:

    Precision@K, Recall@K, NDCG@K, Hit Rate@K, MRR

For each validation sample (input_sequence -> target_news_id), we rank the
*entire* news catalog (minus articles already in the input sequence) by
similarity to the model's predicted preference vector, and check where the
true target lands in that ranking.

Also runs a TF-IDF baseline for direct comparison (Section 6 & 11: "Compare
TF-IDF Recommendation Baseline vs Transformer Embeddings + GRU Recommendation") —
the baseline scores candidates purely by TF-IDF cosine similarity to the
most recently read article, with no sequence modeling.

Run from the backend/ directory:
    python -m ml.evaluate
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import pandas as pd
import torch

from app.config import settings
from app.database import SessionLocal, init_db
from app.models.model_metrics import ModelMetrics
from app.models.news import News
from app.models.user_interaction import UserInteraction
from ml.embeddings import TfidfEmbedder, load_embeddings
from ml.gru_model import build_model_from_config
from ml.preprocessing import preprocess_news_dataframe
from ml.sequence_builder import (
    PAD_TOKEN,
    build_training_samples,
    build_user_sequences,
    train_val_split,
)
from ml.train import load_news_and_interactions

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("evaluate")

K = 5


def _rank_candidates(
    scores: dict[str, float], exclude: set[str], k: int
) -> list[str]:
    """Returns the top-k news_ids by score, excluding already-read articles."""
    candidates = [(nid, s) for nid, s in scores.items() if nid not in exclude]
    candidates.sort(key=lambda x: x[1], reverse=True)
    return [nid for nid, _ in candidates[:k]]


def precision_at_k(ranked: list[str], target: str, k: int) -> float:
    return 1.0 / k if target in ranked[:k] else 0.0


def recall_at_k(ranked: list[str], target: str, k: int) -> float:
    # With a single relevant item per sample, recall@k is binary (hit/miss).
    return 1.0 if target in ranked[:k] else 0.0


def ndcg_at_k(ranked: list[str], target: str, k: int) -> float:
    top_k = ranked[:k]
    if target not in top_k:
        return 0.0
    rank_position = top_k.index(target) + 1  # 1-indexed
    return 1.0 / np.log2(rank_position + 1)


def hit_rate_at_k(ranked: list[str], target: str, k: int) -> float:
    return 1.0 if target in ranked[:k] else 0.0


def reciprocal_rank(ranked: list[str], target: str) -> float:
    if target in ranked:
        return 1.0 / (ranked.index(target) + 1)
    return 0.0


def evaluate_gru(
    model, news_id_to_embedding: dict[str, np.ndarray], val_samples, sequence_length: int, k: int = K
) -> dict:
    """Evaluates the trained GRU model on held-out validation samples."""
    device = next(model.parameters()).device
    model.eval()

    all_news_ids = list(news_id_to_embedding.keys())
    embedding_dim = next(iter(news_id_to_embedding.values())).shape[0]

    metrics = {"precision": [], "recall": [], "ndcg": [], "hit_rate": [], "mrr": []}

    with torch.no_grad():
        for sample in val_samples:
            seq_vecs = np.stack(
                [
                    news_id_to_embedding.get(nid, np.zeros(embedding_dim, dtype=np.float32))
                    if nid != PAD_TOKEN
                    else np.zeros(embedding_dim, dtype=np.float32)
                    for nid in sample.input_sequence
                ]
            )
            mask = np.array(
                [0.0 if nid == PAD_TOKEN else 1.0 for nid in sample.input_sequence], dtype=np.float32
            )
            seq_tensor = torch.from_numpy(seq_vecs).float().unsqueeze(0).to(device)
            mask_tensor = torch.from_numpy(mask).float().unsqueeze(0).to(device)

            predicted = model(seq_tensor, mask_tensor).cpu().numpy()[0]  # (D,)

            scores = {
                nid: float(np.dot(predicted, news_id_to_embedding[nid])) for nid in all_news_ids
            }
            exclude = set(nid for nid in sample.input_sequence if nid != PAD_TOKEN)
            ranked = _rank_candidates(scores, exclude, k=max(k, 20))  # rank a bit deeper for MRR

            target = sample.target_news_id
            metrics["precision"].append(precision_at_k(ranked, target, k))
            metrics["recall"].append(recall_at_k(ranked, target, k))
            metrics["ndcg"].append(ndcg_at_k(ranked, target, k))
            metrics["hit_rate"].append(hit_rate_at_k(ranked, target, k))
            metrics["mrr"].append(reciprocal_rank(ranked, target))

    return {name: float(np.mean(vals)) if vals else 0.0 for name, vals in metrics.items()}


def evaluate_tfidf_baseline(
    news_df: pd.DataFrame, val_samples, k: int = K
) -> dict:
    """Baseline: ranks candidates by TF-IDF cosine similarity to the most
    recently read article in the input sequence (no sequence modeling,
    no GRU) — the comparison point described in Section 6 & 11."""
    embedder = TfidfEmbedder(dim=min(300, len(news_df)))
    tfidf_matrix = embedder.raw_tfidf(news_df["clean_text_tfidf"].tolist())
    news_ids = news_df["news_id"].tolist()
    id_to_row = {nid: tfidf_matrix[i] for i, nid in enumerate(news_ids)}

    norms = {nid: np.linalg.norm(vec) or 1.0 for nid, vec in id_to_row.items()}

    metrics = {"precision": [], "recall": [], "ndcg": [], "hit_rate": [], "mrr": []}

    for sample in val_samples:
        last_read = next(
            (nid for nid in reversed(sample.input_sequence) if nid != PAD_TOKEN), None
        )
        if last_read is None or last_read not in id_to_row:
            continue
        query_vec = id_to_row[last_read]
        query_norm = norms[last_read]

        scores = {}
        for nid, vec in id_to_row.items():
            sim = float(np.dot(query_vec, vec)) / (query_norm * norms[nid])
            scores[nid] = sim

        exclude = set(nid for nid in sample.input_sequence if nid != PAD_TOKEN)
        ranked = _rank_candidates(scores, exclude, k=max(k, 20))

        target = sample.target_news_id
        metrics["precision"].append(precision_at_k(ranked, target, k))
        metrics["recall"].append(recall_at_k(ranked, target, k))
        metrics["ndcg"].append(ndcg_at_k(ranked, target, k))
        metrics["hit_rate"].append(hit_rate_at_k(ranked, target, k))
        metrics["mrr"].append(reciprocal_rank(ranked, target))

    return {name: float(np.mean(vals)) if vals else 0.0 for name, vals in metrics.items()}


def run_full_evaluation() -> dict:
    """Loads the trained GRU + saved embeddings, re-derives the same
    train/val split used during training (same seed), evaluates both the
    GRU and the TF-IDF baseline, saves a ModelMetrics row, and returns a
    summary dict. Also used by POST /api/model/evaluate."""

    model_config_path = settings.saved_models_dir / "model_config.json"
    if not model_config_path.exists():
        raise RuntimeError("No trained model found. Run `python -m ml.train` first.")

    with open(model_config_path) as f:
        config = json.load(f)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = build_model_from_config(config, dropout=0.0).to(device)
    model.load_state_dict(torch.load(settings.saved_models_dir / "gru_recommender.pt", map_location=device))

    embeddings, news_ids = load_embeddings(settings.data_dir / "embeddings")
    news_id_to_embedding = {nid: embeddings[i] for i, nid in enumerate(news_ids)}

    news_records, interactions = load_news_and_interactions()
    news_df = preprocess_news_dataframe(pd.DataFrame(news_records))

    sequences = build_user_sequences(interactions)
    samples = build_training_samples(sequences, sequence_length=config["sequence_length"])
    _, val_samples = train_val_split(samples, val_ratio=0.15)

    if not val_samples:
        raise RuntimeError("No validation samples available — seed more interaction data.")

    logger.info("Evaluating GRU model on %d validation samples...", len(val_samples))
    gru_metrics = evaluate_gru(model, news_id_to_embedding, val_samples, config["sequence_length"], k=K)

    logger.info("Evaluating TF-IDF baseline for comparison...")
    tfidf_metrics = evaluate_tfidf_baseline(news_df, val_samples, k=K)

    with open(settings.saved_models_dir / "loss_history.json") as f:
        loss_history = json.load(f)

    result = {
        "model_name": "GRU Sequential Recommendation Network",
        "precision_at_5": gru_metrics["precision"],
        "recall_at_5": gru_metrics["recall"],
        "ndcg_at_5": gru_metrics["ndcg"],
        "hit_rate_at_5": gru_metrics["hit_rate"],
        "mrr": gru_metrics["mrr"],
        "train_loss": loss_history["train_loss"][-1],
        "val_loss": loss_history["val_loss"][-1],
        "epochs_trained": config["epochs_trained"],
        "baseline_comparison": {
            "tfidf_precision_at_5": tfidf_metrics["precision"],
            "tfidf_recall_at_5": tfidf_metrics["recall"],
            "tfidf_ndcg_at_5": tfidf_metrics["ndcg"],
            "tfidf_hit_rate_at_5": tfidf_metrics["hit_rate"],
        },
    }

    logger.info("GRU    — Precision@5=%.3f Recall@5=%.3f NDCG@5=%.3f HitRate@5=%.3f MRR=%.3f",
                gru_metrics["precision"], gru_metrics["recall"], gru_metrics["ndcg"],
                gru_metrics["hit_rate"], gru_metrics["mrr"])
    logger.info("TF-IDF — Precision@5=%.3f Recall@5=%.3f NDCG@5=%.3f HitRate@5=%.3f",
                tfidf_metrics["precision"], tfidf_metrics["recall"], tfidf_metrics["ndcg"],
                tfidf_metrics["hit_rate"])

    # Persist to DB (Section 4: MODEL_METRICS table) and to a JSON file for
    # the frontend's static demo-mode fallback consistency.
    init_db()
    db = SessionLocal()
    try:
        db.add(
            ModelMetrics(
                model_name=result["model_name"],
                precision_at_k=result["precision_at_5"],
                recall_at_k=result["recall_at_5"],
                ndcg_at_k=result["ndcg_at_5"],
                hit_rate=result["hit_rate_at_5"],
                mrr=result["mrr"],
                train_loss=result["train_loss"],
                val_loss=result["val_loss"],
                epochs_trained=result["epochs_trained"],
                k=K,
            )
        )
        db.commit()
    finally:
        db.close()

    with open(settings.saved_models_dir / "evaluation_results.json", "w") as f:
        json.dump(result, f, indent=2)

    return result


if __name__ == "__main__":
    run_full_evaluation()
