import base64

from pydantic import BaseModel, EmailStr, Field, ConfigDict, validator

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
    picture: str | None = None

    @validator("picture", pre=True)
    def encode_picture(cls, v):
        if v is None:
            return None
        if isinstance(v, bytes):
            return base64.b64encode(v).decode()
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    
class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    country: str | None = None
    city: str | None = None
    picture: str | None = None