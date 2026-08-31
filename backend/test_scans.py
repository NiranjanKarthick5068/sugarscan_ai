import asyncio
from httpx import AsyncClient
from app.main import app
from app.core.dependencies import get_current_active_user
import uuid

class MockUser:
    id = uuid.UUID("79503db2-4110-48b6-9b63-0e9a2d09e096")

async def override_get_user():
    return MockUser()

app.dependency_overrides[get_current_active_user] = override_get_user

async def run():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/scans/?page=1&per_page=100")
        print("STATUS:", response.status_code)
        print("BODY:", response.json())

if __name__ == "__main__":
    asyncio.run(run())
