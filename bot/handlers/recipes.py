"""Handlers: /random, /top, /search, /recipe_ID, /seasonal, recipe callbacks"""
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import Command

from services.api_client import api
from services.redis_client import cache_get, cache_set, set_state, get_state, clear_state
from keyboards.main import (
    recipe_keyboard, recipe_full_keyboard, steps_keyboard,
    search_pagination, categories_keyboard, calorie_keyboard, cancel_keyboard,
)
from utils.formatters import format_recipe_card, format_recipe_list
import re

router = Router()


# ── /random ───────────────────────────────────────────────────────
@router.message(Command("random"))
@router.message(F.text == "🎲 Случайный рецепт")
async def cmd_random(message: Message, access_token: str | None):
    recipe = await api.random_recipe()
    if not recipe:
        await message.answer("😔 Не удалось получить рецепт. Попробуйте позже.")
        return
    text = format_recipe_card(recipe, short=True)
    photo = recipe.get("main_photo")
    kb = recipe_keyboard(recipe["id"], has_token=bool(access_token))
    if photo:
        await message.answer_photo(photo=photo, caption=text, parse_mode="MarkdownV2", reply_markup=kb)
    else:
        await message.answer(text, parse_mode="MarkdownV2", reply_markup=kb)


@router.callback_query(F.data == "random")
async def cb_random(callback: CallbackQuery, access_token: str | None):
    recipe = await api.random_recipe()
    if not recipe:
        await callback.answer("Не удалось получить рецепт", show_alert=True)
        return
    text = format_recipe_card(recipe, short=True)
    kb = recipe_keyboard(recipe["id"], has_token=bool(access_token))
    photo = recipe.get("main_photo")
    if photo:
        await callback.message.answer_photo(photo=photo, caption=text, parse_mode="MarkdownV2", reply_markup=kb)
    else:
        await callback.message.answer(text, parse_mode="MarkdownV2", reply_markup=kb)
    await callback.answer()


# ── /top ─────────────────────────────────────────────────────────
@router.message(Command("top"))
@router.message(F.text == "🏆 Топ рецептов")
async def cmd_top(message: Message):
    cached = await cache_get("top_week")
    if not cached:
        cached = await api.top_recipes(limit=10, period="week")
        await cache_set("top_week", cached, ttl=600)
    text = format_recipe_list(cached, total=len(cached))
    await message.answer(f"🏆 *Топ недели*\n\n{text}", parse_mode="MarkdownV2")


# ── /search ───────────────────────────────────────────────────────
@router.message(Command("search"))
@router.message(F.text == "🔍 Поиск")
async def cmd_search(message: Message):
    # Check if query is passed inline: /search борщ
    parts = message.text.split(maxsplit=1) if message.text else []
    query = parts[1].strip() if len(parts) > 1 else None

    if query:
        await _do_search(message, query, page=1)
    else:
        await set_state(message.from_user.id, "search:waiting")
        await message.answer(
            "🔍 Введите название блюда или ингредиент:",
            reply_markup=cancel_keyboard(),
        )


