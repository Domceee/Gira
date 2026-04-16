"""add news notifications

Revision ID: a2c3d4e5f6b7
Revises: 4e5f6a7b8c9d
Create Date: 2026-04-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a2c3d4e5f6b7"
down_revision: Union[str, Sequence[str], None] = "4e5f6a7b8c9d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "news",
        sa.Column("id_news", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("fk_userid_user", sa.Integer(), nullable=False),
        sa.Column("news_type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("fk_projectid_project", sa.Integer(), nullable=True),
        sa.Column("fk_teamid_team", sa.Integer(), nullable=True),
        sa.Column("fk_taskid_task", sa.Integer(), nullable=True),
        sa.Column("fk_sprintid_sprint", sa.Integer(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["fk_userid_user"], ["users.id_user"]),
        sa.ForeignKeyConstraint(["fk_projectid_project"], ["project.id_project"]),
        sa.ForeignKeyConstraint(["fk_teamid_team"], ["team.id_team"]),
        sa.ForeignKeyConstraint(["fk_taskid_task"], ["task.id_task"]),
        sa.ForeignKeyConstraint(["fk_sprintid_sprint"], ["sprint.id_sprint"]),
    )


def downgrade() -> None:
    op.drop_table("news")
