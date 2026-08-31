import asyncio
from app.services.llm_service import stream_chat

async def test():
    messages = [{"role": "user", "content": "Say hello in one sentence."}]
    async for chunk in stream_chat(messages):
        print(f"CHUNK: {repr(chunk)}")

if __name__ == "__main__":
    asyncio.run(test())
