"""All keyboards and inline markup builders."""
from aiogram.types import (
    ReplyKeyboardMarkup, KeyboardButton,
    InlineKeyboardMarkup, InlineKeyboardButton,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder, ReplyKeyboardBuilder


# ── Main menu ─────────────────────────────────────────────────────
def main_menu(is_pro: bool = False) -> ReplyKeyboardMarkup:
    builder = ReplyKeyboardBuilder()
    builder.row(
        KeyboardButton(text="🎲 Случайный рецепт"),
        KeyboardButton(text="🔍 Поиск"),
    )
    builder.row(
        KeyboardButton(text="🏆 Топ рецептов"),
        KeyboardButton(text="📋 Категории"),
    )
    builder.row(
        KeyboardButton(text="🌶 Специи"),
        KeyboardButton(text="🌱 Сезонные"),
    )
    builder.row(
        KeyboardButton(text="📅 Меню на день"),
        KeyboardButton(text="🧊 Холодильник"),
    )
    if is_pro:
        builder.row(
            KeyboardButton(text="📊 Моя статистика"),
            KeyboardButton(text="⚔️ Дуэль рецептов"),
        )
    else:
        builder.row(KeyboardButton(text="👑 Получить PRO"))
    return builder.as_markup(resize_keyboard=True)


# ── Recipe card keyboard ──────────────────────────────────────────
def recipe_keyboard(recipe_id: int, has_token: bool = False) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="📖 Полный рецепт", callback_data=f"recipe:{recipe_id}"),
        InlineKeyboardButton(text="🎲 Другой", callback_data="random"),
    )
    builder.row(
        InlineKeyboardButton(text="🤖 Спросить AI", callback_data=f"ask_recipe:{recipe_id}"),
        InlineKeyboardButton(text="🔗 Похожие", callback_data=f"similar:{recipe_id}"),
    )
    if has_token:
        builder.row(
            InlineKeyboardButton(text="📝 Записать в дневник", callback_data=f"log_meal:{recipe_id}"),
        )
    return builder.as_markup()


def recipe_full_keyboard(recipe_id: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="🥗 Ингредиенты", callback_data=f"ingredients:{recipe_id}"),
        InlineKeyboardButton(text="📊 КБЖУ", callback_data=f"nutrition:{recipe_id}"),
    )
    builder.row(
        InlineKeyboardButton(text="🚶 Шаги", callback_data=f"steps:{recipe_id}:0"),
        InlineKeyboardButton(text="🤖 AI-ассистент", callback_data=f"ask_recipe:{recipe_id}"),
    )
    builder.row(
        InlineKeyboardButton(text="📝 В дневник", callback_data=f"log_meal:{recipe_id}"),
        InlineKeyboardButton(text="🎲 Случайный", callback_data="random"),
    )
    builder.row(
        InlineKeyboardButton(text="🌐 Открыть на сайте", url=f"https://vegrecipes.app/recipes/{recipe_id}"),
    )
    return builder.as_markup()


def steps_keyboard(recipe_id: int, step_idx: int, total_steps: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    row = []
    if step_idx > 0:
        row.append(InlineKeyboardButton(text="← Назад", callback_data=f"steps:{recipe_id}:{step_idx - 1}"))
    if step_idx < total_steps - 1:
        row.append(InlineKeyboardButton(text="Далее →", callback_data=f"steps:{recipe_id}:{step_idx + 1}"))
    if row:
        builder.row(*row)
    builder.row(
        InlineKeyboardButton(text=f"Шаг {step_idx + 1}/{total_steps}", callback_data="noop"),
    )
    return builder.as_markup()


# ── Search pagination ─────────────────────────────────────────────
def search_pagination(query: str, page: int, total_pages: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    row = []
    if page > 1:
        row.append(InlineKeyboardButton(text="← Назад", callback_data=f"search_page:{query}:{page - 1}"))
    if page < total_pages:
        row.append(InlineKeyboardButton(text="Вперёд →", callback_data=f"search_page:{query}:{page + 1}"))
    if row:
        builder.row(*row)
    return builder.as_markup()


# ── Categories ────────────────────────────────────────────────────
def categories_keyboard(categories: list[dict]) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for cat in categories:
        icon = cat.get("icon") or "🍽"
        builder.button(
            text=f"{icon} {cat['name']}",
            callback_data=f"category:{cat['id']}",
        )
    builder.adjust(2)
    return builder.as_markup()


# ── Spices ────────────────────────────────────────────────────────
def spices_keyboard(spices: list[dict]) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for s in spices:
        builder.button(text=s["name"], callback_data=f"spice:{s['id']}")
    builder.adjust(2)
    return builder.as_markup()


# ── PRO ───────────────────────────────────────────────────────────
def pro_keyboard(checkout_url: str | None = None) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    if checkout_url:
        builder.row(InlineKeyboardButton(text="💳 Оплатить подписку", url=checkout_url))
    builder.row(
        InlineKeyboardButton(text="📅 Месяц — 299 ₽", callback_data="pro:monthly"),
        InlineKeyboardButton(text="📆 Год — 1990 ₽", callback_data="pro:yearly"),
    )
    builder.row(
        InlineKeyboardButton(text="🌐 Открыть сайт", url="https://vegrecipes.app/pro"),
    )
    return builder.as_markup()


# ── Auth ──────────────────────────────────────────────────────────
def auth_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="🔑 Войти", callback_data="auth:login"),
        InlineKeyboardButton(text="📝 Регистрация", callback_data="auth:register"),
    )
    return builder.as_markup()


# ── Duel ─────────────────────────────────────────────────────────
def duel_keyboard(duel_id: int, recipe_a_id: int, recipe_b_id: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="👈 Голос за A", callback_data=f"duel_vote:{duel_id}:{recipe_a_id}"),
        InlineKeyboardButton(text="Голос за B 👉", callback_data=f"duel_vote:{duel_id}:{recipe_b_id}"),
    )
    return builder.as_markup()


# ── Health / stats ────────────────────────────────────────────────
def stats_period_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="7 дней", callback_data="stats:7"),
        InlineKeyboardButton(text="14 дней", callback_data="stats:14"),
        InlineKeyboardButton(text="30 дней", callback_data="stats:30"),
    )
    return builder.as_markup()


# ── Calorie selector ─────────────────────────────────────────────
def calorie_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for cal in [1500, 1800, 2000, 2200, 2500]:
        builder.button(text=f"🔥 {cal} ккал", callback_data=f"calories:{cal}")
    builder.adjust(3)
    return builder.as_markup()


# ── Cancel / back ─────────────────────────────────────────────────
def cancel_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="❌ Отмена", callback_data="cancel")
    return builder.as_markup()
