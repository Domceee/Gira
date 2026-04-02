from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sprint import Sprint
from app.models.sprint_status import SprintStatus
from app.models.team import Team


def get_runtime_sprint_status(sprint: Sprint, now: datetime | None = None) -> str:
    if now is not None:
        current_time = now
    elif sprint.start_date.tzinfo is not None:
        current_time = datetime.now(sprint.start_date.tzinfo)
    elif sprint.end_date.tzinfo is not None:
        current_time = datetime.now(sprint.end_date.tzinfo)
    else:
        current_time = datetime.utcnow()

    if sprint.status == SprintStatus.COMPLETED.value:
        return SprintStatus.COMPLETED.value

    if sprint.start_date <= current_time:
        return SprintStatus.ACTIVE.value

    return SprintStatus.PLANNED.value


async def sync_team_sprint_statuses(team_id: int, db: AsyncSession) -> None:
    result = await db.execute(
        select(Sprint).where(Sprint.fk_teamid_team == team_id)
    )
    sprints = result.scalars().all()

    updated = False
    for sprint in sprints:
        runtime_status = get_runtime_sprint_status(sprint)
        if sprint.status != runtime_status:
            sprint.status = runtime_status
            db.add(sprint)
            updated = True

    if updated:
        await db.commit()


async def sync_project_sprint_statuses(project_id: int, db: AsyncSession) -> None:
    result = await db.execute(
        select(Sprint)
        .join(Team, Team.id_team == Sprint.fk_teamid_team)
        .where(Team.fk_projectid_project == project_id)
    )
    sprints = result.scalars().all()

    updated = False
    for sprint in sprints:
        runtime_status = get_runtime_sprint_status(sprint)
        if sprint.status != runtime_status:
            sprint.status = runtime_status
            db.add(sprint)
            updated = True

    if updated:
        await db.commit()
