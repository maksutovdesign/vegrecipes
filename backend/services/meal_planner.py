"""Meal plan generator respecting daily KBZHU targets."""
import random
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.recipe import Recipe, Nutrition

DAILY_NORM = {"calories": 2000, "protein": 60, "fat": 67, "carbs": 250}
MEALS = ["breakfast", "lunch", "dinner", "snack"]
DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
MEAL_CALORIE_SPLIT = {"breakfast": 0.25, "lunch": 0.35, "dinner": 0.30, "snack": 0.10}


async def generate_week_plan(
    db: AsyncSession,
    daily_calories: int = 2000,
    category_ids: Optional[List[int]] = None,
    is_gluten_free: bool = False,
    is_vegan: bool = True,
) -> Dict[str, Any]:
    query = select(Recipe, Nutrition).join(Nutrition, Recipe.id == Nutrition.recipe_id).where(
        Recipe.is_published == True,
        Recipe.is_vegan == is_vegan,
    )
    if is_gluten_free:
        query = query.where(Recipe.is_gluten_free == True)
    if category_ids:
        query = query.where(Recipe.category_id.in_(category_ids))

    result = await db.execute(query)
    rows = result.all()

    if not rows:
        return {"plan": {day: {} for day in DAYS}, "shopping_list": []}

    plan: Dict[str, Dict] = {}
    used_recipe_ids = set()

    for day in DAYS:
        plan[day] = {}
        for meal in MEALS:
            target_cal = daily_calories * MEAL_CALORIE_SPLIT[meal]
            candidates = [
                (r, n) for r, n in rows
                if r.id not in used_recipe_ids and n.calories and abs(n.calories * r.servings - target_cal) < target_cal * 0.4
            ]
            if not candidates:
                candidates = [(r, n) for r, n in rows if r.id not in used_recipe_ids]
            if not candidates:
                candidates = list(rows)

            recipe, nutrition = random.choice(candidates)
            used_recipe_ids.add(recipe.id)
            plan[day][meal] = {
                "recipe_id": recipe.id,
                "title": recipe.title,
                "calories": round(nutrition.calories * recipe.servings / 4 if nutrition.calories else 0, 1),
            }

    shopping_list = _build_shopping_list(plan, rows)
    return {"plan": plan, "shopping_list": shopping_list}


def _build_shopping_list(plan: Dict, rows) -> List[Dict]:
    recipe_map = {r.id: r for r, _ in rows}
    ingredient_counts: Dict[str, Dict] = {}

    for day_data in plan.values():
        for meal_data in day_data.values():
            recipe_id = meal_data.get("recipe_id")
            recipe = recipe_map.get(recipe_id)
            if not recipe:
                continue
            for ing in (recipe.ingredients or []):
                key = ing.name or ""
                if key not in ingredient_counts:
                    ingredient_counts[key] = {"name": key, "amount": 0, "unit": ing.unit or "г"}
                ingredient_counts[key]["amount"] += ing.amount or 0

    return list(ingredient_counts.values())


async def get_daily_kbzhu(plan_data: Dict, rows) -> Dict[str, float]:
    recipe_map = {r.id: (r, n) for r, n in rows}
    totals = {"calories": 0.0, "protein": 0.0, "fat": 0.0, "carbs": 0.0}
    for meal_data in plan_data.values():
        recipe_id = meal_data.get("recipe_id")
        if recipe_id in recipe_map:
            r, n = recipe_map[recipe_id]
            if n:
                for key in totals:
                    val = getattr(n, key, None) or 0
                    totals[key] += val * r.servings / 4
    return {k: round(v, 1) for k, v in totals.items()}
