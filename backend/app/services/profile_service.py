from typing import Any, Dict
from app.services.supabase_service import get_supabase

async def upsert_health_profile(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    sb = get_supabase()
    
    # 1. user_profiles fields
    up_data = {}
    for key in ["age", "diabetes_type"]:
        if key in data:
            up_data[key] = data.pop(key)
            
    if up_data:
        # User profiles uses 'id' as the primary key matching auth.users
        up_res = sb.table("user_profiles").select("id").eq("id", user_id).execute()
        if up_res.data:
            sb.table("user_profiles").update(up_data).eq("id", user_id).execute()
        else:
            up_data["id"] = user_id
            sb.table("user_profiles").insert(up_data).execute()

    # 2. profiles fields
    p_data = {}
    for key in ["target_glucose_min", "target_glucose_max", "diagnosis_date"]:
        if key in data:
            # map diagnosis_date -> diagnosis_year if needed, but we'll try direct
            p_data[key] = data.pop(key)
            
    if p_data:
        p_res = sb.table("profiles").select("id").eq("id", user_id).execute()
        if p_res.data:
            sb.table("profiles").update(p_data).eq("id", user_id).execute()
        else:
            p_data["id"] = user_id
            sb.table("profiles").insert(p_data).execute()

    # 3. health_profiles fields (whatever is left)
    if data:
        result = sb.table("health_profiles").select("id").eq("user_id", user_id).execute()
        if result.data:
            sb.table("health_profiles").update(data).eq("user_id", user_id).execute()
        else:
            data["user_id"] = user_id
            sb.table("health_profiles").insert(data).execute()
            
    from app.services.supabase_service import get_health_profile
    return await get_health_profile(user_id)

async def update_user_profile(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    sb = get_supabase()
    res = sb.table("profiles").update(data).eq("id", user_id).execute()
    if res.data:
        return res.data[0]
    raise RuntimeError(f"Failed to update profile: {res}")
