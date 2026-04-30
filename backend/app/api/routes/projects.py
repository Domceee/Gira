from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.email import send_project_invitation_email
from app.db.session import get_db
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.role import Role
from app.models.user import User
from app.models.invitation import Invitation
from app.services.news import create_news_for_users
from app.schemas.project import (
    ProjectCreate,
    ProjectRead,
    ProjectStatsTeamOptionRead,
    ProjectStatsRead,
    ProjectUpdate,
    StoryPointsByTeamRead,
    TeamVelocitySprintRead,
)
from app.schemas.board import BoardMemberRead, BoardTaskRead, ProjectBoardRead, SprintBoardRead
from app.schemas.ProjectMember import ProjectMembersAddRequest, ProjectMemberRead
from app.models.team import Team
from app.models.team_member import TeamMember
from app.models.task import Task
from app.models.sprint import Sprint
from app.models.sprint_status import SprintStatus
from app.models.sprint_task_event import SprintTaskEvent
from app.schemas.team import TeamCreate, TeamRead, TeamMembersAddRequest
from app.schemas.task import TaskRead
from app.models.task_workflow_status import TaskWorkflowStatus
from app.services.sprint_burndown import build_fallback_events, summarize_sprint_tasks
from app.services.sprint_status import sync_project_sprint_statuses
from app.services.task_delete import get_task_delete_state
from app.api.routes.auth import get_current_user  

router = APIRouter(prefix="/projects", tags=["projects"])


def normalize_email(email: str) -> str:
    return email.strip().lower()


async def get_project_delete_state(project_id: int, db: AsyncSession) -> tuple[bool, str | None]:
    team_result = await db.execute(
        select(Team).where(Team.fk_projectid_project == project_id)
    )
    teams = team_result.scalars().all()

    task_result = await db.execute(
        select(Task).where(Task.fk_projectid_project == project_id)
    )
    tasks = task_result.scalars().all()

    reasons: list[str] = []
    if teams:
        reasons.append(f"{len(teams)} team(s) still exist")
    if tasks:
        reasons.append(f"{len(tasks)} task(s) still exist")

    if reasons:
        return False, "Cannot delete because " + " and ".join(reasons) + "."

    return True, None


async def get_team_delete_state(team_id: int, db: AsyncSession) -> tuple[bool, str | None]:
    task_result = await db.execute(
        select(Task).where(Task.fk_teamid_team == team_id)
    )
    tasks = task_result.scalars().all()

    sprint_result = await db.execute(
        select(Sprint).where(Sprint.fk_teamid_team == team_id)
    )
    sprints = sprint_result.scalars().all()

    reasons: list[str] = []
    if tasks:
        reasons.append(f"{len(tasks)} task(s) are still assigned")
    if sprints:
        reasons.append(f"{len(sprints)} sprint(s) still exist")

    if reasons:
        return False, "Cannot delete because " + " and ".join(reasons) + "."

    return True, None


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

    output: list[ProjectRead] = []
    for project in projects:
        can_delete, delete_block_reason = await get_project_delete_state(project.id_project, db)
        output.append(
            ProjectRead(
                id=project.id_project,
                name=project.name,
                description=project.description,
                use_swimlane_board=project.use_swimlane_board,
                can_delete=can_delete,
                delete_block_reason=delete_block_reason,
            )
        )

    return output

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
    can_delete, delete_block_reason = await get_project_delete_state(project_id, db)

    return ProjectRead(
        id=project.id_project,
        name=project.name,
        description=project.description,
        use_swimlane_board=project.use_swimlane_board,
        is_owner=is_owner,
        can_delete=can_delete,
        delete_block_reason=delete_block_reason,
    )


