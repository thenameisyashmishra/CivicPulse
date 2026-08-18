import time
import logging
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import get_settings

logger = logging.getLogger("uvicorn.error")
settings = get_settings()

# Optional Redis import
try:
    import redis
    # Lazy initialisation of redis client connection pool
    redis_client = redis.from_url(settings.redis_url, decode_responses=True)
except ImportError:
    redis_client = None
    logger.warning("Redis client package not installed. Rate limiter falling back to in-memory mode.")

# In-memory fallback dictionary: {client_ip: [(timestamp, count), ...]}
# Used only if Redis is down or missing to enable seamless dev operations.
_mem_db: dict[str, list[float]] = {}


def _is_rate_limited_memory(client_ip: str, limit: int, window: int) -> bool:
    now = time.time()
    # Clean up old timestamps outside window
    cutoff = now - window
    history = _mem_db.get(client_ip, [])
    history = [t for t in history if t > cutoff]
    
    if len(history) >= limit:
        _mem_db[client_ip] = history
        return True
        
    history.append(now)
    _mem_db[client_ip] = history
    return False


def _is_rate_limited_redis(client_ip: str, limit: int, window: int) -> bool:
    if redis_client is None:
        return _is_rate_limited_memory(client_ip, limit, window)
        
    key = f"ratelimit:{client_ip}"
    try:
        # Use a sliding window rate limit using a sorted set (zset) in Redis
        now = time.time()
        cutoff = now - window
        
        # Pipeline execution to minimize network roundtrips
        pipe = redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, cutoff) # Remove keys older than window
        pipe.zcard(key)                       # Count remaining active hits
        pipe.zadd(key, {str(now): now})       # Add current hit
        pipe.expire(key, window)              # Reset expiration
        
        # Execute pipeline
        _, current_hits, _, _ = pipe.execute()
        
        if current_hits >= limit:
            return True
        return False
        
    except Exception as e:
        logger.error(f"Redis rate limiter failed: {e}. Falling back to in-memory rate limiting.")
        return _is_rate_limited_memory(client_ip, limit, window)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Resolve client IP
        client_ip = request.client.host if request.client else "127.0.0.1"
        
        # Skip rate limiting for static files / documentation
        path = request.url.path
        if path.startswith("/docs") or path.startswith("/openapi.json") or path.startswith("/uploads"):
            return await call_next(request)
            
        limit = settings.rate_limit_requests
        window = settings.rate_limit_window_seconds
        
        is_limited = _is_rate_limited_redis(client_ip, limit, window)
        
        if is_limited:
            logger.warning(f"Rate limit exceeded for client: {client_ip} on path {path}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many requests. Please slow down.",
                    "limit": limit,
                    "window_seconds": window
                },
                headers={
                    "Retry-After": str(window)
                }
            )
            
        return await call_next(request)
