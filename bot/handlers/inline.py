"""Inline query handler — search recipes in any chat."""
from aiogram import Router
from aiogram.types import (
    InlineQuery, InlineQueryResultArticle,
    InputTextMessageContent, InlineQueryResultPhoto,
)
from services.api_client import api

router = Router()

PLACEHOLDER = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400"


@router.inline_query()
async def inline_search(query: InlineQuery):
    q = query.query.strip()
    offset = int(query.offset or "0")

    if not q:
        # Show trending when no query
        recipes = await api.top_recipes(limit=10, period="week")
    else:
        result = await api.search_recipes(q=q, page=(offset // 10) + 1, size=10)
        recipes = result.get("items", [])

    results = []
    for recipe in recipes[:10]:
        recipe_id = recipe["id"]
        title = recipe.get("title", "Без названия")
        vegan = "🌿 " if recipe.get("is_vegan") else ""

        nutr = recipe.get("nutrition") or {}
        cal_str = f" · {round(nutr['calories'])} ккал" if nutr.get("calories") else ""
        time_str = f" · ⏱{recipe.get('cook_time', '?')}м" if recipe.get("cook_time") else ""
        description = f"{vegan}{time_str}{cal_str}".strip(" · ")

        # Message content when shared
        msg_text = (
            f"🥗 *{title}*\n"
            f"{description}\n\n"
            f"Открыть рецепт: https://vegrecipes.app/recipes/{recipe_id}"
        )

        photo = recipe.get("main_photo")

        if photo:
            results.append(
                InlineQueryResultPhoto(
                    id=str(recipe_id),
                    photo_url=photo,
                    thumbnail_url=photo,
                    title=f"{vegan}{title}",
                    description=description or "Рецепт",
                    caption=msg_text,
                    parse_mode="Markdown",
                )
            )
        else:
            results.append(
                InlineQueryResultArticle(
                    id=str(recipe_id),
                    title=f"{vegan}{title}",
                    description=description or "Рецепт",
                    input_message_content=InputTextMessageContent(
                        message_text=msg_text,
                        parse_mode="Markdown",
                    ),
                    thumbnail_url=PLACEHOLDER,
                )
            )

    next_offset = str(offset + 10) if len(recipes) == 10 else ""
    await query.answer(
        results=results,
        cache_time=60,
        is_personal=False,
        next_offset=next_offset,
        button=None,
    )
