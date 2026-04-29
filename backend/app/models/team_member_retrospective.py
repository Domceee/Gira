from sqlalchemy import Column, Integer, Text, ForeignKey
from app.db.base_class import Base

class TeamMemberRetrospective(Base):
    __tablename__ = "teamMember_retrospective"

    id_retrospective = Column(Integer, primary_key=True, index=True, autoincrement=True)
    description = Column(Text, nullable=True)

    id_sprint = Column(Integer, ForeignKey("sprint.id_sprint"), nullable=False)
    fk_teamMember = Column(Integer, ForeignKey("team_member.id_team_member"), nullable=False)
