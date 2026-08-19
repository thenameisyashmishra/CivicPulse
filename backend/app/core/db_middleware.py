"""
Database Performance Monitoring Middleware for CivicPulse.

Instruments every HTTP request with:
- Total request processing time exposed via ``X-DB-Query-Time`` response header.
- Structured JSON log warnings for slow requests (>500 ms threshold).
- Connection pool exhaustion warnings when checked-out connections exceed 80 %
  of the configured pool capacity.

The middleware degrades gracefully on SQLite (no pool metrics) and never blocks
or raises on its own — it is purely observational.
"""

import logging
import time

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings
from app.db.database import engine

logger = logging.getLogger(__name__)
settings = get_settings()

# Configurable threshold (seconds) — requests slower than this are logged.
SLOW_REQUEST_THRESHOLD_S: float = 0.5  # 500 ms

# Pool exhaustion warning threshold (fraction of pool_size).
POOL_EXHAUSTION_WARN_RATIO: float = 0.8


def _check_pool_exhaustion() -> dict | None:
    """
    Return a warning dict if the connection pool is >80 % utilised.

    Returns ``None`` when pool stats are unavailable (e.g. SQLite / NullPool)
    or when utilisation is within safe limits.
    """
    pool = engine.pool
    try:
        pool_size = pool.size()
        if pool_size <= 0:
            return None
        checked_out = pool.checkedout()
        utilisation = checked_out / pool_size
        if utilisation >= POOL_EXHAUSTION_WARN_RATIO:
            return {
                "pool_size": pool_size,
                "checked_out": checked_out,
                "overflow": pool.overflow(),
                "utilisation_pct": round(utilisation * 100, 1),
            }
    except Exception:
        # StaticPool / NullPool — metrics not available.
        pass
    return None


class DBPerformanceMiddleware(BaseHTTPMiddleware):
    """
    Starlette middleware that measures request duration, sets the
    ``X-DB-Query-Time`` response header, and emits structured warnings
    for slow requests and connection-pool pressure.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip static files and docs to reduce noise.
        path = request.url.path
        if path.startswith(("/docs", "/openapi.json", "/uploads", "/redoc")):
            return await call_next(request)

        start = time.perf_counter()

        # --- Check pool health *before* the request ---
        pool_warning = _check_pool_exhaustion()
        if pool_warning:
            logger.warning(
                "Connection pool nearing exhaustion — consider scaling pool_size or enabling PgBouncer",
                extra={"extra_context": {"pool": pool_warning, "path": path}},
            )

        response: Response = await call_next(request)

        elapsed_s = time.perf_counter() - start
        elapsed_ms = round(elapsed_s * 1000, 2)

        # Attach timing header to every response.
        response.headers["X-DB-Query-Time"] = f"{elapsed_ms}ms"

        # Log slow requests with request context.
        if elapsed_s > SLOW_REQUEST_THRESHOLD_S:
            logger.warning(
                "Slow request detected",
                extra={
                    "extra_context": {
                        "method": request.method,
                        "path": path,
                        "status_code": response.status_code,
                        "elapsed_ms": elapsed_ms,
                        "client": request.client.host if request.client else "unknown",
                    }
                },
            )

        return response
