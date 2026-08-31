from typing import Optional
import uuid
from fastapi import Depends, HTTPException, status, WebSocket
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import verify_token
from app.schemas.user import UserResponse

bearer_scheme = HTTPBearer(auto_error=False)

from app.services.supabase_service import get_supabase, request_token

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> UserResponse:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Set the token for the current request context so get_supabase() uses it
    request_token.set(credentials.credentials)
    
    try:
        sb = get_supabase()
        user_response = sb.auth.get_user(credentials.credentials)
        if not user_response.user:
            raise Exception("No user found in token")
        user_id = user_response.user.id
        email = user_response.user.email or ""
    except Exception as e:
        print(f"Token verification failed: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    # Supabase tokens are signed securely. We don't need to query public.users.
    # Just construct a dummy User object with the ID so routers can use current_user.id.
    from datetime import datetime, timezone
    user = UserResponse(
        id=uuid.UUID(user_id),
        email=email,
        full_name="",
        role="user",
        is_verified=True,
        is_active=True,
        created_at=datetime.now(timezone.utc)
    )
    return user


async def get_current_active_user(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return current_user


async def optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[UserResponse]:
    if credentials is None:
        return None
        
    request_token.set(credentials.credentials)
    
    try:
        sb = get_supabase()
        user_response = sb.auth.get_user(credentials.credentials)
        if not user_response.user:
            return None
        from datetime import datetime, timezone
        return UserResponse(
            id=uuid.UUID(user_response.user.id),
            email=user_response.user.email or "",
            full_name="",
            role="user",
            is_verified=True,
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
    except Exception:
        return None

async def get_ws_user(
    websocket: WebSocket,
) -> Optional[UserResponse]:
    auth_header = websocket.headers.get("authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        token = websocket.query_params.get("token")
        
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return None
        
    request_token.set(token)
    
    try:
        sb = get_supabase()
        user_response = sb.auth.get_user(token)
        if not user_response.user:
            raise Exception()
        from datetime import datetime, timezone
        return UserResponse(
            id=uuid.UUID(user_response.user.id),
            email=user_response.user.email or "",
            full_name="",
            role="user",
            is_verified=True,
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
    except Exception as e:
        print(f"WS Token verification failed: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return None
