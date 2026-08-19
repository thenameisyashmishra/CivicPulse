"""
Health Check & Monitoring Endpoints for CivicPulse.

Provides production-grade observability:
- GET /api/health          — Comprehensive system overview.
- GET /api/health/live     — Ultra-lightweight liveness probe for orchestrators/k8s.
- GET /api/health/ready    — Deep readiness probe verifying active DB read/write and Redis connectivity.
- GET /api/health/db       — Deep database diagnostics: table row counts, index stats, pool utilization.
"""

import logging
import os
import platform
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import engine, get_db

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/health", tags=["health"])

_STARTUP_TIME = time.monotonic()
_STARTUP_UTC = datetime.now(timezone.utc).isoformat()


def _uptime_seconds() -> float:
    return round(time.monotonic() - _STARTUP_TIME, 2)


def _memory_usage_mb() -> float | None:
    """Return resident set size in MB (cross-platform best-effort)."""
    try:
        import psutil
        process = psutil.Process(os.getpid())
        return round(process.memory_info().rss / (1024 * 1024), 2)
    except ImportError:
        pass

    try:
        if platform.system() == "Windows":
            import ctypes
            import ctypes.wintypes

            class PROCESS_MEMORY_COUNTERS(ctypes.Structure):
                _fields_ = [
                    ("cb", ctypes.wintypes.DWORD),
                    ("PageFaultCount", ctypes.wintypes.DWORD),
                    ("PeakWorkingSetSize", ctypes.c_size_t),
                    ("WorkingSetSize", ctypes.c_size_t),
                    ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                    ("PagefileUsage", ctypes.c_size_t),
                    ("PeakPagefileUsage", ctypes.c_size_t),
                ]

            counters = PROCESS_MEMORY_COUNTERS()
            counters.cb = ctypes.sizeof(PROCESS_MEMORY_COUNTERS)
            kernel32 = ctypes.windll.kernel32
            psapi = ctypes.windll.psapi
            handle = kernel32.GetCurrentProcess()
            if psapi.GetProcessMemoryInfo(handle, ctypes.byref(counters), counters.cb):
                return round(counters.WorkingSetSize / (1024 * 1024), 2)
        else:
            import resource
            usage = resource.getrusage(resource.RUSAGE_SELF)
            if platform.system() == "Darwin":
                return round(usage.ru_maxrss / (1024 * 1024), 2)
            return round(usage.ru_maxrss / 1024, 2)
    except Exception:
        pass

    return None


def _pool_stats() -> dict:
    """Extract connection pool statistics from the synchronous engine."""
    pool = engine.pool
    try:
        return {
            "pool_size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "invalid": pool.status(),
        }
    except Exception:
        return {"info": "Pool stats not available (SQLite / NullPool)"}


async def _redis_ping() -> dict:
    """Ping Redis and return connectivity status."""
    try:
        from app.db.cache import redis_cache
        client = await redis_cache.get_client()
        if client is None:
            return {"connected": False, "detail": "Redis client unavailable"}
        pong = await client.ping()
        info = await client.info(section="memory")
        return {
            "connected": bool(pong),
            "used_memory_mb": round(info.get("used_memory", 0) / (1024 * 1024), 2),
            "connected_clients": (await client.info(section="clients")).get("connected_clients", "N/A"),
        }
    except Exception as exc:
        return {"connected": False, "detail": str(exc)}


@router.get("/live")
def liveness_probe():
    """Ultra-lightweight liveness probe for Kubernetes and container orchestrators."""
    return {"status": "alive", "uptime_seconds": _uptime_seconds()}


@router.get("/ready")
async def readiness_probe():
    """Deep readiness probe verifying DB write connectivity and Redis health."""
    db_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        logger.error(f"Readiness check failed on DB: {e}")

    redis_status = await _redis_ping()
    # In production, DB must be connected
    if not db_ok:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is unhealthy.",
        )

    return {
        "status": "ready",
        "database": "connected",
        "redis": "connected" if redis_status.get("connected") else "bypassed/degraded",
    }


@router.get("")
async def health_overview():
    """Comprehensive health overview."""
    db_ok = False
    db_detail = ""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception as exc:
        db_detail = str(exc)

    redis_status = await _redis_ping()
    is_sqlite = settings.database_url.startswith("sqlite")

    return {
        "status": "healthy" if db_ok else "degraded",
        "service": settings.app_name,
        "database": {
            "connected": db_ok,
            "backend": "sqlite" if is_sqlite else "postgresql",
            "detail": db_detail or "ok",
        },
        "redis": redis_status,
        "pool": _pool_stats(),
        "uptime_seconds": _uptime_seconds(),
        "started_at": _STARTUP_UTC,
        "memory_usage_mb": _memory_usage_mb(),
        "platform": platform.system(),
    }


@router.get("/db")
def health_db_deep(db: Session = Depends(get_db)):
    """Deep database health check."""
    is_sqlite = settings.database_url.startswith("sqlite")
    inspector = inspect(engine)

    table_names = inspector.get_table_names()
    row_counts: dict[str, int | str] = {}
    for table in table_names:
        try:
            result = db.execute(text(f'SELECT COUNT(*) FROM "{table}"'))  # noqa: S608
            row_counts[table] = result.scalar()
        except Exception as exc:
            row_counts[table] = f"error: {exc}"

    index_stats: dict[str, list[dict]] = {}
    for table in table_names:
        indexes = inspector.get_indexes(table)
        index_stats[table] = [
            {"name": idx["name"], "columns": idx["column_names"], "unique": idx.get("unique", False)}
            for idx in indexes
        ]

    pg_table_stats = None
    if not is_sqlite:
        try:
            result = db.execute(
                text(
                    "SELECT relname, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch, "
                    "n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup, "
                    "last_vacuum, last_autovacuum, last_analyze, last_autoanalyze "
                    "FROM pg_stat_user_tables ORDER BY n_live_tup DESC"
                )
            )
            pg_table_stats = [dict(row._mapping) for row in result]
        except Exception as exc:
            pg_table_stats = f"error: {exc}"

    return {
        "status": "ok",
        "backend": "sqlite" if is_sqlite else "postgresql",
        "tables": row_counts,
        "indexes": index_stats,
        "pool": _pool_stats(),
        "pg_table_stats": pg_table_stats,
    }
