from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional

class MedicationCreate(BaseModel):
    medication_name: str
    dosage: str
    medication_type: str
    taken_at: Optional[datetime] = None
    notes: Optional[str] = None

class MedicationResponse(BaseModel):
    id: UUID
    user_id: UUID
    medication_name: str
    dosage: str
    medication_type: str
    taken_at: datetime
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
