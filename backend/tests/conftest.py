"""Shared test fixtures.

Tests are split by dependency weight: anything needing PyTorch is skipped
automatically when it isn't installed, so CI can run the fast suite against
the slim serving requirements alone.
"""

import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

BUNDLE_DIR = BACKEND_DIR / "serving_bundle"


@pytest.fixture(scope="session")
def bundle_dir() -> Path:
    if not (BUNDLE_DIR / "manifest.json").exists():
        pytest.skip("serving bundle not built — run `python -m ml.export_for_serving`")
    return BUNDLE_DIR


@pytest.fixture(scope="session")
def bundle(bundle_dir):
    from serving.bundle import ServingBundle

    return ServingBundle(bundle_dir)


@pytest.fixture(scope="session")
def client(bundle_dir):
    from fastapi.testclient import TestClient

    from serving.app import app

    return TestClient(app)
