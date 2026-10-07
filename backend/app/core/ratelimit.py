import os
import time
import logging
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import get_settings

logger = logging.getLogger("uvicorn.error")
settings = get_settings()

# Optional Redis import with circuit breaker
_redis_available: bool = False
_last_redis_check: float = 0.0
REDIS_CHECK_INTERVAL = 60.0

try:
    import redis
    redis_client = redis.from_url(
        settings.redis_url,
        decode_responses=True,
        socket_connect_timeout=0.2,
        socket_timeout=0.3,
    )
except ImportError:
    redis_client = None

# In-memory fallback dictionary: {client_ip: [timestamp1, timestamp2, ...]}
_mem_db: dict[str, list[float]] = {}


def _is_rate_limited_memory(client_ip: str, limit: int, window: int) -> bool:
    now = time.time()
    cutoff = now - window
    history = _mem_db.get(client_ip, [])
    # Fast filter
    history = [t for t in history if t > cutoff]

    if len(history) >= limit:
        _mem_db[client_ip] = history
        return True

    history.append(now)
    _mem_db[client_ip] = history
    return False


def _is_rate_limited_redis(client_ip: str, limit: int, window: int) -> bool:
    global _redis_available, _last_redis_check
    if redis_client is None:
        return _is_rate_limited_memory(client_ip, limit, window)

    now = time.time()
    # If known to be unavailable, fast-fail to memory without trying TCP
    if not _redis_available and (now - _last_redis_check) < REDIS_CHECK_INTERVAL:
        return _is_rate_limited_memory(client_ip, limit, window)

    _last_redis_check = now
    key = f"ratelimit:{client_ip}"
    try:
        cutoff = now - window
        pipe = redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, cutoff)
        pipe.zcard(key)
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, window)
        _, current_hits, _, _ = pipe.execute()

        _redis_available = True
        return current_hits >= limit
    except Exception:
        _redis_available = False
        return _is_rate_limited_memory(client_ip, limit, window)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        # Fast-path: bypass static files, docs, health probes, metrics, and test runners
        if (
            path.startswith("/docs")
            or path.startswith("/openapi.json")
            or path.startswith("/uploads")
            or path.startswith("/assets")
            or path.startswith("/api/health")
            or path.startswith("/metrics")
            or (request.client and request.client.host == "testclient")
            or os.environ.get("PYTEST_CURRENT_TEST")
        ):
            return await call_next(request)

        client_ip = request.client.host if request.client else "127.0.0.1"
        limit = settings.rate_limit_requests
        window = settings.rate_limit_window_seconds

        import anyio
        is_limited = await anyio.to_thread.run_sync(_is_rate_limited_redis, client_ip, limit, window)

        if is_limited:
            logger.warning(f"Rate limit exceeded for client: {client_ip} on path {path}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many requests. Please slow down.",
                    "limit": limit,
                    "window_seconds": window,
                },
                headers={"Retry-After": str(window)},
            )

        return await call_next(request)
