from datetime import datetime, timedelta
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.news import News


async def create_news(
    db: AsyncSession,
    user_id: int,
    title: str,
    message: str,
    news_type: str,
    project_id: int | None = None,
    team_id: int | None = None,
    task_id: int | None = None,
    sprint_id: int | None = None,
) -> None:
    now = datetime.utcnow()

    if news_type == "task_assigned" and project_id is not None and team_id is not None:
        cutoff = now - timedelta(minutes=2)
        recent_result = await db.execute(
            select(News)
            .where(
                News.fk_userid_user == user_id,
                News.news_type == "task_assigned",
                News.fk_projectid_project == project_id,
                News.fk_teamid_team == team_id,
                News.created_at >= cutoff,
            )
            .order_by(News.created_at.desc())
            .limit(1)
        )
        recent_news = recent_result.scalar_one_or_none()
        if recent_news is not None:
            recent_news.title = "Tasks assigned"
            recent_news.message = "New tasks were assigned to your team."
            recent_news.fk_taskid_task = None
            recent_news.is_read = False
            recent_news.created_at = now
            db.add(recent_news)
            return

    db.add(
        News(
            fk_userid_user=user_id,
            title=title,
            message=message,
            news_type=news_type,
            fk_projectid_project=project_id,
            fk_teamid_team=team_id,
            fk_taskid_task=task_id,
            fk_sprintid_sprint=sprint_id,
            created_at=now,
        )
    )


async def create_news_for_users(
    db: AsyncSession,
    user_ids: Iterable[int],
    title: str,
    message: str,
    news_type: str,
    project_id: int | None = None,
    team_id: int | None = None,
    task_id: int | None = None,
    sprint_id: int | None = None,
) -> None:
    for user_id in user_ids:
        await create_news(
            db=db,
            user_id=user_id,
            title=title,
            message=message,
            news_type=news_type,
            project_id=project_id,
            team_id=team_id,
            task_id=task_id,
            sprint_id=sprint_id,
        )
