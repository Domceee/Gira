from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.routes.auth import get_current_user

from app.models.retrospective import Retrospective
from app.models.sprint import Sprint
from app.models.team import Team
from app.models.project_member import ProjectMember
from app.models.user import User

# ⭐ ADD THESE IMPORTS
from app.models.team_member_retrospective import TeamMemberRetrospective
from app.models.team_member import TeamMember

import json

router = APIRouter(prefix="/retrospective", tags=["retrospective"])


# ---------------------------------------------------------
# HELPERS
# ---------------------------------------------------------

async def get_team_member_for_user_or_403(team: Team, user: User, db: AsyncSession):
    print("DEBUG: Checking membership for user", user.id_user, "team", team.id_team)

    # Check project membership
    membership_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.fk_projectid_project == team.fk_projectid_project,
            ProjectMember.fk_userid_user == user.id_user,
        )
    )
    membership = membership_result.scalar_one_or_none()
    print("DEBUG: Project membership:", membership)

    if membership is None:
        print("DEBUG: FAIL → user not in project")
        raise HTTPException(status_code=403, detail="You are not a team member")

    # Check team_member table
    tm_result = await db.execute(
        select(TeamMember).where(
            TeamMember.fk_userid_user == user.id_user,
            TeamMember.fk_teamid_team == team.id_team,
        )
    )
    team_member = tm_result.scalar_one_or_none()
    print("DEBUG: TeamMember row:", team_member)

    if team_member is None:
        print("DEBUG: FAIL → user not in team_member table")
        raise HTTPException(status_code=403, detail="You are not a team member")

    print("DEBUG: SUCCESS → user is team member")
    return team_member



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


# ---------------------------------------------------------
# GET RETROSPECTIVE (AUTO‑CREATE IF MISSING)
# ---------------------------------------------------------
@router.get("/{sprint_id}")
async def get_retro(
    sprint_id: int,
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate sprint
    sprint_result = await db.execute(
        select(Sprint).where(Sprint.id_sprint == sprint_id)
    )
    sprint = sprint_result.scalar_one_or_none()
    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint not found")

    # Validate team + membership
    team = await get_team_or_404(team_id, db)
    await get_project_membership_or_404(
        team.fk_projectid_project, current_user.id_user, db
    )

    # Load retrospective if exists
    retro = None
    if sprint.fk_retrospectiveid_retrospective is not None:
        result = await db.execute(
            select(Retrospective).where(
                Retrospective.id_retrospective == sprint.fk_retrospectiveid_retrospective
            )
        )
        retro = result.scalar_one_or_none()

    # AUTO‑CREATE RETROSPECTIVE IF MISSING
    if retro is None:
        retro = Retrospective(
            text=json.dumps({
                "good": [],
                "bad": [],
                "ideas": [],
                "actions": [],
            }),
            is_finished=False
        )
        db.add(retro)
        await db.flush()

        sprint.fk_retrospectiveid_retrospective = retro.id_retrospective
        await db.commit()

    return {
        "id_retrospective": retro.id_retrospective,
        "is_finished": retro.is_finished,
        "text": retro.text
    }


# ---------------------------------------------------------
# SAVE RETROSPECTIVE (UPDATE ONLY)
# ---------------------------------------------------------
@router.post("/{sprint_id}")
async def save_retro(
    sprint_id: int,
    team_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate sprint
    sprint_result = await db.execute(
        select(Sprint).where(Sprint.id_sprint == sprint_id)
    )
    sprint = sprint_result.scalar_one_or_none()
    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint not found")

    await db.refresh(sprint)

    # Validate team + membership
    team = await get_team_or_404(team_id, db)
    await get_project_membership_or_404(
        team.fk_projectid_project, current_user.id_user, db
    )

    # Load retrospective
    result = await db.execute(
        select(Retrospective).where(
            Retrospective.id_retrospective == sprint.fk_retrospectiveid_retrospective
        )
    )
    retro = result.scalar_one_or_none()

    if retro is None:
        raise HTTPException(status_code=500, detail="Retrospective missing unexpectedly")

    retro.text = json.dumps(data)
    await db.commit()

    return {"status": "ok"}


# ---------------------------------------------------------
# TOGGLE FINISHED
# ---------------------------------------------------------
@router.post("/{sprint_id}/toggle")
async def toggle_retro(
    sprint_id: int,
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate sprint
    sprint_result = await db.execute(
        select(Sprint).where(Sprint.id_sprint == sprint_id)
    )
    sprint = sprint_result.scalar_one_or_none()
    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint not found")

    await db.refresh(sprint)

    # Validate team + membership
    team = await get_team_or_404(team_id, db)
    await get_project_membership_or_404(
        team.fk_projectid_project, current_user.id_user, db
    )

    # Load retrospective
    result = await db.execute(
        select(Retrospective).where(
            Retrospective.id_retrospective == sprint.fk_retrospectiveid_retrospective
        )
    )
    retro = result.scalar_one_or_none()

    if retro is None:
        raise HTTPException(status_code=404, detail="Retrospective not found")

    retro.is_finished = not retro.is_finished
    await db.commit()

    return {"status": "ok", "is_finished": retro.is_finished}


# ---------------------------------------------------------
# PERSONAL RETROSPECTIVE (TEAM MEMBER ONLY)
# ---------------------------------------------------------
@router.get("/member/{sprint_id}")
async def get_member_retro(
    sprint_id: int,
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate sprint
    sprint_result = await db.execute(
        select(Sprint).where(Sprint.id_sprint == sprint_id)
    )
    sprint = sprint_result.scalar_one_or_none()
    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint not found")

    # Validate team
    team = await get_team_or_404(team_id, db)

    # Ensure user is team member
    team_member = await get_team_member_for_user_or_403(team, current_user, db)

    # Load personal retrospective
    result = await db.execute(
        select(TeamMemberRetrospective).where(
            TeamMemberRetrospective.id_sprint == sprint_id,
            TeamMemberRetrospective.fk_teamMember == team_member.id_team_member,
        )
    )
    retro = result.scalar_one_or_none()

    # Auto-create if missing
    if retro is None:
        retro = TeamMemberRetrospective(
            id_sprint=sprint_id,
            fk_teamMember=team_member.id_team_member,
            description="",
        )
        db.add(retro)
        await db.commit()
        await db.refresh(retro)

    return {
        "id_retrospective": retro.id_retrospective,
        "description": retro.description or "",
    }


@router.post("/member/{sprint_id}")
async def save_member_retro(
    sprint_id: int,
    team_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate sprint
    sprint_result = await db.execute(
        select(Sprint).where(Sprint.id_sprint == sprint_id)
    )
    sprint = sprint_result.scalar_one_or_none()
    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint not found")

    # Validate team
    team = await get_team_or_404(team_id, db)

    # Ensure user is team member
    team_member = await get_team_member_for_user_or_403(team, current_user, db)

    # Load personal retrospective
    result = await db.execute(
        select(TeamMemberRetrospective).where(
            TeamMemberRetrospective.id_sprint == sprint_id,
            TeamMemberRetrospective.fk_teamMember == team_member.id_team_member,
        )
    )
    retro = result.scalar_one_or_none()

    if retro is None:
        raise HTTPException(status_code=500, detail="Retrospective missing unexpectedly")

    retro.description = data.get("description", "")
    await db.commit()

    return {"status": "ok"}
