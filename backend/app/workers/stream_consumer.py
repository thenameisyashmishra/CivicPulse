"""
Redis Streams -> PostgreSQL Async Batch Ingestion Worker (SCALE-05).

Consumes high-volume write events (votes, evidence metadata) from Redis Streams
and bulk-inserts them into PostgreSQL partitioned tables.

Usage:
    python -m app.workers.stream_consumer
"""

import asyncio
import logging
import signal
import sys
from typing import Any, Dict, List

from app.core.config import get_settings
from app.db.cache import RedisCacheManager
from app.db.database import AsyncSessionLocal
from app.db.models import Vote, VoteChoice

logger = logging.getLogger(__name__)
settings = get_settings()

STREAM_NAME = settings.redis_write_buffer_stream
GROUP_NAME = "civicpulse_writers"
CONSUMER_NAME = f"worker-{id(asyncio)}"
BATCH_SIZE = 200

_shutdown_event = asyncio.Event()


def handle_shutdown(sig, frame):
    logger.info(f"Received termination signal {sig}. Initiating graceful worker shutdown...")
    _shutdown_event.set()


async def process_batch_payloads(messages: List[Dict[str, Any]]) -> None:
    """Bulk inserts buffered write messages into PostgreSQL."""
    if not AsyncSessionLocal:
        logger.error("AsyncSessionLocal is unavailable. Cannot persist write buffer batch.")
        return

    async with AsyncSessionLocal() as session:
        try:
            persisted_count = 0
            for msg in messages:
                event_type = msg.get("event_type", "vote")
                if event_type == "vote":
                    vote = Vote(
                        evidence_id=int(msg["evidence_id"]),
                        citizen_id=int(msg["citizen_id"]),
                        choice=VoteChoice(msg["choice"]),
                        comment=msg.get("comment"),
                    )
                    session.add(vote)
                    persisted_count += 1

            await session.commit()
            logger.info(f"Successfully bulk-persisted {persisted_count} records to database.")
        except Exception as e:
            await session.rollback()
            logger.error(f"Failed to persist write buffer batch to database: {e}")
            raise


async def run_worker() -> None:
    redis_url = settings.redis_streams_url or settings.redis_url
    cache_mgr = RedisCacheManager(redis_url=redis_url)

    logger.info(f"Starting Stream Consumer Worker on stream '{STREAM_NAME}' (group: {GROUP_NAME})")

    while not _shutdown_event.is_set():
        try:
            processed = await cache_mgr.process_write_buffer_batch(
                stream_name=STREAM_NAME,
                group_name=GROUP_NAME,
                consumer_name=CONSUMER_NAME,
                batch_size=BATCH_SIZE,
                handler_fn=process_batch_payloads,
            )
            if processed == 0:
                await asyncio.sleep(0.5)
        except Exception as e:
            logger.error(f"Error in stream consumer loop: {e}")
            await asyncio.sleep(2.0)

    await cache_mgr.close()
    logger.info("Stream Consumer Worker shut down cleanly.")


def main():
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)
    asyncio.run(run_worker())


if __name__ == "__main__":
    main()
