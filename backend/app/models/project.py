from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class Project(Base):
    __tablename__ = "project"

    id_project: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    use_swimlane_board: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")
