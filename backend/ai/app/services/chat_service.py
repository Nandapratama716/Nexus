"""
RAG Chat Service
Implements the Retrieval-Augmented Generation pipeline:

1. Query ChromaDB for relevant menu context.
2. Build a structured prompt with retrieved context.
3. Stream the LLM response token-by-token via Ollama.
"""

import logging
from typing import AsyncGenerator
import httpx

from langchain_ollama import OllamaLLM
from langchain_core.prompts import PromptTemplate

from app.core.config import OLLAMA_MODEL, OLLAMA_BASE_URL, CORE_SERVICE_URL
from app.repositories.chroma_repo import get_chroma_repo

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# LLM
# ---------------------------------------------------------------------------

_llm = OllamaLLM(model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL)

# ---------------------------------------------------------------------------
# Prompt template
# ---------------------------------------------------------------------------

_RAG_PROMPT = PromptTemplate.from_template(
    """Anda adalah AI Order Assistant ramah untuk restoran Nexus.
Tugas Anda: Membantu pelanggan memilih menu berdasarkan informasi menu resmi di bawah ini.

Aturan Sangat Ketat:
1. DILARANG MENGARANG ATAU MENAMBAHKAN MENU/MINUMAN YANG TIDAK TERCANTUM DI KONTEKS MENU.
2. Jika pelanggan meminta kategori atau item (seperti minuman dingin) dan TIDAK ADA menu kategori tersebut di === KONTEKS MENU ===, jawab secara jujur dan sopan bahwa saat ini restoran Nexus tidak menyediakan menu/kategori tersebut.
3. Sebutkan harga, deskripsi, dan status ketersediaan secara akurat HANYA untuk menu yang benar-benar ada di konteks.

=== KONTEKS MENU ===
{context}
===================

Pertanyaan Pelanggan: {question}
Jawaban:"""
)

_chain = _RAG_PROMPT | _llm

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_context(results: list[dict]) -> str:
    """Format ChromaDB results into a readable context block."""
    if not results:
        return "Tidak ada informasi menu yang relevan ditemukan."

    lines = []
    for i, item in enumerate(results, start=1):
        avail = item.get("is_available", True)
        avail_str = "✓ Tersedia" if avail else "✗ Tidak Tersedia (Sold Out)"
        price = item.get("price", 0)
        lines.append(
            f"{i}. {item.get('name', '')} | Harga: Rp {price:,.0f} | Kategori: {item.get('category', '-')} | Status: {avail_str}"
        )
        lines.append(f"   {item.get('document', '')}")
    return "\n".join(lines)


async def sync_menus_from_core():
    """Fetch menus from Go Core Service and re-seed ChromaDB."""
    url = f"{CORE_SERVICE_URL}/api/v1/menus"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                menus = resp.json()
                repo = get_chroma_repo()
                repo.seed_from_list(menus)
                logger.info("ChromaDB auto-synced with %d menus from Core Service.", len(menus))
    except Exception as err:
        logger.warning("Auto-sync ChromaDB warning: %s", err)


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------


async def generate_rag_stream(message: str) -> AsyncGenerator[str, None]:
    """
    RAG pipeline — retrieves menu context then streams LLM response as SSE tokens.
    
    Yields raw SSE-formatted strings: "data: <token>\\n\\n"
    Ends with:                        "data: [DONE]\\n\\n"
    """
    repo = get_chroma_repo()

    # Auto re-sync if ChromaDB is empty or missing data
    if repo.count() == 0:
        await sync_menus_from_core()

    # 1. Retrieve relevant menus from ChromaDB
    results = repo.search(message, n_results=5)

    # If top search returned nothing or poor match, do full fallback sync & search
    if not results:
        await sync_menus_from_core()
        results = repo.search(message, n_results=5)

    context = _build_context(results)

    logger.info(
        "RAG: query='%s' | retrieved %d results from ChromaDB", message, len(results)
    )

    # 2. Stream from Ollama via LangChain .astream()
    try:
        async for chunk in _chain.astream({"context": context, "question": message}):
            if chunk:
                yield f"data: {chunk}\n\n"
    except Exception as exc:
        logger.error("LLM streaming error: %s", exc)
        yield f"data: [ERROR] Gagal menghubungi AI model: {exc}\n\n"

    yield "data: [DONE]\n\n"
