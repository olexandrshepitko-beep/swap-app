"""
Fuzz tests for PaymentService.
Uses Hypothesis to generate random match_ids, user_ids, and amounts.
Verifies that the payment state machine never panics or throws unexpected errors.
"""
from unittest.mock import AsyncMock, MagicMock

import pytest
from hypothesis import given, strategies as st

from app.services.payment_service import PaymentService
from app.models.payment import Payment


# Fuzz strategies
match_ids = st.integers(min_value=1, max_value=100000)
user_ids = st.integers(min_value=1, max_value=100000)
amounts = st.floats(min_value=0.01, max_value=1000.0, allow_nan=False, allow_infinity=False)
webhook_statuses = st.sampled_from(["paid", "refunded", "failed", "init", "unknown"])
provider_payment_ids = st.text(min_size=1, max_size=100, alphabet="abcdefghijklmnopqrstuvwxyz0123456789_")


class TestPaymentFuzz:
    """Fuzz tests for payment service — no crashes allowed."""

    @given(match_id=match_ids, user_id=user_ids)
    @pytest.mark.asyncio
    async def test_init_payment_fuzz(self, match_id, user_id):
        """
        Fuzz: init_payment should handle any valid ints without crashing.
        It may raise ValueError for invalid states, but never RuntimeException.
        """
        mock_db = AsyncMock()
        mock_db.get.return_value = None  # Match not found -> ValueError
        mock_db.execute.return_value = MagicMock()
        mock_db.execute.return_value.scalar_one_or_none.return_value = None
        mock_db.add = MagicMock()
        mock_db.flush = AsyncMock()

        service = PaymentService(mock_db)
        try:
            result = await service.init_payment(match_id=match_id, user_id=user_id)
            # If we get here, match existed and payment was created
            assert result is not None
        except ValueError:
            # Expected: match not found or user not in match
            pass
        except Exception as e:
            pytest.fail(f"init_payment raised unexpected {type(e).__name__}: {e}")

    @given(provider_payment_id=provider_payment_ids, status=webhook_statuses)
    @pytest.mark.asyncio
    async def test_process_webhook_fuzz(self, provider_payment_id, status):
        """
        Fuzz: process_webhook should handle random inputs without panicking.
        """
        mock_db = AsyncMock()

        # Simulate a payment being found for the first few calls
        mock_payment = Payment(
            id=1,
            match_id=1,
            user_id=1,
            amount=0.5,
            currency="USD",
            provider="telegram",
            status="init",
        )

        async def mock_execute(query):
            result = MagicMock()
            stmt_str = str(query).lower()
            if "payment" in stmt_str:
                result.scalar_one_or_none.return_value = mock_payment
            else:
                result.scalar_one_or_none.return_value = None
                result.scalars.return_value.all.return_value = []
            return result

        mock_db.execute = AsyncMock(side_effect=mock_execute)
        mock_db.get.return_value = None
        mock_db.flush = AsyncMock()

        service = PaymentService(mock_db)
        try:
            result = await service.process_webhook(
                provider_payment_id=provider_payment_id,
                status=status,
            )
            # Should either return None or a Payment
            assert result is None or isinstance(result, Payment)
        except Exception as e:
            pytest.fail(f"process_webhook raised unexpected {type(e).__name__}: {e}")

    @given(match_id=match_ids)
    @pytest.mark.asyncio
    async def test_check_both_paid_fuzz(self, match_id):
        """
        Fuzz: check_both_paid should handle any match_id without crashing.
        """
        mock_db = AsyncMock()
        mock_db.get.return_value = None  # Match not found
        mock_db.execute.return_value = MagicMock()
        mock_db.execute.return_value.scalars.return_value.all.return_value = []

        service = PaymentService(mock_db)
        try:
            result = await service.check_both_paid(match_id=match_id)
            assert isinstance(result, bool)
        except Exception as e:
            pytest.fail(f"check_both_paid raised unexpected {type(e).__name__}: {e}")

    @given(match_id=match_ids, user_id=user_ids)
    @pytest.mark.asyncio
    async def test_get_payment_status_fuzz(self, match_id, user_id):
        """
        Fuzz: get_payment_status should handle random params without crashing.
        """
        mock_db = AsyncMock()
        mock_db.execute.return_value = MagicMock()
        mock_db.execute.return_value.scalar_one_or_none.return_value = None

        service = PaymentService(mock_db)
        try:
            result = await service.get_payment_status(
                match_id=match_id, user_id=user_id
            )
            assert result is None or isinstance(result, Payment)
        except Exception as e:
            pytest.fail(f"get_payment_status raised unexpected {type(e).__name__}: {e}")
