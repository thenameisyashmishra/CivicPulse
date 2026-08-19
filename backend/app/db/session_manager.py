"""
Database Session Manager with Enterprise Resilience Patterns for CivicPulse.

Features:
- **Automatic Retry** — Transient failures (connection drops, deadlocks) are
  retried with exponential back-off and jitter so momentary hiccups don't
  bubble up to the user.
- **Circuit Breaker** — After *N* consecutive failures the circuit opens,
  fast-failing subsequent calls to prevent cascade overload on a struggling
  database. The circuit half-opens after a cool-down and auto-closes on success.
- **Read / Write Routing** — Writes go to the primary engine; reads can be
  directed to a read-replica engine when ``DATABASE_REPLICA_URL`` is set.
  Falls back to the primary when no replica is configured.

The manager works identically on SQLite (local dev) and PostgreSQL (production).
"""

import asyncio
import logging
import random
import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from enum import Enum

from sqlalchemy.exc import DBAPIError, OperationalError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.db.database import AsyncSessionLocal, async_engine

logger = logging.getLogger(__name__)
settings = get_settings()


# ---------------------------------------------------------------------------
# Retry configuration
# ---------------------------------------------------------------------------
MAX_RETRIES: int = 3
BASE_BACKOFF_S: float = 0.25  # 250 ms
MAX_BACKOFF_S: float = 5.0
JITTER_RANGE: float = 0.15  # ±15 %

# Errors considered transient and eligible for retry.
_TRANSIENT_MESSAGES = frozenset({
    "deadlock",
    "connection reset",
    "connection refused",
    "server closed the connection",
    "could not connect",
    "too many connections",
    "connection timed out",
    "broken pipe",
    "ssl connection has been closed unexpectedly",
})


def _is_transient(exc: Exception) -> bool:
    """Decide whether *exc* represents a transient / retriable failure."""
    msg = str(exc).lower()
    return any(keyword in msg for keyword in _TRANSIENT_MESSAGES)


# ---------------------------------------------------------------------------
# Circuit Breaker
# ---------------------------------------------------------------------------
class CircuitState(str, Enum):
    CLOSED = "closed"          # Normal operation.
    OPEN = "open"              # Fast-failing — no calls to DB.
    HALF_OPEN = "half_open"    # Probing — allow a single call through.


