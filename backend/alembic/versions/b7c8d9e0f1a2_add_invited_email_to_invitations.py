"""add invited email to invitations

Revision ID: b7c8d9e0f1a2
Revises: f1a2b3c4d5e6
Create Date: 2026-04-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("invitation", sa.Column("invited_email", sa.String(), nullable=True))
    op.create_index("ix_invitation_invited_email", "invitation", ["invited_email"], unique=False)

    op.execute(
        """
        UPDATE invitation AS invitation_row
        SET invited_email = LOWER(users.email)
        FROM users
        WHERE invitation_row.fk_userid_user = users.id_user
          AND invitation_row.invited_email IS NULL
        """
    )

    op.alter_column(
        "invitation",
        "fk_userid_user",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE invitation AS invitation_row
        SET fk_userid_user = users.id_user
        FROM users
        WHERE invitation_row.fk_userid_user IS NULL
          AND LOWER(users.email) = LOWER(invitation_row.invited_email)
        """
    )
    op.execute("DELETE FROM invitation WHERE fk_userid_user IS NULL")

    op.alter_column(
        "invitation",
        "fk_userid_user",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.drop_index("ix_invitation_invited_email", table_name="invitation")
    op.drop_column("invitation", "invited_email")
