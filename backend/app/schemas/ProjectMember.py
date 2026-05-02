from pydantic import BaseModel, EmailStr, Field


class ProjectMembersAddRequest(BaseModel):
    user_ids: list[int] = Field(default_factory=list)
    emails: list[EmailStr] = Field(default_factory=list)


class ProjectMemberRead(BaseModel):
    id_user: int
    name: str | None
    email: str
    is_owner: bool
