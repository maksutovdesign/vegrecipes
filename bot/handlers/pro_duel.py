"""Handlers: /pro, /duel, /stats"""
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import Command

from services.api_client import api
from keyboards.main import pro_keyboard, duel_keyboard, stats_period_keyboard
from utils.formatters import format_health_stats

router = Router()


# ── /pro ──────────────────────────────────────────────────────────
@router.message(Command("pro"))
@router.message(F.text == "👑 Получить PRO")
async def cmd_pro(message: Message, api_user: dict | None, access_token: str | None):
    if api_user and api_user.get("sub_type") == "pro":
        await message.answer(
            "👑 *У вас уже есть PRO\\!*\n\nНаслаждайтесь всеми возможностями платформы\\.",
            parse_mode="MarkdownV2",
        )
        return

    text = (
        "👑 *VegRecipes PRO*\n\n"
        "Разблокируйте полный потенциал:\n\n"
        "📅 Недельный и месячный план питания\n"
        "🛒 Полный список покупок \\+ PDF\n"
        "📊 Дневник здоровья с трендами\n"
        "🤖 Расширенный AI\\-ассистент\n"
        "🌍 Карта вкусов мира PRO\n"
        "📈 Аналитика витаминов за 90 дней\n\n"
        "💳 *Тарифы:*\n"
        "• Месяц — 299 ₽\n"
        "• Год — 1 990 ₽ \\(экономия 600 ₽\\)"
    )

    if access_token:
        await message.answer(text, parse_mode="MarkdownV2", reply_markup=pro_keyboard())
    else:
        await message.answer(
            text + "\n\n_Войдите через /login для оформления_",
            parse_mode="MarkdownV2",
            reply_markup=pro_keyboard(),
        )


@router.callback_query(F.data.startswith("pro:"))
async def cb_pro_plan(callback: CallbackQuery, access_token: str | None):
    plan = callback.data.split(":")[1]  # monthly | yearly
    if not access_token:
        await callback.answer("Войдите через /login", show_alert=True)
        return

    url = await api.create_checkout(plan, access_token)
    if not url:
        await callback.answer("Ошибка создания платежа. Попробуйте позже.", show_alert=True)
        return

    price = "299 ₽/мес" if plan == "monthly" else "1 990 ₽/год"
    await callback.message.answer(
        f"💳 *Оформление PRO — {price}*\n\nНажмите кнопку для перехода к оплате:",
        parse_mode="Markdown",
        reply_markup=pro_keyboard(checkout_url=url),
    )
    await callback.answer()


# ── /duel ─────────────────────────────────────────────────────────
@router.message(Command("duel"))
@router.message(F.text == "⚔️ Дуэль рецептов")
async def cmd_duel(message: Message):
    duels = await api.active_duels()
    if not duels:
        await message.answer("😔 Активных дуэлей нет. Загляните позже!")
        return

    duel = duels[0]
    ra = duel.get("recipe_a") or {}
    rb = duel.get("recipe_b") or {}
    votes_a = duel.get("votes_a", 0)
    votes_b = duel.get("votes_b", 0)
    total = votes_a + votes_b or 1
    pct_a = round(votes_a / total * 100)
    pct_b = round(votes_b / total * 100)

    text = (
        f"⚔️ *Дуэль рецептов*\n\n"
        f"🅰 *{ra.get('title', 'Рецепт A')}*\n"
        f"{'█' * (pct_a // 10)}{'░' * (10 - pct_a // 10)} {pct_a}%\n\n"
        f"vs\n\n"
        f"🅱 *{rb.get('title', 'Рецепт B')}*\n"
        f"{'█' * (pct_b // 10)}{'░' * (10 - pct_b // 10)} {pct_b}%\n\n"
        f"_Всего голосов: {total}_"
    )

    kb = duel_keyboard(duel["id"], duel["recipe_a_id"], duel["recipe_b_id"])
    await message.answer(text, parse_mode="Markdown", reply_markup=kb)


@router.callback_query(F.data.startswith("duel_vote:"))
async def cb_duel_vote(callback: CallbackQuery, access_token: str | None):
    if not access_token:
        await callback.answer("Войдите через /login чтобы голосовать", show_alert=True)
        return
    _, duel_id_str, recipe_id_str = callback.data.split(":")
    result = await api.vote_duel(int(duel_id_str), int(recipe_id_str), access_token)
    if result:
        va = result.get("votes_a", 0)
        vb = result.get("votes_b", 0)
        total = va + vb or 1
        await callback.answer(
            f"✅ Голос учтён!\nA: {round(va/total*100)}%  B: {round(vb/total*100)}%",
            show_alert=True,
        )
    else:
        await callback.answer("Вы уже голосовали или ошибка", show_alert=True)


# ── /stats ────────────────────────────────────────────────────────
@router.message(Command("stats"))
@router.message(F.text == "📊 Моя статистика")
async def cmd_stats(message: Message, api_user: dict | None, access_token: str | None):
    if not access_token:
        await message.answer("🔐 Войдите через /login для просмотра статистики.")
        return

    is_pro = api_user and api_user.get("sub_type") == "pro"
    if not is_pro:
        await message.answer(
            "📊 Расширенная статистика — функция *PRO*\\.\n\nОформите подписку через /pro",
            parse_mode="MarkdownV2",
        )
        return

    await message.answer(
        "📊 *Статистика питания*\n\nВыберите период:",
        parse_mode="Markdown",
        reply_markup=stats_period_keyboard(),
    )


@router.callback_query(F.data.startswith("stats:"))
async def cb_stats(callback: CallbackQuery, access_token: str | None):
    days = int(callback.data.split(":")[1])
    if not access_token:
        await callback.answer("Войдите через /login", show_alert=True)
        return
    stats = await api.health_stats(days, access_token)
    text = format_health_stats(stats or {}, days)
    await callback.message.edit_text(text, parse_mode="Markdown")
    await callback.answer()
