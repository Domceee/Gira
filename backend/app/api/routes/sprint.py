from datetime import datetime, timedelta
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.auth import get_current_user
from app.db.session import get_db
from app.models.project_member import ProjectMember
from app.models.sprint import Sprint
from app.models.sprint_status import SprintStatus
from app.models.sprint_task_event import SprintTaskEvent
from app.models.sprint_task_event_type import SprintTaskEventType
from app.models.task import Task
from app.models.task_workflow_status import TaskWorkflowStatus
from app.models.team import Team
from app.models.team_member import TeamMember
from app.models.user import User
from app.services.news import create_news_for_users
from app.schemas.sprint import BurndownPoint, SprintCreate, SprintRead, SprintStatsRead
from app.services.sprint_burndown import (
    build_burndown_points,
    build_fallback_events,
    snapshot_story_points,
    summarize_sprint_tasks,
)
from app.services.sprint_status import sync_team_sprint_statuses
from app.schemas.task import TaskRead
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

router = APIRouter(prefix="/sprints", tags=["sprints"])


@router.get("", response_model=list[SprintRead])
async def get_sprints(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    team = await get_team_or_404(team_id, db)
    await get_project_membership_or_404(team.fk_projectid_project, current_user.id_user, db)
    await sync_team_sprint_statuses(team_id, db)

    result = await db.execute(select(Sprint).where(Sprint.fk_teamid_team == team_id))
    sprints = result.scalars().all()

    output = []
    for sprint in sprints:
        result = await db.execute(
            select(Task)
            .where(Task.fk_sprintid_sprint == sprint.id_sprint)
            .order_by(Task.board_order.asc(), Task.id_task.asc())
        )

        tasks = result.scalars().all()
        for t in tasks:
            await db.refresh(t)

        output.append(
            {
                "id_sprint": sprint.id_sprint,
                "start_date": sprint.start_date,
                "end_date": sprint.end_date,
                "status": sprint.status,
                "tasks": [
                    TaskRead.model_validate(t).model_dump()
                    for t in tasks
                ],
            }
        )

    # ⭐ Convert everything to JSON‑safe types
    safe_output = jsonable_encoder(output)

    # ⭐ Disable caching
    return JSONResponse(
        content=safe_output,
        headers={"Cache-Control": "no-store"}
    )


@router.post("", response_model=dict)
async def create_sprint(
    payload: SprintCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    team = await get_team_or_404(payload.team_id, db)
    await get_project_membership_or_404(team.fk_projectid_project, current_user.id_user, db)
    today = datetime.utcnow().date()

    if payload.end_date < payload.start_date:
        raise HTTPException(
            status_code=400,
            detail="Sprint end date must be on or after the start date",
        )

    if payload.end_date.date() < today:
        raise HTTPException(
            status_code=400,
            detail="Sprint end date cannot be in the past",
        )

    if payload.start_date.date() <= today <= payload.end_date.date():
        sprint_status = SprintStatus.ACTIVE.value
    else:
        sprint_status = SprintStatus.PLANNED.value

    sprint = Sprint(
        fk_teamid_team=payload.team_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=sprint_status,
    )

    db.add(sprint)
    await db.flush()

    if sprint_status == SprintStatus.ACTIVE.value:
        member_result = await db.execute(
            select(TeamMember.fk_userid_user)
            .where(TeamMember.fk_teamid_team == team.id_team)
        )
        member_ids = member_result.scalars().all()
        if member_ids:
            await create_news_for_users(
                db=db,
                user_ids=member_ids,
                title="Sprint started",
                message=f"Sprint {sprint.id_sprint} has started for team {team.name}.",
                news_type="sprint_started",
                project_id=team.fk_projectid_project,
                team_id=team.id_team,
                sprint_id=sprint.id_sprint,
            )

    await db.commit()
    await db.refresh(sprint)

    return {"status": "ok", "id_sprint": sprint.id_sprint}


@router.get("/{sprint_id}/stats", response_model=SprintStatsRead)
async def get_sprint_stats(
    sprint_id: int,
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    team = await get_team_or_404(team_id, db)
    await get_project_membership_or_404(team.fk_projectid_project, current_user.id_user, db)
    await sync_team_sprint_statuses(team_id, db)

    result = await db.execute(
        select(Sprint).where(
            Sprint.id_sprint == sprint_id,
            Sprint.fk_teamid_team == team_id,
        )
    )
    sprint = result.scalar_one_or_none()

    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint not found")

    result = await db.execute(
        select(Task).where(Task.fk_sprintid_sprint == sprint.id_sprint)
    )
    tasks = result.scalars().all()

    sprint_length_days = max((sprint.end_date.date() - sprint.start_date.date()).days + 1, 1)

    if sprint.start_date.tzinfo is not None:
        today = datetime.now(sprint.start_date.tzinfo).date()
    else:
        today = datetime.utcnow().date()
    current_date = min(max(today, sprint.start_date.date()), sprint.end_date.date())
    elapsed_days = max((current_date - sprint.start_date.date()).days + 1, 0)
    remaining_days = max((sprint.end_date.date() - current_date).days, 0)
    event_result = await db.execute(
        select(SprintTaskEvent)
        .where(SprintTaskEvent.fk_sprintid_sprint == sprint.id_sprint)
        .order_by(SprintTaskEvent.occurred_at.asc(), SprintTaskEvent.id_sprint_task_event.asc())
    )
    task_events = event_result.scalars().all()
    if not task_events:
        task_events = build_fallback_events(tasks, sprint.start_date, sprint.end_date)

    burndown_points = build_burndown_points(sprint.start_date, sprint.end_date, task_events)
    summary = summarize_sprint_tasks(task_events, tasks)
    planned_points_per_day = (
        summary.committed_story_points / sprint_length_days if sprint_length_days else 0.0
    )
    completion_rate = (
        round((summary.completed_story_points / summary.committed_story_points) * 100, 1)
        if summary.committed_story_points > 0
        else 0.0
    )

    return SprintStatsRead(
        id_sprint=sprint.id_sprint,
        team_id=team_id,
        start_date=sprint.start_date,
        end_date=sprint.end_date,
        status=sprint.status,
        committed_tasks=summary.committed_tasks,
        committed_story_points=summary.committed_story_points,
        completed_tasks=summary.completed_tasks,
        completed_story_points=summary.completed_story_points,
        remaining_tasks=summary.remaining_tasks,
        remaining_story_points=summary.remaining_story_points,
        rolled_over_tasks=summary.rolled_over_tasks,
        rolled_over_story_points=summary.rolled_over_story_points,
        sprint_length_days=sprint_length_days,
        elapsed_days=min(elapsed_days, sprint_length_days),
        remaining_days=remaining_days,
        planned_points_per_day=round(planned_points_per_day, 2),
        completion_rate=completion_rate,
        burndown_points=burndown_points,
    )


@router.get("/{sprint_id}/export")
async def export_sprint(
    sprint_id: int,
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    team = await get_team_or_404(team_id, db)
    await get_project_membership_or_404(team.fk_projectid_project, current_user.id_user, db)
    await sync_team_sprint_statuses(team_id, db)

    result = await db.execute(
        select(Sprint).where(
            Sprint.id_sprint == sprint_id,
            Sprint.fk_teamid_team == team_id,
        )
    )
    sprint = result.scalar_one_or_none()

    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint not found")

    if sprint.status != SprintStatus.COMPLETED.value:
        raise HTTPException(
            status_code=400,
            detail="Sprint export is only available for completed sprints",
        )

    task_result = await db.execute(
        select(Task).where(Task.fk_sprintid_sprint == sprint.id_sprint)
    )
    tasks = task_result.scalars().all()

    workbook = Workbook()
    summary_sheet = workbook.active
    summary_sheet.title = "Sprint Summary"

    summary_sheet.append(["Field", "Value"])
    summary_sheet.append(["Sprint ID", sprint.id_sprint])
    summary_sheet.append(["Team ID", sprint.fk_teamid_team])
    summary_sheet.append(["Start Date", sprint.start_date.isoformat()])
    summary_sheet.append(["End Date", sprint.end_date.isoformat()])
    summary_sheet.append(["Status", sprint.status])
    summary_sheet.append(["Total Tasks", len(tasks)])
    summary_sheet.append(["Completed Tasks", sum(1 for task in tasks if task.workflow_status == TaskWorkflowStatus.DONE.value)])
    summary_sheet.append(["Committed Story Points", sum((task.story_points or 0) for task in tasks)])
    summary_sheet.append(["Completed Story Points", sum((task.story_points or 0) for task in tasks if task.workflow_status == TaskWorkflowStatus.DONE.value)])

    task_sheet = workbook.create_sheet("Sprint Tasks")
    task_sheet.append([
        "Task ID",
        "Name",
        "Status",
        "Story Points",
        "Completed At",
        "Board Order",
        "Description",
    ])

    for task in tasks:
        task_sheet.append([
            task.id_task,
            task.name or "",
            task.workflow_status,
            task.story_points or 0,
            task.completed_at.isoformat() if task.completed_at else "",
            task.board_order,
            task.description or "",
        ])

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    filename = f"sprint-{sprint.id_sprint}-report.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )


@router.post("/{sprint_id}/close")
async def close_sprint(
    sprint_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Sprint).where(Sprint.id_sprint == sprint_id))
    sprint = result.scalar_one_or_none()

    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint not found")

    team = await get_team_or_404(sprint.fk_teamid_team, db)
    await get_project_membership_or_404(team.fk_projectid_project, current_user.id_user, db)

    if sprint.status == SprintStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Sprint is already completed")

    unfinished_result = await db.execute(
        select(Task)
        .where(
            Task.fk_sprintid_sprint == sprint.id_sprint,
            Task.workflow_status != TaskWorkflowStatus.DONE.value,
        )
        .order_by(Task.id_task.asc())
    )
    unfinished_tasks = unfinished_result.scalars().all()

    next_sprint_result = await db.execute(
        select(Sprint)
        .where(
            Sprint.fk_teamid_team == sprint.fk_teamid_team,
            Sprint.id_sprint != sprint.id_sprint,
            Sprint.start_date > sprint.end_date,
            Sprint.status != SprintStatus.COMPLETED.value,
        )
        .order_by(Sprint.start_date.asc(), Sprint.id_sprint.asc())
    )
    next_sprint = next_sprint_result.scalars().first()

    next_board_order = 0
    if next_sprint is not None:
        next_order_result = await db.execute(
            select(Task)
            .where(
                Task.fk_sprintid_sprint == next_sprint.id_sprint,
                Task.workflow_status == TaskWorkflowStatus.TODO.value,
            )
            .order_by(Task.board_order.desc(), Task.id_task.desc())
        )
        existing_todo_tasks = next_order_result.scalars().all()
        if existing_todo_tasks:
            next_board_order = (existing_todo_tasks[0].board_order or 0) + 1

    moved_task_ids: list[int] = []
    occurred_at = datetime.utcnow()

    for task in unfinished_tasks:
        add_sprint_event = SprintTaskEvent(
            fk_taskid_task=task.id_task,
            fk_sprintid_sprint=sprint.id_sprint,
            event_type=SprintTaskEventType.REMOVED.value,
            story_points=snapshot_story_points(task),
            occurred_at=occurred_at,
        )
        db.add(add_sprint_event)

        task.fk_sprintid_sprint = next_sprint.id_sprint if next_sprint is not None else None
        task.workflow_status = TaskWorkflowStatus.TODO.value
        task.board_order = next_board_order if next_sprint is not None else 0
        if next_sprint is not None:
            next_board_order += 1
            db.add(
                SprintTaskEvent(
                    fk_taskid_task=task.id_task,
                    fk_sprintid_sprint=next_sprint.id_sprint,
                    event_type=SprintTaskEventType.ADDED.value,
                    story_points=snapshot_story_points(task),
                    occurred_at=occurred_at,
                )
            )

        db.add(task)
        moved_task_ids.append(task.id_task)

    sprint.status = SprintStatus.COMPLETED.value
    db.add(sprint)

    await db.commit()
    await db.refresh(sprint)

    return {
        "status": "ok",
        "sprint_id": sprint.id_sprint,
        "sprint_status": sprint.status,
        "moved_task_ids": moved_task_ids,
        "target_sprint_id": next_sprint.id_sprint if next_sprint is not None else None,
    }


async def get_team_or_404(team_id: int, db: AsyncSession):
    result = await db.execute(select(Team).where(Team.id_team == team_id))
    team = result.scalar_one_or_none()

    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")

    return team


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
