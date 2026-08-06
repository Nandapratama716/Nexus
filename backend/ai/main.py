"""
Nexus AI Microservice — main entry point.

Startup sequence:
1. Fetch all current menus from Go Core Service.
2. Seed ChromaDB with menu embeddings.
3. Register HTTP routers.
"""

import asyncio
import logging
import httpx
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import CORE_SERVICE_URL, ALLOWED_ORIGINS
from app.repositories.chroma_repo import get_chroma_repo
from app.routers.chat_router import router as chat_router
from app.workers.menu_sync import run_menu_sync_worker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def _seed_menus_from_core() -> None:
    """
    Fetch menus from Go Core Service and bulk-upsert into ChromaDB.
    Gracefully skips if Core Service is unavailable at startup.
    """
    url = f"{CORE_SERVICE_URL}/api/v1/menus"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            menus = response.json()

        repo = get_chroma_repo()
        repo.seed_from_list(menus)
        logger.info("Seeded %d menus from Core Service into ChromaDB.", len(menus))
    except httpx.ConnectError:
        logger.warning(
            "Core Service unreachable at %s — ChromaDB will start empty. "
            "Menus will be added via Redis Streams as they are created/updated.",
            url,
        )
    except Exception as exc:
        logger.error("Failed to seed menus: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan: runs on startup and shutdown."""
    logger.info("Starting Nexus AI Service...")
    await _seed_menus_from_core()

    # Start Redis Streams consumer as background task
    worker_task = asyncio.create_task(run_menu_sync_worker())
    logger.info("Menu sync worker started.")
    logger.info("Nexus AI Service ready.")
    yield
    # Graceful shutdown
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    logger.info("Nexus AI Service shutting down.")


from app.middleware.rate_limit import AIRateLimitMiddleware

app = FastAPI(
    title="Nexus AI Microservice",
    version="2.0.0",
    description="RAG-powered AI Order Assistant (ChromaDB + Ollama)",
    lifespan=lifespan,
)

app.add_middleware(AIRateLimitMiddleware, max_requests=10, window_seconds=60)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(chat_router)


@app.get("/health")
def health_check():
    repo = get_chroma_repo()
    return {
        "status": "ok",
        "service": "nexus-ai",
        "chroma_docs": repo.count(),
    }
