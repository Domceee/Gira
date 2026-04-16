from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.team import Team
from app.models.task import Task
from app.schemas.task import TaskRead

router = APIRouter(prefix="/projects", tags=["teams"])

@router.get("/{project_id}/teams")
async def get_project_teams(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Team).where(Team.fk_projectid_project == project_id)
    )
    teams = result.scalars().all()

    return [
        {
            "id_team": team.id_team,
            "name": team.name,
        }
        for team in teams
    ]

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

    # Get backlog tasks
    result = await db.execute(
        select(Task).where(
            Task.fk_teamid_team == team_id,
            Task.fk_sprintid_sprint == None,
        )
    )
    tasks = result.scalars().all()

    # get team members + user info
    from app.models.team_member import TeamMember
    from app.models.user import User

    result = await db.execute(
        select(TeamMember, User)
        .join(User, User.id_user == TeamMember.fk_userid_user)
        .where(TeamMember.fk_teamid_team == team_id)
    )

    members = [
        {
            "id_team_member": tm.id_team_member,
            "role_in_team": tm.role_in_team,
            "effectiveness": tm.effectiveness,
            "user": {
                "id_user": user.id_user,
                "name": user.name,
                "email": user.email,
                "picture": user.picture,
            }
        }
        for tm, user in result.all()
    ]

return {
    "team_id": team.id_team,
    "team_name": team.name,
    "tasks": [
        TaskRead.model_validate(t).model_dump()
        for t in tasks
    ],
    "team_members": members
}

