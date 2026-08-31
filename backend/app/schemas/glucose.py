import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class GlucoseLogRequest(BaseModel):
    glucose_value_mg_dl: float = Field(gt=20, lt=600)
    measured_at: Optional[datetime] = None
    measurement_type: str = "random"
    scan_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None

class GlucoseStreamRequest(BaseModel):
    glucose_value_mg_dl: float = Field(gt=20, lt=600)
    source: str = "cgm"

class GlucoseLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    scan_id: Optional[uuid.UUID] = None
    glucose_value_mg_dl: float
    measured_at: datetime
    measurement_type: str
    source: str
    notes: Optional[str] = None
    safety_alert: Optional[str] = None
    created_at: Optional[datetime] = None


class GlucoseTrendsResponse(BaseModel):
    readings: list[GlucoseLogResponse]
    avg: Optional[float] = None
    min_val: Optional[float] = None
    max_val: Optional[float] = None
    tir: Optional[float] = None  # Time in range percentage
    count: int
