"""Make sprint retrospective FK nullable

Revision ID: 7e020e2e39fe
Revises: fc00c8264aa4
Create Date: 2026-03-20 17:19:24.422926

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7e020e2e39fe'
down_revision: Union[str, Sequence[str], None] = 'fc00c8264aa4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.alter_column(
        'sprint',
        'fk_retrospectiveid_retrospective',
        existing_type=sa.Integer(),
        nullable=True
    )

def downgrade():
    op.alter_column(
        'sprint',
        'fk_retrospectiveid_retrospective',
        existing_type=sa.Integer(),
        nullable=False
    )
