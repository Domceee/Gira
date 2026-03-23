from pydantic import BaseModel

class TaskCreate(BaseModel):
    name: str
    description: str | None = None
    story_points: float | None = None
    risk: int | None = None
    priority: int | None = None
    fk_projectid_project: int

class TaskRead(BaseModel):
    id_task: int
    name: str
    description: str | None
    story_points: float | None
    risk: int | None
    priority: int | None
    fk_teamid_team: int | None
    fk_sprintid_sprint: int | None

    class Config:
        orm_mode = True
