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


class BurndownPoint(BaseModel):
    label: str
    date: datetime
    ideal_remaining_points: float


class SprintStatsRead(BaseModel):
    id_sprint: int
    team_id: int
    start_date: datetime
    end_date: datetime
    total_tasks: int
    total_story_points: float
    sprint_length_days: int
    elapsed_days: int
    remaining_days: int
    planned_points_per_day: float
    burndown_points: List[BurndownPoint]
