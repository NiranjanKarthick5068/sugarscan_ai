import asyncio
from dotenv import load_dotenv
load_dotenv("backend/.env")
from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'"))
        await conn.execute(text("ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0"))
        await conn.execute(text("ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ"))
        print("Chat sessions migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
