from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from database import get_db
from models.user import User
from models.gamification import MealPlan
from api.schemas import MealPlanRequest, MealPlanOut
from services.auth import get_current_user, require_pro
from services import meal_planner

router = APIRouter(prefix="/meal-plan", tags=["meal-plan"])


@router.post("/generate", response_model=MealPlanOut)
async def generate_plan(
    body: MealPlanRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_pro),
):
    result = await meal_planner.generate_week_plan(
        db=db,
        daily_calories=body.daily_calories,
        is_gluten_free=body.is_gluten_free,
        is_vegan=body.is_vegan,
    )

    plan = MealPlan(
        user_id=user.id,
        week_start=body.week_start or datetime.now(timezone.utc),
        plan_data=result["plan"],
        shopping_list=result["shopping_list"],
        daily_calories_target=body.daily_calories,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.get("/my", response_model=list[MealPlanOut])
async def my_plans(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_pro),
):
    result = await db.execute(
        select(MealPlan).where(MealPlan.user_id == user.id).order_by(MealPlan.created_at.desc()).limit(10)
    )
    return list(result.scalars().all())


@router.get("/daily-generate")
async def generate_daily_plan(
    daily_calories: int = 2000,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Free-tier: daily plan only."""
    result = await meal_planner.generate_week_plan(db=db, daily_calories=daily_calories)
    days = list(result["plan"].items())
    if days:
        _, day_data = days[0]
        return {"plan": day_data, "shopping_list": result["shopping_list"]}
    return {"plan": {}, "shopping_list": []}
