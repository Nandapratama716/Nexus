"""
Chat Router
SSE streaming endpoint powered by the RAG pipeline (ChromaDB + Ollama).
"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.schemas.chat import ChatRequest
from app.services.chat_service import generate_rag_stream

router = APIRouter(prefix="/api/v1/ai", tags=["chat"])


@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    SSE streaming chat endpoint.

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
