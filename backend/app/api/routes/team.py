from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.team import Team
from app.models.task import Task
from app.schemas.task import TaskRead

router = APIRouter(prefix="/projects", tags=["teams"])

@router.get("/{project_id}/teams/{team_id}")
async def get_team_backlog(project_id: int, team_id: int, db: AsyncSession = Depends(get_db)):
    # Validate team exists
    result = await db.execute(
        select(Team).where(
            Team.id_team == team_id,
            Team.fk_projectid_project == project_id
        )
    )
    team = result.scalar_one_or_none()

    if team is None:
        raise HTTPException(404, "Team not found")

    # Get tasks assigned to this team but NOT assigned to a sprint
    result = await db.execute(
        select(Task).where(
            Task.fk_teamid_team == team_id
        )
    )
    tasks = result.scalars().all()

    return {
        "team_id": team.id_team,
        "team_name": team.name,
        "tasks": tasks
    }
