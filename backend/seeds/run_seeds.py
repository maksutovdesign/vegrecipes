"""Run all seeds: categories, achievements, spices, 1000 recipes."""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from config import settings
from database import Base
from models import *  # noqa: register all models
from seeds.seed_data import CATEGORIES, ACHIEVEMENTS, SPICES, ALL_RECIPES

import re


def slugify(text: str) -> str:
    try:
        from transliterate import translit
        text = translit(text, "ru", reversed=True)
    except Exception:
        pass
    text = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[\s_-]+", "-", text).strip("-")


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    AsyncSession = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession() as db:
        from models.recipe import Category, Recipe, RecipeIngredient, RecipeStep, Nutrition
        from models.gamification import Achievement
        from models.spice import Spice, SpiceNutrition
        from sqlalchemy import select

        # ── Categories ────────────────────────────────────────────────────────
        existing = await db.execute(select(Category))
        if not existing.scalars().first():
            for cat in CATEGORIES:
                db.add(Category(
                    name=cat["name"], slug=cat["slug"],
                    icon=cat.get("icon"), subcategories=cat.get("subcategories", [])
                ))
            await db.commit()
            print(f"✓ Seeded {len(CATEGORIES)} categories")

        # ── Achievements ──────────────────────────────────────────────────────
        ex = await db.execute(select(Achievement))
        if not ex.scalars().first():
            for a in ACHIEVEMENTS:
                db.add(Achievement(**a))
            await db.commit()
            print(f"✓ Seeded {len(ACHIEVEMENTS)} achievements")

        # ── Spices ────────────────────────────────────────────────────────────
        ex = await db.execute(select(Spice))
        if not ex.scalars().first():
            for s_data in list(SPICES):          # iterate copy to avoid pop side-effects
                nutrition = s_data.get("nutrition", [])
                spice = Spice(
                    name=s_data["name"],
                    origin=s_data.get("origin"),
                    description=s_data.get("description"),
                )
                db.add(spice)
                await db.flush()
                for n in nutrition:
                    db.add(SpiceNutrition(spice_id=spice.id, **n))
            await db.commit()
            print(f"✓ Seeded {len(SPICES)} spices")

        # ── Recipes ───────────────────────────────────────────────────────────
        cat_map = {c.name: c.id for c in (await db.execute(select(Category))).scalars().all()}

        # Build slug→count map to deduplicate
        slug_counter: dict[str, int] = {}

        ex = await db.execute(select(Recipe))
        if not ex.scalars().first():
            for r_data in ALL_RECIPES:
                title       = r_data["title"]
                ingredients = r_data.get("ingredients", [])
                steps       = r_data.get("steps", [])
                nutrients   = r_data.get("nutrients", {})
                category_nm = r_data.get("category", "")

                # unique slug
                base_slug = slugify(title) or f"recipe-{id(r_data)}"
                if base_slug in slug_counter:
                    slug_counter[base_slug] += 1
                    slug = f"{base_slug}-{slug_counter[base_slug]}"
                else:
                    slug_counter[base_slug] = 0
                    slug = base_slug

                recipe = Recipe(
                    title=title,
                    slug=slug,
                    description=r_data.get("description", ""),
                    category_id=cat_map.get(category_nm),
                    difficulty=r_data.get("difficulty", 1),
                    prep_time=r_data.get("prep_time", 0),
                    cook_time=r_data.get("cook_time", 0),
                    servings=r_data.get("servings", 2),
                    cuisine_country=r_data.get("cuisine_country", ""),
                    season_months=r_data.get("season_months", list(range(1, 13))),
                    tags=r_data.get("tags", []),
                    is_vegan=r_data.get("is_vegan", False),
                    is_gluten_free=r_data.get("is_gluten_free", False),
                    health_benefits=r_data.get("health_benefits", ""),
                    recommended_for=[g.strip() for g in r_data.get("target_groups", "").split(",") if g.strip()],
                    rating=r_data.get("rating", 4.5),
                    views=r_data.get("views", 500),
                    is_published=True,
                )
                db.add(recipe)
                await db.flush()

                # Ingredients
                for ing in ingredients:
                    db.add(RecipeIngredient(
                        recipe_id=recipe.id,
                        name=ing.get("name", ""),
                        amount=ing.get("amount"),
                        unit=ing.get("unit", "г"),
                        group_name=ing.get("group_name", "Основные"),
                        substitute_notes=ing.get("substitutes"),
                    ))

                # Steps
                for step in steps:
                    db.add(RecipeStep(
                        recipe_id=recipe.id,
                        step_number=step["step_number"],
                        description=step.get("description", ""),
                        timer_seconds=step.get("timer_seconds", 0),
                        voice_hint=step.get("voice_hint"),
                    ))

                # Nutrition (real data per 100 g)
                db.add(Nutrition(
                    recipe_id=recipe.id,
                    calories=nutrients.get("calories_per_100g"),
                    protein=nutrients.get("proteins_per_100g"),
                    fat=nutrients.get("fats_per_100g"),
                    carbs=nutrients.get("carbs_per_100g"),
                    fiber=nutrients.get("fiber_per_100g"),
                    vitamin_a=nutrients.get("vitamin_a_per_100g"),
                    vitamin_c=nutrients.get("vitamin_c_per_100g"),
                    vitamin_d=nutrients.get("vitamin_d_per_100g"),
                    vitamin_b12=nutrients.get("vitamin_b12_per_100g"),
                    iron=nutrients.get("iron_per_100g"),
                    calcium=nutrients.get("calcium_per_100g"),
                    magnesium=nutrients.get("magnesium_per_100g"),
                    zinc=nutrients.get("zinc_per_100g"),
                ))

            await db.commit()
            print(f"✓ Seeded {len(ALL_RECIPES)} recipes")

    print("✅ Seed complete!")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
