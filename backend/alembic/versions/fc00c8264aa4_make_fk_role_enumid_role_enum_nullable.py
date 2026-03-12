"""make fk_role_enumid_role_enum nullable

Revision ID: fc00c8264aa4
Revises: 27c2d5a96f1f
Create Date: 2026-03-12 18:23:56.242448

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fc00c8264aa4'
down_revision: Union[str, Sequence[str], None] = '27c2d5a96f1f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.alter_column(
        "task",
        "fk_role_enumid_role_enum",
        existing_type=sa.Integer(),
        nullable=True
    )

def downgrade():
    op.alter_column(
        "task",
        "fk_role_enumid_role_enum",
        existing_type=sa.Integer(),
        nullable=False
    )

