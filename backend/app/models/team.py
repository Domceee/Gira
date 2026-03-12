from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.base import Base

class Team(Base):
    __tablename__ = "team"

    id_team = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)

    fk_projectid_project = Column(
        Integer,
        ForeignKey("project.id_project"),
        nullable=False
    )
