from sqlalchemy import Column, Integer, DateTime, ForeignKey
from app.db.base import Base

class Sprint(Base):
    __tablename__ = "sprint"

    id_sprint = Column(Integer, primary_key=True, index=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)

    fk_teamid_team = Column(
        Integer,
        ForeignKey("team.id_team"),
        nullable=False
    )
