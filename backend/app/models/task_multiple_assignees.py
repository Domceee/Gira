from sqlalchemy import Column, ForeignKey, Integer
from app.db.base_class import Base


class task_multiple_assignees(Base):
    __tablename__ = "task_multiple_assignees"

    id_task_multiple_assignees = Column(Integer, primary_key=True, index=True)

    fk_team_memberid_team_member = Column(
        Integer,
        ForeignKey("team_member.id_team_member"),
        nullable=False,
    )

    fk_taskid_task = Column(
        Integer,
        ForeignKey("task.id_task"),
        nullable=False,
    )
