import uuid
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    avatar_url: Optional[str] = None
    is_verified: bool
    is_active: bool
    created_at: datetime


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = None


class HealthProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    diabetes_type: Optional[str] = None
    diagnosis_date: Optional[date] = None
    target_glucose_min: Optional[float] = None
    target_glucose_max: Optional[float] = None
    hba1c_latest: Optional[float] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    age: Optional[int] = None
    allergies: Optional[list] = None
    dietary_restrictions: Optional[list] = None
    activity_level: Optional[str] = None
    medications: Optional[list] = None
    created_at: datetime
    updated_at: datetime


class HealthProfileUpsertRequest(BaseModel):
    diabetes_type: Optional[str] = None
    diagnosis_date: Optional[date] = None
    target_glucose_min: Optional[float] = None
    target_glucose_max: Optional[float] = None
    hba1c_latest: Optional[float] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    age: Optional[int] = None
    allergies: Optional[list] = None
    dietary_restrictions: Optional[list] = None
    activity_level: Optional[str] = None
    medications: Optional[list] = None
