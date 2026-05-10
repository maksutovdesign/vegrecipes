"""Middleware: inject user token and profile into handler data."""
from typing import Any, Awaitable, Callable
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, User
from services.redis_client import get_user_token
from services.api_client import api


class AuthMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        tg_user: User | None = data.get("event_from_user")
        if tg_user:
            access, refresh = await get_user_token(tg_user.id)
            data["access_token"] = access
            data["refresh_token"] = refresh

            if access:
                # Try to load user profile (cached in Redis for 5 min)
                from services.redis_client import cache_get, cache_set
                cache_key = f"profile:{tg_user.id}"
                user_data = await cache_get(cache_key)
                if not user_data:
                    user_data = await api.me(access)
                    if user_data:
                        await cache_set(cache_key, user_data, ttl=300)
                data["api_user"] = user_data
            else:
                data["api_user"] = None

        return await handler(event, data)