async def _do_search(message: Message, query: str, page: int = 1):
    result = await api.search_recipes(q=query, page=page, size=5)
    items = result.get("items", [])
    total = result.get("total", 0)
    total_pages = max(1, (total + 4) // 5)

    text = format_recipe_list(items, page=page, total=total)
    kb = search_pagination(query, page, total_pages) if total_pages > 1 else None

    await message.answer(text, parse_mode="MarkdownV2", reply_markup=kb)


@router.callback_query(F.data.startswith("search_page:"))
async def cb_search_page(callback: CallbackQuery):
    _, query, page_str = callback.data.split(":", 2)
    page = int(page_str)
    result = await api.search_recipes(q=query, page=page, size=5)
    items = result.get("items", [])
    total = result.get("total", 0)
    total_pages = max(1, (total + 4) // 5)
    text = format_recipe_list(items, page=page, total=total)
    kb = search_pagination(query, page, total_pages)
    await callback.message.edit_text(text, parse_mode="MarkdownV2", reply_markup=kb)
    await callback.answer()


# ── /recipe_ID ────────────────────────────────────────────────────
@router.message(F.text.regexp(r"^/recipe_(\d+)$"))
async def cmd_recipe_by_id(message: Message, access_token: str | None):
    match = re.match(r"^/recipe_(\d+)$", message.text)
    recipe_id = int(match.group(1))
    recipe = await api.get_recipe(recipe_id)
    if not recipe:
        await message.answer("😔 Рецепт не найден.")
        return
    text = format_recipe_card(recipe)
    kb = recipe_full_keyboard(recipe_id)
    photo = recipe.get("main_photo")
    if photo:
        await message.answer_photo(photo=photo, caption=text, parse_mode="MarkdownV2", reply_markup=kb)
    else:
        await message.answer(text, parse_mode="MarkdownV2", reply_markup=kb)


@router.callback_query(F.data.startswith("recipe:"))
async def cb_recipe(callback: CallbackQuery, access_token: str | None):
    recipe_id = int(callback.data.split(":")[1])
    recipe = await api.get_recipe(recipe_id)
    if not recipe:
        await callback.answer("Рецепт не найден", show_alert=True)
        return
    text = format_recipe_card(recipe)
    kb = recipe_full_keyboard(recipe_id)
    await callback.message.answer(text, parse_mode="MarkdownV2", reply_markup=kb)
    await callback.answer()


# ── Recipe detail callbacks ───────────────────────────────────────
@router.callback_query(F.data.startswith("ingredients:"))
async def cb_ingredients(callback: CallbackQuery):
    recipe_id = int(callback.data.split(":")[1])
    recipe = await api.get_recipe(recipe_id)
    if not recipe:
        await callback.answer("Рецепт не найден", show_alert=True)
        return

    ingredients = recipe.get("ingredients", [])
    if not ingredients:
        await callback.answer("Список ингредиентов пуст", show_alert=True)
        return

    lines = [f"🥗 *Ингредиенты: {recipe['title']}*\n"]
    last_group = None
    for ing in ingredients:
        group = ing.get("group_name")
        if group and group != last_group:
            lines.append(f"\n_{group}:_")
            last_group = group
        amount = f"{ing['amount']} {ing['unit']}" if ing.get("amount") else ""
        lines.append(f"  • {ing['name']} {amount}".strip())
        if ing.get("substitute_notes"):
            lines.append(f"    _↳ Замена: {ing['substitute_notes']}_")

    await callback.message.answer("\n".join(lines), parse_mode="Markdown")
    await callback.answer()


@router.callback_query(F.data.startswith("nutrition:"))
async def cb_nutrition(callback: CallbackQuery):
    recipe_id = int(callback.data.split(":")[1])
    recipe = await api.get_recipe(recipe_id)
    nutr = recipe.get("nutrition") if recipe else None
    if not nutr:
        await callback.answer("КБЖУ недоступно", show_alert=True)
        return

    def fmt(val):
        return f"{round(val, 1)}" if val is not None else "—"

    text = (
        f"📊 *КБЖУ: {recipe['title']}*\n\n"
        f"🔥 Калории: *{fmt(nutr.get('calories'))} ккал*\n"
        f"💪 Белки: *{fmt(nutr.get('protein'))} г*\n"
        f"🫙 Жиры: *{fmt(nutr.get('fat'))} г*\n"
        f"🌾 Углеводы: *{fmt(nutr.get('carbs'))} г*\n"
        f"🥬 Клетчатка: *{fmt(nutr.get('fiber'))} г*\n\n"
        f"*Витамины и минералы:*\n"
        f"  Вит. C: {fmt(nutr.get('vitamin_c'))} мг\n"
        f"  Вит. D: {fmt(nutr.get('vitamin_d'))} мкг\n"
        f"  Вит. B12: {fmt(nutr.get('vitamin_b12'))} мкг\n"
        f"  Железо: {fmt(nutr.get('iron'))} мг\n"
        f"  Кальций: {fmt(nutr.get('calcium'))} мг\n"
        f"  Магний: {fmt(nutr.get('magnesium'))} мг\n"
        f"  Цинк: {fmt(nutr.get('zinc'))} мг"
    )
    await callback.message.answer(text, parse_mode="Markdown")
    await callback.answer()


@router.callback_query(F.data.startswith("steps:"))
async def cb_steps(callback: CallbackQuery):
    parts = callback.data.split(":")
    recipe_id = int(parts[1])
    step_idx = int(parts[2])

    recipe = await api.get_recipe(recipe_id)
    if not recipe:
        await callback.answer("Рецепт не найден", show_alert=True)
        return

    steps = recipe.get("steps", [])
    if not steps or step_idx >= len(steps):
        await callback.answer("Шаг не найден", show_alert=True)
        return

    step = steps[step_idx]
    timer_str = ""
    if step.get("timer_seconds"):
        m, s = divmod(step["timer_seconds"], 60)
        timer_str = f"\n⏱ Таймер: *{m}:{s:02d}*"

    text = (
        f"📖 *{recipe['title']}*\n"
        f"_Шаг {step_idx + 1} из {len(steps)}_\n\n"
        f"{step['description']}"
        f"{timer_str}"
    )
    kb = steps_keyboard(recipe_id, step_idx, len(steps))

    if step.get("photo_url") and step_idx == 0:
        await callback.message.answer_photo(
            photo=step["photo_url"], caption=text, parse_mode="Markdown", reply_markup=kb
        )
    else:
        try:
            await callback.message.edit_text(text, parse_mode="Markdown", reply_markup=kb)
        except Exception:
            await callback.message.answer(text, parse_mode="Markdown", reply_markup=kb)
    await callback.answer()


@router.callback_query(F.data.startswith("similar:"))
async def cb_similar(callback: CallbackQuery):
    recipe_id = int(callback.data.split(":")[1])
    similar = await api.get_recipe(recipe_id)  # We'd need a separate similar endpoint
    await callback.answer("Похожие рецепты скоро появятся!", show_alert=True)


# ── /seasonal ─────────────────────────────────────────────────────
@router.message(Command("seasonal"))
@router.message(F.text == "🌱 Сезонные")
async def cmd_seasonal(message: Message):
    from datetime import datetime
    month = datetime.now().month
    months_ru = ["", "январе", "феврале", "марте", "апреле", "мае", "июне",
                 "июле", "августе", "сентябре", "октябре", "ноябре", "декабре"]
    recipes = await api.seasonal_recipes(month)
    if not recipes:
        await message.answer(f"😔 Сезонных рецептов для {months_ru[month]} не найдено.")
        return
    text = f"🌱 *Сезонные рецепты — {months_ru[month]}*\n\n"
    text += format_recipe_list(recipes[:8], total=len(recipes))
    await message.answer(text, parse_mode="MarkdownV2")


# ── /categories ───────────────────────────────────────────────────
@router.message(Command("categories"))
@router.message(F.text == "📋 Категории")
async def cmd_categories(message: Message):
    cats = await api.categories()
    if not cats:
        await message.answer("😔 Не удалось загрузить категории.")
        return
    await message.answer(
        "📋 *Выберите категорию:*",
        parse_mode="Markdown",
        reply_markup=categories_keyboard(cats),
    )


@router.callback_query(F.data.startswith("category:"))
async def cb_category(callback: CallbackQuery, access_token: str | None):
    cat_id = int(callback.data.split(":")[1])
    result = await api.search_recipes(q="", page=1, size=8)
    # Filter by category — use search with category_id
    items = result.get("items", [])
    text = format_recipe_list(items, total=result.get("total", 0))
    await callback.message.answer(text, parse_mode="MarkdownV2")
    await callback.answer()


# ── AI ask ────────────────────────────────────────────────────────
@router.callback_query(F.data.startswith("ask_recipe:"))
async def cb_ask_recipe(callback: CallbackQuery):
    recipe_id = int(callback.data.split(":")[1])
    await set_state(callback.from_user.id, "ask_recipe", {"recipe_id": recipe_id})
    await callback.message.answer(
        "🤖 Задайте вопрос об этом рецепте:\n\n"
        "_Например: «Можно без глютена?», «Чем заменить яйца?»_",
        parse_mode="Markdown",
        reply_markup=cancel_keyboard(),
    )
    await callback.answer()


# ── Log meal ──────────────────────────────────────────────────────
@router.callback_query(F.data.startswith("log_meal:"))
async def cb_log_meal(callback: CallbackQuery, access_token: str | None):
    if not access_token:
        await callback.answer("Войдите в аккаунт через /login", show_alert=True)
        return
    recipe_id = int(callback.data.split(":")[1])
    ok = await api.log_meal(recipe_id, 1.0, access_token)
    if ok:
        await callback.answer("✅ Записано в дневник питания!", show_alert=True)
    else:
        await callback.answer("❌ Ошибка записи", show_alert=True)


# ── cancel ────────────────────────────────────────────────────────
@router.callback_query(F.data == "cancel")
async def cb_cancel(callback: CallbackQuery):
    await clear_state(callback.from_user.id)
    await callback.message.delete()
    await callback.answer("Отменено")


@router.callback_query(F.data == "noop")
async def cb_noop(callback: CallbackQuery):
    await callback.answer()
