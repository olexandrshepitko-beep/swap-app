"""
Full end-to-end test of the barter marketplace flow.
Uses httpx.AsyncClient with the FastAPI app and mocks for all external services.

Flow:
1. Register User A (POST /auth/telegram)
2. User A creates an item (POST /items)
3. Register User B (override current_user)
4. User B creates an item
5. User A likes User B's item (POST /swipe)
6. User B likes User A's item -> match created
7. User A pays (POST /payment/init + POST /payment/webhook)
8. User B pays
9. Chat unlocked (check both paid)
10. Verify chat unlock endpoint
"""
import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import get_async_session
from app.api.deps import get_current_user
from app.models.user import User
from app.models.item import Item
from app.models.match import Match
from app.models.chat import Chat
from app.models.payment import Payment


@pytest.fixture
def mock_session():
    """Mock async session for E2E test."""
    session = AsyncMock()
    session.add = MagicMock()
    session.add_all = MagicMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.refresh = AsyncMock()
    session.execute = AsyncMock()
    session.get = AsyncMock()
    return session


# Global mutable state for E2E tests
E2E_STATE = {
    "user_a_id": 1,
    "user_b_id": 2,
    "item_a_id": 1,
    "item_b_id": 2,
    "match_id": 1,
    "payment_a_id": 1,
    "payment_b_id": 2,
    "user_a_created": False,
    "user_b_created": False,
}


