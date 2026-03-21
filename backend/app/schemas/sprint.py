from pydantic import BaseModel
from datetime import datetime
from typing import List
from app.schemas.task import TaskRead

class SprintCreate(BaseModel):
    team_id: int
    start_date: datetime
    end_date: datetime

class SprintRead(BaseModel):
    id_sprint: int
    start_date: datetime
    end_date: datetime
    tasks: List[TaskRead]

    class Config:
        orm_mode = True
