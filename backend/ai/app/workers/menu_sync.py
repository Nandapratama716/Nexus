import asyncio
import json
import logging
from redis.asyncio import Redis

logger = logging.getLogger(__name__)

async def sync_menu_worker(redis_url: str):
    """
    Background worker to subscribe to Redis event (Pub/Sub)
    and update ChromaDB accordingly.
    Catatan: Implementasi riil sebaiknya pakai Redis Streams (XREADGROUP)
    demi durability, tapi untuk contoh ini pakai Pub/Sub.
    """
    redis = Redis.from_url(redis_url)
    pubsub = redis.pubsub()
    await pubsub.subscribe("menu_events")
    
    logger.info("Started menu sync worker, waiting for events...")
    
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                logger.info(f"Received menu update: {data}")
                
                # Contoh alur (belum diimplementasi konkret):
                # 1. repo = get_chroma_repo()
                # 2. repo.update_menu_embedding(data)
                
    except asyncio.CancelledError:
        logger.info("Worker stopped")
    finally:
        await pubsub.unsubscribe("menu_events")
        await redis.aclose()
