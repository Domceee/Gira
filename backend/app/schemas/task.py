from pydantic import BaseModel
from app.models.task_workflow_status import TaskWorkflowStatus

class TaskCreate(BaseModel):
    name: str
    description: str | None = None
    story_points: float | None = None
    risk: int | None = None
    priority: int | None = None
    fk_projectid_project: int

class TaskUpdate(BaseModel):
    name: str
    description: str | None = None
    story_points: float | None = None
    risk: int | None = None
    priority: int | None = None
    fk_team_memberid_team_member: int | None = None

class TaskRead(BaseModel):
    id_task: int
    name: str
    description: str | None
    story_points: float | None
    risk: int | None
    priority: int | None
    fk_teamid_team: int | None
    fk_sprintid_sprint: int | None
    fk_team_memberid_team_member: int | None
    workflow_status: TaskWorkflowStatus
    board_order: int
    can_delete: bool = True
    delete_block_reason: str | None = None
    model_config = {
        "from_attributes": True 
    }

