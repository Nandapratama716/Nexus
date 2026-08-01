"""
Chat Router
SSE streaming endpoint powered by the RAG pipeline (ChromaDB + Ollama).
Protected by JWT authentication from Go Core Service.
"""

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.core.security import verify_jwt
from app.schemas.chat import ChatRequest
from app.services.chat_service import generate_rag_stream

router = APIRouter(prefix="/api/v1/ai", tags=["chat"])


@router.post("/chat")
async def chat_endpoint(
    request: ChatRequest,
    user_claims: dict = Depends(verify_jwt),
):
    """
    SSE streaming chat endpoint.
    Protected: Requires valid Bearer JWT in Authorization header.

    Returns a text/event-stream response where each token is pushed as:
        data: <token>

    Terminates with:
        data: [DONE]
    """
    return StreamingResponse(
        generate_rag_stream(request.message),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable Nginx buffering in production
        },
    )
