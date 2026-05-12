from sqlalchemy import Column, Integer, DateTime, ForeignKey, String
from app.db.base_class import Base
from app.models.sprint_status import SprintStatus

class Sprint(Base):
    __tablename__ = "sprint"

    id_sprint = Column(Integer, primary_key=True, index=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    name = Column(String, nullable=True, default="New Sprint", server_default="New Sprint")
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

    fk_retrospectiveid_retrospective = Column(
        Integer,
        ForeignKey("retrospective.id_retrospective"),
        nullable=True
    )
    
