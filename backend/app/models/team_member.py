from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class TeamMember(Base):
    __tablename__ = "team_member"

    id_team_member: Mapped[int] = mapped_column(primary_key=True, index=True)
    effectiveness: Mapped[int | None] = mapped_column(Integer, nullable=True)
    role_in_team: Mapped[str | None] = mapped_column(String, nullable=True)

    fk_teamid_team: Mapped[int] = mapped_column(
        ForeignKey("team.id_team"),
        nullable=False,
    )
    fk_userid_user: Mapped[int] = mapped_column(
        ForeignKey("users.id_user"),
        nullable=False,
    )