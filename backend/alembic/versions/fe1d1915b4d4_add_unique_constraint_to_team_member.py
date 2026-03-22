"""add unique constraint to team_member

Revision ID: fe1d1915b4d4
Revises: abc123
Create Date: 2026-03-22 16:31:32.866377

"""
from typing import Sequence, Union
from alembic import op

revision: str = "fe1d1915b4d4"
down_revision: Union[str, Sequence[str], None] = "abc123"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_team_member_team_user",
        "team_member",
        ["fk_teamid_team", "fk_userid_user"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_team_member_team_user", "team_member", type_="unique")
