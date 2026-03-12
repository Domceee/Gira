"""remove unique constraint from task

Revision ID: 27c2d5a96f1f
Revises: bb2dea7b4a78
Create Date: 2026-03-12 18:20:07.116125

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '27c2d5a96f1f'
down_revision: Union[str, Sequence[str], None] = 'bb2dea7b4a78'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


from alembic import op

def upgrade():
    op.drop_constraint(
        "task_fk_role_enumid_role_enum_key",
        "task",
        type_="unique"
    )

def downgrade():
    op.create_unique_constraint(
        "task_fk_role_enumid_role_enum_key",
        "task",
        ["fk_role_enumid_role_enum"]
    )

