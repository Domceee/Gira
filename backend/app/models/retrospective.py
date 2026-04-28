from sqlalchemy import Column, Integer, Text, Boolean
from app.db.base_class import Base

class Retrospective(Base):
    __tablename__ = "retrospective"

    id_retrospective = Column(Integer, primary_key=True, index=True, autoincrement=True)

    text = Column(Text, nullable=True)  # JSON stored as string
    is_finished = Column(Boolean, nullable=False, default=False)
