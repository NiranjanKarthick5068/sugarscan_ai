import asyncio
from app.services.llm_service import stream_chat, CHAT_SYSTEM_PROMPT

async def test():
    context_msg = "User's data from the last 24 hours:\nRecent Meals Logged: None\nRecent Glucose: No recent data\n"
    history = [{"role": "system", "content": f"{CHAT_SYSTEM_PROMPT}\n\n{context_msg}"}, {"role": "user", "content": "hello"}]
    async for chunk in stream_chat(history):
        print(f"CHUNK: {repr(chunk)}")

if __name__ == "__main__":
    asyncio.run(test())
