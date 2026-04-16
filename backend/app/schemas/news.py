from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NewsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_news: int
    fk_userid_user: int
    news_type: str
    title: str
    message: str
    fk_projectid_project: int | None = None
    fk_teamid_team: int | None = None
    fk_taskid_task: int | None = None
    fk_sprintid_sprint: int | None = None
    is_read: bool
    created_at: datetime
