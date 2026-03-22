"""add is_owner to project_member

Revision ID: abc123
Revises: 5f5b15d7ca7c
Create Date: 2026-03-22 14:09:51.517616

"""
from typing import Sequence, Union

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "abc123"
down_revision: Union[str, Sequence[str], None] = "5f5b15d7ca7c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "project_member",
        sa.Column(
            "is_owner",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false")
        )
    )


def downgrade() -> None:
    op.drop_column("project_member", "is_owner")