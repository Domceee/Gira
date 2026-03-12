from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectRead
from app.models.team import Team
from app.models.task import Task


router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectRead])
async def get_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project))
    projects = result.scalars().all()

    return [
        ProjectRead(
            id=project.id_project,
            name=project.name,
            description=project.description,
        )
        for project in projects
    ]


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(payload: ProjectCreate, db: AsyncSession = Depends(get_db)):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Project name is required")

    project = Project(
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
    )

    db.add(project)
    await db.commit()
    await db.refresh(project)

    # Create default teams A and B
    team_a = Team(name="A", fk_projectid_project=project.id_project)
    team_b = Team(name="B", fk_projectid_project=project.id_project)

    db.add_all([team_a, team_b])
    await db.commit()

    return ProjectRead(
        id=project.id_project,
        name=project.name,
        description=project.description,
    )


@router.get("/{id}", response_model=ProjectRead)
async def get_project(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id_project == id))
    project = result.scalar_one_or_none()

    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    return ProjectRead(
        id=project.id_project,
        name=project.name,
        description=project.description,
    )

from app.models.team import Team

@router.get("/{id}/teams")
async def get_project_teams(id: int, db: AsyncSession = Depends(get_db)):
    # Fetch teams for this project
    result = await db.execute(
        select(Team).where(Team.fk_projectid_project == id)
    )
    teams = result.scalars().all()

    response = []

    for team in teams:
        # Fetch tasks assigned to this team
        task_result = await db.execute(
            select(Task).where(Task.fk_teamid_team == team.id_team)
        )
        tasks = task_result.scalars().all()

        response.append({
            "team_id": team.id_team,
            "team_name": team.name,
            "tasks": tasks
        })

    return response
