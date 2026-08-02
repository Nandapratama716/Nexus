"""
ChromaDB Repository
Handles: seeding, upsert, delete, and semantic search for menu embeddings.

Uses ChromaDB's built-in embedding function (via SentenceTransformers / Ollama)
so no external OpenAI key is required — everything stays local.
"""

import logging
from typing import Optional
import chromadb
from chromadb.utils import embedding_functions

from app.core.config import CHROMA_HOST, CHROMA_PORT, CHROMA_COLLECTION

logger = logging.getLogger(__name__)


def _build_menu_document(menu: dict) -> str:
    """
    Converts a menu dict into a rich text string for embedding.
    The more descriptive the text, the better the retrieval quality.
    """
    tags = menu.get("tags", [])
    if isinstance(tags, str):
        import json
        try:
            tags = json.loads(tags)
        except Exception:
            tags = [tags]

    tags_str = ", ".join(tags) if tags else "-"
    stock_qty = menu.get("stock_qty", 0)
    is_avail = menu.get("is_available", True) and (stock_qty > 0 if "stock_qty" in menu else True)
    status_str = f"tersedia (sisa stok {stock_qty})" if is_avail else "tidak tersedia (stok habis)"
    price = menu.get("price", 0)

    return (
        f"Nama menu: {menu.get('name', '')}. "
        f"Deskripsi: {menu.get('description', '')}. "
        f"Kategori: {menu.get('category', '')}. "
        f"Harga: Rp {price:,}. "
        f"Tag: {tags_str}. "
        f"Status: {status_str}."
    )


class ChromaMenuRepository:
    """
    Wrapper around a ChromaDB collection for menu semantic search.

    ChromaDB runs as a persistent in-memory client in the same process.
    In production you can switch to a separate Chroma server by changing
    the client initialisation to chromadb.HttpClient(host=..., port=...).
    """

    def __init__(self, collection_name: str = CHROMA_COLLECTION):
        # Use an ephemeral (in-process) client so no extra Docker service is needed.
        # Data is lost on restart — for a real deployment swap to PersistentClient
        # or HttpClient pointed at a ChromaDB container.
        self._client = chromadb.EphemeralClient()

        # Default embedding function uses all-MiniLM-L6-v2 (runs locally, no API key)
        self._ef = embedding_functions.DefaultEmbeddingFunction()

        self._collection = self._client.get_or_create_collection(
            name=collection_name,
            embedding_function=self._ef,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(
            "ChromaDB collection '%s' ready (%d docs).",
            collection_name,
            self._collection.count(),
        )

    # ------------------------------------------------------------------
    # Write operations
    # ------------------------------------------------------------------

    def upsert_menu(self, menu: dict) -> None:
        """Insert or update a single menu item in the vector store."""
        doc = _build_menu_document(menu)
        menu_id = str(menu["id"])
        price = menu.get("price", 0)

        self._collection.upsert(
            ids=[menu_id],
            documents=[doc],
            metadatas=[
                {
                    "id": menu_id,
                    "name": str(menu.get("name", "")),
                    "price": float(price) if price else 0.0,
                    "category": str(menu.get("category", "")),
                    "is_available": bool(menu.get("is_available", True)),
                }
            ],
        )
        logger.debug("Upserted menu '%s' (id=%s) into ChromaDB.", menu.get("name"), menu_id)

    def delete_menu(self, menu_id: str) -> None:
        """Remove a menu item from the vector store."""
        self._collection.delete(ids=[menu_id])
        logger.debug("Deleted menu id=%s from ChromaDB.", menu_id)

    def seed_from_list(self, menus: list[dict]) -> None:
        """Bulk upsert a list of menu dicts (called at startup)."""
        if not menus:
            logger.info("No menus to seed.")
            return

        ids, docs, metas = [], [], []
        for menu in menus:
            ids.append(str(menu["id"]))
            docs.append(_build_menu_document(menu))
            price = menu.get("price", 0)
            metas.append(
                {
                    "id": str(menu["id"]),
                    "name": str(menu.get("name", "")),
                    "price": float(price) if price else 0.0,
                    "category": str(menu.get("category", "")),
                    "is_available": bool(menu.get("is_available", True)),
                }
            )

        self._collection.upsert(ids=ids, documents=docs, metadatas=metas)
        logger.info("Seeded %d menus into ChromaDB.", len(menus))

    # ------------------------------------------------------------------
    # Read operations
    # ------------------------------------------------------------------

    def search(self, query: str, n_results: int = 4) -> list[dict]:
        """
        Semantic search over menu embeddings.

        Returns a list of dicts with keys: id, name, price, category,
        is_available, document (raw text), distance.
        """
        count = self._collection.count()
        if count == 0:
            logger.warning("ChromaDB collection is empty — search will return nothing.")
            return []

        results = self._collection.query(
            query_texts=[query],
            n_results=min(n_results, count),
            include=["documents", "metadatas", "distances"],
        )

        items = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            items.append(
                {
                    **meta,
                    "document": doc,
                    "distance": dist,
                }
            )
        return items

    def count(self) -> int:
        return self._collection.count()


# Singleton instance — imported by other modules
_repo: Optional[ChromaMenuRepository] = None


def get_chroma_repo() -> ChromaMenuRepository:
    global _repo
    if _repo is None:
        _repo = ChromaMenuRepository()
    return _repo
