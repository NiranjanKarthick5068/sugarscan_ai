from dotenv import load_dotenv
load_dotenv("backend/.env")
from app.services.supabase_service import get_supabase
try:
    sb = get_supabase()
    user = sb.auth.get_user("fake_token")
    print(user)
except Exception as e:
    print("Error:", type(e), str(e))
