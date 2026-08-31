"""Pydantic schemas for User & Auth — mirrors frontend/types/index.ts User."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict, Field


class UserRegister(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    preferred_language: str = "English"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: EmailStr
    profile_image: str
    preferred_language: str
    persona: str | None = None
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
