"""Handler: /start, /help, /me, /logout"""
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import CommandStart, Command

from keyboards.main import main_menu, auth_keyboard
from services.redis_client import delete_user_token, cache_set
from services.api_client import api

router = Router()

WELCOME_TEXT = """
🥗 *Добро пожаловать в VegRecipes\\!*

Твой персональный помощник по вегетарианской кухне\\.

*Что умею:*
🎲 /random — случайный рецепт
🔍 /search — поиск по названию
🏆 /top — топ рецептов недели
📋 /categories — все категории
🌶 /spice — база специй
🌱 /seasonal — сезонные рецепты
📅 /plan — меню на день
🧊 /fridge — что приготовить из холодильника
⚔️ /duel — дуэль рецептов
👤 /me — мой профиль
👑 /pro — подписка PRO

*Inline\\-поиск:* напиши @vegrecipes\\_bot рецепт в любом чате\\.
"""

HELP_TEXT = """
📖 *Все команды VegRecipes*

*🍽 Рецепты*
/random — случайный рецепт
/search \\[запрос\\] — поиск
/top — топ недели
/categories — по категориям
/seasonal — сезонные
/recipe\\_ID — открыть по ID

*🌶 Специи*
/spice — список специй
/spice \\[название\\] — найти специю

*📅 Питание*
/plan — меню на день
/plan\\_week — недельное \\(PRO\\)
/fridge — рецепты из холодильника
/stats — статистика питания \\(PRO\\)

*👤 Аккаунт*
/me — мой профиль
/login — войти
/logout — выйти
/pro — подписка PRO
"""


@router.message(CommandStart())
async def cmd_start(message: Message, api_user: dict | None, access_token: str | None):
    is_pro = api_user and api_user.get("sub_type") == "pro"
    name = message.from_user.first_name or "друг"

    if api_user:
        greeting = f"С возвращением, *{api_user.get('display_name') or name}*\\! 👋"
    else:
        greeting = f"Привет, *{name}*\\! 👋"

    await message.answer(
        f"{greeting}\n{WELCOME_TEXT}",
        parse_mode="MarkdownV2",
        reply_markup=main_menu(is_pro=bool(is_pro)),
    )


@router.message(Command("help"))
async def cmd_help(message: Message):
    await message.answer(HELP_TEXT, parse_mode="MarkdownV2")


@router.message(Command("me"))
async def cmd_me(message: Message, api_user: dict | None, access_token: str | None):
    if not api_user:
        await message.answer(
            "🔐 Вы не авторизованы\\. Войдите в аккаунт:",
            parse_mode="MarkdownV2",
            reply_markup=auth_keyboard(),
        )
        return

    sub = api_user.get("sub_type", "free")
    sub_badge = "👑 PRO" if sub == "pro" else "🆓 Free"
    streak = api_user.get("streak_days", 0)
    joined = api_user.get("created_at", "")[:10] if api_user.get("created_at") else "—"

    text = (
        f"👤 *Мой профиль*\n\n"
        f"📧 {api_user.get('email')}\n"
        f"🏷 {api_user.get('display_name') or api_user.get('username') or '—'}\n"
        f"🎖 Статус: *{sub_badge}*\n"
        f"🔥 Серия: *{streak} дней*\n"
        f"📅 Дата регистрации: {joined}\n"
    )
    await message.answer(text, parse_mode="Markdown")


@router.message(Command("logout"))
async def cmd_logout(message: Message, access_token: str | None):
    if not access_token:
        await message.answer("Вы не авторизованы.")
        return
    await delete_user_token(message.from_user.id)
    await message.answer("✅ Вы вышли из аккаунта.", reply_markup=main_menu())


@router.message(Command("login"))
async def cmd_login(message: Message, access_token: str | None):
    if access_token:
        await message.answer("Вы уже авторизованы\\. Используйте /me чтобы посмотреть профиль\\.", parse_mode="MarkdownV2")
        return
    await message.answer(
        "🔑 *Авторизация*\n\nВыберите действие:",
        parse_mode="Markdown",
        reply_markup=auth_keyboard(),
    )


@router.callback_query(F.data == "auth:login")
async def cb_auth_login(callback: CallbackQuery):
    from services.redis_client import set_state
    await set_state(callback.from_user.id, "login:email")
    await callback.message.edit_text(
        "📧 Введите ваш *email*:",
        parse_mode="Markdown",
    )
    await callback.answer()


@router.callback_query(F.data == "auth:register")
async def cb_auth_register(callback: CallbackQuery):
    from services.redis_client import set_state
    await set_state(callback.from_user.id, "register:email")
    await callback.message.edit_text(
        "📧 Регистрация\\. Введите ваш *email*:",
        parse_mode="MarkdownV2",
    )
    await callback.answer()
