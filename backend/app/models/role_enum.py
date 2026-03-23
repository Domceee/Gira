from sqlalchemy import Column, Integer, String
from app.db.base_class import Base

class RoleEnum(Base):
    __tablename__ = "role_enum"

    id_role_enum = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
