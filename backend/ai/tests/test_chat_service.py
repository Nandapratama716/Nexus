"""
Automation Tests — Nexus AI Service
Covers:
  1. ChromaDB Repository (unit — unique collection per test, no shared state)
  2. Menu document builder
  3. Redis Streams worker message handling (isolated singleton)
  4. API endpoint integration (FastAPI TestClient)
  5. Bug checks: empty collection search, idempotent upsert, invalid action, bad JSON
"""

import json
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

from app.repositories.chroma_repo import ChromaMenuRepository, _build_menu_document


def fresh_repo() -> ChromaMenuRepository:
    """Each call returns a repo backed by a UNIQUE collection name.
    This avoids ChromaDB EphemeralClient's process-level shared state."""
    return ChromaMenuRepository(collection_name=f"test_{uuid.uuid4().hex}")


def _sample_menu(menu_id: str = "m1", name: str = "Nasi Goreng") -> dict:
    return {
        "id": menu_id,
        "name": name,
        "description": f"Deskripsi {name}",
        "category": "food",
        "price": 25000,
        "is_available": True,
        "tags": ["pedas", "populer"],
    }


# ──────────────────────────────────────────────────────────────────────────────
# 1. _build_menu_document tests
# ──────────────────────────────────────────────────────────────────────────────

class TestBuildMenuDocument:
    def test_basic_fields(self):
        doc = _build_menu_document(_sample_menu())
        assert "Nasi Goreng" in doc
        assert "food" in doc
        assert "pedas" in doc
        assert "tersedia" in doc

    def test_unavailable_menu(self):
        menu = _sample_menu()
        menu["is_available"] = False
        doc = _build_menu_document(menu)
        assert "tidak tersedia" in doc

    def test_tags_as_json_string(self):
        """Go serializer:json sends tags as a JSON string."""
        menu = _sample_menu()
        menu["tags"] = '["manis", "dingin"]'
        doc = _build_menu_document(menu)
        assert "manis" in doc

    def test_empty_tags(self):
        menu = _sample_menu()
        menu["tags"] = []
        doc = _build_menu_document(menu)
        assert "tidak ada tag khusus" in doc


# ──────────────────────────────────────────────────────────────────────────────
# 2. ChromaMenuRepository unit tests
# ──────────────────────────────────────────────────────────────────────────────

class TestChromaMenuRepository:
    def test_initial_count_is_zero(self):
        repo = fresh_repo()
        assert repo.count() == 0

    def test_upsert_and_count(self):
        repo = fresh_repo()
        repo.upsert_menu(_sample_menu("m1"))
        assert repo.count() == 1

    def test_upsert_is_idempotent(self):
        """BUG CHECK: upserting same ID twice must not duplicate."""
        repo = fresh_repo()
        repo.upsert_menu(_sample_menu("m1"))
        repo.upsert_menu(_sample_menu("m1"))
        assert repo.count() == 1

    def test_delete_menu(self):
        repo = fresh_repo()
        repo.upsert_menu(_sample_menu("m2", "Teh"))
        repo.delete_menu("m2")
        assert repo.count() == 0

    def test_search_empty_collection_returns_empty_list(self):
        """BUG CHECK: search on empty collection must return [], not raise."""
        repo = fresh_repo()
        results = repo.search("nasi goreng", n_results=3)
        assert results == []

    def test_seed_from_list(self):
        repo = fresh_repo()
        menus = [_sample_menu(f"m{i}", f"Menu {i}") for i in range(5)]
        repo.seed_from_list(menus)
        assert repo.count() == 5

    def test_seed_empty_list_is_safe(self):
        """BUG CHECK: seeding empty list must not raise."""
        repo = fresh_repo()
        repo.seed_from_list([])
        assert repo.count() == 0

    def test_search_returns_relevant_results(self):
        repo = fresh_repo()
        repo.upsert_menu(_sample_menu("m1", "Nasi Goreng Ayam"))
        repo.upsert_menu({**_sample_menu("m2", "Es Teh Manis"), "tags": ["dingin"], "category": "drink"})
        results = repo.search("nasi goreng", n_results=2)
        assert len(results) >= 1
        assert any(r["name"] == "Nasi Goreng Ayam" for r in results)

    def test_search_n_results_clipped_to_collection_size(self):
        """BUG CHECK: asking for more results than docs must not raise."""
        repo = fresh_repo()
        repo.upsert_menu(_sample_menu("m1", "Kopi"))
        results = repo.search("kopi", n_results=100)
        assert len(results) <= 1

    def test_search_result_has_expected_keys(self):
        repo = fresh_repo()
        repo.upsert_menu(_sample_menu("m1"))
        results = repo.search("nasi", n_results=1)
        assert len(results) == 1
        r = results[0]
        assert "name" in r
        assert "price" in r
        assert "distance" in r
        assert "document" in r


