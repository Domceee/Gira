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
    import base64

    def encode_picture(picture_bytes):
        if picture_bytes:
            return base64.b64encode(picture_bytes).decode("utf-8")
        return None

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

    # ⭐ get team members + user info (SAFE)
    from app.models.team_member import TeamMember
    from app.models.user import User

    result = await db.execute(
        select(TeamMember, User)
        .join(User, User.id_user == TeamMember.fk_userid_user)
        .where(TeamMember.fk_teamid_team == team_id)
    )

    rows = result.all()

    members = []
    for tm, user in rows:
        members.append({
            "id_team_member": tm.id_team_member,
            "role_in_team": tm.role_in_team,
            "effectiveness": tm.effectiveness,
            "user": {
                "id_user": user.id_user,
                "name": user.name,
                "email": user.email,
                "picture": encode_picture(user.picture),
            }
        })

    # ⭐ CRITICAL: remove ORM objects so FastAPI cannot see them
    del rows
    del tm
    del user

    # ⭐ FIX: encode picture inside tasks too
    task_dicts = []
    for t in tasks:
        td = TaskRead.model_validate(t).model_dump()

        # ⭐ NEW FIX_USER — handles SQLAlchemy models AND dicts
        def fix_user(u):
            if not u:
                return None

            # SQLAlchemy model → convert to dict
            if hasattr(u, "__dict__"):
                return {
                    "id_user": u.id_user,
                    "name": u.name,
                    "email": u.email,
                    "picture": encode_picture(u.picture),
                }

            # Already a dict
            if isinstance(u, dict):
                if "picture" in u:
                    u["picture"] = encode_picture(u["picture"])
                return u

            return None

        # Apply fix_user to all nested user fields
        td["assigned_user"] = fix_user(td.get("assigned_user"))
        td["created_by_user"] = fix_user(td.get("created_by_user"))
        td["updated_by_user"] = fix_user(td.get("updated_by_user"))

        comments = td.get("comments")
        if comments:
            for c in comments:
                c["user"] = fix_user(c.get("user"))

        events = td.get("events")
        if events:
            for e in events:
                e["user"] = fix_user(e.get("user"))

        task_dicts.append(td)

    # ⭐ FINAL RETURN
    return {
        "team_id": team.id_team,
        "team_name": team.name,
        "tasks": task_dicts,
        "team_members": members,
    }
