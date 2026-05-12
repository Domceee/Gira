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
    fk_team_memberid_team_member: int | None = None
    assignee_user_id: int | None = None
    assignee_name: str | None = None

    multiplePeople: bool
    assignees: list[int]

class BoardMemberRead(BaseModel):
    team_member_id: int
    user_id: int
    name: str


class SprintBoardRead(BaseModel):
    sprint_id: int
    sprint_name: str
    team_id: int
    team_name: str | None = None
    start_date: datetime
    end_date: datetime
    members: list[BoardMemberRead]
    tasks: list[BoardTaskRead]


class ProjectBoardRead(BaseModel):
    project_id: int
    use_swimlane_board: bool = True
    boards: list[SprintBoardRead]