class CircuitBreaker:
    """
    Simple in-process circuit breaker.

    * Trips OPEN after ``failure_threshold`` consecutive failures.
    * After ``recovery_timeout_s`` seconds the circuit moves to HALF_OPEN
      and allows one probe request through.
    * A successful probe resets the counter and closes the circuit.
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout_s: float = 30.0,
    ) -> None:
        self.failure_threshold = failure_threshold
        self.recovery_timeout_s = recovery_timeout_s

        self._state: CircuitState = CircuitState.CLOSED
        self._failure_count: int = 0
        self._last_failure_time: float = 0.0

    # -- public API --

    @property
    def state(self) -> CircuitState:
        if self._state == CircuitState.OPEN:
            if (time.monotonic() - self._last_failure_time) >= self.recovery_timeout_s:
                self._state = CircuitState.HALF_OPEN
        return self._state

    def record_success(self) -> None:
        self._failure_count = 0
        self._state = CircuitState.CLOSED

    def record_failure(self) -> None:
        self._failure_count += 1
        self._last_failure_time = time.monotonic()
        if self._failure_count >= self.failure_threshold:
            self._state = CircuitState.OPEN
            logger.error(
                "Circuit breaker OPEN — database appears unavailable after %d consecutive failures",
                self._failure_count,
            )

    def allow_request(self) -> bool:
        state = self.state  # triggers HALF_OPEN transition if timer elapsed
        if state == CircuitState.CLOSED:
            return True
        if state == CircuitState.HALF_OPEN:
            return True  # allow one probe
        return False  # OPEN — fast fail


# Module-level circuit breakers (one per routing target).
_primary_breaker = CircuitBreaker()
_replica_breaker = CircuitBreaker()


# ---------------------------------------------------------------------------
# Read-Replica Engine (optional)
# ---------------------------------------------------------------------------
_replica_engine = None
_ReplicaSessionLocal: async_sessionmaker | None = None

try:
    _replica_url: str | None = getattr(settings, "database_replica_url", None) or None
    if _replica_url:
        # Build an async URL if the user supplied a sync-style postgres URL.
        if _replica_url.startswith("postgresql://"):
            _replica_url = _replica_url.replace("postgresql://", "postgresql+asyncpg://")
        _replica_engine = create_async_engine(
            _replica_url,
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_timeout=settings.db_pool_timeout,
            pool_recycle=settings.db_pool_recycle,
            pool_pre_ping=True,
        )
        _ReplicaSessionLocal = async_sessionmaker(
            bind=_replica_engine, class_=AsyncSession, expire_on_commit=False,
        )
        logger.info("Read-replica engine initialised: %s", _replica_url.split("@")[-1] if "@" in _replica_url else "(local)")
except Exception as exc:
    logger.warning("Could not initialise read-replica engine: %s", exc)


# ---------------------------------------------------------------------------
# Managed Session Helpers
# ---------------------------------------------------------------------------

async def _backoff(attempt: int) -> None:
    """Sleep with exponential back-off + jitter."""
    delay = min(BASE_BACKOFF_S * (2 ** attempt), MAX_BACKOFF_S)
    jitter = delay * random.uniform(-JITTER_RANGE, JITTER_RANGE)
    await asyncio.sleep(delay + jitter)


@asynccontextmanager
async def get_managed_session(
    *,
    read_only: bool = False,
    retries: int = MAX_RETRIES,
) -> AsyncGenerator[AsyncSession, None]:
    """
    Async context manager that yields a managed ``AsyncSession`` with:

    - Automatic retry for transient failures.
    - Circuit-breaker protection.
    - Read / write routing when a replica is configured.

    Usage::

        async with get_managed_session(read_only=True) as session:
            result = await session.execute(select(User))

    Falls back to the synchronous ``SessionLocal`` (wrapped) if no async
    engine is available (e.g. aiosqlite not installed).
    """
    # Choose engine / session factory based on read_only flag.
    session_factory = (
        _ReplicaSessionLocal if (read_only and _ReplicaSessionLocal) else AsyncSessionLocal
    )
    breaker = _replica_breaker if (read_only and _ReplicaSessionLocal) else _primary_breaker

    # Fallback when async engine is unavailable (pure-sync SQLite dev).
    if session_factory is None:
        from app.db.database import SessionLocal
        db = SessionLocal()
        try:
            yield db  # type: ignore[arg-type]
        finally:
            db.close()
        return

    last_exc: Exception | None = None

    for attempt in range(retries + 1):
        if not breaker.allow_request():
            raise RuntimeError(
                "Circuit breaker is OPEN — database unavailable. "
                "Requests are being fast-failed to prevent cascade overload."
            )

        try:
            async with session_factory() as session:
                try:
                    yield session
                    if not read_only:
                        await session.commit()
                    breaker.record_success()
                    return  # success — exit retry loop
                except (OperationalError, DBAPIError) as exc:
                    await session.rollback()
                    if _is_transient(exc) and attempt < retries:
                        breaker.record_failure()
                        last_exc = exc
                        logger.warning(
                            "Transient DB error on attempt %d/%d — retrying: %s",
                            attempt + 1, retries + 1, exc,
                        )
                        await _backoff(attempt)
                        continue  # next attempt
                    breaker.record_failure()
                    raise
                except Exception:
                    await session.rollback()
                    raise
        except RuntimeError:
            # Re-raise circuit-breaker RuntimeErrors immediately.
            raise
        except (OperationalError, DBAPIError) as conn_exc:
            # Session *creation* failed (connection issue).
            breaker.record_failure()
            last_exc = conn_exc
            if _is_transient(conn_exc) and attempt < retries:
                logger.warning(
                    "Transient connection error on attempt %d/%d — retrying: %s",
                    attempt + 1, retries + 1, conn_exc,
                )
                await _backoff(attempt)
                continue
            raise

    # Exhausted all retries.
    if last_exc:
        raise last_exc  # pragma: no cover


@asynccontextmanager
async def get_write_session(retries: int = MAX_RETRIES) -> AsyncGenerator[AsyncSession, None]:
    """Convenience shortcut — always routes to the primary engine."""
    async with get_managed_session(read_only=False, retries=retries) as session:
        yield session


@asynccontextmanager
async def get_read_session(retries: int = MAX_RETRIES) -> AsyncGenerator[AsyncSession, None]:
    """Convenience shortcut — routes to replica if available, else primary."""
    async with get_managed_session(read_only=True, retries=retries) as session:
        yield session
