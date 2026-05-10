from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models.spice import Spice, SpiceNutrition, SpiceCombo
from api.schemas import SpiceOut

router = APIRouter(prefix="/spices", tags=["spices"])


@router.get("", response_model=list[SpiceOut])
async def list_spices(
    q: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Spice)
    if q:
        query = query.where(Spice.name.ilike(f"%{q}%"))
    result = await db.execute(query.order_by(Spice.name))
    return list(result.scalars().all())


@router.get("/{spice_id}")
async def get_spice(spice_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Spice)
        .options(selectinload(Spice.nutrition), selectinload(Spice.combos_a), selectinload(Spice.combos_b))
        .where(Spice.id == spice_id)
    )
    spice = result.scalar_one_or_none()
    if not spice:
        raise HTTPException(status_code=404, detail="Spice not found")

    combos = []
    for c in spice.combos_a:
        combos.append({"spice_id": c.spice_id_2, "score": c.score, "notes": c.notes})
    for c in spice.combos_b:
        combos.append({"spice_id": c.spice_id_1, "score": c.score, "notes": c.notes})

    return {
        "id": spice.id,
        "name": spice.name,
        "description": spice.description,
        "history": spice.history,
        "origin": spice.origin,
        "photo_url": spice.photo_url,
        "storage_tips": spice.storage_tips,
        "substitutes": spice.substitutes,
        "nutrition": [
            {"element": n.element, "amount_per_5g": n.amount_per_5g, "unit": n.unit}
            for n in spice.nutrition
        ],
        "combos": sorted(combos, key=lambda x: -(x["score"] or 0))[:10],
    }
