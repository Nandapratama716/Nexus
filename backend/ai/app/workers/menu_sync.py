"""
Redis Streams Menu Sync Worker (Poin 2)

Konsumsi events dari stream "nexus:menu_stream" yang dipublish oleh Go Core Service
saat terjadi operasi CRUD menu, lalu sinkronisasi ke ChromaDB.

Actions yang ditangani:
  - "create" / "update"  → chroma_repo.upsert_menu()
  - "delete"             → chroma_repo.delete_menu()
"""

import asyncio
import json
import logging

from redis.asyncio import Redis

from app.core.config import REDIS_URL
from app.repositories.chroma_repo import get_chroma_repo

logger = logging.getLogger(__name__)

STREAM_KEY = "nexus:menu_stream"
GROUP_NAME = "ai_service_group"
CONSUMER_NAME = "ai_consumer_1"


async def _ensure_group(redis: Redis) -> None:
    """Create consumer group jika belum ada (idempotent)."""
    try:
        await redis.xgroup_create(STREAM_KEY, GROUP_NAME, id="0", mkstream=True)
        logger.info("Consumer group '%s' created on stream '%s'.", GROUP_NAME, STREAM_KEY)
    except Exception as exc:
        if "BUSYGROUP" in str(exc):
            logger.debug("Consumer group '%s' already exists.", GROUP_NAME)
        else:
            logger.error("Failed to create consumer group: %s", exc)
            raise


async def _handle_message(data: dict) -> None:
    """
    Dispatch event ke ChromaDB berdasarkan action.

    Payload yang dikirim Go (lihat infrastructure/redis_publisher.go):
      {
        "action":  "create" | "update" | "delete",
        "menu_id": "<uuid>",
        "payload": "<json string of domain.Menu>"
      }
    """
    repo = get_chroma_repo()
    action = data.get("action", "")
    menu_id = data.get("menu_id", "")

    if action in ("create", "update"):
        raw_payload = data.get("payload", "{}")
        try:
            menu = json.loads(raw_payload)
        except json.JSONDecodeError:
            logger.error("Invalid JSON payload for menu %s: %s", menu_id, raw_payload)
            return
        repo.upsert_menu(menu)
        logger.info("ChromaDB: upserted menu '%s' (action=%s).", menu.get("name", menu_id), action)

    elif action == "delete":
        repo.delete_menu(menu_id)
        logger.info("ChromaDB: deleted menu id=%s.", menu_id)

    else:
        logger.warning("Unknown action '%s' — ignored.", action)


async def run_menu_sync_worker() -> None:
    """
    Main async loop — berjalan selamanya sebagai asyncio task.

    Gunakan XREADGROUP agar pesan dijamin delivered ≥1 kali (durable),
    berbeda dengan Pub/Sub yang bisa kehilangan pesan jika consumer mati.
    """
    logger.info("Menu sync worker starting (stream=%s, group=%s).", STREAM_KEY, GROUP_NAME)
    redis = Redis.from_url(REDIS_URL, decode_responses=True)

    try:
        await _ensure_group(redis)

        while True:
            try:
                # Block 5 detik menunggu pesan baru
                results = await redis.xreadgroup(
                    GROUP_NAME,
                    CONSUMER_NAME,
                    {STREAM_KEY: ">"},
                    count=10,
                    block=5000,
                )

                if not results:
                    continue

                for _stream_name, messages in results:
                    for message_id, data in messages:
                        try:
                            await _handle_message(data)
                            # ACK agar tidak dibaca ulang
                            await redis.xack(STREAM_KEY, GROUP_NAME, message_id)
                        except Exception as exc:
                            logger.error(
                                "Error handling message %s: %s — will be retried.",
                                message_id,
                                exc,
                            )

            except asyncio.CancelledError:
                logger.info("Menu sync worker cancelled.")
                break
            except Exception as exc:
                logger.error("Worker loop error: %s — retrying in 5s.", exc)
                await asyncio.sleep(5)

    finally:
        await redis.aclose()
        logger.info("Menu sync worker stopped.")
