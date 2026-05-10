import math
import re
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update
from sqlalchemy.orm import selectinload

from database import get_db
from models.recipe import Recipe, RecipeIngredient, RecipeStep, Nutrition, Category, UserFavorite, UserRecipeRating
from models.user import User
from api.schemas import RecipeIn, RecipeOut, RecipeListItem, PaginatedRecipes, AdaptRequest, AIResponse
from services.auth import get_current_user, get_current_user_optional
from services.nutrition import calculate_nutrition
from services import search as es_service
from services import recommender, ai_assistant, achievements

router = APIRouter(prefix="/recipes", tags=["recipes"])


def _slugify(text: str) -> str:
    from transliterate import translit
    try:
        text = translit(text, "ru", reversed=True)
    except Exception:
        pass
    text = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[\s_-]+", "-", text).strip("-")


async def _load_recipe(recipe_id: int, db: AsyncSession) -> Recipe:
    result = await db.execute(
        select(Recipe)
        .options(
            selectinload(Recipe.ingredients),
            selectinload(Recipe.steps),
            selectinload(Recipe.nutrition),
        )
        .where(Recipe.id == recipe_id, Recipe.is_published == True)
    )
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.get("", response_model=PaginatedRecipes)
async def list_recipes(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    q: Optional[str] = None,
    category_id: Optional[int] = None,
    cuisine: Optional[str] = None,
    difficulty: Optional[int] = Query(None, ge=1, le=5),
    max_cook_time: Optional[int] = None,
    max_calories: Optional[float] = None,
    is_vegan: Optional[bool] = None,
    is_gluten_free: Optional[bool] = None,
    season_month: Optional[int] = Query(None, ge=1, le=12),
    sort: str = Query("rating", regex="^(rating|views|created_at|cook_time)$"),
    db: AsyncSession = Depends(get_db),
):
    if q:
        es_result = await es_service.search_recipes(
            q=q, cuisine=cuisine, difficulty=difficulty,
            max_cook_time=max_cook_time, max_calories=max_calories,
            is_vegan=is_vegan, is_gluten_free=is_gluten_free,
            season_month=season_month, page=page, size=size,
        )
        if not es_result["ids"]:
            return PaginatedRecipes(items=[], total=0, page=page, size=size, pages=0)

        result = await db.execute(
            select(Recipe)
            .options(selectinload(Recipe.nutrition))
            .where(Recipe.id.in_(es_result["ids"]))
        )
        items = list(result.scalars().all())
        total = es_result["total"]
    else:
        query = select(Recipe).options(selectinload(Recipe.nutrition)).where(Recipe.is_published == True)
        count_query = select(func.count()).where(Recipe.is_published == True)

        if category_id:
            query = query.where(Recipe.category_id == category_id)
            count_query = count_query.select_from(Recipe).where(Recipe.category_id == category_id)
        if cuisine:
            query = query.where(Recipe.cuisine_country == cuisine)
        if difficulty:
            query = query.where(Recipe.difficulty == difficulty)
        if max_cook_time:
            query = query.where(Recipe.cook_time <= max_cook_time)
        if is_vegan is not None:
            query = query.where(Recipe.is_vegan == is_vegan)
        if is_gluten_free:
            query = query.where(Recipe.is_gluten_free == True)
        if season_month:
            query = query.where(Recipe.season_months.any(season_month))

        sort_col = {"rating": Recipe.rating, "views": Recipe.views, "created_at": Recipe.created_at, "cook_time": Recipe.cook_time}[sort]
        query = query.order_by(desc(sort_col)).offset((page - 1) * size).limit(size)

        total_result = await db.execute(count_query)
        total = total_result.scalar()
        result = await db.execute(query)
        items = list(result.scalars().all())

    return PaginatedRecipes(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size),
    )


