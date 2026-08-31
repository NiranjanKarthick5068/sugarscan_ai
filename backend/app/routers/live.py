import uuid
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.schemas.user import UserResponse
from app.core.dependencies import get_ws_user
import asyncio

router = APIRouter(prefix="/ws", tags=["Live"])

class ConnectionManager:
    def __init__(self):
        # user_id -> list of active connections
        self.active_connections: Dict[uuid.UUID, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: uuid.UUID):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: uuid.UUID):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def broadcast_to_user(self, user_id: uuid.UUID, message: dict):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

manager = ConnectionManager()

@router.websocket("/live/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    user_id: uuid.UUID,
    current_user: UserResponse = Depends(get_ws_user)
):
    if not current_user or current_user.id != user_id:
        return # already closed by dependency or auth failed

    await manager.connect(websocket, user_id)
    try:
        while True:
            # We don't expect messages from client, but we need to keep connection open
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
