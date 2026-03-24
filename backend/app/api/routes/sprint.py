from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.auth import get_current_user
from app.db.session import get_db
from app.models.project_member import ProjectMember
from app.models.sprint import Sprint
from app.models.task import Task
from app.models.team import Team
from app.models.user import User
from app.schemas.sprint import BurndownPoint, SprintCreate, SprintRead, SprintStatsRead

router = APIRouter(prefix="/sprints", tags=["sprints"])


@router.get("", response_model=list[SprintRead])
async def get_sprints(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    team = await get_team_or_404(team_id, db)
    await get_project_membership_or_404(team.fk_projectid_project, current_user.id_user, db)

    result = await db.execute(select(Sprint).where(Sprint.fk_teamid_team == team_id))
    sprints = result.scalars().all()

    output = []
    for sprint in sprints:
        result = await db.execute(select(Task).where(Task.fk_sprintid_sprint == sprint.id_sprint))
        tasks = result.scalars().all()

        output.append(
            {
                "id_sprint": sprint.id_sprint,
                "start_date": sprint.start_date,
                "end_date": sprint.end_date,
                "tasks": tasks,
            }
        )

    return output


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

    sprint = Sprint(
        fk_teamid_team=payload.team_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )

    db.add(sprint)
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

    total_story_points = float(sum(task.story_points or 0 for task in tasks))
    sprint_length_days = max((sprint.end_date.date() - sprint.start_date.date()).days + 1, 1)

    if sprint.start_date.tzinfo is not None:
        today = datetime.now(sprint.start_date.tzinfo).date()
    else:
        today = datetime.utcnow().date()
    current_date = min(max(today, sprint.start_date.date()), sprint.end_date.date())
    elapsed_days = max((current_date - sprint.start_date.date()).days + 1, 0)
    remaining_days = max((sprint.end_date.date() - current_date).days, 0)
    planned_points_per_day = total_story_points / sprint_length_days if sprint_length_days else 0.0

    burndown_points: list[BurndownPoint] = []
    for day_index in range(sprint_length_days):
        point_date = sprint.start_date + timedelta(days=day_index)
        remaining = max(total_story_points - (planned_points_per_day * day_index), 0.0)
        burndown_points.append(
            BurndownPoint(
                label=f"Day {day_index + 1}",
                date=point_date,
                ideal_remaining_points=round(remaining, 2),
            )
        )

    return SprintStatsRead(
        id_sprint=sprint.id_sprint,
        team_id=team_id,
        start_date=sprint.start_date,
        end_date=sprint.end_date,
        total_tasks=len(tasks),
        total_story_points=round(total_story_points, 2),
        sprint_length_days=sprint_length_days,
        elapsed_days=min(elapsed_days, sprint_length_days),
        remaining_days=remaining_days,
        planned_points_per_day=round(planned_points_per_day, 2),
        burndown_points=burndown_points,
    )


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
