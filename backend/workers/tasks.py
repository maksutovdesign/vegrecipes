"""Celery async tasks."""
from workers.celery_app import celery_app
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session
from config import settings


def _sync_db():
    engine = create_engine(settings.DATABASE_URL_SYNC)
    return Session(engine)


@celery_app.task(name="workers.tasks.create_weekly_duels")
def create_weekly_duels():
    """Create random duels for each category every Sunday."""
    from datetime import datetime, timezone
    from models.recipe import Recipe, Category
    from models.gamification import Duel
    import random

    db = _sync_db()
    try:
        categories = db.execute(select(Category)).scalars().all()
        now = datetime.now(timezone.utc)
        week = now.isocalendar().week

        for category in categories:
            recipes = db.execute(
                select(Recipe).where(Recipe.category_id == category.id, Recipe.is_published == True).order_by(func.random()).limit(2)
            ).scalars().all()

            if len(recipes) < 2:
                continue

            duel = Duel(
                recipe_a_id=recipes[0].id,
                recipe_b_id=recipes[1].id,
                category_id=category.id,
                week_number=week,
                year=now.year,
                status="active",
            )
            db.add(duel)
        db.commit()
    finally:
        db.close()


@celery_app.task(name="workers.tasks.finish_old_duels")
def finish_old_duels():
    """Finish duels older than 7 days."""
    from datetime import datetime, timezone, timedelta
    from models.gamification import Duel

    db = _sync_db()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        old_duels = db.execute(
            select(Duel).where(Duel.status == "active", Duel.created_at < cutoff)
        ).scalars().all()

        for duel in old_duels:
            duel.status = "finished"
            duel.finished_at = datetime.now(timezone.utc)
            duel.winner_id = duel.recipe_a_id if duel.votes_a >= duel.votes_b else duel.recipe_b_id
        db.commit()
    finally:
        db.close()


@celery_app.task(name="workers.tasks.reindex_all_recipes")
def reindex_all_recipes():
    """Re-index all recipes in Elasticsearch."""
    from models.recipe import Recipe, Nutrition
    import asyncio
    from services.search import index_recipe, ensure_index

    db = _sync_db()
    try:
        rows = db.execute(select(Recipe, Nutrition).join(Nutrition, Recipe.id == Nutrition.recipe_id, isouter=True)).all()

        async def _reindex():
            await ensure_index()
            for recipe, nutrition in rows:
                await index_recipe({
                    "id": recipe.id,
                    "title": recipe.title,
                    "description": recipe.description,
                    "tags": recipe.tags or [],
                    "cuisine_country": recipe.cuisine_country,
                    "difficulty": recipe.difficulty,
                    "cook_time": recipe.cook_time,
                    "rating": recipe.rating,
                    "is_vegan": recipe.is_vegan,
                    "is_gluten_free": recipe.is_gluten_free,
                    "season_months": recipe.season_months or [],
                    "calories": nutrition.calories if nutrition else 0,
                })

        asyncio.run(_reindex())
    finally:
        db.close()


@celery_app.task(name="workers.tasks.import_recipe_async")
def import_recipe_async(url: str, user_id: int):
    """Background recipe import from URL."""
    import asyncio
    from services.recipe_importer import import_from_url
    result = asyncio.run(import_from_url(url))
    return result
