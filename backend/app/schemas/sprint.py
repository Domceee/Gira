from pydantic import BaseModel
from datetime import datetime
from typing import List
from app.models.sprint_status import SprintStatus
from app.schemas.task import TaskRead

class SprintCreate(BaseModel):
    team_id: int
    start_date: datetime
    end_date: datetime
    name: str | None = "New Sprint"

class SprintRead(BaseModel):
    id_sprint: int
    start_date: datetime
    end_date: datetime
    status: SprintStatus
    tasks: List[TaskRead]
    name: str | None = "New Sprint"
    class Config:
        orm_mode = True


class BurndownPoint(BaseModel):
    label: str
    date: datetime
    ideal_remaining_points: float
    actual_remaining_points: float
    scope_points: float
    completed_points: float


class SprintStatsRead(BaseModel):
    id_sprint: int
    team_id: int
    start_date: datetime
    end_date: datetime
    status: SprintStatus
    committed_tasks: int
    committed_story_points: float
    completed_tasks: int
    completed_story_points: float
    remaining_tasks: int
    remaining_story_points: float
    rolled_over_tasks: int
    rolled_over_story_points: float
    sprint_length_days: int
    elapsed_days: int
    remaining_days: int
    planned_points_per_day: float
    completion_rate: float
    burndown_points: List[BurndownPoint]
