from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.user import User
from models.gamification import HealthLog
from api.schemas import HealthLogIn
from services.auth import get_current_user, require_pro
from services import health_analytics, achievements

router = APIRouter(prefix="/health-log", tags=["health-log"])


@router.post("", status_code=201)
async def log_meal(
    body: HealthLogIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    log = HealthLog(user_id=user.id, recipe_id=body.recipe_id, servings=body.servings, notes=body.notes)
    db.add(log)
    await db.commit()

    # Check achievements
    try:
        new_achievements = await achievements.check_and_award(user.id, "meal_logged", db)
        if new_achievements:
            await db.commit()
    except Exception as e:
        print(f"[warn] Achievement check failed: {e}")

    return {"id": log.id, "message": "Logged successfully"}


@router.get("/stats")
async def get_stats(
    days: int = Query(7, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stats = await health_analytics.get_period_stats(user.id, days, db)
    deficits = health_analytics.detect_deficits(stats)
    return {"stats": stats, "deficits": deficits, "days": days}


@router.get("/history")
async def get_history(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(HealthLog)
        .where(HealthLog.user_id == user.id)
        .order_by(HealthLog.eaten_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    return [
        {"id": l.id, "recipe_id": l.recipe_id, "eaten_at": l.eaten_at, "servings": l.servings}
        for l in logs
    ]


@router.get("/fridge-suggest")
async def fridge_suggest(
    ingredients: str = Query(..., description="Comma-separated ingredient list"),
    db: AsyncSession = Depends(get_db),
):
    """Suggest recipes from available ingredients (no auth required)."""
    from services.recommender import fridge_match
    ingredient_list = [i.strip() for i in ingredients.split(",") if i.strip()]
    return await fridge_match(db, ingredient_list)


@router.get("/fridge-ai")
async def fridge_ai(
    ingredients: str = Query(...),
):
    """AI suggestion from ingredients."""
    from services.ai_assistant import suggest_from_fridge
    ingredient_list = [i.strip() for i in ingredients.split(",") if i.strip()]
    answer = await suggest_from_fridge(ingredient_list)
    return {"answer": answer}
