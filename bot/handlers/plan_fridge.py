"""Handlers: /plan, /plan_week, /fridge"""
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import Command

from services.api_client import api
from services.redis_client import set_state, get_state, clear_state
from keyboards.main import calorie_keyboard, pro_keyboard, cancel_keyboard
from utils.formatters import format_daily_plan, format_week_plan_summary

router = Router()


# ── /plan (daily, free) ───────────────────────────────────────────
@router.message(Command("plan"))
@router.message(F.text == "📅 Меню на день")
async def cmd_plan(message: Message, api_user: dict | None):
    await message.answer(
        "📅 *Меню на день*\n\nВыберите целевую калорийность:",
        parse_mode="Markdown",
        reply_markup=calorie_keyboard(),
    )


@router.callback_query(F.data.startswith("calories:"))
async def cb_calories(callback: CallbackQuery, api_user: dict | None, access_token: str | None):
    cal = int(callback.data.split(":")[1])

    # Check if PRO requested week plan
    state, state_data = await get_state(callback.from_user.id)
    if state == "plan:week":
        await clear_state(callback.from_user.id)
        if not access_token:
            await callback.message.edit_text(
                "🔐 Войдите в аккаунт для генерации недельного плана\\.",
                parse_mode="MarkdownV2",
            )
            await callback.answer()
            return
        await callback.message.edit_text("⏳ Генерирую недельное меню...")
        plan = await api.generate_week_plan(cal, access_token)
        if not plan:
            await callback.message.edit_text("😔 Не удалось создать план. Попробуйте позже.")
        else:
            text = format_week_plan_summary(plan)
            await callback.message.edit_text(text, parse_mode="Markdown")
        await callback.answer()
        return

    # Daily plan (free)
    plan = await api.daily_plan(cal)
    text = format_daily_plan(plan)
    await callback.message.edit_text(text, parse_mode="Markdown")
    await callback.answer()


# ── /plan_week (PRO) ──────────────────────────────────────────────
@router.message(Command("plan_week"))
async def cmd_plan_week(message: Message, api_user: dict | None, access_token: str | None):
    is_pro = api_user and api_user.get("sub_type") == "pro"
    if not is_pro:
        await message.answer(
            "👑 *Недельное меню — функция PRO*\n\n"
            "Оформите подписку и получите:\n"
            "• Меню на 7 дней с КБЖУ\n"
            "• Список покупок\n"
            "• Фильтры: веган, без глютена",
            parse_mode="Markdown",
            reply_markup=pro_keyboard(),
        )
        return

    await set_state(message.from_user.id, "plan:week")
    await message.answer(
        "📅 *Недельное меню*\n\nВыберите калорийность:",
        parse_mode="Markdown",
        reply_markup=calorie_keyboard(),
    )


# ── /fridge ───────────────────────────────────────────────────────
@router.message(Command("fridge"))
@router.message(F.text == "🧊 Холодильник")
async def cmd_fridge(message: Message, api_user: dict | None, access_token: str | None):
    # PRO gate
    is_pro = api_user and api_user.get("sub_type") == "pro"
    if not is_pro:
        await message.answer(
            "🧊 *Сканер холодильника — функция PRO*\n\n"
            "Что вы получите:\n"
            "• Подбор рецептов по продуктам из холодильника\n"
            "• AI-советы что приготовить прямо сейчас\n"
            "• Процент совпадения с вашими запасами\n\n"
            "Оформите подписку и используйте неограниченно\\.",
            parse_mode="MarkdownV2",
            reply_markup=pro_keyboard(),
        )
        return

    # Check if user passed ingredients inline
    parts = message.text.split(maxsplit=1) if message.text else []
    if len(parts) > 1:
        await _process_fridge(message, parts[1], access_token)
    else:
        await set_state(message.from_user.id, "fridge:waiting")
        await message.answer(
            "🧊 *Что есть в холодильнике?*\n\n"
            "Введите продукты через запятую:\n"
            "_Пример: морковь, брокколи, тофу, чеснок_",
            parse_mode="Markdown",
            reply_markup=cancel_keyboard(),
        )


async def _process_fridge(message: Message, ingredients: str, access_token: str | None = None):
    await message.answer("⏳ Анализирую холодильник...")

    # DB matches
    matches = await api.fridge_suggest(ingredients)
    ai_answer = await api.fridge_ai(ingredients, access_token)

    lines = [f"🧊 *Результаты для:* {ingredients}\n"]

    if matches:
        lines.append("📋 *Рецепты из базы:*")
        for m in matches[:5]:
            pct = m.get("match_percent", 0)
            bar = "🟩" * (pct // 20) + "⬜" * (5 - pct // 20)
            lines.append(f"{bar} {pct}% — *{m['title']}*")
            if m.get("missing"):
                missing = ", ".join(m["missing"][:3])
                lines.append(f"   _Не хватает: {missing}_")
            lines.append(f"   /recipe\\_{m['recipe_id']}")
    else:
        lines.append("😔 Точных совпадений не найдено")

    lines.append(f"\n🤖 *AI-рекомендация:*\n{ai_answer}")

    await message.answer("\n".join(lines), parse_mode="MarkdownV2")
