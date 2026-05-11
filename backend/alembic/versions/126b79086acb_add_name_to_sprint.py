"""add_name_to_sprint

Revision ID: 126b79086acb
Revises: f1ff86b9cd46
Create Date: 2026-05-11 14:16:55.438972

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '126b79086acb'
down_revision: Union[str, Sequence[str], None] = 'f1ff86b9cd46'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sprint', sa.Column('name', sa.String(), nullable=True, server_default='New Sprint'))
    op.execute("UPDATE sprint SET name = 'New Sprint' WHERE name IS NULL")

def downgrade() -> None:
    op.drop_column('sprint', 'name')