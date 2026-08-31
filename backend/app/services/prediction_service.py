"""
backend/app/services/prediction_service.py

Personal glucose spike prediction model per user.
Uses sklearn Ridge regression trained on each user's Supabase scan + glucose history.
Falls back to a calibrated formula when < MIN_SAMPLES data points exist.
Models are pickled to ./models/<user_id>.pkl
"""
import logging
import pickle
import os
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone

import numpy as np

logger = logging.getLogger(__name__)

MIN_SAMPLES = 10  # Minimum combined samples before training real model


def _get_models_dir() -> Path:
    from app.config import settings
    p = Path(settings.MODELS_DIR)
    p.mkdir(parents=True, exist_ok=True)
    return p


def _model_path(user_id: str) -> Path:
    return _get_models_dir() / f"{user_id}.pkl"


def _formula_spike(carbs_g: float, gi: float, fat_g: float = 0, fiber_g: float = 0) -> float:
    """
    Calibrated formula fallback when insufficient training data.
    Accounts for fat (slows absorption) and fiber (reduces spike).
    """
    effective_gi = max(1, gi - (fat_g * 0.5) - (fiber_g * 2))
    gl = (effective_gi * carbs_g) / 100.0
    return round(gl * 2.8, 1)  # empirical multiplier for mg/dL spike


def _nutrition_to_features(nutrition: dict, time_of_day_hour: int = 12, diabetes_type: str = "type2") -> list[float]:
    """Convert a nutrition dict into a feature vector for the model."""
    nd = nutrition.get("nutrition_data", nutrition)
    gd = nutrition.get("glycemic_data", {})

    carbs = float(nd.get("carbs_g", 0) or 0)
    sugar = float(nd.get("sugar_g", 0) or 0)
    fat = float(nd.get("fat_g", 0) or 0)
    fiber = float(nd.get("fiber_g", 0) or 0)
    protein = float(nd.get("protein_g", 0) or 0)
    calories = float(nd.get("calories", 0) or 0)
    gi = float(gd.get("glycemic_index", 55) or 55)
    gl = float(gd.get("glycemic_load", 0) or (gi * carbs / 100.0))

    # Time of day encoding (morning=higher spike due to dawn effect)
    hour_sin = float(np.sin(2 * np.pi * time_of_day_hour / 24))
    hour_cos = float(np.cos(2 * np.pi * time_of_day_hour / 24))

    # Diabetes type encoding
    type_enc = 1.0 if diabetes_type == "type1" else 0.0

    return [carbs, sugar, fat, fiber, protein, calories, gi, gl, hour_sin, hour_cos, type_enc]


def save_model(user_id: str, model_data: dict) -> None:
    path = _model_path(user_id)
    with open(path, "wb") as f:
        pickle.dump(model_data, f)
    logger.info(f"Saved prediction model for user {user_id}")


def load_model(user_id: str) -> Optional[dict]:
    path = _model_path(user_id)
    if not path.exists():
        return None
    try:
        with open(path, "rb") as f:
            return pickle.load(f)
    except Exception as e:
        logger.error(f"Failed to load model for user {user_id}: {e}")
        return None


async def _fetch_training_data(user_id: str) -> tuple[list[list[float]], list[float]]:
    """
    Fetch meal scans and glucose readings from Supabase for a user.
    Pairs each scan with the nearest post-meal glucose reading (1-3h after scan).
    Returns (X_features, y_spikes).
    """
    from app.services.supabase_service import list_meal_scans, list_glucose_readings

    try:
        scans = await list_meal_scans(user_id, limit=200)
        glucose_readings = await list_glucose_readings(user_id, days=90)
    except Exception as e:
        logger.error(f"Failed to fetch training data for {user_id}: {e}")
        return [], []

    if not scans or not glucose_readings:
        return [], []

    # Build glucose timeline for efficient lookup
    glucose_timeline = []
    for g in glucose_readings:
        try:
            ts = datetime.fromisoformat(g["measured_at"].replace("Z", "+00:00"))
            glucose_timeline.append((ts, float(g["glucose_value_mg_dl"])))
        except Exception:
            continue
    glucose_timeline.sort(key=lambda x: x[0])

    X, y = [], []
    for scan in scans:
        try:
            nd = scan.get("nutrition_data") or {}
            gd = scan.get("glycemic_data") or {}
            if not nd:
                continue

            scan_time = datetime.fromisoformat(scan["scanned_at"].replace("Z", "+00:00"))

            # Find glucose readings 60-180 min after the scan
            post_readings = [
                val for (ts, val) in glucose_timeline
                if 60 <= (ts - scan_time).total_seconds() / 60 <= 180
            ]
            if not post_readings:
                continue

            # Find pre-meal glucose (within 30 min before scan)
            pre_readings = [
                val for (ts, val) in glucose_timeline
                if -30 <= (ts - scan_time).total_seconds() / 60 <= 0
            ]
            pre_glucose = pre_readings[-1] if pre_readings else 110.0

            post_glucose = max(post_readings)
            spike = max(0, post_glucose - pre_glucose)

            hour = scan_time.hour
            hp_data = {}  # Could be enriched with health profile
            features = _nutrition_to_features(
                {"nutrition_data": nd, "glycemic_data": gd},
                time_of_day_hour=hour,
            )
            X.append(features)
            y.append(spike)
        except Exception as e:
            logger.debug(f"Skipping scan: {e}")
            continue

    return X, y


