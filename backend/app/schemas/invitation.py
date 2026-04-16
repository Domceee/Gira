from datetime import datetime

from pydantic import BaseModel, ConfigDict


class InvitationRead(BaseModel):
    model_config = ConfigDict()

    id_invitation: int
    fk_projectid_project: int
    project_name: str
    invited_by_name: str | None = None
    created_at: datetime
