from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.auth import get_current_user
from app.db.session import get_db
from app.models.news import News
from app.models.user import User
from app.schemas.news import NewsRead

router = APIRouter(prefix="/news", tags=["news"])


@router.get("", response_model=list[NewsRead])
async def get_news(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    relevant_news_types = [
        "project_invite",
        "task_assigned",
        "sprint_started",
        "team_assignment",
    ]
    result = await db.execute(
        select(News)
        .where(
            News.fk_userid_user == current_user.id_user,
            News.news_type.in_(relevant_news_types),
        )
        .order_by(News.created_at.desc())
        .limit(15)
    )
    return result.scalars().all()


@router.patch("/{news_id}/read")
async def mark_news_as_read(
    news_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(News).where(
            News.id_news == news_id,
            News.fk_userid_user == current_user.id_user,
        )
    )
    news = result.scalar_one_or_none()
    if news is None:
        raise HTTPException(status_code=404, detail="Notification not found")

    news.is_read = True
    db.add(news)
    await db.commit()
    await db.refresh(news)

    return {"status": "ok", "id_news": news.id_news, "is_read": news.is_read}