async def train_model(user_id: str) -> dict:
    """
    Train a Ridge regression model for the user.
    Saves model to disk and returns training metadata.
    """
    from sklearn.linear_model import Ridge
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline

    X, y = await _fetch_training_data(user_id)

    if len(X) < MIN_SAMPLES:
        logger.info(f"User {user_id} has only {len(X)} paired samples — using formula fallback")
        return {"trained": False, "samples": len(X), "reason": "insufficient_data"}

    try:
        X_arr = np.array(X)
        y_arr = np.array(y)

        pipeline = Pipeline([
            ("scaler", StandardScaler()),
            ("model", Ridge(alpha=1.0)),
        ])
        pipeline.fit(X_arr, y_arr)

        model_data = {
            "pipeline": pipeline,
            "samples": len(X),
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "version": "1.0",
        }
        save_model(user_id, model_data)
        logger.info(f"Trained model for user {user_id} on {len(X)} samples")
        return {"trained": True, "samples": len(X)}
    except Exception as e:
        logger.error(f"Model training failed for {user_id}: {e}")
        return {"trained": False, "error": str(e)}


def predict_spike(user_id: str, nutrition: dict, diabetes_type: str = "type2") -> float:
    """
    Predict the blood glucose spike (mg/dL) for a given meal.
    Uses trained model if available, else falls back to formula.
    """
    nd = nutrition.get("nutrition_data", nutrition)
    gd = nutrition.get("glycemic_data", {})
    carbs = float(nd.get("carbs_g", 0) or 0)
    gi = float(gd.get("glycemic_index", 55) or 55)
    fat = float(nd.get("fat_g", 0) or 0)
    fiber = float(nd.get("fiber_g", 0) or 0)

    # Try personal trained model first
    model_data = load_model(user_id)
    if model_data and model_data.get("trained"):
        try:
            hour = datetime.now(timezone.utc).hour
            features = _nutrition_to_features(nutrition, time_of_day_hour=hour, diabetes_type=diabetes_type)
            X = np.array([features])
            spike = float(model_data["pipeline"].predict(X)[0])
            return round(max(0, spike), 1)
        except Exception as e:
            logger.warning(f"Model prediction failed for {user_id}, using formula: {e}")

    # Formula fallback
    return _formula_spike(carbs, gi, fat, fiber)


async def retrain_all_users() -> dict:
    """
    Background job: retrain prediction models for all users who have data.
    Called every 6h by the scheduler.
    """
    from app.services.supabase_service import get_supabase

    trained, skipped, failed = 0, 0, 0
    try:
        sb = get_supabase()
        result = sb.table("meal_scans").select("user_id").execute()
        user_ids = list({row["user_id"] for row in (result.data or [])})
        logger.info(f"Retraining models for {len(user_ids)} users...")
        for uid in user_ids:
            try:
                result = await train_model(uid)
                if result.get("trained"):
                    trained += 1
                else:
                    skipped += 1
            except Exception as e:
                logger.error(f"Retrain failed for {uid}: {e}")
                failed += 1
    except Exception as e:
        logger.error(f"retrain_all_users outer error: {e}")

    logger.info(f"Retrain complete: {trained} trained, {skipped} skipped, {failed} failed")
    return {"trained": trained, "skipped": skipped, "failed": failed}
