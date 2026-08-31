import uuid
from datetime import datetime, timezone
from app.services.supabase_service import (
    get_chat_session,
    insert_chat_session,
    insert_chat_message,
    list_chat_messages,
    get_supabase
)

async def get_or_create_session(
    user_id: uuid.UUID,
    session_id: uuid.UUID | None,
) -> dict:
    """Get existing session or create a new one."""
    if session_id:
        session = await get_chat_session(str(session_id), str(user_id))
        if session:
            return session

    # Create new session
    session = await insert_chat_session({
        "id": str(session_id) if session_id else str(uuid.uuid4()),
        "user_id": str(user_id),
        "title": "New Chat",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return session

async def append_message(
    session: dict,
    role: str,
    content: str,
    msg_id: str | None = None,
) -> dict:
    """Append a message to the session."""
    message = {
        "id": msg_id or str(uuid.uuid4()),
        "session_id": session["id"],
        "user_id": session["user_id"],
        "role": role,
        "content": content,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await insert_chat_message(message)

    # If first user message, update title
    if role == "user":
        # Check if the session title is still "New Chat"
        if session.get("title") == "New Chat":
            title = content[:50].strip()
            if len(content) > 50:
                title += "..."
            sb = get_supabase()
            sb.table("chat_sessions").update({"title": title}).eq("id", session["id"]).execute()
            session["title"] = title

    return message
