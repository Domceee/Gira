from pydantic import BaseModel, EmailStr, Field

class ProjectMembersAddRequest(BaseModel):
    user_ids: list[int] = Field(default_factory=list)
    emails: list[EmailStr] = Field(default_factory=list)
