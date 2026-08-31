"""
backend/app/services/supabase_service.py

Thin wrapper around the Supabase REST API using the service-role key.
The service-role key bypasses RLS — only used server-side.

Install: pip install supabase
"""
from typing import Any, Dict, Optional
from supabase import create_client, Client, ClientOptions
from app.config import settings
from contextvars import ContextVar

_client: Optional[Client] = None
request_token: ContextVar[str] = ContextVar("request_token", default="")


def get_supabase() -> Client:
    """Return a Supabase client. If a request_token is set, returns an authenticated client."""
    token = request_token.get()
    
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in backend/.env"
        )
        
    if not token:
        global _client
        if _client is None:
            _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        return _client
        
    options = ClientOptions(headers={"Authorization": f"Bearer {token}"})
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY, options=options)


def get_supabase_admin() -> Client:
    """Return a pure Supabase admin client using only the service-role key."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in backend/.env"
        )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


# ── Meal Scans ─────────────────────────────────────────────────────────────────

async def insert_meal_scan(data: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a completed scan into the meal_scans table and return the row."""
    sb = get_supabase()
    result = sb.table("meal_scans").insert(data).execute()
    if result.data:
        return result.data[0]
    raise RuntimeError(f"Failed to insert meal_scan: {result}")


async def update_meal_scan(scan_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    sb = get_supabase()
    result = sb.table("meal_scans").update(data).eq("id", scan_id).execute()
    if result.data:
        return result.data[0]
    raise RuntimeError(f"Failed to update meal_scan {scan_id}: {result}")


async def get_meal_scan(scan_id: str) -> Optional[Dict[str, Any]]:
    sb = get_supabase()
    result = sb.table("meal_scans").select("*").eq("id", scan_id).execute()
    return result.data[0] if result.data else None


async def list_meal_scans(user_id: str, limit: int = 20, offset: int = 0) -> list:
    sb = get_supabase()
    result = (
        sb.table("meal_scans")
        .select("*")
        .eq("user_id", user_id)
        .order("scanned_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data or []


async def delete_meal_scan(scan_id: str, user_id: str) -> None:
    sb = get_supabase()
    sb.table("meal_scans").delete().eq("id", scan_id).eq("user_id", user_id).execute()


# ── Glucose Readings ────────────────────────────────────────────────────────────

async def insert_glucose_reading(data: Dict[str, Any]) -> Dict[str, Any]:
    sb = get_supabase()
    result = sb.table("glucose_readings").insert(data).execute()
    if result.data:
        return result.data[0]
    raise RuntimeError(f"Failed to insert glucose_reading: {result}")


async def list_glucose_readings(user_id: str, days: int = 7) -> list:
    from datetime import datetime, timezone, timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    sb = get_supabase()
    result = (
        sb.table("glucose_readings")
        .select("*")
        .eq("user_id", user_id)
        .gte("measured_at", cutoff)
        .order("measured_at", desc=True)
        .execute()
    )
    return result.data or []


# ── Health Profiles ─────────────────────────────────────────────────────────────

async def get_health_profile(user_id: str) -> Optional[Dict[str, Any]]:
    sb = get_supabase()
    
    # Fetch from all three profile-related tables
    hp_res = sb.table("health_profiles").select("*").eq("user_id", user_id).execute()
    up_res = sb.table("user_profiles").select("*").eq("id", user_id).execute()
    p_res = sb.table("profiles").select("*").eq("id", user_id).execute()
    
    hp_data = hp_res.data[0] if hp_res.data else {}
    up_data = up_res.data[0] if up_res.data else {}
    p_data = p_res.data[0] if p_res.data else {}
    
    if not hp_data and not up_data and not p_data:
        return None
        
    # Merge them all into a single dictionary satisfying the Pydantic schema
    merged = {**p_data, **up_data, **hp_data}
    merged["user_id"] = user_id
    # Ensure 'id' is present (Pydantic model requires it)
    merged["id"] = hp_data.get("id") or up_data.get("id") or p_data.get("id") or user_id
    return merged

# ── Chat Sessions ───────────────────────────────────────────────────────────────

async def insert_chat_session(data: Dict[str, Any]) -> Dict[str, Any]:
    sb = get_supabase()
    result = sb.table("chat_sessions").insert(data).execute()
    if result.data:
        return result.data[0]
    raise RuntimeError(f"Failed to insert chat_session: {result}")

async def get_chat_session(session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    sb = get_supabase()
    result = sb.table("chat_sessions").select("*").eq("id", session_id).eq("user_id", user_id).execute()
    return result.data[0] if result.data else None

async def list_chat_sessions(user_id: str) -> list:
    sb = get_supabase()
    result = sb.table("chat_sessions").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return result.data or []

async def delete_chat_session(session_id: str, user_id: str) -> None:
    sb = get_supabase()
    sb.table("chat_sessions").delete().eq("id", session_id).eq("user_id", user_id).execute()

# ── Chat Messages ───────────────────────────────────────────────────────────────

async def insert_chat_message(data: Dict[str, Any]) -> Dict[str, Any]:
    sb = get_supabase()
    result = sb.table("chat_messages").insert(data).execute()
    if result.data:
        return result.data[0]
    raise RuntimeError(f"Failed to insert chat_message: {result}")

async def list_chat_messages(session_id: str, user_id: str) -> list:
    sb = get_supabase()
    result = sb.table("chat_messages").select("*").eq("session_id", session_id).eq("user_id", user_id).order("created_at", desc=False).execute()
    return result.data or []

# ── Medications ─────────────────────────────────────────────────────────────────

async def list_medications(user_id: str) -> list:
    sb = get_supabase()
    result = sb.table("medications").select("*").eq("user_id", user_id).execute()
    return result.data or []

async def insert_medication(data: Dict[str, Any]) -> Dict[str, Any]:
    sb = get_supabase()
    result = sb.table("medications").insert(data).execute()
    if result.data:
        return result.data[0]
    raise RuntimeError(f"Failed to insert medication: {result}")

async def update_medication(med_id: str, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    sb = get_supabase()
    result = sb.table("medications").update(data).eq("id", med_id).eq("user_id", user_id).execute()
    if result.data:
        return result.data[0]
    raise RuntimeError(f"Failed to update medication: {result}")

async def delete_medication(med_id: str, user_id: str) -> None:
    sb = get_supabase()
    sb.table("medications").delete().eq("id", med_id).eq("user_id", user_id).execute()

# ── Activity Logs ───────────────────────────────────────────────────────────────

async def insert_activity_log(data: Dict[str, Any]) -> Dict[str, Any]:
    sb = get_supabase()
    result = sb.table("activity_logs").insert(data).execute()
    if result.data:
        return result.data[0]
    raise RuntimeError(f"Failed to insert activity log: {result}")

async def list_activity_logs(user_id: str, limit: int = 50) -> list:
    sb = get_supabase()
    result = sb.table("activity_logs").select("*").eq("user_id", user_id).order("logged_at", desc=True).limit(limit).execute()
    return result.data or []


async def delete_glucose_reading(log_id: str, user_id: str) -> None:
    sb = get_supabase()
    sb.table("glucose_readings").delete().eq("id", log_id).eq("user_id", user_id).execute()

# ── Storage ─────────────────────────────────────────────────────────────────────

async def upload_meal_scan_image(user_id: str, path: str, content: bytes, content_type: str = "image/jpeg") -> str:
    """Uploads bytes to the private 'meal-scans' bucket at {user_id}/{path}. Returns the storage path."""
    sb = get_supabase()
    full_path = f"{user_id}/{path}"
    sb.storage.from_("meal-scans").upload(
        full_path, content, {"content-type": content_type, "upsert": "true"}
    )
    return full_path

async def get_meal_scan_signed_url(storage_path: str, expires_in: int = 3600) -> str:
    """Returns a signed URL for a private meal-scans object, valid for `expires_in` seconds."""
    sb = get_supabase()
    result = sb.storage.from_("meal-scans").create_signed_url(storage_path, expires_in)
    # Different versions of supabase-py might return different formats
    if isinstance(result, dict):
        return result.get("signedURL") or result.get("signed_url") or result.get("data", {}).get("signedUrl") or ""
    return getattr(result, "signed_url", str(result))

async def delete_meal_scan_image(storage_path: str) -> None:
    sb = get_supabase()
    try:
        sb.storage.from_("meal-scans").remove([storage_path])
    except Exception:
        pass  # ignore if already gone
