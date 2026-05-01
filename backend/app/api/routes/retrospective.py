from app.services.ai import summarize_with_gemini
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



import re

def extract_json(text: str) -> str:
    # Remove markdown code fences like ```json ... ```
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)

    # Extract the first JSON object
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        return match.group(0)

    raise ValueError("No JSON object found in AI response")

router = APIRouter(prefix="/retrospective", tags=["retrospective"])


# ---------------------------------------------------------
# HELPERS
# ---------------------------------------------------------

async def get_team_member_for_user_or_403(team: Team, user: User, db: AsyncSession):
    # Check team membership ONLY
    tm_result = await db.execute(
        select(TeamMember).where(
            TeamMember.fk_userid_user == user.id_user,
            TeamMember.fk_teamid_team == team.id_team,
        )
    )
    team_member = tm_result.scalar_one_or_none()

    if team_member is None:
        raise HTTPException(status_code=403, detail="You are not a member of this team")

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
        "is_submitted": retro.is_submitted,
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

    # ⭐ AUTO‑CREATE IF MISSING
    if retro is None:
        retro = TeamMemberRetrospective(
            id_sprint=sprint_id,
            fk_teamMember=team_member.id_team_member,
            description="",
            is_submitted=False,   # optional if you added this column
        )
        db.add(retro)
        await db.flush()

    # Update description
    retro.description = json.dumps(data)
    await db.commit()

    return {"status": "ok"}



# ---------------------------------------------------------
# GET ALL MEMBER RETROSPECTIVES FOR A SPRINT
# ---------------------------------------------------------
@router.get("/member/{sprint_id}/all")
async def get_all_member_retros(
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

    # Ensure user is part of the project
    await get_project_membership_or_404(
        team.fk_projectid_project, current_user.id_user, db
    )

    # Load all retrospectives + user names
    result = await db.execute(
        select(
            TeamMemberRetrospective,
            TeamMember,
            User
        )
        .join(TeamMember, TeamMember.id_team_member == TeamMemberRetrospective.fk_teamMember)
        .join(User, User.id_user == TeamMember.fk_userid_user)
        .where(
            TeamMemberRetrospective.id_sprint == sprint_id,
            TeamMember.fk_teamid_team == team_id
        )
    )

    rows = result.all()

    return [
        {
            "team_member_id": tm.id_team_member,
            "user_id": user.id_user,
            "member_name": user.name,
            "description": retro.description,
            "is_submitted": retro.is_submitted,
        }
        for retro, tm, user in rows
    ]


    

@router.post("/member/{sprint_id}/submit")
async def submit_member_retro(
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

    if retro is None:
        raise HTTPException(status_code=404, detail="Retrospective not found")

    retro.is_submitted = True
    await db.commit()

    return {"status": "submitted"}

@router.get("/team/{team_id}/is-member")
async def check_team_membership(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate team exists
    team = await get_team_or_404(team_id, db)

    # Debug prints
    print("current_user.id_user =", current_user.id_user)
    print("team.id_team =", team.id_team)

    # Check membership manually for debugging
    tm_result = await db.execute(
        select(TeamMember).where(
            TeamMember.fk_userid_user == current_user.id_user,
            TeamMember.fk_teamid_team == team.id_team,
        )
    )
    tm = tm_result.scalar_one_or_none()
    print("matching team_member =", tm)

    # Use your existing helper
    try:
        await get_team_member_for_user_or_403(team, current_user, db)
        return {"is_member": True}
    except HTTPException:
        return {"is_member": False}
    
from pydantic import BaseModel
class SummarizeRequest(BaseModel):
    projectId: int | str
    teamId: int | str
    sprintId: int | str


@router.post("/summarize")
async def summarize_retro(payload: SummarizeRequest, db: AsyncSession = Depends(get_db)):
    project_id = payload.projectId
    team_id = payload.teamId
    sprint_id = payload.sprintId

    # Load all member retrospectives
    result = await db.execute(
        select(TeamMemberRetrospective)
        .where(TeamMemberRetrospective.fk_sprintid_sprint == sprint_id)
    )
    retros = result.scalars().all()

    texts = []
    for r in retros:
        try:
            parsed = json.loads(r.description)
            texts.append(parsed)
        except:
            pass

    print("LOADED RETROSPECTIVE TEXTS:", texts)


    prompt = f"""
You are a summarization engine. Return ONLY valid JSON.

Format:
{{
  "good": [],
  "bad": [],
  "ideas": [],
  "actions": []
}}

Rules:
- No explanation
- No markdown
- No code fences
- No text before or after the JSON
- Output must start with '{{' and end with '}}'

Retrospectives:
{json.dumps(texts, indent=2)}
"""

    ai_raw = await summarize_with_gemini(prompt)
    print("AI RAW RESPONSE:", ai_raw)

    cleaned = extract_json(ai_raw)
    summary = json.loads(cleaned)

    return summary

