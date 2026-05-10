"""VegRecipes Telegram Bot — entry point."""
import asyncio
import logging
import sentry_sdk
from aiohttp import web

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application

from config import settings
from middlewares.auth import AuthMiddleware
from middlewares.throttle import ThrottleMiddleware
from handlers import start, recipes, plan_fridge, spices, pro_duel, fsm, inline
from services.api_client import api as api_client

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── Sentry ────────────────────────────────────────────────────────────────────
if settings.SENTRY_DSN:
    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.2)
    logger.info("Sentry initialized")


def create_dispatcher() -> Dispatcher:
    dp = Dispatcher()

    # Middlewares (order matters)
    dp.message.middleware(ThrottleMiddleware())
    dp.message.middleware(AuthMiddleware())
    dp.callback_query.middleware(AuthMiddleware())
    dp.inline_query.middleware(AuthMiddleware())

    # Routers — FSM must be last (catches all text)
    dp.include_router(start.router)
    dp.include_router(recipes.router)
    dp.include_router(plan_fridge.router)
    dp.include_router(spices.router)
    dp.include_router(pro_duel.router)
    dp.include_router(inline.router)
    dp.include_router(fsm.router)   # ← must be last

    return dp


async def on_startup(bot: Bot) -> None:
    if settings.WEBHOOK_URL:
        await bot.set_webhook(
            url=f"{settings.WEBHOOK_URL}{settings.WEBHOOK_PATH}",
            secret_token=settings.WEBHOOK_SECRET,
            allowed_updates=["message", "callback_query", "inline_query"],
        )
        logger.info(f"Webhook set: {settings.WEBHOOK_URL}{settings.WEBHOOK_PATH}")
    else:
        logger.info("Running in polling mode")

    # Set bot commands
    from aiogram.types import BotCommand
    commands = [
        BotCommand(command="start",      description="Главное меню"),
        BotCommand(command="random",     description="Случайный рецепт"),
        BotCommand(command="search",     description="Поиск рецептов"),
        BotCommand(command="top",        description="Топ недели"),
        BotCommand(command="categories", description="Категории"),
        BotCommand(command="seasonal",   description="Сезонные рецепты"),
        BotCommand(command="spice",      description="База специй"),
        BotCommand(command="plan",       description="Меню на день"),
        BotCommand(command="plan_week",  description="Недельное меню (PRO)"),
        BotCommand(command="fridge",     description="Рецепты из холодильника"),
        BotCommand(command="duel",       description="Дуэль рецептов"),
        BotCommand(command="stats",      description="Статистика питания (PRO)"),
        BotCommand(command="pro",        description="Подписка PRO"),
        BotCommand(command="me",         description="Мой профиль"),
        BotCommand(command="login",      description="Войти в аккаунт"),
        BotCommand(command="logout",     description="Выйти из аккаунта"),
        BotCommand(command="help",       description="Справка"),
    ]
    await bot.set_my_commands(commands)
    logger.info("Bot commands set")


async def on_shutdown(bot: Bot) -> None:
    await api_client.close()
    if settings.WEBHOOK_URL:
        await bot.delete_webhook()
    logger.info("Bot shut down")


async def run_polling():
    bot = Bot(
        token=settings.BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = create_dispatcher()
    dp.startup.register(on_startup)
    dp.shutdown.register(on_shutdown)

    logger.info("Starting polling...")
    await dp.start_polling(bot, allowed_updates=["message", "callback_query", "inline_query"])


def run_webhook():
    bot = Bot(
        token=settings.BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = create_dispatcher()
    dp.startup.register(on_startup)
    dp.shutdown.register(on_shutdown)

    app = web.Application()
    handler = SimpleRequestHandler(
        dispatcher=dp,
        bot=bot,
        secret_token=settings.WEBHOOK_SECRET,
    )
    handler.register(app, path=settings.WEBHOOK_PATH)
    setup_application(app, dp, bot=bot)

    logger.info(f"Starting webhook server on port 8080...")
    web.run_app(app, host="0.0.0.0", port=8080)


if __name__ == "__main__":
    if settings.WEBHOOK_URL:
        run_webhook()
    else:
        asyncio.run(run_polling())
