from sqlalchemy import Boolean, ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class ProjectMember(Base):
    __tablename__ = "project_member"

    id_project_member: Mapped[int] = mapped_column(primary_key=True, index=True)
    role: Mapped[str | None] = mapped_column(String, nullable=True)

    fk_userid_user: Mapped[int] = mapped_column(
        ForeignKey("users.id_user"),
        nullable=False,
    )
    fk_projectid_project: Mapped[int] = mapped_column(
        ForeignKey("project.id_project"),
        nullable=False,
    )
    fk_roleid_role: Mapped[int] = mapped_column(
        ForeignKey("role.id_role"),
        nullable=False,
    )

    is_owner: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
        default=False,
    )