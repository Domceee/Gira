from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy import delete
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
from app.models.team_member import TeamMember
from app.models.user import User
from app.models.task_multiple_assignees import task_multiple_assignees
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services.news import create_news_for_users
from app.services.sprint_burndown import snapshot_story_points
from app.services.task_delete import get_task_delete_state


router = APIRouter(prefix="/tasks", tags=["tasks"])



class AssignSprint(BaseModel):
    sprint_id: Optional[int]


class UpdateBoardPosition(BaseModel):
    workflow_status: TaskWorkflowStatus
    board_order: int
    team_member_id: Optional[int] = None


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
            Task.fk_sprintid_sprint == None,
        )

    result = await db.execute(query)
    tasks = result.scalars().all()

    output: list[TaskRead] = []

    for task in tasks:
        # Load multi-assignees for this task
        assignees_result = await db.execute(
            select(task_multiple_assignees.fk_team_memberid_team_member)
            .where(task_multiple_assignees.fk_taskid_task == task.id_task)
        )
        assignees = [row[0] for row in assignees_result.fetchall()]

        # Build TaskRead
        can_delete, delete_block_reason = await get_task_delete_state(task, db)
        task_read = TaskRead.model_validate(task)

        # Inject multi-assignee data
        task_read.assignees = assignees

        # Inject delete info
        task_read.can_delete = can_delete
        task_read.delete_block_reason = delete_block_reason

        output.append(task_read)

    return output



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

@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id_task == task_id))
    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    await get_project_membership_or_404(task.fk_projectid_project, current_user.id_user, db)

    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Task name is required")


    print("PAYLOAD:", payload)

    task.name = payload.name.strip()
    task.description = payload.description
    task.story_points = payload.story_points
    task.risk = payload.risk
    task.priority = payload.priority
    task.multiplePeople = payload.multiplePeople

    # If switching to multi-assign mode → clear single assignee
    if payload.multiplePeople:
        task.fk_team_memberid_team_member = None
    else:
        task.fk_team_memberid_team_member = payload.fk_team_memberid_team_member





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

    previous_team_id = task.fk_teamid_team
    task.fk_teamid_team = parsed_team_id


    await db.execute(
        delete(task_multiple_assignees).where(
            task_multiple_assignees.fk_taskid_task == task_id
        )
    )



    if parsed_team_id is not None and parsed_team_id != previous_team_id:
        member_result = await db.execute(
            select(TeamMember.fk_userid_user).where(TeamMember.fk_teamid_team == parsed_team_id)
        )
        member_ids = member_result.scalars().all()
        if member_ids:
            await create_news_for_users(
                db=db,
                user_ids=member_ids,
                title="Task assigned",
                message=f"Task '{task.name or task.id_task}' was assigned to team {team.name}.",
                news_type="task_assigned",
                project_id=task.fk_projectid_project,
                team_id=parsed_team_id,
                task_id=task.id_task,
            )

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

    if payload.team_member_id is not None:
        team_member_result = await db.execute(
            select(TeamMember).where(
                TeamMember.id_team_member == payload.team_member_id,
                TeamMember.fk_teamid_team == task.fk_teamid_team,
            )
        )
        team_member = team_member_result.scalar_one_or_none()

        if team_member is None:
            raise HTTPException(
                status_code=400,
                detail="Team member not in this team",
            )

    previous_status = task.workflow_status
    task.workflow_status = payload.workflow_status.value
    task.board_order = payload.board_order
    if payload.team_member_id is not None:
        task.fk_team_memberid_team_member = payload.team_member_id

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
        "team_member_id": task.fk_team_memberid_team_member,
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

    can_delete, delete_block_reason = await get_task_delete_state(task, db)
    if not can_delete:
        raise HTTPException(status_code=400, detail=delete_block_reason or "Task cannot be deleted")



    # Clear multi‑assignees when team changes or becomes None
    await db.execute(
        delete(task_multiple_assignees).where(
            task_multiple_assignees.fk_taskid_task == task_id
        )
    )


    await db.delete(task)
    await db.commit()

    return {"status": "ok", "task_id": task_id}


@router.patch("/{task_id}/assign_member")
async def assign_member(task_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    team_member_id = payload.get("team_member_id")

    # Load task
    result = await db.execute(select(Task).where(Task.id_task == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    # Validate team member belongs to same team
    if team_member_id is not None:
        result = await db.execute(
            select(TeamMember).where(
                TeamMember.id_team_member == team_member_id,
                TeamMember.fk_teamid_team == task.fk_teamid_team
            )
        )
        tm = result.scalar_one_or_none()
        if not tm:
            raise HTTPException(400, "Team member not in this team")

    # ⭐ ALWAYS clear multi‑assignees when switching to single assignment
    await db.execute(
        delete(task_multiple_assignees).where(
            task_multiple_assignees.fk_taskid_task == task_id
        )
    )

    # ⭐ Disable multi‑people mode
    task.multiplePeople = False

    # ⭐ Set single assignee (or None)
    task.fk_team_memberid_team_member = team_member_id

    await db.commit()
    await db.refresh(task)

    return {"success": True}


@router.get("/task/{task_id}/assignees")
async def get_task_assignees(task_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(task_multiple_assignees).where(
            task_multiple_assignees.fk_taskid_task == task_id
        )
    )
    rows = result.scalars().all()

    return [{"id_team_member": r.fk_team_memberid_team_member} for r in rows]



@router.post("/task/{task_id}/assignees")
async def set_task_assignees(task_id: int, team_member_ids: list[int], db: AsyncSession = Depends(get_db)):
    # Delete old rows
    await db.execute(
        delete(task_multiple_assignees).where(
            task_multiple_assignees.fk_taskid_task == task_id
        )
    )

    # Insert new rows
    for tm_id in team_member_ids:
        db.add(task_multiple_assignees(
            fk_taskid_task=task_id,
            fk_team_memberid_team_member=tm_id,
        ))

    # ⭐ Mark task as multi‑assignee mode
    result = await db.execute(select(Task).where(Task.id_task == task_id))
    task = result.scalar_one()
    task.multiplePeople = True
    task.fk_team_memberid_team_member = None  # clear single assignment

    await db.commit()
    return {"status": "ok"}


@router.patch("/{task_id}/multi")
async def set_multi_assign(task_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.id_task == task_id))
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(404, "Task not found")

    multiple = payload.get("multiplePeople")
    if multiple is None:
        raise HTTPException(400, "multiplePeople is required")

    task.multiplePeople = multiple

    if multiple:
        task.fk_team_memberid_team_member = None

    await db.commit()
    await db.refresh(task)
    return task

@router.patch("/{task_id}/board-position-multi")
async def update_board_position_multi(
    task_id: int,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id_task == task_id))
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(404, "Task not found")

    await get_project_membership_or_404(task.fk_projectid_project, current_user.id_user, db)

    # Only update workflow + board order
    task.workflow_status = payload.get("workflow_status", task.workflow_status)
    task.board_order = payload.get("board_order", task.board_order)

    # ⭐ DO NOT touch fk_team_memberid_team_member
    # ⭐ DO NOT touch multiplePeople
    # ⭐ DO NOT touch assignees

    await db.commit()
    await db.refresh(task)
    return task
