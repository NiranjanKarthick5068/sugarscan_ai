import uuid
from datetime import datetime, timedelta, timezone
from app.services.supabase_service import (
    list_meal_scans,
    list_glucose_readings,
    list_medications,
)

async def get_dashboard_data(user_id: uuid.UUID) -> dict:
    """
    Aggregates dashboard data with efficient async queries using Supabase.
    """
    user_id_str = str(user_id)

    # --- Glucose stats (last 7 days) ---
    merged_glucose = await list_glucose_readings(user_id_str, days=7)

    glucose_values = [g.get("glucose_value_mg_dl") for g in merged_glucose if g.get("glucose_value_mg_dl") is not None]
    target_min = 70.0
    target_max = 140.0

    if glucose_values:
        avg_glucose = round(sum(glucose_values) / len(glucose_values), 1)
        min_glucose = min(glucose_values)
        max_glucose = max(glucose_values)
        in_range = sum(1 for v in glucose_values if target_min <= v <= target_max)
        tir = round((in_range / len(glucose_values)) * 100, 1)
    else:
        avg_glucose = min_glucose = max_glucose = tir = None

    # --- Scan stats ---
    # In Supabase we fetch all for stats. Since we might have many, limit to 1000 for dashboard to be safe.
    all_scans = await list_meal_scans(user_id_str, limit=1000)
    total_scans = len(all_scans)

    safety_scores = []
    high_risk_count = 0
    for s in all_scans:
        if s.get("glycemic_data") and isinstance(s.get("glycemic_data"), dict):
            score = s.get("glycemic_data").get("diabetes_safety_score")
            if score is not None:
                safety_scores.append(float(score))
        if s.get("risk_level") in ("high", "critical"):
            high_risk_count += 1

    avg_safety = round(sum(safety_scores) / len(safety_scores), 1) if safety_scores else 0.0
    safe_rate = round(((total_scans - high_risk_count) / total_scans) * 100, 1) if total_scans > 0 else 100.0

    # --- Medication stats ---
    meds = await list_medications(user_id_str)
    # Basic adherence assumption: 1 log per day is 100% adherence (max 100).
    med_score = min(100.0, (len(meds) / 7.0) * 100) if len(meds) > 0 else 50.0

    # Health score: blend 50% Glucose TIR, 40% Diet Safety, 10% Medication Adherence
    glucose_comp = (tir or 75) * 0.5
    diet_comp = avg_safety * 0.4
    med_comp = med_score * 0.1
    health_score = round(glucose_comp + diet_comp + med_comp, 1)

    # Recent scans (last 5)
    recent_scans = all_scans[:5]
    from app.services.supabase_service import get_meal_scan_signed_url
    for s in recent_scans:
        if s.get("image_path"):
            s["image_url"] = await get_meal_scan_signed_url(s["image_path"])

    # Recent glucose (last 10)
    recent_glucose = merged_glucose[:10]

    return {
        "health_score": {
            "score": min(100, max(0, health_score)),
            "summary": _score_summary(health_score),
        },
        "glucose": {
            "avg": avg_glucose,
            "min": min_glucose,
            "max": max_glucose,
            "tir": tir,
            "readings_count": len(glucose_values),
        },
        "scans": {
            "total_scans": total_scans,
            "high_risk_meals": high_risk_count,
            "safe_rate": safe_rate,
            "avg_safety_score": avg_safety,
        },
        "recent_scans": recent_scans,
        "recent_glucose": recent_glucose,
        "recent_meds": meds[:5],
    }


def _score_summary(score: float) -> str:
    if score >= 85:
        return "Excellent metabolic health! Keep it up."
    elif score >= 70:
        return "Good control. A few areas to watch."
    elif score >= 55:
        return "Moderate. Focus on diet and glucose tracking."
    else:
        return "Needs attention. Please consult your doctor."
