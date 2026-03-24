from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.auth import get_current_user
from app.db.session import get_db
from app.models.project_member import ProjectMember
from app.models.sprint import Sprint
from app.models.task import Task
from app.models.team import Team
from app.models.user import User
from app.schemas.task import TaskCreate, TaskRead

router = APIRouter(prefix="/tasks", tags=["tasks"])


class AssignSprint(BaseModel):
    sprint_id: Optional[int]


@router.get("", response_model=list[TaskRead])
async def get_tasks(
    project_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Task)

    if project_id is not None:
        await get_project_membership_or_404(project_id, current_user.id_user, db)
        query = query.where(
            Task.fk_projectid_project == project_id,
            Task.fk_teamid_team == None,
        )

    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project_membership_or_404(payload.fk_projectid_project, current_user.id_user, db)

    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Task name is required")

    task = Task(
        name=payload.name.strip(),
        description=payload.description,
        story_points=payload.story_points,
        risk=payload.risk,
        priority=payload.priority,
        fk_projectid_project=payload.fk_projectid_project,
    )

    db.add(task)
    await db.commit()
    await db.refresh(task)

    return task


@router.patch("/{task_id}/assign_team")
async def assign_team(
    task_id: int,
    team_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if team_id in (None, "", "null"):
        parsed_team_id = None
    else:
        parsed_team_id = int(team_id)

    result = await db.execute(select(Task).where(Task.id_task == task_id))
    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    await get_project_membership_or_404(task.fk_projectid_project, current_user.id_user, db)

    if parsed_team_id is not None:
        result = await db.execute(
            select(Team).where(
                Team.id_team == parsed_team_id,
                Team.fk_projectid_project == task.fk_projectid_project,
            )
        )
        team = result.scalar_one_or_none()

        if team is None:
            raise HTTPException(status_code=404, detail="Team not found")

    task.fk_teamid_team = parsed_team_id

    if parsed_team_id is None:
        task.fk_sprintid_sprint = None

    db.add(task)
    await db.commit()
    await db.refresh(task)

    return {"status": "ok", "task_id": task_id, "team_id": parsed_team_id}


@router.patch("/{task_id}/assign_sprint")
async def assign_sprint(
    task_id: int,
    payload: AssignSprint,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id_task == task_id))
    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    await get_project_membership_or_404(task.fk_projectid_project, current_user.id_user, db)

    if payload.sprint_id is not None:
        result = await db.execute(select(Sprint).where(Sprint.id_sprint == payload.sprint_id))
        sprint = result.scalar_one_or_none()

        if sprint is None:
            raise HTTPException(status_code=404, detail="Sprint not found")

        if sprint.end_date.tzinfo is not None:
            today = datetime.now(sprint.end_date.tzinfo).date()
        else:
            today = datetime.utcnow().date()

        if sprint.end_date.date() < today:
            raise HTTPException(
                status_code=400,
                detail="Cannot assign tasks to a sprint that has already ended",
            )

        if task.fk_teamid_team is None or sprint.fk_teamid_team != task.fk_teamid_team:
            raise HTTPException(
                status_code=400,
                detail="Sprint must belong to the task's assigned team",
            )

    task.fk_sprintid_sprint = payload.sprint_id

    db.add(task)
    await db.commit()
    await db.refresh(task)

    return {"status": "ok", "task_id": task_id, "sprint_id": payload.sprint_id}


async def get_project_membership_or_404(project_id: int, user_id: int, db: AsyncSession):
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.fk_projectid_project == project_id,
            ProjectMember.fk_userid_user == user_id,
        )
    )
    membership = result.scalar_one_or_none()

    if membership is None:
        raise HTTPException(status_code=404, detail="Project not found")

    return membership
