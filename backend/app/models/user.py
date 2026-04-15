from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Integer, String
from app.db.base_class import Base
from sqlalchemy import LargeBinary

class User(Base):
    __tablename__ = "users"

    id_user: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    country: Mapped[str] = mapped_column(String, nullable=False, default="")
    city: Mapped[str] = mapped_column(String, nullable=False, default="")
    password: Mapped[str | None] = mapped_column(String, nullable=True)
    picture: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    google_sub: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    auth_provider: Mapped[str] = mapped_column(String, nullable=False, default="local")