import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from app.core.dependencies import get_current_active_user
from app.schemas.glucose import GlucoseLogRequest, GlucoseLogResponse, GlucoseTrendsResponse, GlucoseStreamRequest
from app.routers.live import manager
from app.main import limiter
from app.services.supabase_service import insert_glucose_reading, list_glucose_readings, delete_glucose_reading

router = APIRouter(prefix="/glucose", tags=["Glucose"])

@router.post("/", response_model=GlucoseLogResponse)
@limiter.limit("5/minute")
async def log_glucose(
    request: Request,
    data: GlucoseLogRequest,
    current_user = Depends(get_current_active_user),
):
    measured = data.measured_at or datetime.now(timezone.utc)
    
    # Map measurement_type to context if needed
    context_val = getattr(data, "measurement_type", None)
    if not context_val:
        context_val = "random"

    reading_data = {
        "user_id": str(current_user.id),
        "glucose_value_mg_dl": data.glucose_value_mg_dl,
        "measured_at": measured.isoformat(),
        "context": context_val,
        "notes": data.notes,
        "source": "manual",
    }
    
    try:
        log = await insert_glucose_reading(reading_data)
    except Exception as e:
        import logging
        logging.exception("Failed to insert glucose reading")
        raise HTTPException(status_code=502, detail=f"Failed to save reading to database: {e}")
    
    # Generate safety alert
    alert = None
    if log["glucose_value_mg_dl"] < 70:
        alert = "CRITICAL: Hypoglycemia detected. Consume 15g of fast-acting carbs immediately and retest in 15 mins."
    elif log["glucose_value_mg_dl"] > 250:
        alert = "WARNING: Severe hyperglycemia detected. Monitor for ketones and consult your care plan."
    
    # Calculate severity for instant UI update
    severity = "normal"
    if log["glucose_value_mg_dl"] < 70 or log["glucose_value_mg_dl"] > 250:
        severity = "critical"
    elif log["glucose_value_mg_dl"] > 180:
        severity = "warning"
        
    response_data = log.copy()
    response_data["safety_alert"] = alert
    response_data["severity"] = severity
    # Add legacy fields to match response model if needed
    response_data["measurement_type"] = log.get("context")
    
    # Broadcast to live WS
    import asyncio
    asyncio.create_task(manager.broadcast_to_user(current_user.id, {"type": "glucose", "data": response_data}))
    
    return response_data


@router.post("/stream")
async def stream_glucose(
    data: GlucoseStreamRequest,
    current_user = Depends(get_current_active_user),
):
    reading_data = {
        "user_id": str(current_user.id),
        "glucose_value_mg_dl": data.glucose_value_mg_dl,
        "source": data.source,
        "measured_at": datetime.now(timezone.utc).isoformat(),
        "context": "random"
    }
    try:
        log = await insert_glucose_reading(reading_data)
    except Exception as e:
        import logging
        logging.exception("Failed to insert streamed glucose reading")
        raise HTTPException(status_code=502, detail=f"Failed to save reading to database: {e}")
    
    # Calculate severity
    severity = "normal"
    if log["glucose_value_mg_dl"] < 70 or log["glucose_value_mg_dl"] > 250:
        severity = "critical"
    elif log["glucose_value_mg_dl"] > 180:
        severity = "warning"
        
    # Broadcast to live WS
    import asyncio
    asyncio.create_task(manager.broadcast_to_user(current_user.id, {
        "type": "glucose_reading", 
        "data": {
            "glucose_value_mg_dl": log["glucose_value_mg_dl"], 
            "source": log.get("source"), 
            "measured_at": log["measured_at"],
            "severity": severity
        }
    }))
    return {"status": "ok"}


@router.get("/trends", response_model=GlucoseTrendsResponse)
async def get_trends(
    days: int = Query(7, ge=1, le=90),
    current_user = Depends(get_current_active_user),
):
    readings = await list_glucose_readings(str(current_user.id), days=days)

    values = [r["glucose_value_mg_dl"] for r in readings if r.get("glucose_value_mg_dl") is not None]
    target_min, target_max = 70.0, 140.0
    avg = round(sum(values) / len(values), 1) if values else None
    min_val = min(values) if values else None
    max_val = max(values) if values else None
    in_range = sum(1 for v in values if target_min <= v <= target_max)
    tir = round((in_range / len(values)) * 100, 1) if values else None

    # Adapt schema fields
    for r in readings:
        r["measurement_type"] = r.get("context")

    return GlucoseTrendsResponse(
        readings=readings,
        avg=avg,
        min_val=min_val,
        max_val=max_val,
        tir=tir,
        count=len(readings),
    )


@router.get("/", response_model=list[GlucoseLogResponse])
async def list_glucose(
    days: int = Query(7, ge=1, le=365),
    limit: int = Query(100, ge=1, le=500),
    current_user = Depends(get_current_active_user),
):
    readings = await list_glucose_readings(str(current_user.id), days=days)
    readings = readings[:limit]
    for r in readings:
        r["measurement_type"] = r.get("context")
    return readings


@router.delete("/{log_id}")
async def delete_glucose_log_endpoint(
    log_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
):
    await delete_glucose_reading(str(log_id), str(current_user.id))
    return {"success": True}
