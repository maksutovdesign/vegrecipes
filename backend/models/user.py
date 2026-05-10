from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func, Text
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    username = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    display_name = Column(String(200))
    avatar_url = Column(String(500))
    bio = Column(Text)
    sub_type = Column(String(20), default="free")   # free | pro
    sub_until = Column(DateTime(timezone=True))
    stripe_customer_id = Column(String(100))
    stripe_subscription_id = Column(String(100))
    streak_days = Column(Integer, default=0)
    last_activity = Column(DateTime(timezone=True))
    followers_count = Column(Integer, default=0)
    following_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    email_verify_token = Column(String(86), nullable=True, index=True)
    password_reset_token = Column(String(86), nullable=True, index=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    recipes = relationship("Recipe", back_populates="author")
    achievements = relationship("UserAchievement", back_populates="user")
    health_logs = relationship("HealthLog", back_populates="user")
    meal_plans = relationship("MealPlan", back_populates="user")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

    @property
    def is_pro(self) -> bool:
        from datetime import datetime, timezone
        if self.sub_type != "pro":
            return False
        if self.sub_until is None:
            return False
        return self.sub_until > datetime.now(timezone.utc)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    token = Column(String(500), unique=True, index=True)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="refresh_tokens")
