import secrets
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone, timedelta

from database import get_db
from models.user import User, RefreshToken
from api.schemas import (
    RegisterRequest, LoginRequest, TokenResponse, UserOut,
    ForgotPasswordRequest, ResetPasswordRequest, AchievementOut,
)
from api.limiter import limiter
from services.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    get_current_user,
)
from services.email import send_verification_email, send_password_reset_email

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    verify_token = secrets.token_urlsafe(32)
    user = User(
        email=body.email,
        username=body.username,
        hashed_password=hash_password(body.password),
        display_name=body.display_name or body.username,
        email_verify_token=verify_token,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Send verification email (fire-and-forget; don't block registration on SMTP issues)
    try:
        await send_verification_email(user.email, verify_token, user.display_name or user.username)
    except Exception as e:
        print(f"[warn] Could not send verification email: {e}")

    return await _issue_tokens(user, db)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return await _issue_tokens(user, db)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == token,
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    rt = result.scalar_one_or_none()
    if not rt:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_result = await db.execute(select(User).where(User.id == rt.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    await db.delete(rt)
    await db.commit()
    return await _issue_tokens(user, db)


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
async def update_me(
    display_name: str = None,
    bio: str = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if display_name is not None:
        user.display_name = display_name
    if bio is not None:
        user.bio = bio
    await db.commit()
    await db.refresh(user)
    return user


# ── Email verification ────────────────────────────────────────────────────────

@router.post("/request-verification")
async def request_verification(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-send email verification link."""
    if user.is_verified:
        return {"message": "Email already verified"}

    token = secrets.token_urlsafe(32)
    user.email_verify_token = token
    await db.commit()

    await send_verification_email(user.email, token, user.display_name or user.username or "")
    return {"message": "Verification email sent"}


@router.get("/verify-email")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    """Confirm email address via token from email link."""
    result = await db.execute(select(User).where(User.email_verify_token == token))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    user.is_verified = True
    user.email_verify_token = None
    await db.commit()
    return {"message": "Email verified successfully"}


# ── Password reset ────────────────────────────────────────────────────────────

@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Request a password reset link. Always returns 200 to avoid email enumeration."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user:
        token = secrets.token_urlsafe(32)
        user.password_reset_token = token
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        await db.commit()
        try:
            await send_password_reset_email(user.email, token, user.display_name or user.username or "")
        except Exception as e:
            print(f"[warn] Could not send password reset email: {e}")

    return {"message": "If email exists, reset link was sent"}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Set new password using token from email link."""
    result = await db.execute(
        select(User).where(
            User.password_reset_token == body.token,
            User.password_reset_expires > datetime.now(timezone.utc),
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user.hashed_password = hash_password(body.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    await db.commit()
    return {"message": "Password updated successfully"}


# ── Achievements ──────────────────────────────────────────────────────────────

@router.get("/me/achievements", response_model=list[AchievementOut])
async def get_my_achievements(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all achievements earned by the current user."""
    from models.gamification import UserAchievement, Achievement
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(UserAchievement)
        .options(selectinload(UserAchievement.achievement))
        .where(UserAchievement.user_id == user.id)
        .order_by(UserAchievement.earned_at.desc())
    )
    user_achievements = result.scalars().all()
    return [
        AchievementOut(
            id=ua.achievement.id,
            name=ua.achievement.name,
            description=ua.achievement.description,
            level=ua.achievement.level,
            points=ua.achievement.points,
            icon_url=ua.achievement.icon_url,
            earned_at=ua.earned_at,
        )
        for ua in user_achievements
    ]


async def _issue_tokens(user: User, db: AsyncSession) -> TokenResponse:
    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)

    rt = RefreshToken(
        user_id=user.id,
        token=refresh,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(rt)
    await db.commit()

    return TokenResponse(access_token=access, refresh_token=refresh)
