"""Add task → sprint FK

Revision ID: 5f5b15d7ca7c
Revises: 7e020e2e39fe
Create Date: 2026-03-20 17:27:59.176324

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5f5b15d7ca7c'
down_revision: Union[str, Sequence[str], None] = '7e020e2e39fe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Column already exists — only ensure FK exists
    op.create_foreign_key(
        None,
        'task',
        'sprint',
        ['fk_sprintid_sprint'],
        ['id_sprint']
    )

def downgrade():
    op.drop_constraint(None, 'task', type_='foreignkey')
