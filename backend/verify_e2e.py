import asyncio
import os
import httpx
from supabase import create_client

from app.config import settings

async def main():
    # 1. Sign in or sign up a test user using Supabase
    sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    # Try to sign in a dummy user
    email = "test_agent@example.com"
    password = "testpassword123"
    
    try:
        # First sign up
        res = sb.auth.admin.create_user({"email": email, "password": password, "email_confirm": True})
        print("Created test user")
    except Exception as e:
        print("User might exist:", e)
        
    res = sb.auth.sign_in_with_password({"email": email, "password": password})
    access_token = res.session.access_token
    user_id = res.user.id
    print(f"Logged in as {user_id}")
    
    base_url = "http://localhost:8000/api/v1"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        # 1. Scan a meal (simulate by uploading a dummy image)
        print("\n--- Testing Scan Meal ---")
        dummy_img = b"fake image content"
        files = {"image": ("test.jpg", dummy_img, "image/jpeg")}
        resp = await client.post(f"{base_url}/scans/", headers=headers, files=files)
        print("Upload Scan:", resp.status_code)
        scan = resp.json()
        scan_id = scan.get("id")
        print("Scan Data:", scan)
        
        # Verify in Supabase
        db_scan = sb.table("meal_scans").select("*").eq("id", scan_id).execute()
        print("Supabase row exists:", len(db_scan.data) > 0)
        
        # 2. Log Meal
        print("\n--- Testing Log Meal ---")
        resp = await client.patch(f"{base_url}/scans/{scan_id}/correct", headers=headers, json={"meal_type": "lunch"})
        print("Log Meal (Patch):", resp.status_code)
        
        db_scan = sb.table("meal_scans").select("meal_type").eq("id", scan_id).execute()
        print("Supabase row updated:", db_scan.data[0].get("meal_type") == "lunch")
        
        # 3. Check Dashboard
        print("\n--- Testing Dashboard ---")
        resp = await client.get(f"{base_url}/dashboard/", headers=headers)
        print("Dashboard Status:", resp.status_code)
        dash_data = resp.json()
        print("Dashboard Scans:", len(dash_data.get("scans", {})))
        
        # 4. Chat Message
        print("\n--- Testing Chat Message ---")
        resp = await client.post(f"{base_url}/chat/message", headers=headers, json={"content": "Hello AI"})
        print("Chat Status:", resp.status_code)
        # It's an SSE stream, we can read lines
        async with client.stream("POST", f"{base_url}/chat/message", headers=headers, json={"content": "Hello AI"}) as response:
            async for line in response.aiter_lines():
                if line:
                    print("Stream chunk:", line)
                    
        # 5. Discard Scan
        print("\n--- Testing Discard Scan ---")
        resp = await client.delete(f"{base_url}/scans/{scan_id}", headers=headers)
        print("Discard Status:", resp.status_code)
        
        db_scan = sb.table("meal_scans").select("*").eq("id", scan_id).execute()
        print("Supabase row removed:", len(db_scan.data) == 0)

if __name__ == "__main__":
    asyncio.run(main())
