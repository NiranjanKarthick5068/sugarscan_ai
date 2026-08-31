import asyncio
from app.services.supabase_service import insert_glucose_reading
async def main():
    try:
        log = await insert_glucose_reading({
            "user_id": "7598b09e-9e0b-45c6-903e-dbe4befdef1a",
            "glucose_value_mg_dl": 120,
            "measured_at": "2026-08-16T12:00:00Z",
            "context": "random",
            "source": "manual",
        })
        print(log)
    except Exception as e:
        print("ERROR:", e)
asyncio.run(main())
