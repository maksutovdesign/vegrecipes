from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.user import User
from services.auth import get_current_user
from services.recipe_importer import import_from_url

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/from-url")
async def import_recipe_url(
    url: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await import_from_url(url)
    if not result:
        raise HTTPException(status_code=400, detail="Could not import recipe from this URL")
    return {"recipe_draft": result, "message": "Review and confirm before saving"}
