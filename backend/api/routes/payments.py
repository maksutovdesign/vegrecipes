import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from config import settings
from database import get_db
from models.user import User
from services.auth import get_current_user

stripe.api_key = settings.STRIPE_SECRET_KEY
router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/create-checkout")
async def create_checkout(
    plan: str = "monthly",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    price_id = (
        settings.STRIPE_PRO_YEARLY_PRICE_ID
        if plan == "yearly"
        else settings.STRIPE_PRO_MONTHLY_PRICE_ID
    )

    if not user.stripe_customer_id:
        customer = stripe.Customer.create(email=user.email, metadata={"user_id": user.id})
        user.stripe_customer_id = customer.id
        await db.commit()

    session = stripe.checkout.Session.create(
        customer=user.stripe_customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{settings.APP_URL}/pro/success",
        cancel_url=f"{settings.APP_URL}/pro",
        metadata={"user_id": str(user.id)},
    )
    return {"checkout_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "customer.subscription.created":
        await _activate_pro(event["data"]["object"], db)
    elif event["type"] == "customer.subscription.deleted":
        await _deactivate_pro(event["data"]["object"], db)
    elif event["type"] == "invoice.payment_failed":
        await _deactivate_pro(event["data"]["object"].get("subscription_details", {}), db)

    return {"status": "ok"}


async def _activate_pro(subscription: dict, db: AsyncSession):
    customer_id = subscription.get("customer")
    result = await db.execute(select(User).where(User.stripe_customer_id == customer_id))
    user = result.scalar_one_or_none()
    if user:
        user.sub_type = "pro"
        user.stripe_subscription_id = subscription.get("id")
        period_end = subscription.get("current_period_end")
        if period_end:
            user.sub_until = datetime.fromtimestamp(period_end, tz=timezone.utc)
        await db.commit()


async def _deactivate_pro(subscription: dict, db: AsyncSession):
    sub_id = subscription.get("id")
    if not sub_id:
        return
    result = await db.execute(select(User).where(User.stripe_subscription_id == sub_id))
    user = result.scalar_one_or_none()
    if user:
        user.sub_type = "free"
        user.sub_until = None
        await db.commit()


@router.get("/subscription")
async def get_subscription(user: User = Depends(get_current_user)):
    return {
        "sub_type": user.sub_type,
        "sub_until": user.sub_until,
        "is_pro": user.is_pro,
    }
