from datetime import datetime
from typing import Iterable

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
            created_at=datetime.utcnow(),
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
