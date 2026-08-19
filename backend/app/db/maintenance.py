"""
Database Backup & Maintenance Utilities for CivicPulse.

Provides:
- **SQLite backup** — Safe online backup for the development database.
- **Vacuum / Analyze scheduler** — Reclaims storage and refreshes planner statistics.
- **Stale connection cleanup** — Disposes the connection pool to force-close leaked connections.
- **Table statistics refresh** — Runs ANALYZE on user tables for optimal query planning.
- **Partition health & rotation monitor** — Inspects table partitions and distribution.
"""

import logging
import os
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import SessionLocal, engine

logger = logging.getLogger(__name__)
settings = get_settings()


# ---------------------------------------------------------------------------
# 1. SQLite Backup Utility
# ---------------------------------------------------------------------------

def sqlite_backup(destination: str | Path | None = None) -> str | None:
    """Create a consistent online backup of the SQLite database."""
    if not settings.database_url.startswith("sqlite"):
        logger.info("sqlite_backup skipped — not running on SQLite.")
        return None

    db_path_str = settings.database_url.split("///")[-1]
    db_path = Path(db_path_str).resolve()

    if not db_path.exists():
        logger.warning("SQLite database file not found at %s", db_path)
        return None

    if destination is None:
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        destination = db_path.parent / f"{db_path.stem}_backup_{ts}{db_path.suffix}"
    destination = Path(destination)

    try:
        source_conn = sqlite3.connect(str(db_path))
        dest_conn = sqlite3.connect(str(destination))
        with dest_conn:
            source_conn.backup(dest_conn)
        source_conn.close()
        dest_conn.close()
        logger.info("SQLite backup created: %s", destination)
        return str(destination)
    except AttributeError:
        shutil.copy2(str(db_path), str(destination))
        logger.info("SQLite backup (file copy) created: %s", destination)
        return str(destination)
    except Exception as exc:
        logger.error("SQLite backup failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# 2. Vacuum / Analyze
# ---------------------------------------------------------------------------

def vacuum_database() -> dict:
    """Run VACUUM followed by ANALYZE on the database."""
    is_sqlite = settings.database_url.startswith("sqlite")
    results: dict = {"backend": "sqlite" if is_sqlite else "postgresql"}

    raw_conn = engine.raw_connection()
    try:
        if is_sqlite:
            raw_conn.execute("VACUUM")
            raw_conn.execute("ANALYZE")
        else:
            raw_conn.set_isolation_level(0)  # AUTOCOMMIT
            raw_conn.cursor().execute("VACUUM (VERBOSE)")
            raw_conn.cursor().execute("ANALYZE")
        results["status"] = "completed"
        logger.info("VACUUM + ANALYZE completed on %s", results["backend"])
    except Exception as exc:
        results["status"] = "error"
        results["detail"] = str(exc)
        logger.error("VACUUM / ANALYZE failed: %s", exc)
    finally:
        raw_conn.close()

    return results


# ---------------------------------------------------------------------------
# 3. Stale Connection Cleanup
# ---------------------------------------------------------------------------

def cleanup_stale_connections() -> dict:
    """Dispose the connection pool, forcing all idle connections to be closed."""
    try:
        pool = engine.pool
        status_before = _pool_status_safe(pool)
        engine.dispose()
        status_after = _pool_status_safe(engine.pool)
        logger.info("Connection pool disposed and recreated.")
        return {
            "status": "completed",
            "pool_before": status_before,
            "pool_after": status_after,
        }
    except Exception as exc:
        logger.error("Stale connection cleanup failed: %s", exc)
        return {"status": "error", "detail": str(exc)}


def _pool_status_safe(pool) -> dict:
    try:
        return {
            "size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
        }
    except Exception:
        return {"info": "stats unavailable (SQLite / NullPool)"}


# ---------------------------------------------------------------------------
# 4. Table Statistics Refresh
# ---------------------------------------------------------------------------

def refresh_table_statistics() -> dict:
    """Run ANALYZE on every user table to refresh query-planner statistics."""
    is_sqlite = settings.database_url.startswith("sqlite")
    results: dict = {"backend": "sqlite" if is_sqlite else "postgresql", "tables": []}

    db: Session = SessionLocal()
    try:
        if is_sqlite:
            db.execute(text("ANALYZE"))
            db.commit()
            results["tables"].append("(all — single ANALYZE call)")
        else:
            from sqlalchemy import inspect as sa_inspect
            inspector = sa_inspect(engine)
            for table in inspector.get_table_names():
                try:
                    db.execute(text(f"ANALYZE \"{table}\""))  # noqa: S608
                    results["tables"].append(table)
                except Exception as exc:
                    results["tables"].append(f"{table}: error — {exc}")
            db.commit()

        results["status"] = "completed"
        logger.info("Table statistics refreshed on %d table(s).", len(results["tables"]))
    except Exception as exc:
        results["status"] = "error"
        results["detail"] = str(exc)
        logger.error("Table statistics refresh failed: %s", exc)
    finally:
        db.close()

    return results


# ---------------------------------------------------------------------------
# 5. Partition Health Inspection (PostgreSQL)
# ---------------------------------------------------------------------------

def check_partition_health() -> dict:
    """Inspects PostgreSQL table partitions and row distribution."""
    if settings.database_url.startswith("sqlite"):
        return {"status": "skipped", "reason": "Not running on PostgreSQL"}

    db: Session = SessionLocal()
    try:
        query = text("""
            SELECT
                nmsp_parent.nspname AS parent_schema,
                parent.relname      AS parent_table,
                nmsp_child.nspname  AS child_schema,
                child.relname       AS child_table,
                pg_size_pretty(pg_total_relation_size(child.oid)) AS total_size
            FROM pg_inherits
            JOIN pg_class parent        ON pg_inherits.inhparent = parent.oid
            JOIN pg_class child         ON pg_inherits.inhrelid   = child.oid
            JOIN pg_namespace nmsp_parent ON nmsp_parent.oid  = parent.relnamespace
            JOIN pg_namespace nmsp_child  ON nmsp_child.oid   = child.relnamespace
            ORDER BY parent.relname, child.relname;
        """)
        rows = db.execute(query).fetchall()
        partitions = [
            {"parent": r[1], "partition": r[3], "size": r[4]}
            for r in rows
        ]
        return {"status": "completed", "partitions": partitions, "count": len(partitions)}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# 6. Combined Maintenance Run
# ---------------------------------------------------------------------------

def run_full_maintenance(*, include_backup: bool = True) -> dict:
    """Execute a full maintenance pass."""
    report: dict = {}
    if include_backup:
        report["backup"] = sqlite_backup()
    report["stale_connections"] = cleanup_stale_connections()
    report["vacuum_analyze"] = vacuum_database()
    report["statistics_refresh"] = refresh_table_statistics()
    report["partitions"] = check_partition_health()
    logger.info("Full maintenance run completed.")
    return report
