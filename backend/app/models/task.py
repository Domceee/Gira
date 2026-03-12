from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float
from app.db.base import Base

class Task(Base):
    __tablename__ = "task"

    id_task = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    story_points = Column(Float, nullable=True)
    acceptance_criteria_description = Column(Text, nullable=True)
    risk = Column(Integer, nullable=True)
    priority = Column(Integer, nullable=True)

    # REQUIRED foreign keys
    fk_role_enumid_role_enum = Column(
        Integer,
        ForeignKey("role_enum.id_role_enum"),
        nullable=False
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

    #fk_sprintid_sprint = Column(
    #    Integer,
    #    ForeignKey("sprint.id_sprint"),
    #    nullable=True
    #)

    #fk_team_memberid_team_member = Column(
    #    Integer,
    #    ForeignKey("team_member.id_team_member"),
    #    nullable=True
    #)
