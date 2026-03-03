from pydantic import BaseModel, EmailStr, Field, ConfigDict

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    country: str
    city: str

class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_user: int
    name: str | None = None
    email: EmailStr
    country: str | None = None
    city: str | None = None