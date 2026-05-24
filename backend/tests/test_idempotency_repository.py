"""Unit tests for appraise idempotency persistence."""

from unittest.mock import MagicMock, patch

from backend.services.idempotency import AppraiseIdempotencyRepository


def _chainable_query_with_data(data):
    query = MagicMock()
    query.eq.return_value = query
    query.gt.return_value = query
    query.order.return_value = query
    query.limit.return_value = query
    query.execute.return_value = MagicMock(data=data)
    return query


class TestAppraiseIdempotencyRepository:
    @patch("backend.services.idempotency.get_supabase")
    def test_start_request_reserves_new_key(self, mock_get_supabase):
        client = MagicMock()
        table = client.table.return_value
        table.insert.return_value.execute.return_value = MagicMock(data=[{"id": "1"}])
        mock_get_supabase.return_value = client

        repo = AppraiseIdempotencyRepository()
        claim = repo.start_request(
            principal_type="guest",
            principal_id="guest-123",
            idempotency_key="idem-abc",
        )

        assert claim.status == "started"
        payload = table.insert.call_args.args[0]
        assert payload["endpoint"] == "/api/appraise"
        assert payload["principal_type"] == "guest"
        assert payload["principal_id"] == "guest-123"
        assert payload["idempotency_key"] == "idem-abc"
        assert payload["state"] == "processing"

    @patch("backend.services.idempotency.get_supabase")
    def test_start_request_returns_completed_replay(self, mock_get_supabase):
        client = MagicMock()
        query = _chainable_query_with_data(
            [
                {
                    "state": "completed",
                    "status_code": 200,
                    "response_body": {"valuation_id": "uuid-1"},
                    "expires_at": "2999-01-01T00:00:00+00:00",
                }
            ]
        )
        client.table.return_value.insert.return_value.execute.side_effect = RuntimeError(
            "duplicate"
        )
        client.table.return_value.select.return_value = query
        mock_get_supabase.return_value = client

        repo = AppraiseIdempotencyRepository()
        claim = repo.start_request(
            principal_type="guest",
            principal_id="guest-123",
            idempotency_key="idem-abc",
        )

        assert claim.status == "replay"
        assert claim.replay is not None
        assert claim.replay.status_code == 200
        assert claim.replay.response_body["valuation_id"] == "uuid-1"

    @patch("backend.services.idempotency.get_supabase")
    def test_start_request_returns_in_progress_for_processing_duplicate(
        self,
        mock_get_supabase,
    ):
        client = MagicMock()
        query = _chainable_query_with_data(
            [
                {
                    "state": "processing",
                    "status_code": 202,
                    "response_body": {},
                    "expires_at": "2999-01-01T00:00:00+00:00",
                }
            ]
        )
        client.table.return_value.insert.return_value.execute.side_effect = RuntimeError(
            "duplicate"
        )
        client.table.return_value.select.return_value = query
        mock_get_supabase.return_value = client

        repo = AppraiseIdempotencyRepository()
        claim = repo.start_request(
            principal_type="guest",
            principal_id="guest-123",
            idempotency_key="idem-abc",
        )

        assert claim.status == "in_progress"

    @patch("backend.services.idempotency.get_supabase")
    def test_complete_request_updates_scoped_record(self, mock_get_supabase):
        client = MagicMock()
        table = client.table.return_value
        update_query = MagicMock()
        update_query.eq.return_value = update_query
        update_query.execute.return_value = MagicMock(data=[{"id": "1"}])
        table.update.return_value = update_query
        mock_get_supabase.return_value = client

        repo = AppraiseIdempotencyRepository()
        ok = repo.complete_request(
            principal_type="guest",
            principal_id="guest-123",
            idempotency_key="idem-abc",
            response_body={"valuation_id": "uuid-1"},
            status_code=200,
            valuation_id="uuid-1",
        )

        assert ok is True
        payload = table.update.call_args.args[0]
        assert payload["state"] == "completed"
        assert payload["response_body"]["valuation_id"] == "uuid-1"
        update_query.eq.assert_any_call("endpoint", "/api/appraise")
        update_query.eq.assert_any_call("principal_type", "guest")
        update_query.eq.assert_any_call("principal_id", "guest-123")
        update_query.eq.assert_any_call("idempotency_key", "idem-abc")
