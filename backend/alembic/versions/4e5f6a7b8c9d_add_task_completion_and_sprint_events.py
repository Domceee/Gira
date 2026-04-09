"""add task completion and sprint events

Revision ID: 4e5f6a7b8c9d
Revises: 3384cb8e2cdb
Create Date: 2026-04-09 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "4e5f6a7b8c9d"
down_revision = "3384cb8e2cdb"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("task", sa.Column("completed_at", sa.DateTime(), nullable=True))

    op.create_table(
        "sprint_task_event",
        sa.Column("id_sprint_task_event", sa.Integer(), nullable=False),
        sa.Column("fk_taskid_task", sa.Integer(), nullable=False),
        sa.Column("fk_sprintid_sprint", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("story_points", sa.Float(), nullable=False, server_default="0"),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["fk_sprintid_sprint"], ["sprint.id_sprint"]),
        sa.ForeignKeyConstraint(["fk_taskid_task"], ["task.id_task"]),
        sa.PrimaryKeyConstraint("id_sprint_task_event"),
    )
    op.create_index(op.f("ix_sprint_task_event_fk_sprintid_sprint"), "sprint_task_event", ["fk_sprintid_sprint"], unique=False)
    op.create_index(op.f("ix_sprint_task_event_fk_taskid_task"), "sprint_task_event", ["fk_taskid_task"], unique=False)
    op.create_index(op.f("ix_sprint_task_event_id_sprint_task_event"), "sprint_task_event", ["id_sprint_task_event"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_sprint_task_event_id_sprint_task_event"), table_name="sprint_task_event")
    op.drop_index(op.f("ix_sprint_task_event_fk_taskid_task"), table_name="sprint_task_event")
    op.drop_index(op.f("ix_sprint_task_event_fk_sprintid_sprint"), table_name="sprint_task_event")
    op.drop_table("sprint_task_event")
    op.drop_column("task", "completed_at")
