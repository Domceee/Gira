from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base

class Retrospective(Base):
    __tablename__ = "teamMember_retrospective"

    id_retrospective = Column(Integer, primary_key=True, index=True)
    description = Column(Text, nullable=True)
    id_sprint = Column(Integer, ForeignKey("sprint.id_sprint"), nullable=False)
    fk_teamMember = Column(Integer, ForeignKey("team_member.id_team_member"), nullable=True)