from pydantic import BaseModel

class PasswordResetRequest(BaseModel):
    email: str

class ResetPasswordPayload(BaseModel):
    token: str
    new_password: str