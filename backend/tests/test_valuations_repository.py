"""
Tests for ValuationRepository and ValuationRecord.
Story 3.1: Create Valuations Database Schema

Integration tests require SUPABASE_URL to be set; they are skipped otherwise.
Unit tests for the Pydantic model run without external dependencies.
"""
import os
import uuid

import pytest
from unittest.mock import MagicMock, patch

from backend.models import ValuationRecord
from backend.services.valuations import ValuationRepository

# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

SKIP_NO_SUPABASE = pytest.mark.skipif(
    not os.environ.get("SUPABASE_URL"),
    reason="SUPABASE_URL not set – skipping integration test",
)


def _sample_identity() -> dict:
    return {
        "item_type": "wireless headphones",
        "brand": "Sony",
        "model": "WH-1000XM4",
        "visual_condition": "used_good",
        "condition_details": "Minor scratches on headband",
        "estimated_age": "2021",
        "category_hint": "headphones",
        "search_keywords": ["Sony", "WH-1000XM4", "headphones"],
        "identifiers": {},
        "description": "Sony WH-1000XM4 wireless noise-cancelling headphones in good used condition.",
        "ai_identification_confidence": "HIGH",
    }


def _sample_valuation() -> dict:
    return {
        "price_range": {"min": 120.0, "max": 180.0},
        "fair_market_value": 150.0,
        "prices_analyzed": 25,
        "average_price": 148.50,
        "search_query": "Sony WH-1000XM4 headphones",
    }


def _sample_confidence() -> dict:
    return {
        "market_confidence": "HIGH",
        "confidence_factors": {
            "sample_size": 25,
            "variance_pct": 8.5,
            "ai_confidence": "HIGH",
            "data_source": "primary",
            "data_source_penalty": False,
        },
    }


def _make_record(**overrides) -> ValuationRecord:
    return ValuationRecord.from_appraise_response(
        identity_dict=_sample_identity(),
        valuation_dict=_sample_valuation(),
        confidence_dict=_sample_confidence(),
        **overrides,
    )


# ===========================================================================
# Unit tests — ValuationRecord model (no Supabase needed)
# ===========================================================================


class TestValuationRecordModel:
    def test_from_appraise_response_basic(self):
        record = _make_record()
        assert record.item_name == "Sony WH-1000XM4"
        assert record.item_type == "wireless headphones"
        assert record.brand == "Sony"
        assert record.confidence == "HIGH"
        assert record.sample_size == 25
        assert float(record.price_min) == 120.0
        assert float(record.price_max) == 180.0
        assert float(record.fair_market_value) == 150.0
        assert record.user_id is None
        assert record.guest_session_id is None

    def test_from_appraise_response_with_user(self):
        uid = str(uuid.uuid4())
        record = _make_record(user_id=uid)
        assert record.user_id == uid

    def test_from_appraise_response_with_guest_session(self):
        gsid = str(uuid.uuid4())
        record = _make_record(guest_session_id=gsid)
        assert record.guest_session_id == gsid

    def test_item_name_fallback_no_model(self):
        identity = _sample_identity()
        identity["model"] = "unknown"
        record = ValuationRecord.from_appraise_response(
            identity, _sample_valuation(), _sample_confidence()
        )
        assert record.item_name == "Sony wireless headphones"

    def test_item_name_fallback_no_brand(self):
        identity = _sample_identity()
        identity["model"] = "unknown"
        identity["brand"] = "unknown"
        record = ValuationRecord.from_appraise_response(
            identity, _sample_valuation(), _sample_confidence()
        )
        assert record.item_name == "wireless headphones"

    def test_jsonb_fields_stored(self):
        record = _make_record()
        assert record.ai_response == _sample_identity()
        assert record.ebay_data == _sample_valuation()
        assert record.confidence_data == _sample_confidence()

    def test_from_appraise_response_invalid_confidence(self):
        bad_confidence = {"market_confidence": "UNKNOWN"}
        with pytest.raises(ValueError, match="Invalid or missing market_confidence"):
            ValuationRecord.from_appraise_response(
                _sample_identity(), _sample_valuation(), bad_confidence
            )

    def test_from_appraise_response_missing_confidence_key(self):
        with pytest.raises(ValueError, match="Invalid or missing market_confidence"):
            ValuationRecord.from_appraise_response(
                _sample_identity(), _sample_valuation(), {}
            )


# ===========================================================================
# Mocked repository tests (no Supabase needed)
# ===========================================================================