# ──────────────────────────────────────────────────────────────────────────────
# 3. Redis Streams Worker — message handling (isolated)
# ──────────────────────────────────────────────────────────────────────────────

import asyncio
from app.workers.menu_sync import _handle_message


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


class TestHandleMessage:
    """Each test creates its OWN isolated fresh_repo and patches get_chroma_repo."""

    def test_create_action_upserts(self):
        repo = fresh_repo()
        data = {"action": "create", "menu_id": "m1", "payload": json.dumps(_sample_menu("m1"))}
        with patch("app.workers.menu_sync.get_chroma_repo", return_value=repo):
            run(_handle_message(data))
        assert repo.count() == 1

    def test_update_action_upserts(self):
        repo = fresh_repo()
        repo.upsert_menu(_sample_menu("m1", "Sate"))
        updated = {**_sample_menu("m1", "Sate Updated"), "price": 35000}
        data = {"action": "update", "menu_id": "m1", "payload": json.dumps(updated)}
        with patch("app.workers.menu_sync.get_chroma_repo", return_value=repo):
            run(_handle_message(data))
        assert repo.count() == 1  # still 1, just updated

    def test_delete_action_removes(self):
        repo = fresh_repo()
        repo.upsert_menu(_sample_menu("m1"))
        data = {"action": "delete", "menu_id": "m1", "payload": ""}
        with patch("app.workers.menu_sync.get_chroma_repo", return_value=repo):
            run(_handle_message(data))
        assert repo.count() == 0

    def test_invalid_action_does_not_raise(self):
        """BUG CHECK: unknown action must log warning, not raise."""
        repo = fresh_repo()
        data = {"action": "unknown_xyz", "menu_id": "m1", "payload": "{}"}
        with patch("app.workers.menu_sync.get_chroma_repo", return_value=repo):
            run(_handle_message(data))  # must not raise

    def test_invalid_json_payload_does_not_raise(self):
        """BUG CHECK: malformed JSON in payload must be handled gracefully."""
        repo = fresh_repo()
        data = {"action": "create", "menu_id": "m1", "payload": "{not: valid json}"}
        with patch("app.workers.menu_sync.get_chroma_repo", return_value=repo):
            run(_handle_message(data))  # must not raise
        assert repo.count() == 0  # nothing was added


# ──────────────────────────────────────────────────────────────────────────────
# 4. API Integration Tests (FastAPI TestClient)
# ──────────────────────────────────────────────────────────────────────────────

from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    """TestClient with lifespan patched to skip real Redis/Core calls."""
    with patch("main._seed_menus_from_core", new_callable=AsyncMock), \
         patch("main.run_menu_sync_worker", new_callable=AsyncMock):
        from main import app
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c


class TestHealthEndpoint:
    def test_health_returns_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["service"] == "nexus-ai"
        assert "chroma_docs" in data

    def test_health_chroma_docs_is_int(self, client):
        resp = client.get("/health")
        assert isinstance(resp.json()["chroma_docs"], int)


import jwt
from app.core.config import JWT_SECRET


def auth_headers(user_id: str = "user-1", role: str = "customer") -> dict:
    token = jwt.encode({"user_id": user_id, "role": role}, JWT_SECRET, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


class TestChatEndpoint:
    def test_chat_unauthenticated_returns_401(self, client):
        with patch("app.core.security.JWT_SECRET", "prod-secret-key-12345"):
            resp = client.post("/api/v1/ai/chat", json={"message": "halo", "session_id": "s1"})
            assert resp.status_code == 401

    def test_chat_invalid_token_returns_401(self, client):
        resp = client.post(
            "/api/v1/ai/chat",
            json={"message": "halo", "session_id": "s1"},
            headers={"Authorization": "Bearer invalid_token_str"},
        )
        assert resp.status_code == 401

    def test_chat_requires_body(self, client):
        resp = client.post("/api/v1/ai/chat", json={}, headers=auth_headers())
        assert resp.status_code == 422

    def test_chat_missing_session_id(self, client):
        resp = client.post("/api/v1/ai/chat", json={"message": "halo"}, headers=auth_headers())
        assert resp.status_code == 422

    def test_chat_valid_request_streams(self, client):
        """BUG CHECK: valid request with JWT returns 200 text/event-stream."""

        async def _fake_stream(_msg: str):
            yield "data: Halo\n\n"
            yield "data: [DONE]\n\n"

        with patch("app.routers.chat_router.generate_rag_stream", side_effect=_fake_stream):
            resp = client.post(
                "/api/v1/ai/chat",
                json={"message": "menu apa yang tersedia?", "session_id": "test-session"},
                headers=auth_headers(),
            )
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers.get("content-type", "")
        assert "Halo" in resp.text

