"""The NumPy inference path must agree with PyTorch.

This is the test that matters most for the deployment: the live API serves
recommendations from ml/numpy_inference.py, while the model is trained and
evaluated with PyTorch. If the two ever diverge, the deployed site would
silently rank articles differently from every reported metric — with no error
to notice. GRU gate ordering and the placement of the reset gate are the two
easy ways to get this subtly wrong, and both would show up here.
"""

from __future__ import annotations

import json

import numpy as np
import pytest

torch = pytest.importorskip("torch", reason="PyTorch only needed for the parity check")


@pytest.fixture(scope="module")
def torch_model(bundle_dir):
    """Rebuilds the PyTorch model from the same checkpoint the bundle came from."""
    from app.config import settings
    from ml.gru_model import build_model_from_config

    config_path = settings.saved_models_dir / "model_config.json"
    weights_path = settings.saved_models_dir / "gru_recommender.pt"
    if not weights_path.exists():
        pytest.skip("no trained checkpoint on disk")

    config = json.loads(config_path.read_text())
    checkpoint = torch.load(weights_path, map_location="cpu", weights_only=False)
    model = build_model_from_config(config)
    model.load_state_dict(checkpoint.get("model_state_dict", checkpoint))
    model.eval()
    return model


@pytest.fixture(scope="module")
def numpy_model(bundle_dir):
    from ml.numpy_inference import NumpyGRURecommender

    return NumpyGRURecommender(bundle_dir)


@pytest.mark.parametrize("seq_len", [1, 2, 3, 4, 5])
def test_preference_vector_matches_pytorch(numpy_model, torch_model, seq_len):
    rng = np.random.default_rng(seq_len)
    indices = rng.integers(0, len(numpy_model.news_ids), size=seq_len)
    sequence = numpy_model.embeddings[indices]

    numpy_out = numpy_model.preference_vector(sequence)
    with torch.no_grad():
        torch_out = torch_model(torch.tensor(sequence[None, ...], dtype=torch.float32)).numpy()[0]

    assert numpy_out.shape == torch_out.shape
    # float32 accumulation order differs between the two; 1e-5 is far tighter
    # than any difference that could reorder a ranking.
    np.testing.assert_allclose(numpy_out, torch_out, atol=1e-5)


def test_preference_vector_is_l2_normalised(numpy_model):
    sequence = numpy_model.embeddings[:3]
    assert np.linalg.norm(numpy_model.preference_vector(sequence)) == pytest.approx(1.0, abs=1e-5)


def test_ranking_agrees_with_pytorch(numpy_model, torch_model):
    """Same top-5 ids, in the same order, for a realistic history."""
    history = numpy_model.news_ids[:5]
    sequence = numpy_model.embed_sequence(history)

    with torch.no_grad():
        torch_pref = torch_model(torch.tensor(sequence[None, ...], dtype=torch.float32)).numpy()[0]
    torch_scores = numpy_model.embeddings @ torch_pref
    torch_ranked = [
        nid
        for nid, _ in sorted(
            ((n, torch_scores[i]) for i, n in enumerate(numpy_model.news_ids) if n not in history),
            key=lambda p: p[1],
            reverse=True,
        )[:5]
    ]

    numpy_ranked = [nid for nid, _ in numpy_model.rank(history, top_n=5)]
    assert numpy_ranked == torch_ranked


def test_empty_sequence_rejected(numpy_model):
    with pytest.raises(ValueError):
        numpy_model.preference_vector(np.zeros((0, numpy_model.embedding_dim), dtype=np.float32))


def test_unknown_ids_are_skipped(numpy_model):
    """A history referencing articles outside the catalog still ranks."""
    history = ["does-not-exist", numpy_model.news_ids[0], "also-missing"]
    assert numpy_model.rank(history, top_n=3), "known ids should still produce a ranking"
    assert numpy_model.rank(["nope-1", "nope-2"], top_n=3) == []
