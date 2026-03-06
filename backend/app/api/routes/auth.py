from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy import select
import sys

from app.db.session import get_db
from app.models.user import User
from app.core.security import hash_password, verify_password
from app.schemas.user import UserCreate, UserRead, UserLogin
from app.core.email import send_registration_email

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserRead, status_code=201)
async def register(payload: UserCreate, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    sys.stdout.flush()
    result = await db.execute(select(User).where(User.email == payload.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        country=payload.country,
        city=payload.city,
        password=hash_password(payload.password),
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    background_tasks.add_task(send_registration_email, user.email, user.name)
    return user

@router.post("/login", response_model=UserRead)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    return user