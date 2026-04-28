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

import json

router = APIRouter(prefix="/retrospective", tags=["retrospective"])


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
# GET RETROSPECTIVE
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

    # If sprint has no retrospective FK yet → return empty template
    if sprint.fk_retrospectiveid_retrospective is None:
        return {
            "id_retrospective": None,
            "is_finished": False,
            "text": json.dumps({
                "good": [""],
                "bad": [""],
                "ideas": [""],
                "actions": [""],
            })
        }

    # Load retrospective using FK
    result = await db.execute(
        select(Retrospective).where(
            Retrospective.id_retrospective == sprint.fk_retrospectiveid_retrospective
        )
    )
    retro = result.scalar_one_or_none()

    if retro is None or not retro.text:
        return {
            "id_retrospective": sprint.fk_retrospectiveid_retrospective,
            "is_finished": retro.is_finished if retro else False,
            "text": json.dumps({
                "good": [""],
                "bad": [""],
                "ideas": [""],
                "actions": [""],
            })
        }

    return {
        "id_retrospective": retro.id_retrospective,
        "is_finished": retro.is_finished,
        "text": retro.text
    }



# ---------------------------------------------------------
# SAVE RETROSPECTIVE
# ---------------------------------------------------------
@router.post("/{sprint_id}")
async def save_retro(
    sprint_id: int,
    team_id: int,
    data: dict,  # <-- receives the JSON object directly
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

    # Load existing retrospective
    result = await db.execute(
        select(Retrospective).where(
            Retrospective.id_retrospective == sprint.fk_retrospectiveid_retrospective
        )
    )
    retro = result.scalar_one_or_none()

    json_text = json.dumps(data)

    if retro:
        retro.text = json_text
    else:
        retro = Retrospective(
            text=json_text,
            is_finished=False
        )
        db.add(retro)
        await db.flush()
        sprint.fk_retrospectiveid_retrospective = retro.id_retrospective

    await db.commit()

    return {
        "status": "ok",
        "id_retrospective": retro.id_retrospective
    }
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

    # Toggle
    retro.is_finished = not retro.is_finished
    await db.commit()

    return {
        "status": "ok",
        "is_finished": retro.is_finished
    }
