"""Restores the request path that Vercel's rewrite discards.

A single serverless function has to answer every route, which means a
catch-all rewrite in vercel.json. That rewrite replaces the request path with
the destination — the function always sees `/api/index`, whatever the client
asked for, and every route 404s. No header carries the original path, but the
query string *is* preserved, so vercel.json smuggles the path through as
`__original_path` and this middleware puts it back before routing runs.

Implemented as raw ASGI rather than BaseHTTPMiddleware so the rewrite happens
strictly before the router reads `scope["path"]`, and so it costs nothing on
platforms that never set the parameter (local uvicorn, tests, Docker).
"""

from __future__ import annotations

from urllib.parse import parse_qsl, urlencode

PATH_PARAM = "__original_path"


class RestoreOriginalPath:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "http":
            query = scope.get("query_string", b"").decode("latin-1")
            if PATH_PARAM in query:
                params = parse_qsl(query, keep_blank_values=True)
                original = next((v for k, v in params if k == PATH_PARAM), None)
                if original:
                    scope = dict(scope)
                    scope["path"] = original
                    scope["raw_path"] = original.encode("utf-8")
                    # Drop the smuggled parameter so handlers see only the
                    # caller's own query (e.g. ?top_n=4).
                    remaining = [(k, v) for k, v in params if k != PATH_PARAM]
                    scope["query_string"] = urlencode(remaining).encode("latin-1")
        await self.app(scope, receive, send)
