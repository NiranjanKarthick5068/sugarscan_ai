import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NutritionData(BaseModel):
    calories: Optional[float] = None
    carbs_g: Optional[float] = None
    protein_g: Optional[float] = None
    fat_g: Optional[float] = None
    sugar_g: Optional[float] = None
    fiber_g: Optional[float] = None


class GlycemicData(BaseModel):
    glycemic_index: Optional[float] = None
    glycemic_load: Optional[float] = None
    estimated_spike_mg_dl: Optional[float] = None
    diabetes_safety_score: Optional[int] = None


class AlternativeItem(BaseModel):
    name: str
    reason: str


class ScanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    image_url: Optional[str] = None
    food_name: Optional[str] = None
    food_category: Optional[str] = None
    ingredients: Optional[list] = []
    estimated_weight_g: Optional[float] = None
    serving_size: Optional[str] = None
    nutrition_data: Optional[NutritionData] = None
    glycemic_data: Optional[GlycemicData] = None
    risk_level: Optional[str] = None
    recommendations: Optional[list] = []
    alternatives: Optional[list] = []
    confidence_score: Optional[float] = None
    processing_status: str = "completed"
    is_estimate_fallback: bool = False
    is_user_corrected: bool = False
    processing_time_ms: Optional[int] = None
    scanned_at: datetime


class ScanCorrectionRequest(BaseModel):
    food_name: Optional[str] = None
    ingredients: Optional[list[str]] = None
    estimated_weight_g: Optional[float] = None
    nutrition_data: Optional[NutritionData] = None
    meal_type: Optional[str] = None


class ManualScanRequest(BaseModel):
    text: str


class ScanListResponse(BaseModel):
    scans: list[ScanResponse]
    total: int
    page: int
    per_page: int


class ScanStats(BaseModel):
    total_scans: int
    high_risk_meals: int
    safe_rate: float
    avg_safety_score: float
