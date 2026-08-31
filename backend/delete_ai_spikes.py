import asyncio
from app.services.supabase_service import supabase

async def run():
    res = supabase.table('glucose_readings').delete().like('notes', 'AI Predicted spike%').execute()
    print("Deleted rows:", len(res.data))

asyncio.run(run())
