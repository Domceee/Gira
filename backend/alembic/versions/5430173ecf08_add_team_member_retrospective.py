"""empty message

Revision ID: 5430173ecf08
Revises: b7c8d9e0f1a2
Create Date: 2026-04-27 20:09:48.106598

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5430173ecf08'
down_revision: Union[str, Sequence[str], None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        "team_member_retrospective",
        sa.Column("id_retrospective", sa.Integer(), primary_key=True, index=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("id_sprint", sa.Integer(), sa.ForeignKey("sprint.id_sprint"), nullable=False),
        sa.Column("fk_teamMember", sa.Integer(), sa.ForeignKey("team_member.id_team_member"), nullable=True),
    )

def downgrade() -> None:
    op.drop_table("team_member_retrospective")

    