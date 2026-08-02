"""
End-to-End Integration Test: Event Stream Pipeline
Tests the complete multi-service data sync flow:

  Go Core (MenuStreamPublisher) / Redis Stream
                    ↓
          Redis Stream "nexus:menu_stream"
                    ↓
   Python Worker (_handle_message & XREADGROUP)
                    ↓
      ChromaDB Vector Store (get_chroma_repo)

If Redis server (localhost:6379) is running, executes live integration assertions.
If Redis server is unreachable, gracefully skips live network tests.
"""

import json
import uuid
import pytest
import redis
from unittest.mock import patch

from app.core.config import REDIS_HOST, REDIS_PORT
from app.repositories.chroma_repo import ChromaMenuRepository
from app.workers.menu_sync import _handle_message, STREAM_KEY, GROUP_NAME, CONSUMER_NAME


def is_redis_available() -> bool:
    try:
        r = redis.Redis(host=REDIS_HOST, port=int(REDIS_PORT), socket_timeout=1.0)
        return r.ping()
    except Exception:
        return False


# Skip module if Redis is not running locally
pytestmark = pytest.mark.skipif(
    not is_redis_available(),
    reason="Live Redis server (localhost:6379) is not running — skipping live stream integration tests."
)


@pytest.fixture
def sync_redis():
    r = redis.Redis(host=REDIS_HOST, port=int(REDIS_PORT), decode_responses=True)
    yield r
    r.close()


@pytest.fixture
def fresh_chroma_repo():
    return ChromaMenuRepository(collection_name=f"e2e_{uuid.uuid4().hex}")


def test_full_redis_stream_to_chromadb_lifecycle(sync_redis, fresh_chroma_repo):
    """
    E2E FLOW TEST:
    1. Create a simulated Go Core MenuStreamPublisher message in Redis Stream.
    2. Read & process message via Python worker _handle_message().
    3. Verify menu vector embedding is created in ChromaDB and retrievable via semantic search.
    4. Simulate an update message in Redis Stream → verify updated details in ChromaDB.
    5. Simulate a delete message in Redis Stream → verify menu removal from ChromaDB.
    """
    menu_id = f"e2e-menu-{uuid.uuid4().hex[:8]}"
    menu_data = {
        "id": menu_id,
        "name": "Nasi Goreng Wagyu Integration Special",
        "description": "Nasi goreng mewah dengan topping daging sapi wagyu panggang",
        "price": 85000,
        "category": "food",
        "is_available": True,
        "tags": ["premium", "wagyu", "populer"],
    }

    # -------------------------------------------------------------------------
    # STEP 1: Publish "create" event to Redis Stream (simulating Go Core Publisher)
    # -------------------------------------------------------------------------
    msg_fields = {
        "action": "create",
        "menu_id": menu_id,
        "payload": json.dumps(menu_data),
    }
    message_id = sync_redis.xadd(STREAM_KEY, msg_fields)
    assert message_id is not None

    # -------------------------------------------------------------------------
    # STEP 2: Process stream message via Python Worker handler
    # -------------------------------------------------------------------------
    import asyncio
    with patch("app.workers.menu_sync.get_chroma_repo", return_value=fresh_chroma_repo):
        asyncio.get_event_loop().run_until_complete(_handle_message(msg_fields))

    # -------------------------------------------------------------------------
    # STEP 3: Verify ChromaDB contains the embedded menu & vector search finds it
    # -------------------------------------------------------------------------
    assert fresh_chroma_repo.count() == 1
    search_results = fresh_chroma_repo.search("wagyu", n_results=1)
    assert len(search_results) == 1
    assert search_results[0]["name"] == "Nasi Goreng Wagyu Integration Special"
    assert search_results[0]["price"] == 85000.0

    # -------------------------------------------------------------------------
    # STEP 4: Publish "update" event → Process → Verify ChromaDB update
    # -------------------------------------------------------------------------
    menu_data["price"] = 95000
    menu_data["name"] = "Nasi Goreng Wagyu Premium Supreme"
    update_fields = {
        "action": "update",
        "menu_id": menu_id,
        "payload": json.dumps(menu_data),
    }
    sync_redis.xadd(STREAM_KEY, update_fields)

    with patch("app.workers.menu_sync.get_chroma_repo", return_value=fresh_chroma_repo):
        asyncio.get_event_loop().run_until_complete(_handle_message(update_fields))

    assert fresh_chroma_repo.count() == 1  # count stays 1 (updated in-place)
    search_results = fresh_chroma_repo.search("supreme", n_results=1)
    assert search_results[0]["price"] == 95000.0

    # -------------------------------------------------------------------------
    # STEP 5: Publish "delete" event → Process → Verify removal from ChromaDB
    # -------------------------------------------------------------------------
    delete_fields = {
        "action": "delete",
        "menu_id": menu_id,
        "payload": "",
    }
    sync_redis.xadd(STREAM_KEY, delete_fields)

    with patch("app.workers.menu_sync.get_chroma_repo", return_value=fresh_chroma_repo):
        asyncio.get_event_loop().run_until_complete(_handle_message(delete_fields))

    assert fresh_chroma_repo.count() == 0  # successfully deleted
