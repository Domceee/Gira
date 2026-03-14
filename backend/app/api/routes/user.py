from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate
from app.core.security import get_password_hash

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id_user == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.put("/{user_id}", response_model=UserRead)
async def update_user(user_id: int, payload: UserUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id_user == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Update only provided fields
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