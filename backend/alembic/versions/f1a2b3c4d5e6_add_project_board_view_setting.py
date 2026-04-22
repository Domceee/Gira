"""add project board view setting

Revision ID: f1a2b3c4d5e6
Revises: 3384cb8e2cdb, 4c212645b2f6
Create Date: 2026-04-22 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = ("3384cb8e2cdb", "4c212645b2f6")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "project",
        sa.Column("use_swimlane_board", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )


def downgrade():
    op.drop_column("project", "use_swimlane_board")
