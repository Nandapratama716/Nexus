import asyncio
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.schemas.chat import ChatRequest

# from app.services.chat_service import ChatService
# from app.core.security import verify_jwt

router = APIRouter(prefix="/api/v1/ai", tags=["chat"])

async def mock_chat_stream(query: str):
    """Mock generator untuk demonstrasi Server-Sent Events (SSE) streaming"""
    tokens = ["Saya ", "adalah ", "AI ", "Assistant. ", "Anda ", "bertanya: ", f"{query}"]
    for token in tokens:
        await asyncio.sleep(0.1) # Simulasi network/LLM latency
        yield f"data: {token}\n\n"
    
    yield "data: [DONE]\n\n"

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Endpoint SSE Streaming.
    Di dunia nyata, dependency injection digunakan di sini:
    def chat_endpoint(request: ChatRequest, service: ChatService = Depends(get_chat_service)):
        response_generator = service.generate_stream(request.message)
    """
    
    return StreamingResponse(
        mock_chat_stream(request.message),
        media_type="text/event-stream"
    )
