"""Async email service for verification and password reset.

In development (SMTP_HOST not configured) tokens are printed to stdout.
In production set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env.
"""
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import settings


def _build_message(to_email: str, subject: str, html: str) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))
    return msg


async def _send(to_email: str, subject: str, html: str) -> None:
    """Send email or print token in dev mode."""
    if not settings.SMTP_HOST:
        # Dev mode: just log the email content
        print(f"[DEV EMAIL] To: {to_email} | Subject: {subject}")
        print(f"[DEV EMAIL] Body preview: {html[:300]}")
        return

    msg = _build_message(to_email, subject, html)
    await aiosmtplib.send(
        msg,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER or None,
        password=settings.SMTP_PASSWORD or None,
        start_tls=settings.SMTP_PORT == 587,
    )


async def send_verification_email(to_email: str, token: str, name: str) -> None:
    link = f"{settings.APP_URL}/verify-email?token={token}"
    subject = "Подтвердите email — VegRecipes"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
      <h2 style="color:#16a34a;margin-top:0">🌱 VegRecipes</h2>
      <p style="color:#374151;font-size:16px">Привет, <strong>{name}</strong>!</p>
      <p style="color:#374151">Подтвердите свой email, чтобы активировать аккаунт.</p>
      <a href="{link}"
         style="display:inline-block;margin:16px 0;padding:14px 28px;background:#16a34a;color:#fff;
                border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
        Подтвердить email
      </a>
      <p style="color:#9ca3af;font-size:13px">Ссылка действует 7 дней. Если вы не регистрировались — просто проигнорируйте это письмо.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="color:#9ca3af;font-size:12px">VegRecipes — вегетарианские рецепты, планировщик питания и AI-помощник.</p>
    </div>
    """
    await _send(to_email, subject, html)


async def send_password_reset_email(to_email: str, token: str, name: str) -> None:
    link = f"{settings.APP_URL}/reset-password?token={token}"
    subject = "Сброс пароля — VegRecipes"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
      <h2 style="color:#16a34a;margin-top:0">🌱 VegRecipes</h2>
      <p style="color:#374151;font-size:16px">Привет, <strong>{name}</strong>!</p>
      <p style="color:#374151">Мы получили запрос на сброс пароля для вашего аккаунта.</p>
      <a href="{link}"
         style="display:inline-block;margin:16px 0;padding:14px 28px;background:#dc2626;color:#fff;
                border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
        Сбросить пароль
      </a>
      <p style="color:#9ca3af;font-size:13px">Ссылка действует <strong>1 час</strong>. Если вы не запрашивали сброс — просто проигнорируйте это письмо.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="color:#9ca3af;font-size:12px">VegRecipes — вегетарианские рецепты, планировщик питания и AI-помощник.</p>
    </div>
    """
    await _send(to_email, subject, html)
