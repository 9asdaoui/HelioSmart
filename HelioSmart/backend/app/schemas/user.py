from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Literal
from datetime import datetime


# ---------- Register / Create ----------

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: Literal["vendor", "user"] = "user"
    company_name: Optional[str] = None  # relevant for vendors

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


# ---------- Login ----------

class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ---------- Token responses ----------

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    role: str


# ---------- User profile response ----------

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    company_name: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
