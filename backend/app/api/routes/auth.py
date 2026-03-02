from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy import select
import sys

from app.db.session import get_db
from app.models.user import User
from app.core.security import hash_password
from app.schemas.user import UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserRead, status_code=201)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    pw = payload.password
    print("PASSWORD RAW:", repr(pw), type(pw), flush=True)
    print("PASSWORD BYTES LEN:", len(pw.encode("utf-8")), flush=True)
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
    return user