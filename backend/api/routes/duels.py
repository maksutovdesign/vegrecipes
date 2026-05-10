from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from database import get_db
from models.gamification import Duel, DuelResult
from models.recipe import Recipe
from models.user import User
from api.schemas import DuelOut
from services.auth import get_current_user_optional

router = APIRouter(prefix="/duels", tags=["duels"])


@router.get("/active", response_model=list[DuelOut])
async def list_active_duels(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Duel).where(Duel.status == "active").order_by(Duel.created_at.desc()).limit(20)
    )
    return list(result.scalars().all())


@router.get("/hot", response_model=list[DuelOut])
async def hot_duels(db: AsyncSession = Depends(get_db)):
    """Duels with most votes in last 24h."""
    result = await db.execute(
        select(Duel)
        .where(Duel.status == "active")
        .order_by((Duel.votes_a + Duel.votes_b).desc())
        .limit(10)
    )
    return list(result.scalars().all())


@router.get("/{duel_id}")
async def get_duel(duel_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Duel)
        .options(selectinload(Duel.recipe_a), selectinload(Duel.recipe_b))
        .where(Duel.id == duel_id)
    )
    duel = result.scalar_one_or_none()
    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found")
    return {
        "id": duel.id,
        "recipe_a": {"id": duel.recipe_a.id, "title": duel.recipe_a.title, "main_photo": duel.recipe_a.main_photo},
        "recipe_b": {"id": duel.recipe_b.id, "title": duel.recipe_b.title, "main_photo": duel.recipe_b.main_photo},
        "votes_a": duel.votes_a,
        "votes_b": duel.votes_b,
        "status": duel.status,
        "week_number": duel.week_number,
    }


@router.post("/{duel_id}/vote")
async def vote(
    duel_id: int,
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user_optional),
):
    result = await db.execute(select(Duel).where(Duel.id == duel_id, Duel.status == "active"))
    duel = result.scalar_one_or_none()
    if not duel:
        raise HTTPException(status_code=404, detail="Active duel not found")

    if recipe_id == duel.recipe_a_id:
        duel.votes_a += 1
    elif recipe_id == duel.recipe_b_id:
        duel.votes_b += 1
    else:
        raise HTTPException(status_code=400, detail="recipe_id does not belong to this duel")

    db.add(DuelResult(duel_id=duel_id, user_id=user.id if user else None, voted_recipe_id=recipe_id))
    await db.commit()
    return {"votes_a": duel.votes_a, "votes_b": duel.votes_b}


@router.post("/create")
async def create_duel(
    category_id: int = None,
    db: AsyncSession = Depends(get_db),
):
    """Create a random duel from same category."""
    query = select(Recipe).where(Recipe.is_published == True)
    if category_id:
        query = query.where(Recipe.category_id == category_id)
    result = await db.execute(query.order_by(func.random()).limit(2))
    recipes = list(result.scalars().all())
    if len(recipes) < 2:
        raise HTTPException(status_code=400, detail="Not enough recipes for a duel")

    now = datetime.now(timezone.utc)
    week_number = now.isocalendar().week

    duel = Duel(
        recipe_a_id=recipes[0].id,
        recipe_b_id=recipes[1].id,
        category_id=category_id,
        week_number=week_number,
        year=now.year,
        status="active",
    )
    db.add(duel)
    await db.commit()
    await db.refresh(duel)
    return DuelOut.model_validate(duel)
