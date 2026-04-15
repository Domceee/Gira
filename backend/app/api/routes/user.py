from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import base64

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate
from app.models.project_member import ProjectMember
from app.core.security import get_password_hash, get_current_user

router = APIRouter(prefix="/user", tags=["user"])


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

    if payload.password:
        user.password = get_password_hash(payload.password)

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