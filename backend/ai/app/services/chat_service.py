"""
RAG Chat Service
Implements the Retrieval-Augmented Generation pipeline:

1. Query ChromaDB for relevant menu context.
2. Build a structured prompt with retrieved context.
3. Stream the LLM response token-by-token via Ollama.
"""

import logging
from typing import AsyncGenerator

from langchain_ollama import OllamaLLM
from langchain_core.prompts import PromptTemplate

from app.core.config import OLLAMA_MODEL, OLLAMA_BASE_URL
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
    """Anda adalah AI Order Assistant untuk restoran Nexus. 
Jawab pertanyaan pelanggan atau kasir menggunakan informasi menu di bawah ini.
Bersikaplah ramah, profesional, dan ringkas. Gunakan Bahasa Indonesia.
Jika pertanyaan tidak berhubungan dengan menu, jawab dengan sopan bahwa Anda 
hanya membantu seputar menu dan pemesanan.

=== KONTEKS MENU ===
{context}
===================

Pertanyaan: {question}
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
        available = "✓ Tersedia" if item.get("is_available") else "✗ Tidak Tersedia"
        lines.append(
            f"{i}. {item['name']} | Rp {item['price']:,.0f} | {item.get('category', '-')} | {available}"
        )
        # Add raw embedding document text for richer LLM context
        lines.append(f"   Detail: {item.get('document', '')}")
    return "\n".join(lines)


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

    # 1. Retrieve relevant menus from ChromaDB
    results = repo.search(message, n_results=4)
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


async def generate_rag_response(message: str) -> str:
    """Non-streaming version — returns full response string (used internally)."""
    repo = get_chroma_repo()
    results = repo.search(message, n_results=4)
    context = _build_context(results)

    try:
        response = await _chain.ainvoke({"context": context, "question": message})
        return response
    except Exception as exc:
        logger.error("LLM invocation error: %s", exc)
        return f"Error: {exc}"
