from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
from sse_starlette.sse import EventSourceResponse
from app.rag import get_chat_response

app = FastAPI(title="Nexus AI Microservice", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    user_id: str
    session_id: str

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "nexus-ai"}

async def event_generator(msg: str):
    # Placeholder untuk streaming respons kata-per-kata
    # (Di tahap lanjut akan diganti stream asli dari LangChain)
    full_response = get_chat_response(msg)
    for word in full_response.split():
        yield {"data": word + " "}
        await asyncio.sleep(0.05)
    yield {"data": "[DONE]"}

@app.post("/api/v1/ai/chat")
async def chat_endpoint(req: ChatRequest):
    return EventSourceResponse(event_generator(req.message))
