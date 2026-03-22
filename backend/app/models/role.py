from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Role(Base):
    __tablename__ = "role"

    id_role: Mapped[int] = mapped_column(primary_key=True, index=True)
    visibility: Mapped[int | None] = mapped_column(Integer, nullable=True)

    fk_projectid_project: Mapped[int] = mapped_column(
        ForeignKey("project.id_project"),
        nullable=False,
    )