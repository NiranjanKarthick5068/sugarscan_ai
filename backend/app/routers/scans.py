import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query, Request, status
from app.core.dependencies import get_current_active_user
from app.schemas.scan import ScanResponse, ScanListResponse, ScanCorrectionRequest, ScanStats, ManualScanRequest
from app.services import scan_service
from app.config import settings
from app.routers.live import manager
from app.main import limiter

router = APIRouter(prefix="/scans", tags=["Scans"])

@router.post("/manual", response_model=ScanResponse)
@limiter.limit("5/minute")
async def manual_scan(
    request: Request,
    data: ManualScanRequest,
    current_user = Depends(get_current_active_user),
):
    scan = await scan_service.process_manual_scan(
        user_id=str(current_user.id),
        text=data.text,
    )
    
    import asyncio
    response_data = ScanResponse.model_validate(scan).model_dump()
    asyncio.create_task(manager.broadcast_to_user(current_user.id, {"type": "scan", "data": response_data}))
    
    return scan

@router.post("/", response_model=ScanResponse)
@limiter.limit("5/minute")
async def upload_scan(
    request: Request,
    image: UploadFile = File(...),
    current_user = Depends(get_current_active_user),
):
    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    scan = await scan_service.process_scan(
        user_id=str(current_user.id),
        image_file=image,
    )
    
    from app.services.supabase_service import get_meal_scan_signed_url
    if scan.get("image_path"):
        scan["image_url"] = await get_meal_scan_signed_url(scan["image_path"])

    import asyncio
    response_data = ScanResponse.model_validate(scan).model_dump()
    asyncio.create_task(manager.broadcast_to_user(current_user.id, {"type": "scan", "data": response_data}))
    
    return scan


@router.get("/stats", response_model=ScanStats)
async def get_scan_stats(
    current_user = Depends(get_current_active_user),
):
    from app.services.supabase_service import list_meal_scans
    scans = await list_meal_scans(str(current_user.id), limit=1000)
    total = len(scans)
    high_risk = sum(1 for s in scans if s.get("risk_level") in ("high", "critical"))
    scores = [
        float(s.get("glycemic_data").get("diabetes_safety_score"))
        for s in scans
        if s.get("glycemic_data") and s.get("glycemic_data").get("diabetes_safety_score") is not None
    ]
    safe_rate = round(((total - high_risk) / total) * 100, 1) if total else 100.0
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
    return ScanStats(total_scans=total, high_risk_meals=high_risk, safe_rate=safe_rate, avg_safety_score=avg_score)


@router.get("/", response_model=ScanListResponse)
async def list_scans(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user = Depends(get_current_active_user),
):
    offset = (page - 1) * per_page
    from app.services.supabase_service import list_meal_scans
    # Supabase doesn't easily return count with range in a single simple query via the python client,
    # so we'll fetch the range and just return total=len(scans) for now as a workaround, or 1000.
    scans = await list_meal_scans(str(current_user.id), limit=per_page, offset=offset)

    from app.services.supabase_service import get_meal_scan_signed_url
    for s in scans:
        if s.get("image_path"):
            s["image_url"] = await get_meal_scan_signed_url(s["image_path"])

    return ScanListResponse(scans=scans, total=1000, page=page, per_page=per_page)


@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(
    scan_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
):
    from app.services.supabase_service import get_meal_scan
    scan = await get_meal_scan(str(scan_id))
    if not scan or scan.get("user_id") != str(current_user.id):
        raise HTTPException(status_code=404, detail="Scan not found")
        
    from app.services.supabase_service import get_meal_scan_signed_url
    if scan.get("image_path"):
        scan["image_url"] = await get_meal_scan_signed_url(scan["image_path"])
        
    return scan


@router.patch("/{scan_id}/correct", response_model=ScanResponse)
async def correct_scan(
    scan_id: uuid.UUID,
    correction: ScanCorrectionRequest,
    current_user = Depends(get_current_active_user),
):
    from app.services.supabase_service import get_meal_scan
    try:
        scan = await get_meal_scan(str(scan_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    if not scan or scan.get("user_id") != str(current_user.id):
        raise HTTPException(status_code=404, detail="Scan not found")
    updated = await scan_service.apply_correction(str(scan_id), str(current_user.id), correction.model_dump(exclude_none=True))
    return updated


@router.delete("/{scan_id}")
async def delete_scan(
    scan_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
):
    from app.services.supabase_service import get_meal_scan, delete_meal_scan, delete_meal_scan_image
    scan = await get_meal_scan(str(scan_id))
    if not scan or scan.get("user_id") != str(current_user.id):
        raise HTTPException(status_code=404, detail="Scan not found")
    
    if scan.get("image_path"):
        await delete_meal_scan_image(scan["image_path"])
        
    await delete_meal_scan(str(scan_id), str(current_user.id))
    return {"success": True}
