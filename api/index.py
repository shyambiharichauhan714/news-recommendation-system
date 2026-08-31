"""Vercel serverless entry point.

Vercel turns every file under /api into a function. Exposing the ASGI app as
`app` is all the Python runtime needs; vercel.json routes every request here
so FastAPI does its own routing.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from serving.app import app  # noqa: E402,F401
