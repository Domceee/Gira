from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectRead

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
