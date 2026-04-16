from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.auth import get_current_user
from app.db.session import get_db
from app.models.invitation import Invitation
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.role import Role
from app.models.user import User
from app.schemas.invitation import InvitationRead

router = APIRouter(prefix="/invitations", tags=["invitations"])


@router.get("", response_model=list[InvitationRead])
async def get_invitations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Invitation, Project, User)
        .join(Project, Project.id_project == Invitation.fk_projectid_project)
        .join(User, User.id_user == Invitation.invited_by_user_id)
        .where(
            Invitation.fk_userid_user == current_user.id_user,
            Invitation.is_accepted == False,
            Invitation.is_declined == False,
        )
        .order_by(Invitation.created_at.desc())
    )

    invitations = []
    for invitation, project, invited_by in result.all():
        invitations.append(
            {
                "id_invitation": invitation.id_invitation,
                "fk_projectid_project": invitation.fk_projectid_project,
                "project_name": project.name or "Project",
                "invited_by_name": invited_by.name,
                "created_at": invitation.created_at,
            }
        )

    return invitations


@router.patch("/{invitation_id}/accept")
async def accept_invitation(
    invitation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Invitation).where(
            Invitation.id_invitation == invitation_id,
            Invitation.fk_userid_user == current_user.id_user,
            Invitation.is_accepted == False,
            Invitation.is_declined == False,
        )
    )
    invitation = result.scalar_one_or_none()

    if invitation is None:
        raise HTTPException(status_code=404, detail="Invitation not found")

    membership_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.fk_projectid_project == invitation.fk_projectid_project,
            ProjectMember.fk_userid_user == current_user.id_user,
        )
    )
    if membership_result.scalar_one_or_none() is not None:
        invitation.is_accepted = True
        db.add(invitation)
        await db.commit()
        return {"status": "ok", "id_invitation": invitation.id_invitation}

    role_result = await db.execute(
        select(Role).where(Role.fk_projectid_project == invitation.fk_projectid_project)
    )
    role = role_result.scalars().first()
    if role is None:
        role = Role(visibility=1, fk_projectid_project=invitation.fk_projectid_project)
        db.add(role)
        await db.flush()

    membership = ProjectMember(
        role="Member",
        is_owner=False,
        fk_userid_user=current_user.id_user,
        fk_projectid_project=invitation.fk_projectid_project,
        fk_roleid_role=role.id_role,
    )
    db.add(membership)

    invitation.is_accepted = True
    db.add(invitation)
    await db.commit()

    return {"status": "ok", "id_invitation": invitation.id_invitation}


@router.patch("/{invitation_id}/decline")
async def decline_invitation(
    invitation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Invitation).where(
            Invitation.id_invitation == invitation_id,
            Invitation.fk_userid_user == current_user.id_user,
            Invitation.is_accepted == False,
            Invitation.is_declined == False,
        )
    )
    invitation = result.scalar_one_or_none()

    if invitation is None:
        raise HTTPException(status_code=404, detail="Invitation not found")

    invitation.is_declined = True
    db.add(invitation)
    await db.commit()

    return {"status": "ok", "id_invitation": invitation.id_invitation}
