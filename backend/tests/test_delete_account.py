"""Tests for Story 4.10: DELETE /api/account."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.main import app
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


class TestDeleteAccount:
    @patch("backend.main.get_user_supabase")
    @patch("backend.main.get_supabase")
    def test_delete_account_success(self, mock_get_supabase, mock_get_user_supabase, client):
        supabase = _supabase_with_user()
        user_supabase = MagicMock()
        mock_get_supabase.return_value = supabase
        mock_get_user_supabase.return_value = user_supabase

        resp = client.delete(
            "/api/account",
            headers={"Authorization": "Bearer valid-token"},
        )

        assert resp.status_code == 200
        assert resp.json() == {"success": True}
        supabase.auth.get_user.assert_called_once_with("valid-token")
        user_supabase.table.assert_called_once_with("valuations")
        user_supabase.table.return_value.delete.assert_called_once()
        user_supabase.table.return_value.delete.return_value.eq.assert_called_once_with(
            "user_id", "user-123"
        )
        supabase.auth.admin.delete_user.assert_called_once_with("user-123")

    @patch("backend.main.get_user_supabase")
    @patch("backend.main.get_supabase")
    def test_delete_account_missing_auth_header(
        self,
        mock_get_supabase,
        mock_get_user_supabase,
        client,
    ):
        resp = client.delete("/api/account")

        assert resp.status_code == 401
        assert resp.json()["detail"] == "Missing or invalid Authorization header"
        mock_get_supabase.assert_not_called()
        mock_get_user_supabase.assert_not_called()

    @patch("backend.main.get_user_supabase")
    @patch("backend.main.get_supabase")
    def test_delete_account_invalid_token(
        self,
        mock_get_supabase,
        mock_get_user_supabase,
        client,
    ):
        supabase = MagicMock()
        supabase.auth.get_user.side_effect = ValueError("bad token")
        mock_get_supabase.return_value = supabase

        resp = client.delete(
            "/api/account",
            headers={"Authorization": "Bearer invalid-token"},
        )

        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid or expired token"
        supabase.auth.admin.delete_user.assert_not_called()
        mock_get_user_supabase.assert_not_called()

    @patch("backend.main.get_user_supabase")
    @patch("backend.main.get_supabase")
    def test_delete_account_valuations_delete_fails(
        self,
        mock_get_supabase,
        mock_get_user_supabase,
        client,
    ):
        supabase = _supabase_with_user()
        user_supabase = MagicMock()
        user_supabase.table.return_value.delete.return_value.eq.return_value.execute.side_effect = RuntimeError(
            "db failed"
        )
        mock_get_supabase.return_value = supabase
        mock_get_user_supabase.return_value = user_supabase

        resp = client.delete(
            "/api/account",
            headers={"Authorization": "Bearer valid-token"},
        )

        assert resp.status_code == 500
        assert resp.json()["detail"] == "Failed to delete account data"
        supabase.auth.admin.delete_user.assert_not_called()

    @patch("backend.main.get_user_supabase")
    @patch("backend.main.get_supabase")
    def test_delete_account_auth_delete_fails(
        self,
        mock_get_supabase,
        mock_get_user_supabase,
        client,
    ):
        supabase = _supabase_with_user()
        user_supabase = MagicMock()
        supabase.auth.admin.delete_user.side_effect = RuntimeError("auth failed")
        mock_get_supabase.return_value = supabase
        mock_get_user_supabase.return_value = user_supabase

        resp = client.delete(
            "/api/account",
            headers={"Authorization": "Bearer valid-token"},
        )

        assert resp.status_code == 500
        assert resp.json()["detail"] == "Failed to delete account"
        user_supabase.table.assert_called_once_with("valuations")
        supabase.auth.admin.delete_user.assert_called_once_with("user-123")