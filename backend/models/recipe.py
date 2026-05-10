from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey,
    ARRAY, Enum as SAEnum, func
)
from sqlalchemy.orm import relationship
from database import Base
import enum


class DifficultyEnum(str, enum.Enum):
    one = "1"
    two = "2"
    three = "3"
    four = "4"
    five = "5"


class SubType(str, enum.Enum):
    free = "free"
    pro = "pro"


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    icon = Column(String(10))
    subcategories = Column(ARRAY(String), default=[])

    recipes = relationship("Recipe", back_populates="category")


class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False, unique=True)
    is_gluten_free = Column(Boolean, default=False)
    is_lactose_free = Column(Boolean, default=False)
    is_nut_free = Column(Boolean, default=False)
    is_vegan = Column(Boolean, default=True)


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True)
    title = Column(String(300), nullable=False)
    slug = Column(String(300), nullable=False, unique=True, index=True)
    description = Column(Text)
    category_id = Column(Integer, ForeignKey("categories.id"))
    subcategory = Column(String(100))
    difficulty = Column(Integer, default=1)  # 1–5
    prep_time = Column(Integer)              # minutes
    cook_time = Column(Integer)              # minutes
    servings = Column(Integer, default=4)
    main_photo = Column(String(500))
    gallery = Column(ARRAY(String), default=[])
    cuisine_country = Column(String(100))
    season_months = Column(ARRAY(Integer), default=[])  # 1–12
    region_tags = Column(ARRAY(String), default=[])
    tags = Column(ARRAY(String), default=[])
    rating = Column(Float, default=0.0)
    views = Column(Integer, default=0)
    favorites_count = Column(Integer, default=0)
    is_gluten_free = Column(Boolean, default=False)
    is_lactose_free = Column(Boolean, default=False)
    is_nut_free = Column(Boolean, default=False)
    is_vegan = Column(Boolean, default=True)
    glycemic_index = Column(Integer)
    diet_tags = Column(ARRAY(String), default=[])   # keto, fodmap, ayurveda, etc.
    health_benefits = Column(Text)
    contraindications = Column(Text)
    recommended_for = Column(ARRAY(String), default=[])
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_published = Column(Boolean, default=True)
    imported_from_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    category = relationship("Category", back_populates="recipes")
    author = relationship("User", back_populates="recipes")
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")
    steps = relationship("RecipeStep", back_populates="recipe", cascade="all, delete-orphan", order_by="RecipeStep.step_number")
    nutrition = relationship("Nutrition", back_populates="recipe", uselist=False, cascade="all, delete-orphan")


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id = Column(Integer, primary_key=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"))
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"))
    name = Column(String(200))          # denormalized for speed
    amount = Column(Float)
    unit = Column(String(50))           # г, мл, ст.л., шт.
    group_name = Column(String(100))    # основные / для соуса / для подачи
    substitute_ids = Column(ARRAY(Integer), default=[])
    substitute_notes = Column(Text)

    recipe = relationship("Recipe", back_populates="ingredients")
    ingredient = relationship("Ingredient")


class RecipeStep(Base):
    __tablename__ = "recipe_steps"

    id = Column(Integer, primary_key=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"))
    step_number = Column(Integer, nullable=False)
    description = Column(Text, nullable=False)
    photo_url = Column(String(500))
    timer_seconds = Column(Integer)         # 0 = нет таймера
    voice_hint = Column(Text)               # для AR-режима

    recipe = relationship("Recipe", back_populates="steps")


class Nutrition(Base):
    __tablename__ = "nutrition"

    id = Column(Integer, primary_key=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), unique=True)
    # per 100g
    calories = Column(Float)
    protein = Column(Float)
    fat = Column(Float)
    carbs = Column(Float)
    fiber = Column(Float)
    vitamin_a = Column(Float)   # мкг
    vitamin_c = Column(Float)   # мг
    vitamin_d = Column(Float)   # мкг
    vitamin_b12 = Column(Float) # мкг
    iron = Column(Float)        # мг
    calcium = Column(Float)     # мг
    magnesium = Column(Float)   # мг
    zinc = Column(Float)        # мг

    recipe = relationship("Recipe", back_populates="nutrition")


class UserFavorite(Base):
    """Junction table: user ↔ favourite recipe."""
    __tablename__ = "user_favorites"

    user_id   = Column(Integer, ForeignKey("users.id",   ondelete="CASCADE"), primary_key=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserRecipeRating(Base):
    """One rating per user per recipe (1–5 stars). Recipe.rating is the running average."""
    __tablename__ = "user_recipe_ratings"

    user_id   = Column(Integer, ForeignKey("users.id",   ondelete="CASCADE"), primary_key=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True)
    rating    = Column(Integer, nullable=False)   # 1–5
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
