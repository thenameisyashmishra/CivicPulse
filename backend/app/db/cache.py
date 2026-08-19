"""
Redis Cache Manager & Write-Buffer Stream Processor for High-Scale Concurrency (10M Users).

Features:
- Async Distributed Redis Client with automatic connection pooling.
- Cache-aside helpers for JSON objects (User sessions, Project details).
- Async Write-Buffer (Redis Streams) to absorb peak traffic spikes (e.g., voting floods).
- Distributed Rate Limiter & Atomic Counter Pipelines.
- Sanitized credential logging.
"""

import json
import logging
import re
from typing import Any, Callable

try:
    import redis.asyncio as aioredis
    from redis.exceptions import ResponseError
except ImportError:
    aioredis = None
    ResponseError = Exception

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def sanitize_redis_url(url: str) -> str:
    """Mask credentials in Redis connection string for safe logging."""
    if "@" in url:
        return re.sub(r"://([^:]+):([^@]+)@", r"://\1:****@", url)
    return url


class RedisCacheManager:
    def __init__(self, redis_url: str | None = None):
        self.redis_url = redis_url or settings.redis_url
        self._client: aioredis.Redis | None = None

    async def get_client(self) -> aioredis.Redis | None:
        if aioredis is None:
            return None

        if self._client is None:
            try:
                self._client = aioredis.from_url(
                    self.redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    max_connections=100,
                )
                await self._client.ping()
            except Exception as e:
                masked = sanitize_redis_url(self.redis_url)
                logger.error(f"Failed to connect to Redis at {masked}: {e}")
                self._client = None
        return self._client

    async def get_json(self, key: str) -> dict[str, Any] | list[Any] | None:
        client = await self.get_client()
        if not client:
            return None
        try:
            val = await client.get(key)
            return json.loads(val) if val else None
        except Exception as e:
            logger.error(f"Redis get_json error for key '{key}': {e}")
            return None

    async def set_json(self, key: str, value: Any, ttl_seconds: int = 300) -> bool:
        client = await self.get_client()
        if not client:
            return False
        try:
            serialized = json.dumps(value)
            await client.set(key, serialized, ex=ttl_seconds)
            return True
        except Exception as e:
            logger.error(f"Redis set_json error for key '{key}': {e}")
            return False

    async def delete(self, key: str) -> bool:
        client = await self.get_client()
        if not client:
            return False
        try:
            await client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Redis delete error for key '{key}': {e}")
            return False

    async def increment_counter(self, key: str, amount: int = 1, ttl_seconds: int = 86400) -> int:
        """Atomic pipeline counter for real-time live vote counts / analytics without DB lock contention."""
        client = await self.get_client()
        if not client:
            return 0
        try:
            async with client.pipeline(transaction=True) as pipe:
                pipe.incrby(key, amount)
                pipe.expire(key, ttl_seconds)
                results = await pipe.execute()
            return int(results[0])
        except Exception as e:
            logger.error(f"Redis incrby error for key '{key}': {e}")
            return 0

    async def push_to_write_buffer(self, stream_name: str, payload: dict[str, Any]) -> str | None:
        """Pushes high-volume incoming writes into Redis Stream for batch bulk DB ingestion."""
        client = await self.get_client()
        if not client:
            return None
        try:
            stream_fields = {k: json.dumps(v) if isinstance(v, (dict, list)) else str(v) for k, v in payload.items()}
            msg_id = await client.xadd(stream_name, stream_fields)
            return msg_id
        except Exception as e:
            logger.error(f"Redis xadd error for stream '{stream_name}': {e}")
            return None

    async def process_write_buffer_batch(
        self,
        stream_name: str,
        group_name: str,
        consumer_name: str,
        batch_size: int = 100,
        handler_fn: Callable[[list[dict[str, Any]]], Any] | None = None,
    ) -> int:
        """Consumes buffered write stream entries in bulk to persist to database."""
        client = await self.get_client()
        if not client:
            return 0
        try:
            try:
                await client.xgroup_create(stream_name, group_name, id="0", mkstream=True)
            except ResponseError:
                pass  # Group already exists

            entries = await client.xreadgroup(
                groupname=group_name,
                consumername=consumer_name,
                streams={stream_name: ">"},
                count=batch_size,
            )

            if not entries:
                return 0

            processed_count = 0
            for _, message_list in entries:
                parsed_messages = []
                ack_ids = []
                for msg_id, fields in message_list:
                    parsed_fields = {}
                    for k, v in fields.items():
                        try:
                            parsed_fields[k] = json.loads(v)
                        except Exception:
                            parsed_fields[k] = v
                    parsed_messages.append({"_msg_id": msg_id, **parsed_fields})
                    ack_ids.append(msg_id)

                if handler_fn and parsed_messages:
                    await handler_fn(parsed_messages)

                if ack_ids:
                    await client.xack(stream_name, group_name, *ack_ids)
                    processed_count += len(ack_ids)

            return processed_count
        except Exception as e:
            logger.error(f"Error processing write buffer for stream '{stream_name}': {e}")
            return 0

    async def close(self) -> None:
        if self._client:
            await self._client.close()
            self._client = None


redis_cache = RedisCacheManager()
