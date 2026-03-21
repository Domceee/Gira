from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db

from app.models.sprint import Sprint
from app.models.task import Task
from app.schemas.sprint import SprintCreate, SprintRead

router = APIRouter(prefix="/sprints", tags=["sprints"])


# ---------------------------------------------------------
# GET — all sprints for a team
# ---------------------------------------------------------
@router.get("", response_model=list[SprintRead])
async def get_sprints(team_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
    select(Sprint).where(Sprint.fk_teamid_team == team_id)
    )
    sprints = result.scalars().all()

    output = []
    for sprint in sprints:
        result = await db.execute(
            select(Task).where(Task.fk_sprintid_sprint == sprint.id_sprint)
        )
        tasks = result.scalars().all()

        output.append({
            "id_sprint": sprint.id_sprint,
            "start_date": sprint.start_date,
            "end_date": sprint.end_date,
            "tasks": tasks
        })

    return output


# ---------------------------------------------------------
# POST — create a sprint
# ---------------------------------------------------------
@router.post("", response_model=dict)
async def create_sprint(payload: SprintCreate, db: AsyncSession = Depends(get_db)):
    sprint = Sprint(
    fk_teamid_team=payload.team_id,
    start_date=payload.start_date,
    end_date=payload.end_date
    )

    db.add(sprint)
    await db.commit()
    await db.refresh(sprint)

    return {"status": "ok", "id_sprint": sprint.id_sprint}
