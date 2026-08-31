import uuid
import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from app.core.dependencies import get_current_active_user
from app.schemas.chat import ChatMessageRequest, ChatSessionResponse
from app.services import llm_service, chat_service
from app.services.speech_service import transcribe_audio

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    current_user = Depends(get_current_active_user),
):
    text = await transcribe_audio(file)
    return {"text": text}


@router.post("/message")
async def send_message(
    data: ChatMessageRequest,
    current_user = Depends(get_current_active_user),
):
    """Stream AI response via SSE."""
    # Collect full AI response to save
    full_response: list[str] = []

    async def sse_generator():
        # Ensure headers are sent immediately by yielding a connection start
        yield f"data: {json.dumps({'status': 'connected'})}\n\n"
        try:
            session = await chat_service.get_or_create_session(current_user.id, data.session_id)
            
            # Send session_id so client can reference it
            session_id_str = str(session["id"])
            yield f"data: {json.dumps({'session_id': session_id_str})}\n\n"

            # Append user message
            user_msg = await chat_service.append_message(session, "user", data.content)

            # Fetch recent user context
            from app.services.supabase_service import list_meal_scans, list_glucose_readings, list_chat_messages
            # list_meal_scans fetches by scanned_at desc, we can just get the top 10
            recent_scans = await list_meal_scans(str(current_user.id), limit=10)
            
            # list_glucose_readings fetches by measured_at desc, top 10
            recent_glucose = await list_glucose_readings(str(current_user.id), days=1)
            
            context_msg = "User's data from the last 24 hours:\n"
            if recent_scans:
                context_msg += "Recent Meals Logged:\n"
                for s in recent_scans:
                    cal = s.get("nutrition_data", {}).get('calories', '?') if s.get("nutrition_data") else '?'
                    context_msg += f"- {s.get('food_name') or 'Unknown'} ({cal} kcal), Risk: {s.get('risk_level')}\n"
            else:
                context_msg += "Recent Meals Logged: None\n"
                
            if recent_glucose:
                avg_g = round(sum(g.get("glucose_value_mg_dl", 0) for g in recent_glucose) / len(recent_glucose), 1)
                context_msg += f"Recent Glucose Avg: {avg_g} mg/dL (over {len(recent_glucose)} readings)\n"
            else:
                context_msg += "Recent Glucose: No recent data\n"

            # Build message history for LLM
            history = [{"role": "system", "content": f"{llm_service.CHAT_SYSTEM_PROMPT}\n\n{context_msg}"}]
            
            messages = await list_chat_messages(str(session["id"]), str(current_user.id))
            for m in messages:
                if m.get("role") in ("user", "assistant"):
                    history.append({"role": m["role"], "content": m.get("content")})

            # RAG: retrieve relevant diabetes guidelines for this user's question
            rag_context = ""
            if not data.is_voice:
                try:
                    from app.services.rag_service import retrieve
                    from app.config import settings as cfg
                    guide_chunks = retrieve(data.content, cfg.RAG_COLLECTION_GUIDELINES, k=4)
                    nutr_chunks = retrieve(data.content, cfg.RAG_COLLECTION_NUTRITION, k=2)
                    all_chunks = guide_chunks + nutr_chunks
                    if all_chunks:
                        rag_context = "\n".join(f"- {c}" for c in all_chunks)
                except Exception as rag_err:
                    pass  # Non-fatal, proceed without RAG

            async for token in llm_service.stream_chat(history, is_voice=data.is_voice, rag_context=rag_context):
                full_response.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"

            complete = "".join(full_response)
            await chat_service.append_message(session, "assistant", complete)
            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            # ALWAYS terminate the stream with something the client can act on
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/sessions", response_model=list[ChatSessionResponse])
async def list_sessions(
    current_user = Depends(get_current_active_user),
):
    from app.services.supabase_service import list_chat_sessions
    sessions = await list_chat_sessions(str(current_user.id))
    return sessions


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_session(
    session_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
):
    from app.services.supabase_service import get_chat_session
    session = await get_chat_session(str(session_id), str(current_user.id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/sessions/{session_id}")
async def delete_session(
    current_user = Depends(get_current_active_user),
):
    from app.services.supabase_service import get_chat_session, delete_chat_session
    session = await get_chat_session(str(session_id), str(current_user.id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await delete_chat_session(str(session_id), str(current_user.id))
    return {"success": True}
