import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.dependencies import get_current_active_user
from app.schemas.medication import MedicationCreate, MedicationResponse
from datetime import datetime, timezone
from app.services.supabase_service import insert_medication, list_medications, delete_medication

router = APIRouter(prefix="/medications", tags=["Medications"])

@router.post("/", response_model=MedicationResponse)
async def log_medication(
    data: MedicationCreate,
    current_user = Depends(get_current_active_user),
):
    """Log a new medication entry."""
    med_data = {
        "user_id": str(current_user.id),
        "name": data.medication_name,
        "dosage": data.dosage,
        "timing": data.medication_type, # mapping type to timing for simplicity
        "notes": data.notes,
        "created_at": (data.taken_at or datetime.now(timezone.utc)).isoformat(),
        "active": True
    }
    try:
        med_log = await insert_medication(med_data)
    except Exception as e:
        import logging
        logging.exception("Failed to insert medication")
        raise HTTPException(status_code=502, detail=f"Failed to save medication: {e}")
        
    # Map back to response format
    med_log["medication_name"] = med_log.get("name")
    med_log["medication_type"] = med_log.get("timing") or "unknown"
    med_log["taken_at"] = med_log.get("created_at")
    
    return med_log

@router.get("/", response_model=List[MedicationResponse])
async def get_medications(
    current_user = Depends(get_current_active_user),
):
    """Retrieve all medication logs for the current user."""
    meds = await list_medications(str(current_user.id))
    
    # Map fields for legacy client schema compatibility
    for m in meds:
        m["medication_name"] = m.get("name")
        m["medication_type"] = m.get("timing") or "unknown"
        m["taken_at"] = m.get("created_at")
        
    return meds

@router.delete("/{med_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medication_endpoint(
    med_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
):
    await delete_medication(str(med_id), str(current_user.id))
    return None
