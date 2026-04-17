"""add task_assignees table

Revision ID: 32d82666f491
Revises: 8f7a9b8c7d6e
Create Date: 2026-04-17 01:50:47.412694

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '32d82666f491'
down_revision: Union[str, Sequence[str], None] = '8f7a9b8c7d6e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "task",
        sa.Column("multiple_assignees", sa.Boolean(), nullable=False, server_default='0')
    )
    op.execute("UPDATE task SET multiple_assignees = '0';")

    op.create_table(
        "task_assignees",
        sa.Column("id_task_assignee", sa.Integer(), nullable=False),
        sa.Column("fk_taskid_task", sa.Integer(), nullable=False),
        sa.Column("fk_team_memberid_team_member", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["fk_team_memberid_team_member"], ["team_member.id_team_member"]),
        sa.ForeignKeyConstraint(["fk_taskid_task"], ["task.id_task"]),
        sa.PrimaryKeyConstraint("id_task_assignee"),
    )


def downgrade():
    op.drop_column("task", "multiple_assignees")
    op.drop_table("task_assignees")