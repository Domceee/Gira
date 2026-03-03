from email.message import EmailMessage
import aiosmtplib

from app.core.config import settings

async def send_registration_email(to_email: str, username: str) -> None:
    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to_email
    message["Subject"] = "Welcome to Gira!"
    message.set_content(f"Hello {username},\n\nYour account was created successfully.\n\n-Gira Team")

    await aiosmtplib.send(
        message,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASS,
        start_tls=True,
    )