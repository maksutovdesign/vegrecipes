from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from config import settings
from services.search import ensure_index
from api.limiter import limiter

from api.routes import (
    recipes, categories, spices, meal_plan,
    users, payments, duels, health_log, import_recipe,
)

# ── Sentry ────────────────────────────────────────────────────────────────────
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[StarletteIntegration(), FastApiIntegration()],
        traces_sample_rate=0.2,
        environment=settings.APP_ENV,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await ensure_index()
    except Exception as e:
        print(f"[warn] Elasticsearch not available: {e}")
    yield


app = FastAPI(
    title="VegRecipes API",
    description="Платформа вегетарианских рецептов",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api/v1")
app.include_router(recipes.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(spices.router, prefix="/api/v1")
app.include_router(meal_plan.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(duels.router, prefix="/api/v1")
app.include_router(health_log.router, prefix="/api/v1")
app.include_router(import_recipe.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/v1/world-map")
async def world_map(db=None):
    """Recipe counts by cuisine country for the world map."""
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select, func
    from database import get_db, AsyncSessionLocal
    from models.recipe import Recipe

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Recipe.cuisine_country, func.count(Recipe.id).label("count"))
            .where(Recipe.is_published == True, Recipe.cuisine_country != None)
            .group_by(Recipe.cuisine_country)
            .order_by(func.count(Recipe.id).desc())
        )
        return [{"country": row.cuisine_country, "count": row.count} for row in result.all()]
