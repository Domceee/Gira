"""add project invitations

Revision ID: d4e5f6a7b8c9
Revises: a2c3d4e5f6b7
Create Date: 2026-04-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "a2c3d4e5f6b7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "invitation",
        sa.Column("id_invitation", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("fk_userid_user", sa.Integer(), nullable=False),
        sa.Column("fk_projectid_project", sa.Integer(), nullable=False),
        sa.Column("invited_by_user_id", sa.Integer(), nullable=False),
        sa.Column("is_accepted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_declined", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["fk_userid_user"], ["users.id_user"]),
        sa.ForeignKeyConstraint(["fk_projectid_project"], ["project.id_project"]),
        sa.ForeignKeyConstraint(["invited_by_user_id"], ["users.id_user"]),
    )


def downgrade() -> None:
    op.drop_table("invitation")