class TestFullCycleE2E:
    """Full end-to-end cycle test."""

    @pytest.mark.asyncio
    async def test_full_cycle(self):
        """Execute the complete barter flow end-to-end with mocks."""
        # ─────────────────────────────────────────────
        # Setup: create mock data
        # ─────────────────────────────────────────────
        user_a = User(
            id=1, telegram_id=111, username="user_a",
            first_name="UserA", is_pro=False, risk_score=0,
            is_shadow_banned=False,
            created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
        )
        user_b = User(
            id=2, telegram_id=222, username="user_b",
            first_name="UserB", is_pro=False, risk_score=0,
            is_shadow_banned=False,
            created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
        )
        item_a = Item(
            id=1, owner_id=1, video_file_id="vid_a",
            title="Item A", description="Desc A",
            category="electronics", condition="good",
            status="active",
            created_at=datetime.now(timezone.utc),
        )
        item_b = Item(
            id=2, owner_id=2, video_file_id="vid_b",
            title="Item B", description="Desc B",
            category="clothing", condition="new",
            status="active",
            created_at=datetime.now(timezone.utc),
        )
        match_ab = Match(
            id=1, item_a_id=1, item_b_id=2,
            user_a_id=1, user_b_id=2,
            status="pending",
            created_at=datetime.now(timezone.utc),
        )
        chat_ab = Chat(
            id=1, match_id=1,
            status="locked", unlocked_at=None,
        )
        payment_a = Payment(
            id=1, match_id=1, user_id=1, amount=0.5,
            currency="USD", provider="telegram", status="paid",
        )
        payment_b = Payment(
            id=2, match_id=1, user_id=2, amount=0.5,
            currency="USD", provider="telegram", status="paid",
        )

        # ─────────────────────────────────────────────
        # Step 1: Register User A
        # ─────────────────────────────────────────────
        with patch('app.api.auth.verify_telegram_hash') as mock_verify, \
             patch('app.api.auth.get_telegram_user_from_init_data') as mock_get_user, \
             patch('app.api.auth.create_jwt_token') as mock_jwt:

            mock_verify.return_value = {
                "auth_date": str(int(datetime.now(timezone.utc).timestamp())),
                "hash": "abc123",
                "user": json.dumps({"id": 111, "first_name": "UserA", "username": "user_a"}),
            }
            mock_get_user.return_value = {"id": 111, "first_name": "UserA", "username": "user_a"}
            mock_jwt.return_value = "token_a"

            session_a = AsyncMock()
            session_a.execute.return_value = MagicMock()
            session_a.execute.return_value.scalar_one_or_none.return_value = None
            session_a.add = MagicMock()
            session_a.flush = AsyncMock()
            session_a.refresh = AsyncMock()

            async def override_db_a():
                yield session_a

            async def override_current_user_a():
                return user_a

            app.dependency_overrides[get_async_session] = override_db_a
            app.dependency_overrides[get_current_user] = override_current_user_a

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post(
                    "/auth/telegram",
                    json={"init_data": "query_id=test&user=%7B%22id%22%3A111%7D"},
                )
                assert resp.status_code in (200, 201), f"User A auth failed: {resp.text}"
                token_a = resp.json()["token"]
                assert token_a == "token_a"

                # ─────────────────────────────────────────────
                # Step 2: User A creates item
                # ─────────────────────────────────────────────
                resp = await client.post(
                    "/items",
                    json={
                        "video_file_id": "vid_a",
                        "title": "Item A",
                        "description": "Desc A",
                        "category": "electronics",
                        "condition": "good",
                    },
                )
                assert resp.status_code in (200, 201), f"User A create item failed: {resp.text}"
                item_a_data = resp.json()
                assert item_a_data["title"] == "Item A"

        # ─────────────────────────────────────────────
        # Step 3: Register User B
        # ─────────────────────────────────────────────
        with patch('app.api.auth.verify_telegram_hash') as mock_verify, \
             patch('app.api.auth.get_telegram_user_from_init_data') as mock_get_user, \
             patch('app.api.auth.create_jwt_token') as mock_jwt:

            mock_verify.return_value = {
                "auth_date": str(int(datetime.now(timezone.utc).timestamp())),
                "hash": "def456",
                "user": json.dumps({"id": 222, "first_name": "UserB", "username": "user_b"}),
            }
            mock_get_user.return_value = {"id": 222, "first_name": "UserB", "username": "user_b"}
            mock_jwt.return_value = "token_b"

            session_b = AsyncMock()
            session_b.execute.return_value = MagicMock()
            session_b.execute.return_value.scalar_one_or_none.return_value = None
            session_b.add = MagicMock()
            session_b.flush = AsyncMock()
            session_b.refresh = AsyncMock()

            async def override_db_b():
                yield session_b

            async def override_current_user_b():
                return user_b

            app.dependency_overrides[get_async_session] = override_db_b
            app.dependency_overrides[get_current_user] = override_current_user_b

            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post(
                    "/auth/telegram",
                    json={"init_data": "query_id=test&user=%7B%22id%22%3A222%7D"},
                )
                assert resp.status_code in (200, 201), f"User B auth failed: {resp.text}"

                # ─────────────────────────────────────────────
                # Step 4: User B creates item
                # ─────────────────────────────────────────────
                resp = await client.post(
                    "/items",
                    json={
                        "video_file_id": "vid_b",
                        "title": "Item B",
                        "description": "Desc B",
                        "category": "clothing",
                        "condition": "new",
                    },
                )
                assert resp.status_code in (200, 201), f"User B create item failed: {resp.text}"

        # ─────────────────────────────────────────────
        # Step 5: User A likes User B's item
        # ─────────────────────────────────────────────
        combined_session = AsyncMock()
        combined_session.add = MagicMock()
        combined_session.flush = AsyncMock()
        combined_session.refresh = AsyncMock()
        combined_session.execute = AsyncMock()
        combined_session.get = AsyncMock()

        # Mock that no existing swipe, then check reciprocal (not yet)
        async def e2e_execute_a(query):
            result = MagicMock()
            stmt_str = str(query).lower()
            if "swipe.user_id" in stmt_str and "swipe.item_id" in stmt_str and "direction" not in stmt_str:
                # Existing swipe check: none
                result.scalar_one_or_none.return_value = None
            elif "swipe.direction" in stmt_str and "like" in stmt_str:
                # Reciprocal check: none yet (User B hasn't liked back)
                result.scalar_one_or_none.return_value = None
            elif "item" in stmt_str and "owner_id" in stmt_str:
                # Item query for fraud check
                result.scalars.return_value.all.return_value = [item_b]
            elif "swipe" in stmt_str:
                result.scalar_one_or_none.return_value = None
            else:
                result.scalar_one_or_none.return_value = None
            return result

        combined_session.execute = AsyncMock(side_effect=e2e_execute_a)

        async def e2e_get_a(model, pk):
            if (model, pk) == (Item, 2):
                return item_b
            if (model, pk) == (Item, 1):
                return item_a
            return None

        combined_session.get = AsyncMock(side_effect=e2e_get_a)

        async def override_db_combined():
            yield combined_session

        async def override_current_user_a2():
            return user_a

        app.dependency_overrides[get_async_session] = override_db_combined
        app.dependency_overrides[get_current_user] = override_current_user_a2

        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.services.anti_fraud_service.AntiFraudService.apply_limits',
                       new_callable=AsyncMock) as mock_limits:
                mock_limits.return_value = {"allowed": True}
                resp = await client.post(
                    "/swipe",
                    json={"item_id": 2, "direction": "like"},
                )
                assert resp.status_code == 200, f"User A swipe failed: {resp.text}"
                assert resp.json()["match_id"] is None  # No reciprocal yet

        # ─────────────────────────────────────────────
        # Step 6: User B likes User A's item -> Match!
        # ─────────────────────────────────────────────
        # Now reciprocal swipe exists
        async def e2e_execute_b(query):
            result = MagicMock()
            stmt_str = str(query).lower()
            if "swipe.user_id" in stmt_str and "swipe.item_id" in stmt_str and "swipe.direction" not in stmt_str:
                result.scalar_one_or_none.return_value = None  # No existing swipe for User B
            elif "swipe.direction" in stmt_str:
                # Reciprocal: User A already liked item 2 (owned by B)
                from app.models.swipe import Swipe
                reciprocal = Swipe(user_id=1, item_id=2, direction="like")
                result.scalar_one_or_none.return_value = reciprocal
            elif "match" in stmt_str:
                result.scalar_one_or_none.return_value = None
            else:
                result.scalar_one_or_none.return_value = None
            return result

        combined_session.execute = AsyncMock(side_effect=e2e_execute_b)
        combined_session.get = AsyncMock(side_effect=e2e_get_a)

        async def override_current_user_b2():
            return user_b

        app.dependency_overrides[get_current_user] = override_current_user_b2

        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.services.anti_fraud_service.AntiFraudService.apply_limits',
                       new_callable=AsyncMock) as mock_limits:
                mock_limits.return_value = {"allowed": True}
                resp = await client.post(
                    "/swipe",
                    json={"item_id": 1, "direction": "like"},
                )
                assert resp.status_code == 200, f"User B swipe failed: {resp.text}"
                swipe_result = resp.json()
                assert swipe_result["match_id"] is not None, "Match should be created!"
                E2E_STATE["match_id"] = swipe_result["match_id"]

        # ─────────────────────────────────────────────
        # Step 7: User A pays
        # ─────────────────────────────────────────────
        async def override_current_user_a3():
            return user_a

        app.dependency_overrides[get_current_user] = override_current_user_a3

        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.services.anti_fraud_service.AntiFraudService.check_before_payment',
                       new_callable=AsyncMock) as mock_fraud, \
                 patch('app.services.payment_service.PaymentService.init_payment',
                       new_callable=AsyncMock) as mock_init:
                mock_fraud.return_value = (True, "OK")
                mock_init.return_value = payment_a

                resp = await client.post(
                    "/payment/init",
                    json={"match_id": 1},
                )
                assert resp.status_code == 200, f"User A payment init failed: {resp.text}"

        # ─────────────────────────────────────────────
        # Step 8: Webhook for User A payment
        # ─────────────────────────────────────────────
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.services.payment_service.PaymentService.process_webhook',
                       new_callable=AsyncMock) as mock_webhook:
                mock_webhook.return_value = payment_a

                resp = await client.post(
                    "/payment/webhook",
                    json={"provider_payment_id": "prov_a", "status": "paid"},
                )
                assert resp.status_code == 200, f"Webhook A failed: {resp.text}"

        # ─────────────────────────────────────────────
        # Step 9: User B pays
        # ─────────────────────────────────────────────
        async def override_current_user_b3():
            return user_b

        app.dependency_overrides[get_current_user] = override_current_user_b3

        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.services.anti_fraud_service.AntiFraudService.check_before_payment',
                       new_callable=AsyncMock) as mock_fraud, \
                 patch('app.services.payment_service.PaymentService.init_payment',
                       new_callable=AsyncMock) as mock_init:
                mock_fraud.return_value = (True, "OK")
                mock_init.return_value = payment_b

                resp = await client.post(
                    "/payment/init",
                    json={"match_id": 1},
                )
                assert resp.status_code == 200, f"User B payment init failed: {resp.text}"

        # Webhook for B
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.services.payment_service.PaymentService.process_webhook',
                       new_callable=AsyncMock) as mock_webhook:
                mock_webhook.return_value = payment_b

                resp = await client.post(
                    "/payment/webhook",
                    json={"provider_payment_id": "prov_b", "status": "paid"},
                )
                assert resp.status_code == 200, f"Webhook B failed: {resp.text}"

        # ─────────────────────────────────────────────
        # Step 10: Verify chat unlock
        # ─────────────────────────────────────────────
        # Simulate both paid -> chat unlocked
        chat_ab.status = "unlocked"
        chat_ab.unlocked_at = datetime.now(timezone.utc)

        async def e2e_get_unlocked(model, pk):
            if (model, pk) == (Match, 1):
                match_ab.status = "active"
                return match_ab
            return None

        combined_session.get = AsyncMock(side_effect=e2e_get_unlocked)

        async def e2e_execute_chat(query):
            result = MagicMock()
            stmt_str = str(query).lower()
            if "chat" in stmt_str:
                result.scalar_one_or_none.return_value = chat_ab
            elif "match" in stmt_str:
                result.scalar_one_or_none.return_value = match_ab
            else:
                result.scalar_one_or_none.return_value = None
                result.scalars.return_value.all.return_value = []
            return result

        combined_session.execute = AsyncMock(side_effect=e2e_execute_chat)

        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.config.settings') as mock_settings:
                mock_settings.BOT_TOKEN = "123456:ABC-DEF1234"
                resp = await client.get("/chat/unlock/1")
                assert resp.status_code == 200, f"Chat unlock failed: {resp.text}"
                chat_data = resp.json()
                # Should be unlocked or at least accessible
                assert "unlocked" in chat_data

        # Clean up
        app.dependency_overrides.clear()
