from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_active_user
from app.services.dashboard_service import get_dashboard_data
from app.services import prediction_service

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/score")
async def get_health_score(
    current_user = Depends(get_current_active_user),
):
    """Returns a comprehensive health score with component breakdown."""
    data = await get_dashboard_data(current_user.id)
    glucose = data["glucose"]
    scans = data["scans"]

    tir = glucose.get("tir") or 0.0
    avg_safety = scans.get("avg_safety_score") or 0.0

    glucose_control_score = min(100, tir)
    diet_quality_score = min(100, avg_safety)
    activity_score = 60.0  # Placeholder — would come from wearable integration
    medication_score = 80.0  # Placeholder

    overall = round(
        glucose_control_score * 0.4
        + diet_quality_score * 0.3
        + activity_score * 0.2
        + medication_score * 0.1,
        1,
    )

    # Get all glucose readings for the user
    from app.services.supabase_service import get_supabase
    client = get_supabase()
    res = client.table("glucose_readings").select("glucose_value_mg_dl,measured_at").eq("user_id", str(current_user.id)).order("measured_at", desc=True).execute()
    
    # 1. Fetch Badges
    badges_res = client.table("user_achievements").select("*", count="exact").eq("user_id", str(current_user.id)).execute()
    badges_count = badges_res.count if badges_res.count is not None else 0
    
    # 2. Compute Streak (Naive: 1 scan today = 1 day streak)
    streak = 0
    if scans.get("total_scans", 0) > 0:
        streak = 1 # Simple fallback logic for now; you'd query actual consecutive days
        
    return {
        "score": overall,
        "summary": data["health_score"]["summary"],
        "streak": streak,
        "badges_count": badges_count,
        "breakdown": {
            "glucose_control": glucose_control_score,
            "diet_quality": diet_quality_score,
            "activity": activity_score,
            "medication_adherence": medication_score,
        },
    }


@router.get("/status-summary")
async def get_status_summary(
    current_user = Depends(get_current_active_user),
):
    """Returns a fast, lightweight status summary for UI initial state."""
    from app.services.supabase_service import list_glucose_readings
    
    # Just get the single most recent reading overall
    readings = await list_glucose_readings(str(current_user.id), days=7)

    latest_val = None
    last_updated = None
    if readings:
        latest = readings[0]
        latest_val = latest.get("glucose_value_mg_dl")
        last_updated = latest.get("measured_at")

    severity = "normal"
    if latest_val is not None:
        if latest_val < 70 or latest_val > 250:
            severity = "critical"
        elif latest_val > 180:
            severity = "warning"

    return {
        "severity": severity,
        "last_updated": last_updated
    }


@router.get("/insights")
async def get_health_insights(
    current_user = Depends(get_current_active_user),
):
    """Returns AI-generated health insights based on recent data."""
    data = await get_dashboard_data(current_user.id)
    glucose = data["glucose"]
    scans = data["scans"]

    insights = []
    predictions = []

    tir = glucose.get("tir")
    avg_glucose = glucose.get("avg")

    if tir is not None:
        if tir >= 80:
            insights.append({
                "type": "positive",
                "title": "Excellent Time in Range",
                "body": f"Your glucose was in target range {tir:.0f}% of the time this week. Outstanding control!",
            })
        elif tir >= 60:
            insights.append({
                "type": "warning",
                "title": "Time in Range",
                "body": f"Your glucose was in range {tir:.0f}% of the time. Aim for above 70% for better outcomes.",
            })
        else:
            insights.append({
                "type": "action",
                "title": "Improve Time in Range",
                "body": f"Only {tir:.0f}% time in range. Consider reviewing your meal plan with your dietitian.",
            })

    if avg_glucose is not None:
        if avg_glucose > 180:
            insights.append({
                "type": "warning",
                "title": "Elevated Average Glucose",
                "body": f"Average glucose of {avg_glucose} mg/dL is above target. Monitor closely.",
            })

    if scans["high_risk_meals"] > 0:
        insights.append({
            "type": "action",
            "title": "High-Risk Foods Detected",
            "body": f"You consumed {scans['high_risk_meals']} high-risk meal(s) this week. Check alternatives.",
        })

    if not insights:
        insights.append({
            "type": "info",
            "title": "Start Tracking",
            "body": "Scan your meals and log glucose readings to get personalized insights.",
        })

    # Add RAG source info if available on the most recent scan
    rag_sources = []
    if data.get("recent_scans") and len(data["recent_scans"]) > 0:
        latest_scan = data["recent_scans"][0]
        if latest_scan.get("rag_sources"):
            rag_sources = latest_scan["rag_sources"]

    from app.services.llm_service import generate_ai_twin_predictions
    predictions = await generate_ai_twin_predictions(data)

    # Enrich with real personal model status
    model_data = prediction_service.load_model(str(current_user.id))
    if model_data and model_data.get("trained"):
        predictions.insert(0, {
            "text": f"Your personal prediction model is active, trained on {model_data['samples']} meal records.",
            "risk": "low",
            "source": "personal_model",
        })
    else:
        predictions.insert(0, {
            "text": "Log more meals and glucose readings to enable personalised glucose spike predictions.",
            "risk": "low",
            "source": "formula_fallback",
        })

    return {"insights": insights, "predictions": predictions, "rag_sources": rag_sources}


@router.post("/predict-meal")
async def predict_meal_spike(
    meal: dict,
    current_user = Depends(get_current_active_user),
):
    """
    Predict the blood glucose spike for a given meal based on user's personal model.
    
    Input body example:
    {
      "nutrition_data": {"carbs_g": 45, "sugar_g": 5, "fat_g": 8, "fiber_g": 3, "protein_g": 12, "calories": 280},
      "glycemic_data": {"glycemic_index": 65, "glycemic_load": 29}
    }
    """
    from app.services.supabase_service import get_health_profile
    hp = await get_health_profile(str(current_user.id))
    diabetes_type = (hp or {}).get("diabetes_type", "type2") or "type2"

    predicted_spike = prediction_service.predict_spike(
        str(current_user.id), meal, diabetes_type
    )
    model_data = prediction_service.load_model(str(current_user.id))
    trained = bool(model_data and model_data.get("trained"))
    samples = model_data.get("samples", 0) if model_data else 0

    return {
        "predicted_spike_mg_dl": predicted_spike,
        "model_type": "personal_ridge_regression" if trained else "formula_fallback",
        "samples_used_for_training": samples,
        "trained": trained,
    }


@router.post("/train-personal-model")
async def train_personal_model(
    current_user = Depends(get_current_active_user),
):
    """
    Manually trigger retraining of the user's personal glucose spike prediction model.
    Requires at least 10 paired meal scans + glucose readings.
    """
    result = await prediction_service.train_model(str(current_user.id))
    return result


@router.get("/rag-status")
async def rag_status(
    current_user = Depends(get_current_active_user),
):
    """Returns the current status of the RAG vector store."""
    try:
        from app.services.rag_service import collection_count
        from app.config import settings
        nutr_count = collection_count(settings.RAG_COLLECTION_NUTRITION)
        guide_count = collection_count(settings.RAG_COLLECTION_GUIDELINES)
        return {
            "nutrition_facts_indexed": nutr_count,
            "diabetes_guidelines_indexed": guide_count,
            "rag_ready": nutr_count > 0 and guide_count > 0,
        }
    except Exception as e:
        return {"error": str(e), "rag_ready": False}
