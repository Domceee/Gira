from sqlalchemy import Column, Integer, DateTime, ForeignKey, String, Text, Boolean
from app.db.base_class import Base
from app.models.sprint_status import SprintStatus

class Sprint(Base):
    __tablename__ = "sprint"

    id_sprint = Column(Integer, primary_key=True, index=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    status = Column(
        String,
        nullable=False,
        default=SprintStatus.PLANNED.value,
        server_default=SprintStatus.PLANNED.value,
    )

    fk_teamid_team = Column(
        Integer,
        ForeignKey("team.id_team"),
        nullable=False
    )

    retrospective_data = Column(
        Text,
        nullable=True,
        default=None,
    )

    is_retrospective_finished = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )
