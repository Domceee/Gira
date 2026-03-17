from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate
from app.core.security import get_password_hash, get_current_user

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


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

    if payload.password:
        user.password = get_password_hash(payload.password)

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user