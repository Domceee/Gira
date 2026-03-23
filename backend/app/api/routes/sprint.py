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
from app.schemas.sprint import SprintCreate, SprintRead

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

    sprint = Sprint(
        fk_teamid_team=payload.team_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )

    db.add(sprint)
    await db.commit()
    await db.refresh(sprint)

    return {"status": "ok", "id_sprint": sprint.id_sprint}


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
