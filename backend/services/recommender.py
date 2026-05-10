"""Simple content-based recommender for similar recipes."""
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from models.recipe import Recipe


async def get_similar_recipes(recipe: Recipe, db: AsyncSession, limit: int = 6) -> List[Recipe]:
    result = await db.execute(
        select(Recipe).where(
            Recipe.id != recipe.id,
            Recipe.is_published == True,
            or_(
                Recipe.category_id == recipe.category_id,
                Recipe.cuisine_country == recipe.cuisine_country,
            )
        ).order_by(Recipe.rating.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def get_trending(db: AsyncSession, hours: int = 24, limit: int = 10) -> List[Recipe]:
    from datetime import datetime, timedelta, timezone
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    result = await db.execute(
        select(Recipe).where(
            Recipe.is_published == True,
            Recipe.updated_at >= since,
        ).order_by(Recipe.views.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def get_seasonal(db: AsyncSession, month: int, limit: int = 20) -> List[Recipe]:
    from sqlalchemy.dialects.postgresql import ARRAY
    result = await db.execute(
        select(Recipe).where(
            Recipe.is_published == True,
            Recipe.season_months.any(month),
        ).order_by(Recipe.rating.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def fridge_match(
    db: AsyncSession,
    available_ingredients: List[str],
    limit: int = 10,
) -> List[dict]:
    """Score recipes by ingredient overlap."""
    result = await db.execute(
        select(Recipe).where(Recipe.is_published == True)
        .limit(500)
    )
    recipes = list(result.scalars().all())

    available_lower = {i.lower().strip() for i in available_ingredients}
    scored = []
    for recipe in recipes:
        recipe_ing = {i.name.lower().strip() for i in (recipe.ingredients or []) if i.name}
        if not recipe_ing:
            continue
        overlap = len(available_lower & recipe_ing)
        score = overlap / len(recipe_ing) * 100
        missing = recipe_ing - available_lower
        scored.append({
            "recipe_id": recipe.id,
            "title": recipe.title,
            "match_percent": round(score, 1),
            "missing_count": len(missing),
            "missing": list(missing)[:5],
        })

    scored.sort(key=lambda x: (-x["match_percent"], x["missing_count"]))
    return scored[:limit]