@router.post("", response_model=RecipeOut, status_code=201)
async def create_recipe(
    body: RecipeIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    slug = _slugify(body.title)
    existing = await db.execute(select(Recipe).where(Recipe.slug == slug))
    if existing.scalar_one_or_none():
        slug = f"{slug}-{user.id}"

    recipe = Recipe(
        title=body.title, slug=slug, description=body.description,
        category_id=body.category_id, subcategory=body.subcategory,
        difficulty=body.difficulty, prep_time=body.prep_time, cook_time=body.cook_time,
        servings=body.servings, cuisine_country=body.cuisine_country,
        season_months=body.season_months, region_tags=body.region_tags,
        tags=body.tags, is_gluten_free=body.is_gluten_free,
        is_lactose_free=body.is_lactose_free, is_nut_free=body.is_nut_free,
        is_vegan=body.is_vegan, diet_tags=body.diet_tags,
        health_benefits=body.health_benefits, glycemic_index=body.glycemic_index,
        author_id=user.id,
    )
    db.add(recipe)
    await db.flush()

    for ing in body.ingredients:
        db.add(RecipeIngredient(recipe_id=recipe.id, **ing.model_dump()))

    for step in body.steps:
        db.add(RecipeStep(recipe_id=recipe.id, **step.model_dump()))

    nutrition_data = calculate_nutrition([i.model_dump() for i in body.ingredients], body.servings)
    db.add(Nutrition(recipe_id=recipe.id, **nutrition_data))

    await db.commit()

    full = await _load_recipe(recipe.id, db)
    await es_service.index_recipe({
        "id": full.id, "title": full.title, "description": full.description,
        "tags": full.tags, "cuisine_country": full.cuisine_country,
        "difficulty": full.difficulty, "cook_time": full.cook_time,
        "rating": full.rating, "is_vegan": full.is_vegan,
        "is_gluten_free": full.is_gluten_free, "season_months": full.season_months,
        "calories": full.nutrition.calories if full.nutrition else 0,
    })
    return full


@router.get("/top", response_model=List[RecipeListItem])
async def top_recipes(
    limit: int = Query(100, ge=1, le=100),
    period: str = Query("all", regex="^(all|week|month)$"),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timedelta, timezone
    query = select(Recipe).options(selectinload(Recipe.nutrition)).where(Recipe.is_published == True)
    if period == "week":
        query = query.where(Recipe.created_at >= datetime.now(timezone.utc) - timedelta(weeks=1))
    elif period == "month":
        query = query.where(Recipe.created_at >= datetime.now(timezone.utc) - timedelta(days=30))
    query = query.order_by(desc(Recipe.rating)).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/trending", response_model=List[RecipeListItem])
async def trending(db: AsyncSession = Depends(get_db)):
    recipes = await recommender.get_trending(db)
    return recipes


@router.get("/seasonal", response_model=List[RecipeListItem])
async def seasonal(
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
):
    recipes = await recommender.get_seasonal(db, month)
    return recipes


@router.get("/random", response_model=RecipeListItem)
async def random_recipe(
    category_id: Optional[int] = None,
    max_cook_time: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Recipe).options(selectinload(Recipe.nutrition)).where(Recipe.is_published == True)
    if category_id:
        query = query.where(Recipe.category_id == category_id)
    if max_cook_time:
        query = query.where(Recipe.cook_time <= max_cook_time)
    query = query.order_by(func.random()).limit(1)
    result = await db.execute(query)
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="No recipes found")
    return recipe


@router.get("/autocomplete")
async def autocomplete(q: str = Query(..., min_length=2)):
    suggestions = await es_service.autocomplete(q)
    return {"suggestions": suggestions}


@router.get("/{recipe_id}", response_model=RecipeOut)
async def get_recipe(
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    recipe = await _load_recipe(recipe_id, db)
    await db.execute(update(Recipe).where(Recipe.id == recipe_id).values(views=Recipe.views + 1))
    await db.commit()

    # Attach is_favorited for authenticated users
    result = RecipeOut.model_validate(recipe)
    if user:
        fav = await db.execute(
            select(UserFavorite).where(
                UserFavorite.user_id == user.id,
                UserFavorite.recipe_id == recipe_id,
            )
        )
        result.is_favorited = fav.scalar_one_or_none() is not None
    return result


@router.put("/{recipe_id}", response_model=RecipeOut)
async def update_recipe(
    recipe_id: int,
    body: RecipeIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Not found")
    if recipe.author_id != user.id:
        raise HTTPException(status_code=403, detail="Not your recipe")

    for field, value in body.model_dump(exclude={"ingredients", "steps"}).items():
        setattr(recipe, field, value)

    await db.commit()
    return await _load_recipe(recipe_id, db)


@router.delete("/{recipe_id}", status_code=204)
async def delete_recipe(
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Not found")
    if recipe.author_id != user.id:
        raise HTTPException(status_code=403, detail="Not your recipe")
    await db.delete(recipe)
    await db.commit()
    await es_service.delete_recipe(recipe_id)


@router.post("/{recipe_id}/adapt", response_model=AIResponse)
async def adapt_recipe(
    recipe_id: int,
    body: AdaptRequest,
    db: AsyncSession = Depends(get_db),
):
    recipe = await _load_recipe(recipe_id, db)
    recipe_dict = {
        "title": recipe.title,
        "description": recipe.description,
        "servings": recipe.servings,
        "ingredients": [{"name": i.name, "amount": i.amount, "unit": i.unit} for i in recipe.ingredients],
        "nutrition": {
            "calories": recipe.nutrition.calories if recipe.nutrition else None,
            "protein": recipe.nutrition.protein if recipe.nutrition else None,
        },
    }
    answer = await ai_assistant.adapt_recipe(recipe_dict, body.model_dump())
    return AIResponse(answer=answer)


@router.post("/{recipe_id}/ask", response_model=AIResponse)
async def ask_about_recipe(
    recipe_id: int,
    question: str,
    db: AsyncSession = Depends(get_db),
):
    recipe = await _load_recipe(recipe_id, db)
    recipe_dict = {
        "title": recipe.title,
        "description": recipe.description,
        "ingredients": [{"name": i.name, "amount": i.amount, "unit": i.unit} for i in recipe.ingredients],
    }
    answer = await ai_assistant.answer_question(recipe_dict, question)
    return AIResponse(answer=answer)


@router.get("/{recipe_id}/similar", response_model=List[RecipeListItem])
async def similar_recipes(recipe_id: int, db: AsyncSession = Depends(get_db)):
    recipe = await _load_recipe(recipe_id, db)
    return await recommender.get_similar_recipes(recipe, db)


# ── Favorites ────────────────────────────────────────────────────────────────

@router.post("/{recipe_id}/favorite", status_code=200)
async def toggle_favorite(
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Toggle favourite. Returns {is_favorited, favorites_count}."""
    result = await db.execute(
        select(Recipe).where(Recipe.id == recipe_id)
    )
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    fav_result = await db.execute(
        select(UserFavorite).where(
            UserFavorite.user_id == user.id,
            UserFavorite.recipe_id == recipe_id,
        )
    )
    existing = fav_result.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        recipe.favorites_count = max(0, (recipe.favorites_count or 0) - 1)
        is_favorited = False
    else:
        db.add(UserFavorite(user_id=user.id, recipe_id=recipe_id))
        recipe.favorites_count = (recipe.favorites_count or 0) + 1
        is_favorited = True

    await db.commit()

    # Check achievements after adding (not removing)
    if is_favorited:
        try:
            new_achievements = await achievements.check_and_award(user.id, "favorite_added", db)
            if new_achievements:
                await db.commit()
        except Exception as e:
            print(f"[warn] Achievement check failed: {e}")

    return {"is_favorited": is_favorited, "favorites_count": recipe.favorites_count}


@router.get("/{recipe_id}/favorite", status_code=200)
async def get_favorite_status(
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Check whether the current user has favourited this recipe."""
    result = await db.execute(
        select(UserFavorite).where(
            UserFavorite.user_id == user.id,
            UserFavorite.recipe_id == recipe_id,
        )
    )
    return {"is_favorited": result.scalar_one_or_none() is not None}


# ── Ratings ──────────────────────────────────────────────────────────────────

@router.post("/{recipe_id}/rate", status_code=200)
async def rate_recipe(
    recipe_id: int,
    rating: int = Query(..., ge=1, le=5, description="Rating from 1 to 5"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Submit or update a 1–5 star rating. Recalculates recipe average."""
    result = await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Upsert user rating
    existing_result = await db.execute(
        select(UserRecipeRating).where(
            UserRecipeRating.user_id == user.id,
            UserRecipeRating.recipe_id == recipe_id,
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        existing.rating = rating
    else:
        db.add(UserRecipeRating(user_id=user.id, recipe_id=recipe_id, rating=rating))

    await db.flush()

    # Recalculate average rating
    avg_result = await db.execute(
        select(func.avg(UserRecipeRating.rating)).where(
            UserRecipeRating.recipe_id == recipe_id
        )
    )
    new_avg = avg_result.scalar() or rating
    recipe.rating = round(float(new_avg), 2)

    await db.commit()

    # Check achievements
    try:
        new_achievements = await achievements.check_and_award(user.id, "recipe_rated", db)
        if new_achievements:
            await db.commit()
    except Exception as e:
        print(f"[warn] Achievement check failed: {e}")

    return {"rating": recipe.rating, "your_rating": rating}
