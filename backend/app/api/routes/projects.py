from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.role import Role
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.schemas.ProjectMember import ProjectMembersAddRequest
from app.models.team import Team
from app.models.team_member import TeamMember
from app.schemas.team import TeamCreate, TeamRead, TeamMembersAddRequest
from app.api.routes.auth import get_current_user  

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectRead])
async def get_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project, ProjectMember.is_owner)
        .join(ProjectMember, ProjectMember.fk_projectid_project == Project.id_project)
        .where(ProjectMember.fk_userid_user == current_user.id_user)
        .order_by(Project.id_project.desc())
    )

    projects = result.scalars().all()

    return [
        ProjectRead(
            id=project.id_project,
            name=project.name,
            description=project.description,
        )
        for project in projects
    ]

@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project, ProjectMember.is_owner)
        .join(ProjectMember, ProjectMember.fk_projectid_project == Project.id_project)
        .where(
            Project.id_project == project_id,
            ProjectMember.fk_userid_user == current_user.id_user,
        )
    )

    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    project, is_owner = row

    return ProjectRead(
        id=project.id_project,
        name=project.name,
        description=project.description,
        is_owner=is_owner,
    )


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    name = payload.name.strip()
    description = payload.description.strip() if payload.description else None

    if not name or name in {".", "..", "..."}:
        raise HTTPException(status_code=400, detail="Invalid project name")

    project = Project(
        name=name,
        description=description,
    )
    db.add(project)
    await db.flush()

    owner_role = Role(
        visibility=1,
        fk_projectid_project=project.id_project,
    )
    db.add(owner_role)
    await db.flush()

    project_member = ProjectMember(
        role="Owner",
        is_owner=True,
        fk_userid_user=current_user.id_user,
        fk_projectid_project=project.id_project,
        fk_roleid_role=owner_role.id_role,
    )
    db.add(project_member)

    await db.commit()
    await db.refresh(project)

    return ProjectRead(
        id=project.id_project,
        name=project.name,
        description=project.description,
    )

