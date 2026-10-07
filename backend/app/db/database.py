"""
Database engine configuration with safe URL handling, connection pooling,
and async/sync engine separation.
"""

from collections.abc import AsyncGenerator, Generator
import logging

from sqlalchemy import create_engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Synchronous Engine (used for SQLite local dev, health checks, seed, maintenance)
# ---------------------------------------------------------------------------
_sync_connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

if settings.database_url.startswith("sqlite"):
    if settings.database_url.startswith("sqlite:///"):
        _db_path = settings.database_url.replace("sqlite:///", "")
        if _db_path and _db_path != ":memory:":
            from pathlib import Path
            Path(_db_path).parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        settings.database_url,
        connect_args=_sync_connect_args,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
    )
else:
    engine = create_engine(
        settings.database_url,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
        pool_recycle=settings.db_pool_recycle,
        pool_pre_ping=True,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ---------------------------------------------------------------------------
# Asynchronous Engine — safe URL derivation via make_url()
# ---------------------------------------------------------------------------
async_engine = None
AsyncSessionLocal = None


def derive_async_url(sync_url: str) -> str:
    """Safely convert any sync database URL to an async driver URL."""
    if sync_url.startswith("sqlite"):
        return sync_url.replace("sqlite:///", "sqlite+aiosqlite:///")
    parsed = make_url(sync_url)
    return str(parsed.set(drivername="postgresql+asyncpg"))


try:
    _async_url = settings.async_database_url
    if settings.database_url.startswith("postgresql"):
        _async_url = derive_async_url(settings.database_url)

    _async_connect_args = {}
    if _async_url.startswith("sqlite"):
        import aiosqlite  # noqa: F401
        _async_connect_args = {"check_same_thread": False}
        async_engine = create_async_engine(_async_url, connect_args=_async_connect_args)
    else:
        async_engine = create_async_engine(
            _async_url,
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_timeout=settings.db_pool_timeout,
            pool_recycle=settings.db_pool_recycle,
            pool_pre_ping=True,
        )
    AsyncSessionLocal = async_sessionmaker(bind=async_engine, class_=AsyncSession, expire_on_commit=False)
except ImportError as e:
    logger.warning("Async database driver unavailable (%s). Sync fallback mode active.", e)


# ---------------------------------------------------------------------------
# Dependency Injection Helpers
# ---------------------------------------------------------------------------

def get_db() -> Generator[Session, None, None]:
    """Sync session dependency for standard routes and local development."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Async session dependency with explicit Unit-of-Work boundaries.
    Raises RuntimeError if async engine is unavailable.
    """
    if AsyncSessionLocal is None:
        raise RuntimeError(
            "Async database engine is unavailable. "
            "Install asyncpg (PostgreSQL) or aiosqlite (SQLite) to use async database sessions."
        )

    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
