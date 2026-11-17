from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend import main as backend_main
from backend.main import app
from backend.rate_limit import RateLimitRule, user_rate_limiter


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


class TestAuthenticatedRateLimits:
    @patch("backend.main.get_user_supabase")
    @patch("backend.main.get_supabase")
    def test_delete_account_rate_limited_returns_429(
        self,
        mock_get_supabase,
        mock_get_user_supabase,
        client,
        monkeypatch,
    ):
        monkeypatch.setattr(backend_main, "DELETE_ACCOUNT_RATE_LIMIT", RateLimitRule.parse("1/hour"))
        mock_get_supabase.return_value = _supabase_with_user()
        mock_get_user_supabase.return_value = MagicMock()

        first = client.delete("/api/account", headers={"Authorization": "Bearer valid-token"})
        second = client.delete("/api/account", headers={"Authorization": "Bearer valid-token"})

        assert first.status_code == 200
        assert second.status_code == 429
        assert second.json()["detail"] == "Rate limit exceeded. Please try again later."
        assert second.headers["Retry-After"]

    @patch("backend.main.get_user_supabase")
    @patch("backend.main.get_supabase")
    def test_migrate_guest_rate_limited_returns_429(
        self,
        mock_get_supabase,
        mock_get_user_supabase,
        client,
        monkeypatch,
    ):
        monkeypatch.setattr(backend_main, "MIGRATE_GUEST_RATE_LIMIT", RateLimitRule.parse("1/hour"))
        mock_get_supabase.return_value = _supabase_with_user()
        user_supabase = MagicMock()
        user_supabase.table.return_value.update.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[{"id": "1"}]
        )
        mock_get_user_supabase.return_value = user_supabase

        first = client.post(
            "/api/migrate-guest",
            headers={"Authorization": "Bearer valid-token"},
            json={"guest_session_id": "guest-123"},
        )
        second = client.post(
            "/api/migrate-guest",
            headers={"Authorization": "Bearer valid-token"},
            json={"guest_session_id": "guest-123"},
        )

        assert first.status_code == 200
        assert second.status_code == 429
        assert second.headers["Retry-After"]

    @patch("backend.main.ValuationRepository")
    @patch("backend.main.get_user_supabase")
    @patch("backend.main.get_supabase")
    def test_get_valuations_rate_limited_returns_429(
        self,
        mock_get_supabase,
        mock_get_user_supabase,
        mock_repo_cls,
        client,
        monkeypatch,
    ):
        monkeypatch.setattr(backend_main, "GET_VALUATIONS_RATE_LIMIT", RateLimitRule.parse("1/minute"))
        mock_get_supabase.return_value = _supabase_with_user()
        mock_get_user_supabase.return_value = MagicMock()
        mock_repo_cls.return_value.get_by_user.return_value = []

        first = client.get("/api/valuations", headers={"Authorization": "Bearer valid-token"})
        second = client.get("/api/valuations", headers={"Authorization": "Bearer valid-token"})

        assert first.status_code == 200
        assert second.status_code == 429
        assert second.headers["Retry-After"]


TINY_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="


def _make_fake_identity():
    identity = MagicMock()
    identity.model_dump.return_value = {
        "item_type": "watch",
        "brand": "Seiko",
        "model": "SKX007",
        "visual_condition": "used_good",
        "condition_details": "Minor scratches",
        "estimated_age": "2010s",
        "category_hint": "watches",
        "search_keywords": ["seiko", "skx007"],
        "identifiers": {"UPC": None, "model_number": "SKX007", "serial_number": None},
        "description": "A classic dive watch",
        "ai_identification_confidence": "HIGH",
    }
    identity.ai_identification_confidence = "HIGH"
    return identity


FAKE_MARKET_DATA = {
    "status": "success",
    "keywords": "seiko skx007",
    "total_found": 25,
    "prices_analyzed": 20,
    "outliers_removed": 2,
    "price_range": {"min": 150.0, "max": 350.0},
    "fair_market_value": 249.99,
    "mean": 245.0,
    "std_dev": 30.0,
    "avg_days_to_sell": 5,
    "confidence": "HIGH",
}

FAKE_CONFIDENCE_RESULT = MagicMock()
FAKE_CONFIDENCE_RESULT.market_confidence = "HIGH"
FAKE_CONFIDENCE_RESULT.to_dict.return_value = {
    "market_confidence": "HIGH",
    "confidence_factors": {
        "sample_size": 20,
        "variance_pct": 12.0,
        "ai_confidence": "HIGH",
        "data_source": "primary",
        "data_source_penalty": False,
    },
    "ai_only_flag": False,
    "confidence_message": "Strong market data available",
}


def _stub_successful_appraise(mock_ai, mock_ebay, mock_confidence, mock_repo_cls):
    mock_ai.return_value = _make_fake_identity()
    mock_ebay.return_value = FAKE_MARKET_DATA
    mock_confidence.return_value = FAKE_CONFIDENCE_RESULT
    mock_repo_cls.return_value.save.return_value = "valuation-123"


