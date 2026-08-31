"""Vercel serverless entry point.

Vercel turns every file under /api into a function. `app` is the ASGI callable
the Python runtime looks for; vercel.json routes every request here so FastAPI
does its own routing.

RestoreOriginalPath undoes the path rewrite that routing-everything-to-one-
function requires — see backend/serving/path_fix.py.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from serving.app import app as fastapi_app  # noqa: E402
from serving.path_fix import RestoreOriginalPath  # noqa: E402

app = RestoreOriginalPath(fastapi_app)
