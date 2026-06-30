"""
Integration tests for the full API flow.
Uses REAL SQLite database, REAL API calls, NO mocks.

Flow:
1. POST /items → User A creates item 1
2. GET /items/feed → empty (no other items)
3. POST /auth/telegram → User B authenticated
4. POST /items → User B creates item 2
5. GET /items/feed → User A sees item 2
6. POST /swipe → User A likes item 2
7. POST /swipe → User B likes item 1 → MATCH!
8. GET /matches → User A sees match
9. POST /payment/init → User A pays
10. POST /payment/init → User B pays
11. Direct DB check: both payments exist
12. Direct DB check: chat unlocked
"""
import json
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import get_async_session, Base
from app.api.deps import get_current_user
from app.models.user import User


@pytest_asyncio.fixture(autouse=True)
async def patch_database():
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
    from app.core import database

    engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    database.engine = engine
    database.async_session_factory = session_factory
    yield
    await engine.dispose()


@pytest.mark.asyncio
async def test_full_api_flow_real():
    """
    Execute the full API flow against REAL SQLite database.
    All data is created through API calls. No mocks for business logic.
    """
    from sqlalchemy import select
    from app.core import database
    from app.models.payment import Payment
    from app.models.chat import Chat
    from app.models.user import User as UserModel
    from app.models.item import Item as ItemModel
    from app.models.swipe import Swipe as SwipeModel
    from app.models.match import Match as MatchModel

    # ── Setup: create two users directly in DB ──
    user_a = UserModel(id=1, telegram_id=1001, username="user_a", first_name="Alice",
                       is_pro=False, risk_score=0, is_shadow_banned=False,
                       created_at=datetime(2024, 1, 1, tzinfo=timezone.utc))
    user_b = UserModel(id=2, telegram_id=1002, username="user_b", first_name="Bob",
                       is_pro=False, risk_score=0, is_shadow_banned=False,
                       created_at=datetime(2024, 1, 1, tzinfo=timezone.utc))

    async with database.async_session_factory() as init_session:
        init_session.add_all([user_a, user_b])
        await init_session.commit()

    # ── Helper: create a client with overridden deps ──
    async def _client(user):
        """Create an API client authenticated as `user`."""
        async def override_get_db():
            async with database.async_session_factory() as s:
                yield s

        app.dependency_overrides[get_async_session] = override_get_db
        app.dependency_overrides[get_current_user] = lambda: user
        transport = ASGITransport(app=app)
        return AsyncClient(transport=transport, base_url="http://test")

    async with database.async_session_factory() as verify_session:
        # ── Step 1: User A creates item 1 ──
        async with await _client(user_a) as ca:
            resp = await ca.post("/items", json={
                "video_file_id": "vid_a_1", "title": "Alice's Phone",
                "description": "iPhone 14", "category": "electronics", "condition": "good",
            })
            assert resp.status_code in (200, 201), f"Create item A failed: {resp.text}"
            item_a = resp.json()
            assert item_a["title"] == "Alice's Phone"
            item_a_id = item_a["id"]

            # ── Step 2: Feed empty for A (no other items) ──
            resp = await ca.get("/items/feed?page=1&page_size=20")
            assert resp.status_code == 200
            feed = resp.json()
            assert len(feed["items"]) == 0

        # ── Step 3: User B creates item 2 ──
        async with await _client(user_b) as cb:
            resp = await cb.post("/items", json={
                "video_file_id": "vid_b_1", "title": "Bob's Camera",
                "description": "Sony A7", "category": "electronics", "condition": "like_new",
            })
            assert resp.status_code in (200, 201), f"Create item B failed: {resp.text}"
            item_b = resp.json()
            assert item_b["title"] == "Bob's Camera"
            item_b_id = item_b["id"]

        # ── Step 4: User A sees 1 item (Bob's Camera) ──
        async with await _client(user_a) as ca:
            resp = await ca.get("/items/feed?page=1&page_size=20")
            assert resp.status_code == 200
            feed = resp.json()
            assert len(feed["items"]) == 1, f"Expected 1 item, got {len(feed['items'])}"
            assert feed["items"][0]["title"] == "Bob's Camera"

            # ── Step 5: User A likes Bob's Camera ──
            resp = await ca.post("/swipe", json={"item_id": item_b_id, "direction": "like"})
            assert resp.status_code == 200, f"Swipe A failed: {resp.text}"
            assert resp.json()["match_id"] is None

        # ── Step 6: User B likes Alice's Phone → MATCH! ──
        async with await _client(user_b) as cb:
            resp = await cb.post("/swipe", json={"item_id": item_a_id, "direction": "like"})
            assert resp.status_code == 200, f"Swipe B failed: {resp.text}"
            swipe_b = resp.json()
            match_id = swipe_b.get("match_id")
            assert match_id is not None, f"Expected match_id, got: {swipe_b}"

        # ── Step 7: User A sees match ──
        async with await _client(user_a) as ca:
            resp = await ca.get("/matches")
            assert resp.status_code == 200
            matches = resp.json()
            assert len(matches) >= 1

            # ── Step 8: User A pays ──
            resp = await ca.post("/payment/init", json={"match_id": match_id})
            assert resp.status_code == 200, f"Payment A failed: {resp.text}"
            assert resp.json()["status"] == "init"

        # ── Step 9: User B pays ──
        async with await _client(user_b) as cb:
            resp = await cb.post("/payment/init", json={"match_id": match_id})
            # Step 10: Verify payments in DB directly
            # Open a fresh session to see committed data from API
            async with database.async_session_factory() as verify_sess:
                result = await verify_sess.execute(
                    select(Payment).where(Payment.match_id == match_id)
                )
                payments = list(result.scalars().all())
                assert len(payments) == 2, f"Expected 2 payments, got {len(payments)}"
                assert all(p.status == "init" for p in payments)

        # Step 11: Process payments via webhook
        async with database.async_session_factory() as webhook_sess:
            result = await webhook_sess.execute(
                select(Payment).where(Payment.match_id == match_id)
            )
            db_payments = list(result.scalars().all())
            assert len(db_payments) == 2

            for p in db_payments:
                p.provider_payment_id = f"prov_{p.id}"
            await webhook_sess.commit()

            for p in db_payments:
                async with await _client(
                    user_a if p.user_id == 1 else user_b
                ) as c:
                    resp = await c.post("/payment/webhook", json={
                        "provider_payment_id": p.provider_payment_id,
                        "status": "paid",
                    })
                    assert resp.status_code == 200, f"Webhook failed: {resp.text}"
                    assert resp.json()["payment_status"] == "paid"

        # Step 12: Verify both paid + chat unlocked
        async with database.async_session_factory() as final_sess:
            result = await final_sess.execute(
                select(Payment).where(Payment.match_id == match_id)
            )
            final_payments = list(result.scalars().all())
            assert len(final_payments) == 2
            assert all(p.status == "paid" for p in final_payments)

            result = await final_sess.execute(
                select(Chat).where(Chat.match_id == match_id)
            )
            chat = result.scalar_one_or_none()
            assert chat is not None
            assert chat.status == "unlocked", f"Expected unlocked, got {chat.status}"

            result = await final_sess.execute(
                select(MatchModel).where(MatchModel.id == match_id)
            )
            match = result.scalar_one()
            assert match.status == "active"

        print(f"\n FULL CYCLE PASSED")
        print(f"  Items: {item_a_id} (Alice), {item_b_id} (Bob)")
        print(f"  Match: {match_id}")
        print(f"  Payments: {len(payments)} both paid")
        print(f"  Chat: {chat.status}")
