from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_active_user
from app.services.dashboard_service import get_dashboard_data
from app.schemas.scan import ScanResponse
from app.schemas.glucose import GlucoseLogResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/")
async def get_dashboard(
    current_user = Depends(get_current_active_user),
):
    data = await get_dashboard_data(current_user.id)

    # In Supabase, the data comes back as dicts directly, not ORM models.
    recent_scans = data["recent_scans"]
    recent_glucose = data["recent_glucose"]

    return {
        "health_score": data["health_score"],
        "glucose": data["glucose"],
        "scans": data["scans"],
        "recent_scans": recent_scans,
        "recent_glucose": recent_glucose,
    }
