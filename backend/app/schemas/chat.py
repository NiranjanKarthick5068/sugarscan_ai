import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ChatMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    session_id: Optional[uuid.UUID] = None
    is_voice: Optional[bool] = False


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    sent_at: str


class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    message_count: int
    last_message_at: Optional[datetime] = None
    messages: list = []
    created_at: datetime