@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_project_owner(project_id, current_user.id_user, db)

    result = await db.execute(
        select(Project).where(Project.id_project == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    name = payload.name.strip()
    if not name or name in {".", "..", "..."}:
        raise HTTPException(status_code=400, detail="Invalid project name")

    project.name = name
    project.description = payload.description.strip() if payload.description else None

    await db.commit()
    await db.refresh(project)

    return ProjectRead(
        id=project.id_project,
        name=project.name,
        description=project.description,
        is_owner=True,
    )

@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_project_owner(project_id, current_user.id_user, db)

    await db.execute(
        delete(ProjectMember).where(ProjectMember.fk_projectid_project == project_id)
    )
    await db.execute(
        delete(Role).where(Role.fk_projectid_project == project_id)
    )
    await db.execute(
        delete(Project).where(Project.id_project == project_id)
    )

    await db.commit()
    return {"message": "Project deleted"}


@router.post("/{project_id}/members")
async def add_project_members(
    project_id: int,
    payload: ProjectMembersAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_project_owner(project_id, current_user.id_user, db)

    if not payload.user_ids:
        return {"message": "No users to add"}

    result = await db.execute(
        select(Role).where(Role.fk_projectid_project == project_id)
    )
    role = result.scalars().first()

    if not role:
        role = Role(visibility=1, fk_projectid_project=project_id)
        db.add(role)
        await db.flush()

    existing_result = await db.execute(
        select(ProjectMember.fk_userid_user).where(
            ProjectMember.fk_projectid_project == project_id,
            ProjectMember.fk_userid_user.in_(payload.user_ids),
        )
    )
    existing_ids = set(existing_result.scalars().all())

    new_ids = [user_id for user_id in payload.user_ids if user_id not in existing_ids]

    for user_id in new_ids:
        db.add(
            ProjectMember(
                role="Member",
                is_owner=False,
                fk_userid_user=user_id,
                fk_projectid_project=project_id,
                fk_roleid_role=role.id_role,
            )
        )

    await db.commit()

    return {"message": "Members added"}

@router.get("/{project_id}/teams", response_model=list[TeamRead])
async def get_project_teams(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project_membership_or_404(project_id, current_user.id_user, db)

    result = await db.execute(
        select(Team)
        .where(Team.fk_projectid_project == project_id)
        .order_by(Team.id_team.asc())
    )
    teams = result.scalars().all()

    return [
        TeamRead(
            id_team=team.id_team,
            name=team.name,
        )
        for team in teams
    ]


@router.post("/{project_id}/teams", response_model=TeamRead, status_code=201)
async def create_team(
    project_id: int,
    payload: TeamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_project_owner(project_id, current_user.id_user, db)

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Team name is required")

    team = Team(
        name=name,
        fk_projectid_project=project_id,
    )
    db.add(team)
    await db.commit()
    await db.refresh(team)

    return TeamRead(
        id_team=team.id_team,
        name=team.name,
    )


@router.delete("/{project_id}/teams/{team_id}")
async def delete_team(
    project_id: int,
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_project_owner(project_id, current_user.id_user, db)
    await get_team_or_404(project_id, team_id, db)

    await db.execute(
        delete(TeamMember).where(TeamMember.fk_teamid_team == team_id)
    )
    await db.execute(
        delete(Team).where(
            Team.id_team == team_id,
            Team.fk_projectid_project == project_id,
        )
    )

    await db.commit()
    return {"message": "Team deleted"}


@router.get("/{project_id}/available-members")
async def get_available_project_members(
    project_id: int,
    team_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_project_owner(project_id, current_user.id_user, db)

    query = (
        select(User)
        .join(ProjectMember, ProjectMember.fk_userid_user == User.id_user)
        .where(
            ProjectMember.fk_projectid_project == project_id,
            User.id_user != current_user.id_user,
        )
    )

    if team_id is not None:
        subquery = (
            select(TeamMember.fk_userid_user)
            .where(TeamMember.fk_teamid_team == team_id)
        )
        query = query.where(User.id_user.not_in(subquery))

    result = await db.execute(query.order_by(User.name.asc()))
    users = result.scalars().all()

    return [
        {
            "id_user": user.id_user,
            "name": user.name,
            "email": user.email,
            "country": user.country,
            "city": user.city,
        }
        for user in users
    ]


@router.get("/{project_id}/teams/{team_id}/members")
async def get_team_members(
    project_id: int,
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project_membership_or_404(project_id, current_user.id_user, db)
    await get_team_or_404(project_id, team_id, db)

    result = await db.execute(
        select(User, TeamMember)
        .join(TeamMember, TeamMember.fk_userid_user == User.id_user)
        .where(TeamMember.fk_teamid_team == team_id)
    )
    rows = result.all()

    return [
        {
            "id_user": user.id_user,
            "name": user.name,
            "email": user.email,
            "country": user.country,
            "city": user.city,
            "role_in_team": team_member.role_in_team,
            "effectiveness": team_member.effectiveness,
        }
        for user, team_member in rows
    ]


@router.post("/{project_id}/teams/{team_id}/members")
async def add_team_members(
    project_id: int,
    team_id: int,
    payload: TeamMembersAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_project_owner(project_id, current_user.id_user, db)
    await get_team_or_404(project_id, team_id, db)

    if not payload.user_ids:
        return {"message": "No users to add"}

    result = await db.execute(
        select(ProjectMember.fk_userid_user).where(
            ProjectMember.fk_projectid_project == project_id,
            ProjectMember.fk_userid_user.in_(payload.user_ids),
        )
    )
    valid_project_member_ids = set(result.scalars().all())

    existing_result = await db.execute(
        select(TeamMember.fk_userid_user).where(
            TeamMember.fk_teamid_team == team_id,
            TeamMember.fk_userid_user.in_(payload.user_ids),
        )
    )
    existing_team_member_ids = set(existing_result.scalars().all())

    final_ids = [
        user_id
        for user_id in payload.user_ids
        if user_id in valid_project_member_ids and user_id not in existing_team_member_ids
    ]

    for user_id in final_ids:
        db.add(
            TeamMember(
                fk_teamid_team=team_id,
                fk_userid_user=user_id,
                role_in_team="Member",
                effectiveness=None,
            )
        )

    await db.commit()
    return {"message": "Team members added"}


@router.delete("/{project_id}/teams/{team_id}/members/{user_id}")
async def remove_team_member(
    project_id: int,
    team_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_project_owner(project_id, current_user.id_user, db)
    await get_team_or_404(project_id, team_id, db)

    await db.execute(
        delete(TeamMember).where(
            TeamMember.fk_teamid_team == team_id,
            TeamMember.fk_userid_user == user_id,
        )
    )
    await db.commit()

    return {"message": "Team member removed"}

async def get_project_membership_or_404(project_id: int, user_id: int, db: AsyncSession):
    result = await db.execute(
        select(ProjectMember)
        .where(
            ProjectMember.fk_projectid_project == project_id,
            ProjectMember.fk_userid_user == user_id,
        )
    )
    membership = result.scalar_one_or_none()

    if not membership:
        raise HTTPException(status_code=404, detail="Project not found")

    return membership

async def require_project_owner(project_id: int, user_id: int, db: AsyncSession):
    membership = await get_project_membership_or_404(project_id, user_id, db)

    if not membership.is_owner:
        raise HTTPException(status_code=403, detail="Only project owners can do this")

    return membership

async def get_team_or_404(project_id: int, team_id: int, db: AsyncSession):
    result = await db.execute(
        select(Team).where(
            Team.id_team == team_id,
            Team.fk_projectid_project == project_id,
        )
    )
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    return team