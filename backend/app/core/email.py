from email.message import EmailMessage
import aiosmtplib

from app.core.config import settings


async def _send_email(message: EmailMessage) -> None:
    await aiosmtplib.send(
        message,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASS,
        start_tls=True,
    )


async def send_registration_email(to_email: str, username: str) -> None:
    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to_email
    message["Subject"] = "Welcome to Gira!"
    message.set_content(f"Hello {username},\n\nYour account was created successfully.\n\n-Gira Team")

    await _send_email(message)


async def send_project_invitation_email(
    to_email: str,
    project_name: str,
    invited_by_name: str,
) -> None:
    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to_email
    message["Subject"] = f"You were invited to join {project_name}"
    message.set_content(
        "\n".join(
            [
                f"Hello,",
                "",
                f"{invited_by_name} invited you to join the project '{project_name}' in Gira.",
                "",
                "If you already have an account, log in with this email address and accept the invitation from your dashboard.",
                "If you do not have an account yet, register with this email address first and the invitation will appear automatically.",
                "",
                f"Login: {settings.FRONTEND_URL}/login",
                f"Register: {settings.FRONTEND_URL}/register",
                "",
                "-Gira Team",
            ]
        )
    )

    await _send_email(message)
