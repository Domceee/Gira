from pydantic import BaseModel

class ProjectMembersAddRequest(BaseModel):
    user_ids: list[int]