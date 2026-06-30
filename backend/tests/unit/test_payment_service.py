"""
Unit tests for PaymentService.
Tests payment initialization, webhook processing, and dual-payment chat unlock.
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.payment_service import PaymentService
from app.models.payment import Payment
from app.models.match import Match
from app.models.chat import Chat


class TestPaymentService:
    """Tests for PaymentService."""

    @pytest.mark.asyncio
    async def test_init_payment_creates_payment(self, mock_db, sample_match):
        """init_payment creates a payment record with status='init'."""
        mock_db.get.return_value = sample_match
        mock_db.execute.return_value.scalar_one_or_none.return_value = None

        service = PaymentService(mock_db)
        payment = await service.init_payment(match_id=1, user_id=1)

        assert payment is not None
        assert payment.status == "init"
        assert payment.match_id == 1
        assert payment.user_id == 1
        assert float(payment.amount) == 0.5

    @pytest.mark.asyncio
    async def test_init_payment_raises_for_nonexistent_match(self, mock_db):
        """init_payment raises ValueError for non-existent match."""
        mock_db.get.return_value = None
        service = PaymentService(mock_db)
        with pytest.raises(ValueError, match="Match not found"):
            await service.init_payment(match_id=999, user_id=1)

    @pytest.mark.asyncio
    async def test_init_payment_raises_for_non_participant(self, mock_db, sample_match):
        """init_payment raises ValueError when user is not in match."""
        mock_db.get.return_value = sample_match
        mock_db.execute.return_value.scalar_one_or_none.return_value = None

        service = PaymentService(mock_db)
        with pytest.raises(ValueError, match="User is not part of this match"):
            await service.init_payment(match_id=1, user_id=999)

    @pytest.mark.asyncio
    async def test_init_payment_returns_existing(self, mock_db, sample_match, sample_payment):
        """init_payment returns existing payment if already created."""
        mock_db.get.return_value = sample_match
        mock_db.execute.return_value.scalar_one_or_none.return_value = sample_payment

        service = PaymentService(mock_db)
        payment = await service.init_payment(match_id=1, user_id=1)
        assert payment.id == sample_payment.id

    @pytest.mark.asyncio
    async def test_process_webhook_init_to_paid(self, mock_db, sample_payment):
        """process_webhook transitions payment from init to paid."""
        sample_payment.status = "init"
        mock_db.execute.return_value.scalar_one_or_none.return_value = sample_payment

        service = PaymentService(mock_db)
        with patch.object(service, '_check_both_paid_and_unlock', return_value=False):
            payment = await service.process_webhook(
                provider_payment_id="prov_123",
                status="paid",
            )
            assert payment is not None
            assert payment.status == "paid"

    @pytest.mark.asyncio
    async def test_process_webhook_payment_not_found(self, mock_db):
        """process_webhook returns None for unknown provider_payment_id."""
        mock_db.execute.return_value.scalar_one_or_none.return_value = None

        service = PaymentService(mock_db)
        payment = await service.process_webhook(
            provider_payment_id="unknown",
            status="paid",
        )
        assert payment is None

    @pytest.mark.asyncio
    async def test_check_both_paid_false(self, mock_db, sample_match):
        """check_both_paid returns False when only one user paid."""
        mock_db.get.return_value = sample_match

        payment_a = Payment(id=1, match_id=1, user_id=1, amount=0.5, status="paid")
        payments_result = MagicMock()
        payments_result.scalars.return_value.all.return_value = [payment_a]
        mock_db.execute.return_value = payments_result

        service = PaymentService(mock_db)
        both_paid = await service.check_both_paid(match_id=1)
        assert both_paid is False

    @pytest.mark.asyncio
    async def test_check_both_paid_true_and_unlock(self, mock_db, sample_match, sample_chat):
        """check_both_paid returns True and unlocks chat when both paid."""
        mock_db.get.return_value = sample_match

        payment_a = Payment(id=1, match_id=1, user_id=1, amount=0.5, status="paid")
        payment_b = Payment(id=2, match_id=1, user_id=2, amount=0.5, status="paid")
        payments_result = MagicMock()
        payments_result.scalars.return_value.all.return_value = [payment_a, payment_b]

        chat_result = MagicMock()
        chat_result.scalar_one_or_none.return_value = sample_chat

        # First call: payments query; second call: chat query
        mock_db.execute.side_effect = [payments_result, chat_result]

        service = PaymentService(mock_db)
        both_paid = await service.check_both_paid(match_id=1)

        assert both_paid is True
        assert sample_chat.status == "unlocked"
        assert sample_chat.unlocked_at is not None
        assert sample_match.status == "active"

    @pytest.mark.asyncio
    async def test_get_payment_status(self, mock_db, sample_payment):
        """get_payment_status returns the payment record."""
        mock_db.execute.return_value.scalar_one_or_none.return_value = sample_payment

        service = PaymentService(mock_db)
        payment = await service.get_payment_status(match_id=1, user_id=1)
        assert payment is not None
        assert payment.id == sample_payment.id

    @pytest.mark.asyncio
    async def test_get_payment_status_not_found(self, mock_db):
        """get_payment_status returns None when no payment exists."""
        mock_db.execute.return_value.scalar_one_or_none.return_value = None

        service = PaymentService(mock_db)
        payment = await service.get_payment_status(match_id=1, user_id=1)
        assert payment is None

    @pytest.mark.asyncio
    async def test_process_webhook_sets_failed(self, mock_db, sample_payment):
        """process_webhook correctly sets status='failed'."""
        sample_payment.status = "init"
        mock_db.execute.return_value.scalar_one_or_none.return_value = sample_payment

        service = PaymentService(mock_db)
        with patch.object(service, '_check_both_paid_and_unlock', return_value=False):
            payment = await service.process_webhook(
                provider_payment_id="prov_123",
                status="failed",
            )
            assert payment is not None
            assert payment.status == "failed"

    @pytest.mark.asyncio
    async def test_process_webhook_sets_refunded(self, mock_db, sample_payment):
        """process_webhook transitions paid->refunded."""
        sample_payment.status = "paid"
        mock_db.execute.return_value.scalar_one_or_none.return_value = sample_payment

        service = PaymentService(mock_db)
        with patch.object(service, '_check_both_paid_and_unlock', return_value=False):
            payment = await service.process_webhook(
                provider_payment_id="prov_123",
                status="refunded",
            )
            assert payment is not None
            assert payment.status == "refunded"
