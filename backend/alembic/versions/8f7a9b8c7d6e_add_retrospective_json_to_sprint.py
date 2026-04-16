"""Add retrospective JSON and finished flag to sprint

Revision ID: 8f7a9b8c7d6e
Revises: 7e020e2e39fe
Create Date: 2026-04-16 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f7a9b8c7d6e'
down_revision: Union[str, Sequence[str], None] = '4c212645b2f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column('sprint', sa.Column('retrospective_data', sa.Text(), nullable=True))
    op.add_column('sprint', sa.Column('is_retrospective_finished', sa.Boolean(), nullable=False, server_default='0'))
    op.execute("UPDATE sprint SET retrospective_data = NULL;")
    op.execute("UPDATE sprint SET is_retrospective_finished = '0';")
def downgrade():
    op.drop_column('sprint', 'is_retrospective_finished')
    op.drop_column('sprint', 'retrospective_data')
