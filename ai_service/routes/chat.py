# ─────────────────────────────────────────────
#  ai_service/routes/chat.py
#  POST /chat — Streaming SSE chat endpoint
# ─────────────────────────────────────────────

from fastapi import APIRouter, HTTPException, Header, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import jwt
from config import settings

from chains.query_chain import run_query_chain
from middleware.input_validator import validate_chat_message, validate_context

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None


def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("")
async def chat_stream(request: ChatRequest, user: dict = Depends(verify_token)):
    """
    POST /chat
    Accepts a user message and frontend context, then streams
    back the LLM response as Server-Sent Events (SSE).
    """
    # 1. Input validation & sanitisation
    message = validate_chat_message(request.message)
    context = validate_context(request.context)

    ctx = context or {}
    selected_entity_id = ctx.get("selectedEntityId")
    sensor_data = ctx.get("sensorData")

    async def event_generator():
        try:
            async for token in run_query_chain(
                message=message,
                selected_entity_id=selected_entity_id,
                sensor_data=sensor_data,
            ):
                # Ensure newlines in tokens are properly handled for SSE format
                # The frontend expects "data: <token>\n\n"
                # Since tokens might contain newlines, we replace them or just yield raw token chunks properly.
                # Actually, yielding "data: {token}\n\n" where token can have \n breaks SSE.
                # A safer way: replace \n with something, or send tokens as JSON, or simply split tokens by line.
                # But looking at frontend: it just concatenates line.slice(6).
                # So if we send multiline, we should send them as multiple "data: ..." lines.
                lines = token.split("\n")
                for i, line in enumerate(lines):
                    if i > 0:
                        yield "data: \n\n" # This represents a newline character in the frontend reconstruction
                    yield f"data: {line}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            print(f"[chat] streaming error: {e}")
            yield f"data: [Error: {str(e)}]\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )