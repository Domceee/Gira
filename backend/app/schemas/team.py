from pydantic import BaseModel


class TeamCreate(BaseModel):
    name: str


class TeamRead(BaseModel):
    id_team: int
    name: str | None = None
    can_delete: bool = True
    delete_block_reason: str | None = None


class TeamMembersAddRequest(BaseModel):
    user_ids: list[int]
