"""Tests for Story 4.11: guest data migration and server history fetch."""

from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.models import ValuationRecord
from backend.rate_limit import user_rate_limiter


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    user_rate_limiter.reset()
    yield
    user_rate_limiter.reset()


def _supabase_with_user(user_id: str = "user-123"):
    supabase = MagicMock()
    supabase.auth.get_user.return_value = MagicMock(user=MagicMock(id=user_id))
    return supabase


def _valuation_record() -> ValuationRecord:
    return ValuationRecord(
        id="valuation-1",
        user_id="user-123",
        item_name="Seiko SKX007",
        item_type="watch",
        brand="Seiko",
        price_min=Decimal("100.00"),
        price_max=Decimal("200.00"),
        fair_market_value=Decimal("150.00"),
        confidence="HIGH",
        sample_size=12,
        image_thumbnail_url="https://example.com/thumb.jpg",
        ai_response={
            "item_type": "watch",
            "brand": "Seiko",
            "model": "SKX007",
            "visual_condition": "used_good",
            "condition_details": "Minor wear",
            "estimated_age": "2010s",
            "category_hint": "Watches",
            "search_keywords": ["Seiko", "SKX007"],
            "identifiers": {
                "UPC": None,
                "model_number": "SKX007",
                "serial_number": None,
            },
        },
        ebay_data={
            "status": "success",
            "keywords": "seiko skx007",
            "total_found": 20,
            "prices_analyzed": 12,
            "price_range": {"min": 100.0, "max": 200.0},
            "fair_market_value": 150.0,
            "mean": 148.0,
            "std_dev": 12.0,
            "avg_days_to_sell": 5,
            "confidence": "HIGH",
        },
        confidence_data={"market_confidence": "HIGH"},
        created_at=datetime(2026, 4, 1, 12, 0, tzinfo=timezone.utc),
    )


class TestMigrateGuest:
    @patch("backend.main.get_user_supabase")
    @patch("backend.main.get_supabase")
    def test_migrate_success(self, mock_get_supabase, mock_get_user_supabase, client):
        supabase = _supabase_with_user()
        user_supabase = MagicMock()
        user_supabase.table.return_value.update.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[{"id": "1"}, {"id": "2"}]
        )
        mock_get_supabase.return_value = supabase
        mock_get_user_supabase.return_value = user_supabase

        resp = client.post(
            "/api/migrate-guest",
            headers={"Authorization": "Bearer valid-token"},
            json={"guest_session_id": "guest-123"},
        )

        assert resp.status_code == 200
        assert resp.json() == {"migrated": 2}
        supabase.auth.get_user.assert_called_once_with("valid-token")
        user_supabase.table.assert_called_once_with("valuations")
        user_supabase.table.return_value.update.assert_called_once_with({"user_id": "user-123"})
        user_supabase.table.return_value.update.return_value.eq.assert_called_once_with(
            "guest_session_id", "guest-123"
        )
        user_supabase.table.return_value.update.return_value.eq.return_value.is_.assert_called_once_with(
            "user_id", "null"
        )

    @patch("backend.main.get_user_supabase")
    @patch("backend.main.get_supabase")
    def test_migrate_missing_auth_header(self, mock_get_supabase, mock_get_user_supabase, client):
        resp = client.post("/api/migrate-guest", json={"guest_session_id": "guest-123"})

        assert resp.status_code == 401
        assert resp.json()["detail"] == "Missing or invalid Authorization header"
        mock_get_supabase.assert_not_called()
        mock_get_user_supabase.assert_not_called()

    @patch("backend.main.get_user_supabase")
    @patch("backend.main.get_supabase")
    def test_migrate_invalid_token(self, mock_get_supabase, mock_get_user_supabase, client):
        supabase = MagicMock()
        supabase.auth.get_user.side_effect = ValueError("bad token")
        mock_get_supabase.return_value = supabase

        resp = client.post(
            "/api/migrate-guest",
            headers={"Authorization": "Bearer invalid-token"},
            json={"guest_session_id": "guest-123"},
        )

        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid or expired token"
        mock_get_user_supabase.assert_not_called()

    @patch("backend.main.get_user_supabase")
    @patch("backend.main.get_supabase")
    def test_migrate_empty_session_id(self, mock_get_supabase, mock_get_user_supabase, client):
        resp = client.post(
            "/api/migrate-guest",
            headers={"Authorization": "Bearer valid-token"},
            json={"guest_session_id": ""},
        )

        assert resp.status_code == 422
        mock_get_supabase.assert_not_called()
        mock_get_user_supabase.assert_not_called()

    @patch("backend.main.get_user_supabase")
    @patch("backend.main.get_supabase")
    def test_migrate_zero_rows(self, mock_get_supabase, mock_get_user_supabase, client):
        supabase = _supabase_with_user()
        user_supabase = MagicMock()
        user_supabase.table.return_value.update.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[]
        )
        mock_get_supabase.return_value = supabase
        mock_get_user_supabase.return_value = user_supabase

        resp = client.post(
            "/api/migrate-guest",
            headers={"Authorization": "Bearer valid-token"},
            json={"guest_session_id": "guest-123"},
        )

        assert resp.status_code == 200
        assert resp.json() == {"migrated": 0}

    @patch("backend.main.get_user_supabase")
    @patch("backend.main.get_supabase")
    def test_migrate_is_null_filter_applied(self, mock_get_supabase, mock_get_user_supabase, client):
        supabase = _supabase_with_user()
        user_supabase = MagicMock()
        user_supabase.table.return_value.update.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[{"id": "1"}]
        )
        mock_get_supabase.return_value = supabase
        mock_get_user_supabase.return_value = user_supabase

        resp = client.post(
            "/api/migrate-guest",
            headers={"Authorization": "Bearer valid-token"},
            json={"guest_session_id": "guest-abc"},
        )

        assert resp.status_code == 200
        user_supabase.table.return_value.update.assert_called_once_with({"user_id": "user-123"})
        user_supabase.table.return_value.update.return_value.eq.return_value.is_.assert_called_once_with(
            "user_id", "null"
        )

    @patch("backend.main.get_user_supabase")
    @patch("backend.main.get_supabase")
    def test_migrate_db_failure(self, mock_get_supabase, mock_get_user_supabase, client):
        supabase = _supabase_with_user()
        user_supabase = MagicMock()
        user_supabase.table.return_value.update.return_value.eq.return_value.is_.return_value.execute.side_effect = RuntimeError(
            "db failed"
        )
        mock_get_supabase.return_value = supabase
        mock_get_user_supabase.return_value = user_supabase

        resp = client.post(
            "/api/migrate-guest",
            headers={"Authorization": "Bearer valid-token"},
            json={"guest_session_id": "guest-123"},
        )

        assert resp.status_code == 500
        assert resp.json()["detail"] == "Failed to migrate guest data"


