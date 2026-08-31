"""
GRU model training script (Section 8: GRU Model, Section 20 Phase 6).

Pipeline:
    1. Load news + interactions from the database
    2. Preprocess news text and generate embeddings (ml/preprocessing.py, ml/embeddings.py)
    3. Build user sequences and sliding-window training samples (ml/sequence_builder.py)
    4. Train the GRU on a next-item-prediction objective using cosine
       embedding loss (pulls the predicted user-preference vector toward the
       true next article's embedding, and away from random negatives)
    5. Save the trained model + config + embeddings to backend/saved_models/

Run from the backend/ directory:
    python -m ml.train
    python -m ml.train --epochs 20 --batch-size 64 --lr 0.0005

All hyperparameters default to app/config.py settings (env-var configurable,
Section 8: "Make the following configurable").
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from app.config import settings
from app.database import SessionLocal, init_db
from app.models.news import News
from app.models.user_interaction import UserInteraction
from ml.data_loader import SequenceEmbeddingDataset, collate_batch
from ml.embeddings import generate_news_embeddings, save_embeddings
from ml.gru_model import GRURecommender
from ml.preprocessing import preprocess_news_dataframe
from ml.sequence_builder import (
    DEFAULT_SEQUENCE_LENGTH,
    build_training_samples,
    build_user_sequences,
    train_val_split,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train")


def load_news_and_interactions():
    """Pulls news + interactions from the DB into plain Python structures
    (decoupled from SQLAlchemy session lifetime for use in the training loop)."""
    init_db()
    db = SessionLocal()
    try:
        news_rows = db.query(News).all()
        news_records = [
            {
                "news_id": n.id,
                "title": n.title,
                "description": n.description,
                "content": n.content,
                "category": n.category,
                "subcategory": n.subcategory,
            }
            for n in news_rows
        ]
        interaction_rows = db.query(UserInteraction).all()
        interactions = [
            {"user_id": i.user_id, "news_id": i.news_id, "timestamp": i.timestamp}
            for i in interaction_rows
        ]
        return news_records, interactions
    finally:
        db.close()


def cosine_embedding_loss_with_negatives(
    predicted: torch.Tensor,
    positive: torch.Tensor,
    negatives: torch.Tensor,
    margin: float = 0.3,
) -> torch.Tensor:
    """Triplet-style loss: predicted preference vector should be closer
    (higher cosine similarity) to the true next-article embedding than to
    random negative articles, by at least `margin`.

    predicted: (B, D), positive: (B, D), negatives: (B, N, D)
    """
    pos_sim = torch.sum(predicted * positive, dim=-1)  # (B,)
    neg_sim = torch.bmm(negatives, predicted.unsqueeze(-1)).squeeze(-1)  # (B, N)
    neg_sim_max = neg_sim.max(dim=-1).values  # hardest negative per sample
    loss = torch.clamp(margin - pos_sim + neg_sim_max, min=0.0)
    return loss.mean()


def sample_negatives(
    all_embeddings: np.ndarray, exclude_indices: torch.Tensor, num_negatives: int
) -> torch.Tensor:
    """Randomly samples `num_negatives` article embeddings per training
    example (in-batch random negative sampling), re-drawing any sample that
    happens to land on that example's true positive target index so the
    "negative" set never accidentally contains the ground-truth item."""
    batch_size = exclude_indices.size(0)
    n_items = all_embeddings.shape[0]
    exclude_np = exclude_indices.cpu().numpy()

    neg_idx = np.random.randint(0, n_items, size=(batch_size, num_negatives))
    for b in range(batch_size):
        target = exclude_np[b]
        if target < 0:
            continue  # target_index of -1 means "not found in catalog" — nothing to exclude
        clash_mask = neg_idx[b] == target
        while clash_mask.any():
            neg_idx[b, clash_mask] = np.random.randint(0, n_items, size=clash_mask.sum())
            clash_mask = neg_idx[b] == target

    neg_embeddings = all_embeddings[neg_idx]  # (B, N, D)
    return torch.from_numpy(neg_embeddings).float()


def train(
    epochs: int | None = None,
    batch_size: int | None = None,
    learning_rate: float | None = None,
    sequence_length: int | None = None,
    hidden_dim: int | None = None,
    num_layers: int | None = None,
    dropout: float | None = None,
    num_negatives: int = 5,
) -> dict:
    """Runs the full training pipeline and returns a summary dict (final
    losses, embedding backend used, sample counts) — also used by the
    FastAPI POST /api/model/train endpoint."""

    epochs = epochs or settings.epochs
    batch_size = batch_size or settings.batch_size
    learning_rate = learning_rate or settings.learning_rate
    sequence_length = sequence_length or settings.sequence_length
    hidden_dim = hidden_dim or settings.gru_hidden_dim
    num_layers = num_layers or settings.gru_num_layers
    dropout = dropout if dropout is not None else settings.gru_dropout

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("Using device: %s", device)

    # --- 1. Load data ---
    logger.info("Loading news + interactions from database...")
    news_records, interactions = load_news_and_interactions()
    if not news_records:
        raise RuntimeError(
            "No news articles found in the database. Run `python -m data.seed_db` first."
        )
    if not interactions:
        raise RuntimeError(
            "No user interactions found in the database. Run `python -m data.seed_db` first."
        )

    # --- 2. NLP preprocessing + embeddings ---
    logger.info("Preprocessing news text...")
    import pandas as pd

    news_df = preprocess_news_dataframe(pd.DataFrame(news_records))

    logger.info("Generating news embeddings...")
    embeddings, backend_name = generate_news_embeddings(news_df, model_name=settings.embedding_model_name)
    embedding_dim = embeddings.shape[1]
    news_ids = news_df["news_id"].tolist()
    news_id_to_embedding = {nid: embeddings[i] for i, nid in enumerate(news_ids)}
    logger.info("Embedding backend: %s (dim=%d)", backend_name, embedding_dim)

    # Persist embeddings for the recommendation engine to reuse at inference time.
    save_embeddings(embeddings, news_ids, settings.data_dir / "embeddings")

    # --- 3. Build sequences + training samples ---
    logger.info("Building user sequences...")
    sequences = build_user_sequences(interactions)
    samples = build_training_samples(sequences, sequence_length=sequence_length)
    logger.info(
        "Built %d training samples from %d users (sequence_length=%d)",
        len(samples),
        len(sequences),
        sequence_length,
    )
    if len(samples) < 4:
        raise RuntimeError(
            "Not enough training samples to train the GRU. Seed more interaction history "
            "or reduce SEQUENCE_LENGTH."
        )

    train_samples, val_samples = train_val_split(samples, val_ratio=0.15)
    logger.info("Train samples: %d | Validation samples: %d", len(train_samples), len(val_samples))

    train_dataset = SequenceEmbeddingDataset(train_samples, news_id_to_embedding, embedding_dim)
    val_dataset = SequenceEmbeddingDataset(val_samples, news_id_to_embedding, embedding_dim)

    effective_batch_size = max(1, min(batch_size, len(train_dataset)))
    train_loader = DataLoader(
        train_dataset, batch_size=effective_batch_size, shuffle=True, collate_fn=collate_batch
    )
    val_loader = (
        DataLoader(val_dataset, batch_size=effective_batch_size, shuffle=False, collate_fn=collate_batch)
        if len(val_dataset) > 0
        else None
    )

    # --- 4. Build + train the GRU ---
    model = GRURecommender(
        embedding_dim=embedding_dim, hidden_dim=hidden_dim, num_layers=num_layers, dropout=dropout
    ).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)

    history = {"train_loss": [], "val_loss": []}
    start_time = time.time()

    for epoch in range(1, epochs + 1):
        model.train()
        epoch_losses = []
        for batch in train_loader:
            sequence = batch["sequence"].to(device)
            mask = batch["mask"].to(device)
            target = batch["target_embedding"].to(device)

            negatives = sample_negatives(embeddings, batch["target_index"], num_negatives).to(device)

            optimizer.zero_grad()
            predicted = model(sequence, mask)
            loss = cosine_embedding_loss_with_negatives(predicted, target, negatives)
            loss.backward()
            optimizer.step()
            epoch_losses.append(loss.item())

        train_loss = float(np.mean(epoch_losses))
        history["train_loss"].append(train_loss)

        val_loss = train_loss
        if val_loader is not None:
            model.eval()
            val_losses = []
            with torch.no_grad():
                for batch in val_loader:
                    sequence = batch["sequence"].to(device)
                    mask = batch["mask"].to(device)
                    target = batch["target_embedding"].to(device)
                    negatives = sample_negatives(embeddings, batch["target_index"], num_negatives).to(device)
                    predicted = model(sequence, mask)
                    loss = cosine_embedding_loss_with_negatives(predicted, target, negatives)
                    val_losses.append(loss.item())
            val_loss = float(np.mean(val_losses)) if val_losses else train_loss
        history["val_loss"].append(val_loss)

        if epoch == 1 or epoch % 5 == 0 or epoch == epochs:
            logger.info("Epoch %3d/%d — train_loss=%.4f  val_loss=%.4f", epoch, epochs, train_loss, val_loss)

    elapsed = time.time() - start_time
    logger.info("Training complete in %.1fs", elapsed)

    # --- 5. Save model + metadata ---
    settings.saved_models_dir.mkdir(parents=True, exist_ok=True)
    model_path = settings.saved_models_dir / "gru_recommender.pt"
    torch.save(model.state_dict(), model_path)

    config = {
        **model.config_dict(),
        "dropout": dropout,
        "sequence_length": sequence_length,
        "embedding_backend": backend_name,
        "epochs_trained": epochs,
        "batch_size": effective_batch_size,
        "learning_rate": learning_rate,
        "train_samples": len(train_samples),
        "val_samples": len(val_samples),
        "final_train_loss": history["train_loss"][-1],
        "final_val_loss": history["val_loss"][-1],
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    with open(settings.saved_models_dir / "model_config.json", "w") as f:
        json.dump(config, f, indent=2)

    with open(settings.saved_models_dir / "loss_history.json", "w") as f:
        json.dump(history, f, indent=2)

    logger.info("Model saved to %s", model_path)
    return config


def parse_args():
    parser = argparse.ArgumentParser(description="Train the GRU sequential recommendation model.")
    parser.add_argument("--epochs", type=int, default=None)
    parser.add_argument("--batch-size", type=int, default=None)
    parser.add_argument("--lr", type=float, default=None, dest="learning_rate")
    parser.add_argument("--sequence-length", type=int, default=None)
    parser.add_argument("--hidden-dim", type=int, default=None)
    parser.add_argument("--num-layers", type=int, default=None)
    parser.add_argument("--dropout", type=float, default=None)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    train(
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        sequence_length=args.sequence_length,
        hidden_dim=args.hidden_dim,
        num_layers=args.num_layers,
        dropout=args.dropout,
    )
