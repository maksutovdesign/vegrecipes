from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from database import Base


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False, unique=True)
    description = Column(Text)
    condition_type = Column(String(100))    # cuisine_count, streak_days, spices_used, likes_received, cooking_streak
    condition_value = Column(Integer)
    condition_extra = Column(String(200))   # e.g. cuisine name for cuisine_count
    level = Column(String(20))             # bronze, silver, gold, platinum, legend
    icon_url = Column(String(500))
    points = Column(Integer, default=0)

    user_achievements = relationship("UserAchievement", back_populates="achievement")


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    achievement_id = Column(Integer, ForeignKey("achievements.id"))
    earned_at = Column(DateTime(timezone=True), server_default=func.now())
    progress = Column(Integer, default=0)

    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")


class Duel(Base):
    __tablename__ = "duels"

    id = Column(Integer, primary_key=True)
    recipe_a_id = Column(Integer, ForeignKey("recipes.id"))
    recipe_b_id = Column(Integer, ForeignKey("recipes.id"))
    votes_a = Column(Integer, default=0)
    votes_b = Column(Integer, default=0)
    category_id = Column(Integer, ForeignKey("categories.id"))
    week_number = Column(Integer)
    year = Column(Integer)
    status = Column(String(20), default="active")   # active | finished
    winner_id = Column(Integer, ForeignKey("recipes.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True))

    recipe_a = relationship("Recipe", foreign_keys=[recipe_a_id])
    recipe_b = relationship("Recipe", foreign_keys=[recipe_b_id])
    winner = relationship("Recipe", foreign_keys=[winner_id])
    results = relationship("DuelResult", back_populates="duel", cascade="all, delete-orphan")


class DuelResult(Base):
    __tablename__ = "duel_results"

    id = Column(Integer, primary_key=True)
    duel_id = Column(Integer, ForeignKey("duels.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    voted_recipe_id = Column(Integer, ForeignKey("recipes.id"))
    voted_at = Column(DateTime(timezone=True), server_default=func.now())

    duel = relationship("Duel", back_populates="results")


class HealthLog(Base):
    __tablename__ = "health_log"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    recipe_id = Column(Integer, ForeignKey("recipes.id"))
    eaten_at = Column(DateTime(timezone=True), server_default=func.now())
    servings = Column(Float, default=1.0)
    notes = Column(Text)

    user = relationship("User", back_populates="health_logs")
    recipe = relationship("Recipe")


class MealPlan(Base):
    __tablename__ = "meal_plans"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    week_start = Column(DateTime(timezone=True))
    plan_data = Column(JSON)    # {mon: {breakfast: recipe_id, lunch: recipe_id, dinner: recipe_id}, ...}
    daily_calories_target = Column(Integer)
    shopping_list = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="meal_plans")