class TestGetValuations:
    @patch("backend.main.ValuationRepository")
    @patch("backend.main.get_user_supabase")
    @patch("backend.main.get_supabase")
    def test_get_valuations_success(
        self,
        mock_get_supabase,
        mock_get_user_supabase,
        mock_repo_cls,
        client,
    ):
        mock_get_supabase.return_value = _supabase_with_user()
        mock_get_user_supabase.return_value = MagicMock()
        mock_repo_cls.return_value.get_by_user.return_value = [_valuation_record()]

        resp = client.get(
            "/api/valuations",
            headers={"Authorization": "Bearer valid-token"},
        )

        assert resp.status_code == 200
        assert mock_repo_cls.return_value.get_by_user.call_args.args == ("user-123",)

        body = resp.json()
        assert len(body["valuations"]) == 1
        assert body["valuations"][0]["id"] == "valuation-1"
        assert body["valuations"][0]["item_name"] == "Seiko SKX007"
        assert body["valuations"][0]["brand"] == "Seiko"
        assert body["valuations"][0]["fair_market_value"] == 150.0
        assert body["valuations"][0]["image_thumbnail_url"] == "https://example.com/thumb.jpg"
        assert body["valuations"][0]["created_at"] == "2026-04-01T12:00:00+00:00"

    @patch("backend.main.ValuationRepository")
    @patch("backend.main.get_user_supabase")
    @patch("backend.main.get_supabase")
    def test_get_valuations_missing_auth_header(
        self,
        mock_get_supabase,
        mock_get_user_supabase,
        mock_repo_cls,
        client,
    ):
        resp = client.get("/api/valuations")

        assert resp.status_code == 401
        assert resp.json()["detail"] == "Missing or invalid Authorization header"
        mock_get_supabase.assert_not_called()
        mock_get_user_supabase.assert_not_called()
        mock_repo_cls.assert_not_called()

    @patch("backend.main.ValuationRepository")
    @patch("backend.main.get_user_supabase")
    @patch("backend.main.get_supabase")
    def test_get_valuations_invalid_token(
        self,
        mock_get_supabase,
        mock_get_user_supabase,
        mock_repo_cls,
        client,
    ):
        supabase = MagicMock()
        supabase.auth.get_user.side_effect = ValueError("bad token")
        mock_get_supabase.return_value = supabase

        resp = client.get(
            "/api/valuations",
            headers={"Authorization": "Bearer invalid-token"},
        )

        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid or expired token"
        mock_get_user_supabase.assert_not_called()
        mock_repo_cls.assert_not_called()