class TestValuationRepositoryMocked:
    """Verify repository methods call Supabase correctly via mocks."""

    def _mock_supabase(self):
        client = MagicMock()
        return client

    @patch("backend.services.valuations.get_supabase")
    def test_save_returns_uuid(self, mock_get):
        client = self._mock_supabase()
        mock_get.return_value = client
        fake_id = str(uuid.uuid4())
        client.table().insert().execute.return_value = MagicMock(
            data=[{"id": fake_id}]
        )

        repo = ValuationRepository()
        result = repo.save(_make_record())
        assert result == fake_id

    @patch("backend.services.valuations.get_supabase")
    def test_save_raises_on_empty_result(self, mock_get):
        client = self._mock_supabase()
        mock_get.return_value = client
        client.table().insert().execute.return_value = MagicMock(data=[])

        repo = ValuationRepository()
        with pytest.raises(ValueError, match="Insert returned no data"):
            repo.save(_make_record())

    @patch("backend.services.valuations.get_supabase")
    def test_get_by_user_empty(self, mock_get):
        client = self._mock_supabase()
        mock_get.return_value = client
        client.table().select().eq().order().limit().execute.return_value = MagicMock(
            data=[]
        )

        repo = ValuationRepository()
        result = repo.get_by_user("some-user-id")
        assert result == []

    @patch("backend.services.valuations.get_supabase")
    def test_get_by_id_not_found(self, mock_get):
        client = self._mock_supabase()
        mock_get.return_value = client
        client.table().select().eq().execute.return_value = MagicMock(data=[])

        repo = ValuationRepository()
        result = repo.get_by_id(str(uuid.uuid4()))
        assert result is None

    @patch("backend.services.valuations.get_supabase")
    def test_delete_by_id_success(self, mock_get):
        client = self._mock_supabase()
        mock_get.return_value = client
        client.table().delete().eq().execute.return_value = MagicMock(
            data=[{"id": "deleted"}]
        )

        repo = ValuationRepository()
        assert repo.delete_by_id(str(uuid.uuid4())) is True

    @patch("backend.services.valuations.get_supabase")
    def test_delete_by_id_not_found(self, mock_get):
        client = self._mock_supabase()
        mock_get.return_value = client
        client.table().delete().eq().execute.return_value = MagicMock(data=[])

        repo = ValuationRepository()
        assert repo.delete_by_id(str(uuid.uuid4())) is False


# ===========================================================================
# Integration tests — require live Supabase
# ===========================================================================


@SKIP_NO_SUPABASE
class TestValuationRepositoryIntegration:
    """
    Run against real Supabase. Each test creates its own data and cleans up.
    """

    @pytest.fixture(autouse=True)
    def _setup(self):
        self.repo = ValuationRepository()
        self._created_ids: list[str] = []
        yield
        # Cleanup: delete all records created during the test
        for vid in self._created_ids:
            try:
                self.repo.delete_by_id(vid)
            except Exception:
                pass

    def _save_and_track(self, **overrides) -> str:
        record = _make_record(**overrides)
        vid = self.repo.save(record)
        self._created_ids.append(vid)
        return vid

    def test_save_valuation_guest(self):
        vid = self._save_and_track(guest_session_id=str(uuid.uuid4()))
        assert vid is not None
        assert len(vid) == 36  # UUID format

    def test_save_valuation_authenticated(self):
        uid = str(uuid.uuid4())
        vid = self._save_and_track(user_id=uid)
        assert vid is not None
        assert len(vid) == 36

    def test_get_by_user_empty(self):
        result = self.repo.get_by_user(str(uuid.uuid4()))
        assert result == []

    def test_get_by_id_not_found(self):
        result = self.repo.get_by_id(str(uuid.uuid4()))
        assert result is None

    def test_delete_by_id(self):
        vid = self._save_and_track()
        assert self.repo.get_by_id(vid) is not None
        deleted = self.repo.delete_by_id(vid)
        assert deleted is True
        assert self.repo.get_by_id(vid) is None
        self._created_ids.remove(vid)  # Already deleted

    def test_rls_cross_user_isolation(self):
        user_a = str(uuid.uuid4())
        user_b = str(uuid.uuid4())
        vid = self._save_and_track(user_id=user_a)

        # Query with user_b should not find user_a's record
        result = self.repo.get_by_id(vid, user_id=user_b)
        assert result is None

        # But user_a can see it
        result = self.repo.get_by_id(vid, user_id=user_a)
        assert result is not None
        assert result.id == vid
