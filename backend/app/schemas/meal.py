import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class MealCreateRequest(BaseModel):
    scan_id: Optional[uuid.UUID] = None
    meal_type: str = "snack"
    consumed_at: Optional[datetime] = None
    total_calories: Optional[float] = None
    total_carbs_g: Optional[float] = None
    total_protein_g: Optional[float] = None
    total_fat_g: Optional[float] = None
    notes: Optional[str] = None


class MealResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    scan_id: Optional[uuid.UUID] = None
    meal_type: str
    consumed_at: datetime
    total_calories: Optional[float] = None
    total_carbs_g: Optional[float] = None
    total_protein_g: Optional[float] = None
    total_fat_g: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
