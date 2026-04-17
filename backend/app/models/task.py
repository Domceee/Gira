from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text,Boolean
from sqlalchemy.orm import relationship

from app.db.base_class import Base
from app.models.task_workflow_status import TaskWorkflowStatus

class Task(Base):
    __tablename__ = "task"

    id_task = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    story_points = Column(Float, nullable=True)
    acceptance_criteria_description = Column(Text, nullable=True)
    risk = Column(Integer, nullable=True)
    priority = Column(Integer, nullable=True)
    multiple_assignees = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )




    # Legacy role enum link; latest migration allows this to be null.
    fk_role_enumid_role_enum = Column(
        Integer,
        ForeignKey("role_enum.id_role_enum"),
        nullable=True
    )

    fk_projectid_project = Column(
        Integer,
        ForeignKey("project.id_project"),
        nullable=False
    )

    # OPTIONAL foreign keys (NULL allowed)
    fk_teamid_team = Column(
        Integer,
        ForeignKey("team.id_team"),
        nullable=True
    )

    fk_sprintid_sprint = Column(
        Integer,
        ForeignKey("sprint.id_sprint"),
        nullable=True
    )

    workflow_status = Column(
        String,
        nullable=False,
        default=TaskWorkflowStatus.TODO.value,
        server_default=TaskWorkflowStatus.TODO.value,
    )

    completed_at = Column(
        DateTime,
        nullable=True,
    )

    board_order = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    fk_team_memberid_team_member = Column(
        Integer,
        ForeignKey("team_member.id_team_member"),
        nullable=True
    )
    assignees = relationship(
        "TaskAssignee",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    @property
    def multi_assignees(self):
        return [a.fk_team_memberid_team_member for a in self.assignees]