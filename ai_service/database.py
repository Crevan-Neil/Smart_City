# ─────────────────────────────────────────────
#  ai_service/database.py
#  Async MongoDB (motor) + Redis clients
# ─────────────────────────────────────────────

import redis.asyncio as aioredis
from motor.motor_asyncio import AsyncIOMotorClient

from config import settings

# ── MongoDB ───────────────────────────────────
_mongo_client: AsyncIOMotorClient | None = None
_db = None

# ── Redis ─────────────────────────────────────
_redis_client: aioredis.Redis | None = None


async def init_db():
    global _mongo_client, _db, _redis_client

    # MongoDB
    _mongo_client = AsyncIOMotorClient(settings.MONGO_URI)
    _db = _mongo_client[settings.MONGO_DB_NAME]
    print(f"[db] MongoDB connected → {settings.MONGO_DB_NAME}")

    # Redis
    _redis_client = await aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )
    print("[db] Redis connected")


async def close_db():
    global _mongo_client, _redis_client

    if _mongo_client:
        _mongo_client.close()
        print("[db] MongoDB closed")

    if _redis_client:
        await _redis_client.aclose()
        print("[db] Redis closed")


def get_db():
    if _db is None:
        raise RuntimeError("MongoDB not initialised — call init_db() first")
    return _db


def get_redis():
    if _redis_client is None:
        raise RuntimeError("Redis not initialised — call init_db() first")
    return _redis_client