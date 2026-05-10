"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Any
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: str
    username: Optional[str]
    display_name: Optional[str]
    avatar_url: Optional[str]
    sub_type: str
    streak_days: int
    followers_count: int
    following_count: int
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ── Nutrition ─────────────────────────────────────────────────────────────────
class NutritionOut(BaseModel):
    calories: Optional[float]
    protein: Optional[float]
    fat: Optional[float]
    carbs: Optional[float]
    fiber: Optional[float]
    vitamin_a: Optional[float]
    vitamin_c: Optional[float]
    vitamin_d: Optional[float]
    vitamin_b12: Optional[float]
    iron: Optional[float]
    calcium: Optional[float]
    magnesium: Optional[float]
    zinc: Optional[float]

    model_config = {"from_attributes": True}


# ── Ingredients / Steps ───────────────────────────────────────────────────────
class IngredientIn(BaseModel):
    name: str
    amount: Optional[float]
    unit: Optional[str] = "г"
    group_name: Optional[str] = "основные"
    substitute_notes: Optional[str]


class IngredientOut(IngredientIn):
    id: int
    model_config = {"from_attributes": True}


class StepIn(BaseModel):
    step_number: int
    description: str
    photo_url: Optional[str]
    timer_seconds: Optional[int] = 0
    voice_hint: Optional[str]


class StepOut(StepIn):
    id: int
    model_config = {"from_attributes": True}


# ── Recipe ────────────────────────────────────────────────────────────────────
class RecipeIn(BaseModel):
    title: str
    description: Optional[str]
    category_id: Optional[int]
    subcategory: Optional[str]
    difficulty: int = 1
    prep_time: Optional[int]
    cook_time: Optional[int]
    servings: int = 4
    cuisine_country: Optional[str]
    season_months: List[int] = []
    region_tags: List[str] = []
    tags: List[str] = []
    is_gluten_free: bool = False
    is_lactose_free: bool = False
    is_nut_free: bool = False
    is_vegan: bool = True
    diet_tags: List[str] = []
    health_benefits: Optional[str]
    glycemic_index: Optional[int]
    ingredients: List[IngredientIn] = []
    steps: List[StepIn] = []


class RecipeOut(BaseModel):
    id: int
    title: str
    slug: str
    description: Optional[str]
    category_id: Optional[int]
    difficulty: int
    prep_time: Optional[int]
    cook_time: Optional[int]
    servings: int
    main_photo: Optional[str]
    gallery: List[str]
    cuisine_country: Optional[str]
    season_months: List[int]
    tags: List[str]
    rating: float
    views: int
    favorites_count: int
    is_favorited: bool = False
    is_gluten_free: bool
    is_lactose_free: bool
    is_nut_free: bool
    is_vegan: bool
    diet_tags: List[str]
    nutrition: Optional[NutritionOut]
    ingredients: List[IngredientOut] = []
    steps: List[StepOut] = []

    model_config = {"from_attributes": True}


class RecipeListItem(BaseModel):
    id: int
    title: str
    slug: str
    main_photo: Optional[str]
    difficulty: int
    cook_time: Optional[int]
    prep_time: Optional[int]
    rating: float
    views: int
    cuisine_country: Optional[str]
    is_vegan: bool
    nutrition: Optional[NutritionOut]

    model_config = {"from_attributes": True}


class PaginatedRecipes(BaseModel):
    items: List[RecipeListItem]
    total: int
    page: int
    size: int
    pages: int


# ── Category ──────────────────────────────────────────────────────────────────
class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    icon: Optional[str]
    subcategories: List[str]

    model_config = {"from_attributes": True}


# ── Spice ─────────────────────────────────────────────────────────────────────
class SpiceOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    origin: Optional[str]
    photo_url: Optional[str]
    storage_tips: Optional[str]
    substitutes: Optional[str]

    model_config = {"from_attributes": True}


# ── Meal Plan ─────────────────────────────────────────────────────────────────
class MealPlanRequest(BaseModel):
    daily_calories: int = 2000
    is_gluten_free: bool = False
    is_vegan: bool = True
    week_start: Optional[datetime]


class MealPlanOut(BaseModel):
    id: int
    week_start: Optional[datetime]
    plan_data: Any
    shopping_list: Any
    daily_calories_target: Optional[int]

    model_config = {"from_attributes": True}


# ── AI Assistant ──────────────────────────────────────────────────────────────
class AdaptRequest(BaseModel):
    remove: List[str] = []
    servings: Optional[int]
    gluten_free: bool = False
    question: Optional[str]


class AIResponse(BaseModel):
    answer: str


# ── Duel ──────────────────────────────────────────────────────────────────────
class DuelOut(BaseModel):
    id: int
    recipe_a_id: int
    recipe_b_id: int
    votes_a: int
    votes_b: int
    status: str
    week_number: Optional[int]

    model_config = {"from_attributes": True}


# ── Health Log ────────────────────────────────────────────────────────────────
class HealthLogIn(BaseModel):
    recipe_id: int
    servings: float = 1.0
    notes: Optional[str]


# ── Auth (password reset / email) ─────────────────────────────────────────────
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = ""

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


# ── Achievements ──────────────────────────────────────────────────────────────
class AchievementOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    level: Optional[str]
    points: int
    icon_url: Optional[str]
    earned_at: Optional[datetime]

    model_config = {"from_attributes": True}