@router.get("/{project_id}/stats", response_model=ProjectStatsRead)
async def get_project_stats(
    project_id: int,
    team_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project_membership_or_404(project_id, current_user.id_user, db)

    result = await db.execute(
        select(Task).where(Task.fk_projectid_project == project_id)
    )
    tasks = result.scalars().all()
    team_result = await db.execute(
        select(Team)
        .where(Team.fk_projectid_project == project_id)
        .order_by(Team.id_team.asc())
    )
    teams = team_result.scalars().all()
    team_options = [
        ProjectStatsTeamOptionRead(
            team_id=team.id_team,
            label=team.name or f"Team {team.id_team}",
        )
        for team in teams
    ]
    selected_team = next((team for team in teams if team.id_team == team_id), None) if team_id is not None else None
    if team_id is not None and selected_team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    if selected_team is None and teams:
        selected_team = teams[0]

    def story_points_for(items: list[Task]) -> float:
        return float(sum(task.story_points or 0 for task in items))

    done_tasks = [task for task in tasks if task.workflow_status == TaskWorkflowStatus.DONE.value]
    active_tasks = [task for task in tasks if task.workflow_status != TaskWorkflowStatus.DONE.value]
    unassigned_tasks = [task for task in active_tasks if task.fk_teamid_team is None]
    team_backlog_tasks = [
        task for task in active_tasks
        if task.fk_teamid_team is not None and task.fk_sprintid_sprint is None
    ]
    in_sprint_tasks = [task for task in active_tasks if task.fk_sprintid_sprint is not None]
    story_points_by_team: list[StoryPointsByTeamRead] = []

    for team in teams:
        team_story_points = float(
            sum((task.story_points or 0) for task in active_tasks if task.fk_teamid_team == team.id_team)
        )
        story_points_by_team.append(
            StoryPointsByTeamRead(
                label=team.name or f"Team {team.id_team}",
                team_id=team.id_team,
                story_points=team_story_points,
            )
        )

    story_points_by_team.append(
        StoryPointsByTeamRead(
            label="Unassigned",
            story_points=story_points_for(unassigned_tasks),
        )
    )

    velocity_report: list[TeamVelocitySprintRead] = []
    if selected_team is not None:
        sprint_result = await db.execute(
            select(Sprint)
            .where(
                Sprint.fk_teamid_team == selected_team.id_team,
                Sprint.status == SprintStatus.COMPLETED.value,
            )
            .order_by(Sprint.end_date.desc(), Sprint.id_sprint.desc())
        )
        completed_sprints = list(reversed(sprint_result.scalars().all()[:7]))

        for sprint in completed_sprints:
            sprint_task_result = await db.execute(
                select(Task).where(Task.fk_sprintid_sprint == sprint.id_sprint)
            )
            sprint_tasks = sprint_task_result.scalars().all()

            event_result = await db.execute(
                select(SprintTaskEvent)
                .where(SprintTaskEvent.fk_sprintid_sprint == sprint.id_sprint)
                .order_by(SprintTaskEvent.occurred_at.asc(), SprintTaskEvent.id_sprint_task_event.asc())
            )
            sprint_events = event_result.scalars().all()
            if not sprint_events:
                sprint_events = build_fallback_events(sprint_tasks, sprint.start_date, sprint.end_date)

            summary = summarize_sprint_tasks(sprint_events, sprint_tasks)
            velocity_report.append(
                TeamVelocitySprintRead(
                    sprint_id=sprint.id_sprint,
                    start_date=sprint.start_date,
                    end_date=sprint.end_date,
                    committed_story_points=summary.committed_story_points,
                    completed_story_points=summary.completed_story_points,
                )
            )

    return ProjectStatsRead(
        total_tasks=len(tasks),
        active_tasks=len(active_tasks),
        unassigned_tasks=len(unassigned_tasks),
        team_backlog_tasks=len(team_backlog_tasks),
        in_sprint_tasks=len(in_sprint_tasks),
        done_tasks=len(done_tasks),
        total_story_points=story_points_for(tasks),
        active_story_points=story_points_for(active_tasks),
        unassigned_story_points=story_points_for(unassigned_tasks),
        team_backlog_story_points=story_points_for(team_backlog_tasks),
        in_sprint_story_points=story_points_for(in_sprint_tasks),
        done_story_points=story_points_for(done_tasks),
        story_points_by_team=story_points_by_team,
        teams=team_options,
        selected_team_id=selected_team.id_team if selected_team is not None else None,
        velocity_report=velocity_report,
    )


@router.get("/{project_id}/board", response_model=ProjectBoardRead)
async def get_project_board(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project_membership_or_404(project_id, current_user.id_user, db)
    await sync_project_sprint_statuses(project_id, db)

    project_result = await db.execute(
        select(Project).where(Project.id_project == project_id)
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    sprint_result = await db.execute(
        select(Sprint, Team)
        .join(Team, Team.id_team == Sprint.fk_teamid_team)
        .where(
            Team.fk_projectid_project == project_id,
            Sprint.status == SprintStatus.ACTIVE.value,
        )
        .order_by(Team.name.asc(), Sprint.start_date.asc(), Sprint.id_sprint.asc())
    )
    sprint_rows = sprint_result.all()

    boards: list[SprintBoardRead] = []
    for sprint, team in sprint_rows:
        member_result = await db.execute(
            select(TeamMember, User)
            .join(User, User.id_user == TeamMember.fk_userid_user)
            .where(TeamMember.fk_teamid_team == team.id_team)
            .order_by(User.name.asc(), TeamMember.id_team_member.asc())
        )
        members = [
            BoardMemberRead(
                team_member_id=team_member.id_team_member,
                user_id=user.id_user,
                name=user.name,
            )
            for team_member, user in member_result.all()
        ]

        task_result = await db.execute(
            select(Task, TeamMember, User)
            .outerjoin(
                TeamMember,
                TeamMember.id_team_member == Task.fk_team_memberid_team_member,
            )
            .outerjoin(
                User,
                User.id_user == TeamMember.fk_userid_user,
            )
            .where(Task.fk_sprintid_sprint == sprint.id_sprint)
            .order_by(Task.workflow_status.asc(), Task.board_order.asc(), Task.id_task.asc())
        )
        task_rows = task_result.all()

        tasks: list[BoardTaskRead] = []
        for task, team_member, assignee in task_rows:
            tasks.append(
                BoardTaskRead(
                    id_task=task.id_task,
                    name=task.name,
                    description=task.description,
                    story_points=task.story_points,
                    risk=task.risk,
                    priority=task.priority,
                    fk_teamid_team=task.fk_teamid_team,
                    fk_sprintid_sprint=task.fk_sprintid_sprint,
                    workflow_status=task.workflow_status,
                    board_order=task.board_order,
                    fk_team_memberid_team_member=task.fk_team_memberid_team_member,
                    assignee_user_id=assignee.id_user if assignee is not None else None,
                    assignee_name=assignee.name if assignee is not None else None,
                )
            )

        boards.append(
            SprintBoardRead(
                sprint_id=sprint.id_sprint,
                team_id=team.id_team,
                team_name=team.name,
                start_date=sprint.start_date,
                end_date=sprint.end_date,
                members=members,
                tasks=tasks,
            )
        )

    return ProjectBoardRead(
        project_id=project_id,
        use_swimlane_board=project.use_swimlane_board,
        boards=boards,
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
        use_swimlane_board=payload.use_swimlane_board,
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
        use_swimlane_board=project.use_swimlane_board,
        can_delete=True,
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
    project.use_swimlane_board = payload.use_swimlane_board

    await db.commit()
    await db.refresh(project)
    can_delete, delete_block_reason = await get_project_delete_state(project_id, db)

    return ProjectRead(
        id=project.id_project,
        name=project.name,
        description=project.description,
        use_swimlane_board=project.use_swimlane_board,
        is_owner=True,
        can_delete=can_delete,
        delete_block_reason=delete_block_reason,
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
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_project_owner(project_id, current_user.id_user, db)

    project_result = await db.execute(select(Project).where(Project.id_project == project_id))
    project = project_result.scalar_one_or_none()

    normalized_emails = {normalize_email(email) for email in payload.emails}
    owner_email = normalize_email(current_user.email)
    normalized_emails.discard(owner_email)

    if not payload.user_ids and not normalized_emails:
        return {"message": "No users to add"}

    requested_users_by_id: dict[int, User] = {}
    if payload.user_ids:
        users_result = await db.execute(
            select(User).where(User.id_user.in_(payload.user_ids))
        )
        requested_users_by_id.update(
            {user.id_user: user for user in users_result.scalars().all()}
        )

    if normalized_emails:
        email_user_result = await db.execute(
            select(User).where(func.lower(User.email).in_(normalized_emails))
        )
        for user in email_user_result.scalars().all():
            requested_users_by_id[user.id_user] = user

    candidate_user_ids = list(requested_users_by_id.keys())
    candidate_emails = set(normalized_emails)
    candidate_emails.update(normalize_email(user.email) for user in requested_users_by_id.values())

    existing_member_ids: set[int] = set()
    if candidate_user_ids:
        existing_result = await db.execute(
            select(ProjectMember.fk_userid_user).where(
                ProjectMember.fk_projectid_project == project_id,
                ProjectMember.fk_userid_user.in_(candidate_user_ids),
            )
        )
        existing_member_ids = set(existing_result.scalars().all())

    existing_member_emails: set[str] = set()
    if candidate_emails:
        existing_member_email_result = await db.execute(
            select(User.email)
            .join(ProjectMember, ProjectMember.fk_userid_user == User.id_user)
            .where(
                ProjectMember.fk_projectid_project == project_id,
                func.lower(User.email).in_(candidate_emails),
            )
        )
        existing_member_emails = {
            normalize_email(email) for email in existing_member_email_result.scalars().all()
        }

    existing_invitation_ids: set[int] = set()
    if candidate_user_ids:
        invitation_result = await db.execute(
            select(Invitation.fk_userid_user).where(
                Invitation.fk_projectid_project == project_id,
                Invitation.is_accepted == False,
                Invitation.is_declined == False,
                Invitation.fk_userid_user.in_(candidate_user_ids),
            )
        )
        existing_invitation_ids = {
            user_id
            for user_id in invitation_result.scalars().all()
            if user_id is not None
        }

    existing_invitation_emails: set[str] = set()
    if candidate_emails:
        invitation_email_result = await db.execute(
            select(Invitation.invited_email).where(
                Invitation.fk_projectid_project == project_id,
                Invitation.is_accepted == False,
                Invitation.is_declined == False,
                func.lower(Invitation.invited_email).in_(candidate_emails),
            )
        )
        existing_invitation_emails = {
            normalize_email(email)
            for email in invitation_email_result.scalars().all()
            if email is not None
        }

    created_user_ids: list[int] = []
    created_emails: list[str] = []
    created_invitation_emails: set[str] = set()

    for user in requested_users_by_id.values():
        normalized_email = normalize_email(user.email)
        if normalized_email == owner_email:
            continue
        if user.id_user in existing_member_ids:
            continue
        if normalized_email in existing_member_emails:
            continue
        if user.id_user in existing_invitation_ids:
            continue
        if normalized_email in existing_invitation_emails or normalized_email in created_invitation_emails:
            continue

        db.add(
            Invitation(
                fk_userid_user=user.id_user,
                fk_projectid_project=project_id,
                invited_by_user_id=current_user.id_user,
                invited_email=normalized_email,
            )
        )
        created_user_ids.append(user.id_user)
        created_emails.append(normalized_email)
        created_invitation_emails.add(normalized_email)

    unresolved_emails = normalized_emails.difference(created_invitation_emails)
    for email in sorted(unresolved_emails):
        if email in existing_member_emails:
            continue
        if email in existing_invitation_emails:
            continue
        db.add(
            Invitation(
                fk_userid_user=None,
                fk_projectid_project=project_id,
                invited_by_user_id=current_user.id_user,
                invited_email=email,
            )
        )
        created_emails.append(email)
        created_invitation_emails.add(email)

    if created_user_ids and project is not None:
        await create_news_for_users(
            db=db,
            user_ids=created_user_ids,
            title="Project invitation",
            message=f"You were invited to project {project.name}.",
            news_type="project_invite",
            project_id=project_id,
        )

    if project is not None:
        invited_by_name = current_user.name or "A Gira user"
        project_name = project.name or "Project"
        for email in created_emails:
            background_tasks.add_task(
                send_project_invitation_email,
                email,
                project_name,
                invited_by_name,
            )

    await db.commit()

    return {"message": "Invitations sent"}

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

    output: list[TeamRead] = []
    for team in teams:
        can_delete, delete_block_reason = await get_team_delete_state(team.id_team, db)
        output.append(
            TeamRead(
                id_team=team.id_team,
                name=team.name,
                can_delete=can_delete,
                delete_block_reason=delete_block_reason,
            )
        )

    return output


@router.get("/{project_id}/teams/{team_id}")
async def get_team_backlog(
    project_id: int,
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Ensure user belongs to the project
    await get_project_membership_or_404(project_id, current_user.id_user, db)

    # Ensure team exists
    team = await get_team_or_404(project_id, team_id, db)

    # Fetch tasks for this team
    result = await db.execute(
        select(Task)
        .where(Task.fk_teamid_team == team_id)
        .order_by(Task.id_task.asc())
    )
    tasks = result.scalars().all()

    # Fetch team members (joined with User)
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

    task_output = []
    for task in tasks:
        can_delete, delete_block_reason = await get_task_delete_state(task, db)
        task_read = TaskRead.model_validate(task).model_dump()
        task_read["can_delete"] = can_delete
        task_read["delete_block_reason"] = delete_block_reason
        task_output.append(task_read)

    return {
        "team_id": team.id_team,
        "team_name": team.name,
        "tasks": task_output,
        "team_members": members,
    }


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
        can_delete=True,
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


@router.get("/{project_id}/members", response_model=list[ProjectMemberRead])
async def get_project_members(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_project_owner(project_id, current_user.id_user, db)

    result = await db.execute(
        select(User, ProjectMember.is_owner)
        .join(ProjectMember, ProjectMember.fk_userid_user == User.id_user)
        .where(ProjectMember.fk_projectid_project == project_id)
        .order_by(User.name.asc())
    )

    members = result.all()

    return [
        ProjectMemberRead(
            id_user=user.id_user,
            name=user.name,
            email=user.email,
            is_owner=is_owner,
        )
        for user, is_owner in members
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
    team = await get_team_or_404(project_id, team_id, db)
    project_result = await db.execute(select(Project).where(Project.id_project == project_id))
    project = project_result.scalar_one_or_none()

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

    if final_ids and project is not None:
        await create_news_for_users(
            db=db,
            user_ids=final_ids,
            title="Team assignment",
            message=f"You were assigned to team {team.name} in project {project.name}.",
            news_type="team_assignment",
            project_id=project_id,
            team_id=team_id,
        )

        active_sprint_result = await db.execute(
            select(Sprint.id_sprint)
            .where(
                Sprint.fk_teamid_team == team_id,
                Sprint.status == SprintStatus.ACTIVE.value,
            )
        )
        active_sprint_ids = active_sprint_result.scalars().all()
        if active_sprint_ids:
            await create_news_for_users(
                db=db,
                user_ids=final_ids,
                title="Sprint started",
                message=f"A sprint is currently active for team {team.name}.",
                news_type="sprint_started",
                project_id=project_id,
                team_id=team_id,
                sprint_id=active_sprint_ids[0],
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

    # Get the team member to unassign tasks
    team_member_result = await db.execute(
        select(TeamMember).where(
            TeamMember.fk_teamid_team == team_id,
            TeamMember.fk_userid_user == user_id,
        )
    )
    team_member = team_member_result.scalar_one_or_none()
    if not team_member:
        raise HTTPException(status_code=404, detail="Team member not found")

    # Unassign tasks from this team member
    await db.execute(
        update(Task).where(Task.fk_team_memberid_team_member == team_member.id_team_member).values(
            fk_team_memberid_team_member=None
        )
    )

    # Move sprint tasks back to backlog
    await db.execute(
        update(Task).where(
            Task.fk_team_memberid_team_member == team_member.id_team_member,
            Task.fk_sprintid_sprint.isnot(None)
        ).values(
            fk_sprintid_sprint=None,
            workflow_status=TaskWorkflowStatus.TODO.value,
            board_order=0
        )
    )

    # Delete the team member
    await db.execute(
        delete(TeamMember).where(
            TeamMember.fk_teamid_team == team_id,
            TeamMember.fk_userid_user == user_id,
        )
    )
    await db.commit()

    return {"message": "Team member removed"}


@router.delete("/{project_id}/members/{user_id}")
async def remove_project_member(
    project_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_project_owner(project_id, current_user.id_user, db)

    # Get the project member
    membership_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.fk_projectid_project == project_id,
            ProjectMember.fk_userid_user == user_id,
        )
    )
    membership = membership_result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=404, detail="Project member not found")
    
    if membership.is_owner:
        raise HTTPException(status_code=400, detail="Cannot remove project owner")

    # Get all team members for this user in the project
    team_members_result = await db.execute(
        select(TeamMember).where(
            TeamMember.fk_userid_user == user_id,
            TeamMember.fk_teamid_team.in_(
                select(Team.id_team).where(Team.fk_projectid_project == project_id)
            )
        )
    )
    team_members = team_members_result.scalars().all()

    # Unassign tasks from all team members of this user in the project
    team_member_ids = [tm.id_team_member for tm in team_members]
    if team_member_ids:
        await db.execute(
            update(Task).where(Task.fk_team_memberid_team_member.in_(team_member_ids)).values(
                fk_team_memberid_team_member=None,
                fk_teamid_team=None
            )
        )

        # Move sprint tasks back to backlog
        await db.execute(
            update(Task).where(
                Task.fk_team_memberid_team_member.in_(team_member_ids),
                Task.fk_sprintid_sprint.isnot(None)
            ).values(
                fk_sprintid_sprint=None,
                workflow_status=TaskWorkflowStatus.TODO.value,
                board_order=0
            )
        )

    # Delete all team members for this user in the project
    await db.execute(
        delete(TeamMember).where(
            TeamMember.fk_userid_user == user_id,
            TeamMember.fk_teamid_team.in_(
                select(Team.id_team).where(Team.fk_projectid_project == project_id)
            )
        )
    )

    # Delete the project member
    await db.execute(
        delete(ProjectMember).where(
            ProjectMember.fk_projectid_project == project_id,
            ProjectMember.fk_userid_user == user_id,
        )
    )
    await db.commit()

    return {"message": "Project member removed"}

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
