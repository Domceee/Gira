from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String

from app.db.base_class import Base


class SprintTaskEvent(Base):
    __tablename__ = "sprint_task_event"

    id_sprint_task_event = Column(Integer, primary_key=True, index=True)
    fk_taskid_task = Column(Integer, ForeignKey("task.id_task"), nullable=False, index=True)
    fk_sprintid_sprint = Column(Integer, ForeignKey("sprint.id_sprint"), nullable=False, index=True)
    event_type = Column(String, nullable=False)
    story_points = Column(Float, nullable=False, default=0.0, server_default="0")
    occurred_at = Column(DateTime, nullable=False, default=datetime.utcnow)
