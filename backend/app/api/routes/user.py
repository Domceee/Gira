from datetime import datetime, timedelta

import secrets
from app.core.email import send_password_reset_email
from app.schemas.PasswordResetRequest import PasswordResetRequest, ResetPasswordPayload
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import base64

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate
from app.models.project_member import ProjectMember
from app.models.password_reset import PasswordResetToken
from app.core.security import get_password_hash, get_current_user

router = APIRouter(prefix="/user", tags=["user"])

from app.core.config import settings

def user_to_dict(user: User) -> dict:
    """Convert user to dict with base64 encoded picture"""
    data = {
        "id_user": user.id_user,
        "name": user.name,
        "email": user.email,
        "country": user.country,
        "city": user.city,
        "picture": None,
    }
    if user.picture:
        data["picture"] = base64.b64encode(user.picture).decode('utf-8')
    return data


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserRead(**user_to_dict(current_user))


@router.put("/me", response_model=UserRead)
async def update_me( 
    payload: UserUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = current_user

    if payload.name is not None:
        user.name = payload.name

    if payload.email is not None:
        user.email = payload.email

    if payload.country is not None:
        user.country = payload.country

    if payload.city is not None:
        user.city = payload.city

    # REMOVE PASSWORD HANDLING COMPLETELY

    if payload.picture is not None:
        if payload.picture == "":
            user.picture = None
        else:
            user.picture = base64.b64decode(payload.picture)

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return UserRead(**user_to_dict(user))


@router.get("/search")
async def search_users(
    email: str = Query(..., min_length=1),
    project_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(User).where(User.email.ilike(f"%{email.strip()}%"))
    query = select(User).where(
    User.email.ilike(f"%{email.strip()}%"),
    User.id_user != current_user.id_user
    )
    if project_id is not None:
        subquery = (
            select(ProjectMember.fk_userid_user)
            .where(ProjectMember.fk_projectid_project == project_id)
        )
        query = query.where(User.id_user.not_in(subquery))

    result = await db.execute(query.limit(10))
    users = result.scalars().all()

    return [
        {
            "id_user": user.id_user,
            "name": user.name,
            "email": user.email,
            "country": user.country,
            "city": user.city,
        }
        for user in users
    ]

@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordPayload,
    db: AsyncSession = Depends(get_db),
):
    token = payload.token
    new_password = payload.new_password

    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token == token)
    )
    reset = result.scalar_one_or_none()

    if not reset or reset.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    result = await db.execute(
        select(User).where(User.id_user == reset.fk_userid_user)
    )
    user = result.scalar_one()

    user.password = get_password_hash(new_password)
    db.add(user)

    await db.delete(reset)
    await db.commit()

    return {"status": "success"}



@router.post("/request-password-reset")
async def request_password_reset(
    payload: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    email = payload.email

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        return {"status": "ok"}

    token = secrets.token_urlsafe(48)

    reset = PasswordResetToken(
        fk_userid_user=user.id_user,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )

    db.add(reset)
    await db.commit()

    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    await send_password_reset_email(user.email, reset_link)

    return {"status": "ok"}