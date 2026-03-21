from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.task import Task
from app.schemas.task import TaskRead, TaskCreate

from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/tasks", tags=["tasks"])


class AssignSprint(BaseModel):
    sprint_id: Optional[int]  # null = remove
# ---------------------------------------------------------
# GET — return ONLY unassigned tasks for a project
# ---------------------------------------------------------
@router.get("", response_model=list[TaskRead])
async def get_tasks(project_id: int | None = None, db: AsyncSession = Depends(get_db)):
    query = select(Task)

    if project_id is not None:
        query = query.where(
            Task.fk_projectid_project == project_id,
            Task.fk_teamid_team == None  # only tasks without a team
        )

    result = await db.execute(query)
    return result.scalars().all()


# ---------------------------------------------------------
# POST — create a new task
# ---------------------------------------------------------
@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(payload: TaskCreate, db: AsyncSession = Depends(get_db)):
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


# ---------------------------------------------------------
# PATCH — assign or remove a team from a task
# ---------------------------------------------------------
@router.patch("/{task_id}/assign_team")
async def assign_team(task_id: int, team_id: str | None = None, db: AsyncSession = Depends(get_db)):
    # Convert empty string → None
    if team_id in (None, "", "null"):
        team_id = None
    else:
        team_id = int(team_id)

    result = await db.execute(select(Task).where(Task.id_task == task_id))
    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    # Update team assignment
    task.fk_teamid_team = team_id

    #If team is removed, also remove sprint assignment
    if team_id is None:
        task.fk_sprintid_sprint = None

    db.add(task)
    await db.commit()
    await db.refresh(task)

    return {"status": "ok", "task_id": task_id, "team_id": team_id}


@router.patch("/{task_id}/assign_sprint")
async def assign_sprint(task_id: int, payload: AssignSprint, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.id_task == task_id))
    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(404, "Task not found")

    task.fk_sprintid_sprint = payload.sprint_id

    db.add(task)
    await db.commit()
    await db.refresh(task)

    return {"status": "ok", "task_id": task_id, "sprint_id": payload.sprint_id}