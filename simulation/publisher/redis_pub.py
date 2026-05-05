# ─────────────────────────────────────────────
#  simulation/publisher/redis_pub.py
#  Async Redis Pub/Sub publisher
#
#  Publishes sensor events to the `city:live`
#  channel, which the Node.js backend subscribes to.
# ─────────────────────────────────────────────

import json
import redis.asyncio as aioredis

from config import settings

_redis: aioredis.Redis | None = None


async def init_redis() -> None:
    global _redis
    _redis = await aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )
    # Verify connection
    await _redis.ping()
    print(f"[redis_pub] connected → {settings.REDIS_URL}")


async def close_redis() -> None:
    global _redis
    if _redis:
        await _redis.aclose()
        print("[redis_pub] connection closed")


async def publish_event(event: dict) -> None:
    """
    Publish one sensor event to the Redis Pub/Sub channel.

    Event shape:
      {
        entityId:   str,
        entityType: str,
        metric:     str,
        value:      float,
        unit:       str,
        timestamp:  ISO string,
        simHour:    float,
      }
    """
    if _redis is None:
        print("[redis_pub] WARNING: Redis not initialised — dropping event")
        return

    try:
        payload = json.dumps(event)
        await _redis.publish(settings.REDIS_CHANNEL, payload)
    except Exception as e:
        print(f"[redis_pub] publish error: {e}")


async def publish_raw(channel: str, message: str) -> None:
    """Publish a raw string message to any channel."""
    if _redis is None:
        return
    try:
        await _redis.publish(channel, message)
    except Exception as e:
        print(f"[redis_pub] raw publish error: {e}")