from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.news import News
from app.models.sprint_task_event import SprintTaskEvent
from app.models.task import Task


async def get_task_delete_state(task: Task, db: AsyncSession) -> tuple[bool, str | None]:
    reasons: list[str] = []

    event_result = await db.execute(
        select(SprintTaskEvent.id_sprint_task_event)
        .where(SprintTaskEvent.fk_taskid_task == task.id_task)
        .limit(1)
    )
    if event_result.scalar_one_or_none() is not None:
        reasons.append("task has sprint history")

    news_result = await db.execute(
        select(News.id_news)
        .where(News.fk_taskid_task == task.id_task)
        .limit(1)
    )
    if news_result.scalar_one_or_none() is not None:
        reasons.append("task has news notifications")

    if reasons:
        return False, "Cannot delete because " + " and ".join(reasons) + "."

    return True, None
