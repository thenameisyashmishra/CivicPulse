import asyncio
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.ratelimit import RateLimitMiddleware
from app.core.db_middleware import DBPerformanceMiddleware
from app.core.telemetry import setup_telemetry
from app.core.websockets import ws_manager
from app.core import metrics

from app.core.config import get_settings
from app.core.logging import setup_structured_logging
from app.db.database import Base, engine
from app.api import auth, dashboard, evidence, map, projects, reports, reviews, votes, notifications, privacy, opendata
from app.api import health as health_api

setup_structured_logging()
settings = get_settings()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Register running event loop for safe multi-threaded WebSocket broadcasts & Redis pub/sub
    try:
        ws_manager.set_event_loop(asyncio.get_running_loop())
    except Exception:
        pass

    # Only auto-create tables on SQLite (local dev). On PostgreSQL,
    # Alembic migrations manage the schema exclusively (fixes PERF-01).
    if settings.database_url.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)
    settings.upload_path.mkdir(parents=True, exist_ok=True)

    # --- Setup Distributed Telemetry (if enabled) ---
    setup_telemetry(app)

    # --- Log database engine info ---
    is_sqlite = settings.database_url.startswith("sqlite")
    logger.info(
        "Database engine initialised",
        extra={"extra_context": {
            "backend": "sqlite" if is_sqlite else "postgresql",
            "url": settings.database_url.split("@")[-1] if "@" in settings.database_url else settings.database_url,
            "pool_size": settings.db_pool_size if not is_sqlite else "N/A (SQLite)",
            "max_overflow": settings.db_max_overflow if not is_sqlite else "N/A",
        }},
    )

    # --- Initialise Redis cache (best-effort) ---
    try:
        from app.db.cache import redis_cache
        client = await redis_cache.get_client()
        if client:
            logger.info("Redis cache connected successfully.")
        else:
            logger.warning("Redis unavailable — cache operations will be bypassed.")
    except Exception as exc:
        logger.warning("Redis initialisation failed: %s — running without cache.", exc)

    yield

    # --- Shutdown: close Redis connection pool ---
    try:
        from app.db.cache import redis_cache
        await redis_cache.close()
        logger.info("Redis cache connection closed.")
    except Exception as exc:
        logger.warning("Error closing Redis connection: %s", exc)


app = FastAPI(
    title=settings.app_name,
    description=(
        "Enterprise REST API for the AI-Based Public Works Monitoring & Verification System. "
        "Handles projects, geotagged evidence uploads with AI verification "
        "(GPS/EXIF check, duplicate detection, quality/completion heuristics, YOLOv11 defect detection), "
        "citizen voting, and the Pradhan -> Engineer -> Admin approval chain."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# GZip Response Compression for high-throughput responses > 500 bytes
app.add_middleware(GZipMiddleware, minimum_size=500)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(DBPerformanceMiddleware)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "img-src 'self' data: blob: https:; "
        "connect-src 'self' ws: wss: http: https:; "
        "frame-ancestors 'none';"
    )
    response.headers["Permissions-Policy"] = "geolocation=(self), camera=(self), microphone=()"
    if settings.app_env == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

app.mount("/uploads", StaticFiles(directory=str(settings.upload_path)), name="uploads")

# Application & Domain Routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(evidence.router)
app.include_router(votes.router)
app.include_router(reviews.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(map.router)
app.include_router(health_api.router)
app.include_router(notifications.router)
app.include_router(notifications.direct_ws_router)

# Enterprise Observability & GovTech Compliance Routers
app.include_router(metrics.router)
app.include_router(privacy.router)
app.include_router(opendata.router)
