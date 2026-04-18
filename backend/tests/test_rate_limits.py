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