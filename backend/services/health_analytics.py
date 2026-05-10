"""Health log analytics: trends, deficits, recommendations."""
from datetime import datetime, timedelta, timezone
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sqlfunc
from models.gamification import HealthLog
from models.recipe import Nutrition, Recipe

DAILY_NORMS = {
    "calories": 2000, "protein": 60, "fat": 67, "carbs": 250, "fiber": 25,
    "vitamin_a": 900, "vitamin_c": 90, "vitamin_d": 15, "vitamin_b12": 2.4,
    "iron": 18, "calcium": 1000, "magnesium": 400, "zinc": 11,
}


async def get_period_stats(user_id: int, days: int, db: AsyncSession) -> List[Dict]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(HealthLog, Nutrition, Recipe)
        .join(Recipe, HealthLog.recipe_id == Recipe.id)
        .join(Nutrition, Recipe.id == Nutrition.recipe_id, isouter=True)
        .where(HealthLog.user_id == user_id, HealthLog.eaten_at >= since)
        .order_by(HealthLog.eaten_at)
    )
    rows = result.all()

    daily: Dict[str, Dict] = {}
    for log, nutrition, recipe in rows:
        day_key = log.eaten_at.strftime("%Y-%m-%d")
        if day_key not in daily:
            daily[day_key] = {k: 0.0 for k in DAILY_NORMS}
            daily[day_key]["date"] = day_key

        if nutrition:
            servings = log.servings or 1
            weight_per_serving = 300
            factor = servings * weight_per_serving / 100
            for nutrient in DAILY_NORMS:
                val = getattr(nutrition, nutrient, None) or 0
                daily[day_key][nutrient] += val * factor

    return [
        {**v, **{k: round(v[k], 1) for k in DAILY_NORMS}}
        for v in daily.values()
    ]


def detect_deficits(stats: List[Dict]) -> List[Dict]:
    """Find nutrients consistently below 80% of daily norm."""
    if not stats:
        return []

    averages = {k: 0.0 for k in DAILY_NORMS}
    for day in stats:
        for k in DAILY_NORMS:
            averages[k] += day.get(k, 0)
    n = len(stats)
    averages = {k: v / n for k, v in averages.items()}

    return [
        {
            "nutrient": k,
            "average": round(averages[k], 1),
            "norm": DAILY_NORMS[k],
            "percent": round(averages[k] / DAILY_NORMS[k] * 100, 1),
        }
        for k in DAILY_NORMS
        if averages[k] < DAILY_NORMS[k] * 0.8
    ]
