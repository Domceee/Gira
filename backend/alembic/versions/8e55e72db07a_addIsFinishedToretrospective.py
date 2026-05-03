"""empty message

Revision ID: 8e55e72db07a
Revises: 5430173ecf08
Create Date: 2026-04-27 20:25:43.170500

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8e55e72db07a'
down_revision: Union[str, Sequence[str], None] = '5430173ecf08'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "retrospective",
        sa.Column("is_finished", sa.Boolean(), server_default=sa.text("false"), nullable=False)
    )
    
def downgrade() -> None:
    op.drop_column("retrospective", "is_finished")
