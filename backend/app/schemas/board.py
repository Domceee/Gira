from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.task_workflow_status import TaskWorkflowStatus


class BoardTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_task: int
    name: str | None = None
    description: str | None = None
    story_points: float | None = None
    risk: int | None = None
    priority: int | None = None
    fk_teamid_team: int | None = None
    fk_sprintid_sprint: int | None = None
    workflow_status: TaskWorkflowStatus
    board_order: int


class SprintBoardRead(BaseModel):
    sprint_id: int
    team_id: int
    team_name: str | None = None
    start_date: datetime
    end_date: datetime
    tasks: list[BoardTaskRead]


class ProjectBoardRead(BaseModel):
    project_id: int
    boards: list[SprintBoardRead]
