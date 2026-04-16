from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class Invitation(Base):
    __tablename__ = "invitation"

    id_invitation: Mapped[int] = mapped_column(primary_key=True, index=True)
    fk_userid_user: Mapped[int] = mapped_column(
        ForeignKey("users.id_user"),
        nullable=False,
    )
    fk_projectid_project: Mapped[int] = mapped_column(
        ForeignKey("project.id_project"),
        nullable=False,
    )
    invited_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id_user"),
        nullable=False,
    )
    is_accepted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
        default=False,
    )
    is_declined: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
        default=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )
