"""add picture column to users

Revision ID: 4c212645b2f6
Revises: 4e5f6a7b8c9d
Create Date: 2026-04-13 22:07:32.122227

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c212645b2f6'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("picture", sa.LargeBinary(), nullable=True)
    )
    op.execute("UPDATE users SET picture = NULL;")

def downgrade():
    op.drop_column("users", "picture")