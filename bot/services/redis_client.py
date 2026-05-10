"""Redis storage for user sessions and FSM state."""
import json
from typing import Any
import redis.asyncio as aioredis
from config import settings

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


# ── User token storage ────────────────────────────────────────────
async def save_user_token(tg_id: int, access: str, refresh: str) -> None:
    r = await get_redis()
    await r.hset(f"user:{tg_id}", mapping={"access": access, "refresh": refresh})
    await r.expire(f"user:{tg_id}", 60 * 60 * 24 * 30)  # 30 days


async def get_user_token(tg_id: int) -> tuple[str | None, str | None]:
    r = await get_redis()
    data = await r.hgetall(f"user:{tg_id}")
    return data.get("access"), data.get("refresh")


async def delete_user_token(tg_id: int) -> None:
    r = await get_redis()
    await r.delete(f"user:{tg_id}")


# ── FSM context ───────────────────────────────────────────────────
async def set_state(tg_id: int, state: str, data: dict | None = None) -> None:
    r = await get_redis()
    payload = {"state": state, "data": data or {}}
    await r.set(f"fsm:{tg_id}", json.dumps(payload), ex=60 * 30)  # 30 min TTL


async def get_state(tg_id: int) -> tuple[str | None, dict]:
    r = await get_redis()
    raw = await r.get(f"fsm:{tg_id}")
    if not raw:
        return None, {}
    payload = json.loads(raw)
    return payload.get("state"), payload.get("data", {})


async def clear_state(tg_id: int) -> None:
    r = await get_redis()
    await r.delete(f"fsm:{tg_id}")


# ── General KV cache ─────────────────────────────────────────────
async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    r = await get_redis()
    await r.set(f"cache:{key}", json.dumps(value), ex=ttl)


async def cache_get(key: str) -> Any | None:
    r = await get_redis()
    raw = await r.get(f"cache:{key}")
    return json.loads(raw) if raw else None
