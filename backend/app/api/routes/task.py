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
from app.models.sprint_task_event import SprintTaskEvent
from app.models.sprint_task_event_type import SprintTaskEventType
from app.models.task import Task
from app.models.task_workflow_status import TaskWorkflowStatus
from app.models.team import Team
from app.models.user import User
from app.schemas.task import TaskCreate, TaskRead
from app.services.sprint_burndown import snapshot_story_points

router = APIRouter(prefix="/tasks", tags=["tasks"])


class AssignSprint(BaseModel):
    sprint_id: Optional[int]


class UpdateBoardPosition(BaseModel):
    workflow_status: TaskWorkflowStatus
    board_order: int


def utc_now() -> datetime:
    return datetime.utcnow()


def add_sprint_event(
    db: AsyncSession,
    *,
    task: Task,
    sprint_id: int,
    event_type: SprintTaskEventType,
    occurred_at: datetime | None = None,
) -> None:
    db.add(
        SprintTaskEvent(
            fk_taskid_task=task.id_task,
            fk_sprintid_sprint=sprint_id,
            event_type=event_type.value,
            story_points=snapshot_story_points(task),
            occurred_at=occurred_at or utc_now(),
        )
    )


def move_done_task_between_sprints(
    db: AsyncSession,
    *,
    task: Task,
    previous_sprint_id: int,
    next_sprint_id: int | None,
    occurred_at: datetime,
) -> None:
    add_sprint_event(
        db,
        task=task,
        sprint_id=previous_sprint_id,
        event_type=SprintTaskEventType.REOPENED,
        occurred_at=occurred_at,
    )
    add_sprint_event(
        db,
        task=task,
        sprint_id=previous_sprint_id,
        event_type=SprintTaskEventType.REMOVED,
        occurred_at=occurred_at,
    )

    if next_sprint_id is not None:
        add_sprint_event(
            db,
            task=task,
            sprint_id=next_sprint_id,
            event_type=SprintTaskEventType.ADDED,
            occurred_at=occurred_at,
        )
        add_sprint_event(
            db,
            task=task,
            sprint_id=next_sprint_id,
            event_type=SprintTaskEventType.COMPLETED,
            occurred_at=occurred_at,
        )


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
        workflow_status=TaskWorkflowStatus.TODO.value,
        board_order=0,
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
        if task.fk_sprintid_sprint is not None:
            occurred_at = utc_now()
            if task.workflow_status == TaskWorkflowStatus.DONE.value:
                move_done_task_between_sprints(
                    db,
                    task=task,
                    previous_sprint_id=task.fk_sprintid_sprint,
                    next_sprint_id=None,
                    occurred_at=occurred_at,
                )
            else:
                add_sprint_event(
                    db,
                    task=task,
                    sprint_id=task.fk_sprintid_sprint,
                    event_type=SprintTaskEventType.REMOVED,
                    occurred_at=occurred_at,
                )
        task.fk_sprintid_sprint = None
        task.workflow_status = TaskWorkflowStatus.TODO.value
        task.completed_at = None
        task.board_order = 0

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

    previous_sprint_id = task.fk_sprintid_sprint
    task.fk_sprintid_sprint = payload.sprint_id
    occurred_at = utc_now()

    if previous_sprint_id != payload.sprint_id and previous_sprint_id is not None:
        if task.workflow_status == TaskWorkflowStatus.DONE.value:
            move_done_task_between_sprints(
                db,
                task=task,
                previous_sprint_id=previous_sprint_id,
                next_sprint_id=payload.sprint_id,
                occurred_at=occurred_at,
            )
        else:
            add_sprint_event(
                db,
                task=task,
                sprint_id=previous_sprint_id,
                event_type=SprintTaskEventType.REMOVED,
                occurred_at=occurred_at,
            )
            if payload.sprint_id is not None:
                add_sprint_event(
                    db,
                    task=task,
                    sprint_id=payload.sprint_id,
                    event_type=SprintTaskEventType.ADDED,
                    occurred_at=occurred_at,
                )
    elif previous_sprint_id is None and payload.sprint_id is not None:
        add_sprint_event(
            db,
            task=task,
            sprint_id=payload.sprint_id,
            event_type=SprintTaskEventType.ADDED,
            occurred_at=occurred_at,
        )

    if payload.sprint_id is None:
        task.workflow_status = TaskWorkflowStatus.TODO.value
        task.completed_at = None
        task.board_order = 0
    else:
        task.workflow_status = task.workflow_status or TaskWorkflowStatus.TODO.value
        task.board_order = task.board_order or 0

    db.add(task)
    await db.commit()
    await db.refresh(task)

    return {"status": "ok", "task_id": task_id, "sprint_id": payload.sprint_id}


@router.patch("/{task_id}/board-position")
async def update_board_position(
    task_id: int,
    payload: UpdateBoardPosition,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id_task == task_id))
    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    await get_project_membership_or_404(task.fk_projectid_project, current_user.id_user, db)

    if task.fk_sprintid_sprint is None:
        raise HTTPException(
            status_code=400,
            detail="Only sprint tasks can be moved on the board",
        )

    if payload.board_order < 0:
        raise HTTPException(
            status_code=400,
            detail="Board order must be zero or greater",
        )

    previous_status = task.workflow_status
    task.workflow_status = payload.workflow_status.value
    task.board_order = payload.board_order

    if previous_status != TaskWorkflowStatus.DONE.value and task.workflow_status == TaskWorkflowStatus.DONE.value:
        task.completed_at = utc_now()
        add_sprint_event(
            db,
            task=task,
            sprint_id=task.fk_sprintid_sprint,
            event_type=SprintTaskEventType.COMPLETED,
            occurred_at=task.completed_at,
        )
    elif previous_status == TaskWorkflowStatus.DONE.value and task.workflow_status != TaskWorkflowStatus.DONE.value:
        occurred_at = utc_now()
        task.completed_at = None
        add_sprint_event(
            db,
            task=task,
            sprint_id=task.fk_sprintid_sprint,
            event_type=SprintTaskEventType.REOPENED,
            occurred_at=occurred_at,
        )

    db.add(task)
    await db.commit()
    await db.refresh(task)

    return {
        "status": "ok",
        "task_id": task.id_task,
        "workflow_status": task.workflow_status,
        "board_order": task.board_order,
    }







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

@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id_task == task_id))
    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    await get_project_membership_or_404(task.fk_projectid_project, current_user.id_user, db)

    await db.delete(task)
    await db.commit()

    return {"status": "ok", "task_id": task_id}
