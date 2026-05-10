"""Simple per-user rate limiting middleware."""
from typing import Any, Awaitable, Callable
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Message
from services.redis_client import get_redis

RATE_LIMIT = 1.5  # seconds between messages per user


class ThrottleMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        if not isinstance(event, Message):
            return await handler(event, data)

        user = event.from_user
        if not user:
            return await handler(event, data)

        r = await get_redis()
        key = f"throttle:{user.id}"
        exists = await r.exists(key)
        if exists:
            await event.answer("⏳ Не так быстро! Подождите секунду.")
            return

        await r.set(key, "1", px=int(RATE_LIMIT * 1000))
        return await handler(event, data)
