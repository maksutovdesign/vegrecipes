"""Achievement engine.

Call ``check_and_award(user_id, event, db)`` after key user actions.
Returns a list of newly-awarded achievement names (empty if nothing new).
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from models.gamification import Achievement, UserAchievement, HealthLog
from models.recipe import UserFavorite, UserRecipeRating


# ── Achievement definitions ───────────────────────────────────────────────────

_DEFINITIONS: list[dict] = [
    # Favorites
    {
        "name": "Первый фаворит",
        "description": "Добавьте первый рецепт в избранное",
        "level": "bronze",
        "points": 10,
        "icon_url": "⭐",
        "event": "favorite_added",
        "threshold": 1,
        "counter": "favorites",
    },
    {
        "name": "Коллекционер рецептов",
        "description": "Добавьте 10 рецептов в избранное",
        "level": "silver",
        "points": 50,
        "icon_url": "📚",
        "event": "favorite_added",
        "threshold": 10,
        "counter": "favorites",
    },
    {
        "name": "Гурман",
        "description": "Добавьте 50 рецептов в избранное",
        "level": "gold",
        "points": 150,
        "icon_url": "🌟",
        "event": "favorite_added",
        "threshold": 50,
        "counter": "favorites",
    },
    # Ratings
    {
        "name": "Первый отзыв",
        "description": "Оцените первый рецепт",
        "level": "bronze",
        "points": 10,
        "icon_url": "📝",
        "event": "recipe_rated",
        "threshold": 1,
        "counter": "ratings",
    },
    {
        "name": "Критик",
        "description": "Оцените 20 рецептов",
        "level": "silver",
        "points": 75,
        "icon_url": "🎯",
        "event": "recipe_rated",
        "threshold": 20,
        "counter": "ratings",
    },
    # Health logging
    {
        "name": "Начало пути",
        "description": "Запишите первый приём пищи",
        "level": "bronze",
        "points": 10,
        "icon_url": "🌱",
        "event": "meal_logged",
        "threshold": 1,
        "counter": "logs",
    },
    {
        "name": "Неделя здорового питания",
        "description": "Записывайте питание 7 дней подряд",
        "level": "silver",
        "points": 100,
        "icon_url": "🗓️",
        "event": "meal_logged",
        "threshold": 7,
        "counter": "streak",
    },
    {
        "name": "Месяц осознанного питания",
        "description": "Записывайте питание 30 дней подряд",
        "level": "gold",
        "points": 300,
        "icon_url": "🏆",
        "event": "meal_logged",
        "threshold": 30,
        "counter": "streak",
    },
]


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_or_create_achievement(defn: dict, db: AsyncSession) -> Achievement:
    result = await db.execute(select(Achievement).where(Achievement.name == defn["name"]))
    ach = result.scalar_one_or_none()
    if not ach:
        ach = Achievement(
            name=defn["name"],
            description=defn["description"],
            level=defn["level"],
            points=defn["points"],
            icon_url=defn["icon_url"],
            condition_type=defn["counter"],
            condition_value=defn["threshold"],
        )
        db.add(ach)
        await db.flush()
    return ach


async def _already_awarded(user_id: int, achievement_id: int, db: AsyncSession) -> bool:
    result = await db.execute(
        select(UserAchievement).where(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_id == achievement_id,
        )
    )
    return result.scalar_one_or_none() is not None


async def _award(user_id: int, defn: dict, db: AsyncSession) -> Optional[str]:
    """Award achievement if not already granted. Returns name or None."""
    ach = await _get_or_create_achievement(defn, db)
    if await _already_awarded(user_id, ach.id, db):
        return None
    db.add(UserAchievement(user_id=user_id, achievement_id=ach.id, progress=defn["threshold"]))
    await db.flush()
    return ach.name


# ── Counters ──────────────────────────────────────────────────────────────────

async def _count_favorites(user_id: int, db: AsyncSession) -> int:
    r = await db.execute(select(func.count()).select_from(UserFavorite).where(UserFavorite.user_id == user_id))
    return r.scalar() or 0


async def _count_ratings(user_id: int, db: AsyncSession) -> int:
    r = await db.execute(select(func.count()).select_from(UserRecipeRating).where(UserRecipeRating.user_id == user_id))
    return r.scalar() or 0


async def _count_logs(user_id: int, db: AsyncSession) -> int:
    r = await db.execute(select(func.count()).select_from(HealthLog).where(HealthLog.user_id == user_id))
    return r.scalar() or 0


async def _current_streak(user_id: int, db: AsyncSession) -> int:
    """Return the current consecutive-day logging streak for this user."""
    result = await db.execute(
        select(func.date(HealthLog.eaten_at).label("day"))
        .where(HealthLog.user_id == user_id)
        .distinct()
        .order_by(func.date(HealthLog.eaten_at).desc())
    )
    days = [row.day for row in result.all()]
    if not days:
        return 0

    streak = 1
    today = datetime.now(timezone.utc).date()
    # Accept logs from today or yesterday as "current"
    if days[0] < today - timedelta(days=1):
        return 0

    for i in range(1, len(days)):
        if (days[i - 1] - days[i]).days == 1:
            streak += 1
        else:
            break
    return streak


# ── Public API ────────────────────────────────────────────────────────────────

async def check_and_award(user_id: int, event: str, db: AsyncSession) -> list[str]:
    """Check achievements for the given event and award any that are newly unlocked.

    Args:
        user_id: The user performing the action.
        event: One of ``"favorite_added"``, ``"recipe_rated"``, ``"meal_logged"``.
        db: AsyncSession (caller is responsible for commit).

    Returns:
        List of newly awarded achievement names.
    """
    awarded: list[str] = []
    relevant = [d for d in _DEFINITIONS if d["event"] == event]

    # Build counters once per event type
    counters: dict[str, int] = {}
    for defn in relevant:
        key = defn["counter"]
        if key not in counters:
            if key == "favorites":
                counters[key] = await _count_favorites(user_id, db)
            elif key == "ratings":
                counters[key] = await _count_ratings(user_id, db)
            elif key == "logs":
                counters[key] = await _count_logs(user_id, db)
            elif key == "streak":
                counters[key] = await _current_streak(user_id, db)

    for defn in relevant:
        if counters.get(defn["counter"], 0) >= defn["threshold"]:
            name = await _award(user_id, defn, db)
            if name:
                awarded.append(name)

    return awarded
