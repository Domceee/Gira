from pydantic import BaseModel, ConfigDict

class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    use_swimlane_board: bool = True


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str | None = None
    description: str | None = None
    use_swimlane_board: bool = True
    is_owner: bool = False
    can_delete: bool = True
    delete_block_reason: str | None = None


class StoryPointsByTeamRead(BaseModel):
    label: str
    team_id: int | None = None
    story_points: float


class ProjectStatsRead(BaseModel):
    total_tasks: int
    active_tasks: int
    unassigned_tasks: int
    team_backlog_tasks: int
    in_sprint_tasks: int
    done_tasks: int
    total_story_points: float
    active_story_points: float
    unassigned_story_points: float
    team_backlog_story_points: float
    in_sprint_story_points: float
    done_story_points: float
    story_points_by_team: list[StoryPointsByTeamRead]

class ProjectUpdate(BaseModel):
    name: str
    description: str | None = None
    use_swimlane_board: bool = True
