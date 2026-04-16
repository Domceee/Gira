from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, text

from app.db.base_class import Base


class News(Base):
    __tablename__ = "news"

    id_news = Column(Integer, primary_key=True, index=True)
    fk_userid_user = Column(Integer, ForeignKey("users.id_user"), nullable=False)
    news_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    fk_projectid_project = Column(Integer, ForeignKey("project.id_project"), nullable=True)
    fk_teamid_team = Column(Integer, ForeignKey("team.id_team"), nullable=True)
    fk_taskid_task = Column(Integer, ForeignKey("task.id_task"), nullable=True)
    fk_sprintid_sprint = Column(Integer, ForeignKey("sprint.id_sprint"), nullable=True)
    is_read = Column(Boolean, nullable=False, server_default=text("false"), default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("CURRENT_TIMESTAMP"))
