from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

class TaskAssignee(Base):
    __tablename__ = "task_assignees"

    id_task_assignee: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    fk_taskid_task: Mapped[int] = mapped_column(
        ForeignKey("task.id_task", ondelete="CASCADE"),
        nullable=False,
    )

    fk_team_memberid_team_member: Mapped[int] = mapped_column(
        ForeignKey("team_member.id_team_member", ondelete="CASCADE"),
        nullable=False,
    )

    # ⭐ THIS IS THE MISSING PIECE
    task = relationship(
        "Task",
        back_populates="assignees"
    )