class TestAppraiseRateLimits:
    @patch("backend.main.ValuationRepository")
    @patch("backend.main.calculate_market_confidence")
    @patch("backend.main.get_market_data_for_item")
    @patch("backend.main.identify_item_from_image")
    def test_appraise_guest_rate_limited_returns_429(
        self,
        mock_identify_item,
        mock_get_market_data,
        mock_confidence,
        mock_repo_cls,
        client,
        monkeypatch,
    ):
        monkeypatch.setattr(backend_main, "APPRAISE_RATE_LIMIT_GUEST", RateLimitRule.parse("1/hour"))
        _stub_successful_appraise(mock_identify_item, mock_get_market_data, mock_confidence, mock_repo_cls)

        payload = {
            "image_base64": TINY_PNG_B64,
            "guest_session_id": "guest-456",
        }

        first = client.post("/api/appraise", json=payload)
        second = client.post("/api/appraise", json=payload)

        assert first.status_code == 200
        assert second.status_code == 429
        assert second.headers["Retry-After"]
        assert mock_identify_item.call_count == 1

    @patch("backend.main.get_supabase")
    @patch("backend.main.ValuationRepository")
    @patch("backend.main.calculate_market_confidence")
    @patch("backend.main.get_market_data_for_item")
    @patch("backend.main.identify_item_from_image")
    def test_appraise_auth_rate_limited_returns_429(
        self,
        mock_identify_item,
        mock_get_market_data,
        mock_confidence,
        mock_repo_cls,
        mock_get_supabase,
        client,
        monkeypatch,
    ):
        monkeypatch.setattr(backend_main, "APPRAISE_RATE_LIMIT_AUTH", RateLimitRule.parse("1/hour"))
        mock_get_supabase.return_value = _supabase_with_user("auth-user-789")
        _stub_successful_appraise(mock_identify_item, mock_get_market_data, mock_confidence, mock_repo_cls)

        payload = {
            "image_base64": TINY_PNG_B64,
            "guest_session_id": "guest-456",
        }
        headers = {"Authorization": "Bearer valid-token"}

        first = client.post("/api/appraise", json=payload, headers=headers)
        second = client.post("/api/appraise", json=payload, headers=headers)

        assert first.status_code == 200
        assert second.status_code == 429
        assert second.headers["Retry-After"]
        mock_get_supabase.return_value.auth.get_user.assert_called_with("valid-token")

    @patch("backend.main.AppraiseIdempotencyRepository")
    @patch("backend.main.ValuationRepository")
    @patch("backend.main.calculate_market_confidence")
    @patch("backend.main.get_market_data_for_item")
    @patch("backend.main.identify_item_from_image")
    def test_appraise_idempotency_replay_does_not_consume_rate_limit(
        self,
        mock_identify_item,
        mock_get_market_data,
        mock_confidence,
        mock_repo_cls,
        mock_idempotency_repo_cls,
        client,
        monkeypatch,
    ):
        monkeypatch.setattr(backend_main, "APPRAISE_RATE_LIMIT_GUEST", RateLimitRule.parse("1/hour"))
        _stub_successful_appraise(mock_identify_item, mock_get_market_data, mock_confidence, mock_repo_cls)

        replay_body = {
            "identity": _make_fake_identity().model_dump(),
            "valuation": FAKE_MARKET_DATA,
            "confidence": FAKE_CONFIDENCE_RESULT.to_dict(),
            "valuation_id": "cached-123",
        }
        started = MagicMock(status="started", replay=None)
        replay = MagicMock(
            status="replay",
            replay=MagicMock(status_code=200, response_body=replay_body),
        )
        started_new_key = MagicMock(status="started", replay=None)
        mock_idempotency_repo = mock_idempotency_repo_cls.return_value
        mock_idempotency_repo.start_request.side_effect = [started, replay, started_new_key]

        payload = {
            "image_base64": TINY_PNG_B64,
            "guest_session_id": "guest-replay-test",
        }

        first = client.post(
            "/api/appraise",
            json=payload,
            headers={"Idempotency-Key": "test-replay-key"},
        )
        second = client.post(
            "/api/appraise",
            json=payload,
            headers={"Idempotency-Key": "test-replay-key"},
        )
        third = client.post(
            "/api/appraise",
            json=payload,
            headers={"Idempotency-Key": "different-key"},
        )

        assert first.status_code == 200
        assert second.status_code == 200
        assert second.json() == replay_body
        assert third.status_code == 429
        assert third.headers["Retry-After"]
        assert mock_identify_item.call_count == 1
        mock_idempotency_repo.abort_request.assert_called_once_with(
            principal_type="guest",
            principal_id="guest-replay-test",
            idempotency_key="different-key",
        )

    @patch("backend.main.AppraiseIdempotencyRepository")
    @patch("backend.main.ValuationRepository")
    @patch("backend.main.calculate_market_confidence")
    @patch("backend.main.get_market_data_for_item")
    @patch("backend.main.identify_item_from_image")
    def test_rate_limited_appraise_releases_idempotency_key(
        self,
        mock_identify_item,
        mock_get_market_data,
        mock_confidence,
        mock_repo_cls,
        mock_idempotency_repo_cls,
        client,
        monkeypatch,
    ):
        monkeypatch.setattr(backend_main, "APPRAISE_RATE_LIMIT_GUEST", RateLimitRule.parse("1/hour"))
        _stub_successful_appraise(mock_identify_item, mock_get_market_data, mock_confidence, mock_repo_cls)

        mock_idempotency_repo = mock_idempotency_repo_cls.return_value
        mock_idempotency_repo.start_request.side_effect = [
            MagicMock(status="started", replay=None),
            MagicMock(status="started", replay=None),
        ]

        payload = {
            "image_base64": TINY_PNG_B64,
            "guest_session_id": "guest-abort-test",
        }

        first = client.post(
            "/api/appraise",
            json=payload,
            headers={"Idempotency-Key": "first-key"},
        )
        second = client.post(
            "/api/appraise",
            json=payload,
            headers={"Idempotency-Key": "retry-after-429"},
        )

        assert first.status_code == 200
        assert second.status_code == 429
        mock_idempotency_repo.abort_request.assert_called_once_with(
            principal_type="guest",
            principal_id="guest-abort-test",
            idempotency_key="retry-after-429",
        )
