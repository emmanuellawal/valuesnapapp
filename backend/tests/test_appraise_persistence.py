"""
Tests for Story 3.2: Appraise endpoint persistence behavior.

Verifies:
- Successful appraisals include valuation_id in response
- Save failures still return the appraisal result (best-effort persistence)
- guest_session_id flows through to the saved record
"""
import base64
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

from backend.main import app


TINY_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="


def _make_fake_identity():
    """Create a minimal ItemIdentity-like mock."""
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
    identity.search_keywords = ["seiko", "skx007"]
    identity.brand = "Seiko"
    identity.model = "SKX007"
    identity.item_type = "watch"
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


@pytest.fixture
def client():
    return TestClient(app)


class TestAppraisePersistence:
    """Tests for valuation_id in the appraise response."""

    @patch("backend.main.ValuationRepository")
    @patch("backend.main.calculate_market_confidence")
    @patch("backend.main.search_sold_listings")
    @patch("backend.main.identify_item_from_image")
    def test_successful_appraisal_returns_valuation_id(
        self, mock_ai, mock_ebay, mock_confidence, mock_repo_cls, client
    ):
        """AC1: Response includes a valuation_id when save succeeds."""
        mock_ai.return_value = _make_fake_identity()
        mock_ebay.return_value = FAKE_MARKET_DATA
        mock_confidence.return_value = FAKE_CONFIDENCE_RESULT
        mock_repo_cls.return_value.save.return_value = "uuid-1234"

        resp = client.post("/api/appraise", json={"image_base64": TINY_PNG_B64})

        assert resp.status_code == 200
        body = resp.json()
        assert body["valuation_id"] == "uuid-1234"
        assert "identity" in body
        assert "valuation" in body
        assert "confidence" in body

    @patch("backend.main.ValuationRepository")
    @patch("backend.main.calculate_market_confidence")
    @patch("backend.main.search_sold_listings")
    @patch("backend.main.identify_item_from_image")
    def test_save_failure_returns_null_valuation_id(
        self, mock_ai, mock_ebay, mock_confidence, mock_repo_cls, client
    ):
        """AC2: Save failure → still 200 with valuation_id=null."""
        mock_ai.return_value = _make_fake_identity()
        mock_ebay.return_value = FAKE_MARKET_DATA
        mock_confidence.return_value = FAKE_CONFIDENCE_RESULT
        mock_repo_cls.return_value.save.side_effect = ValueError("DB connection lost")

        resp = client.post("/api/appraise", json={"image_base64": TINY_PNG_B64})

        assert resp.status_code == 200
        body = resp.json()
        assert body["valuation_id"] is None
        # Appraisal data is still present
        assert body["identity"]["brand"] == "Seiko"
        assert body["valuation"]["fair_market_value"] == 249.99

    @patch("backend.main.ValuationRepository")
    @patch("backend.main.calculate_market_confidence")
    @patch("backend.main.search_sold_listings")
    @patch("backend.main.identify_item_from_image")
    def test_guest_session_id_forwarded_to_record(
        self, mock_ai, mock_ebay, mock_confidence, mock_repo_cls, client
    ):
        """AC3: guest_session_id from request body is passed to ValuationRecord."""
        mock_ai.return_value = _make_fake_identity()
        mock_ebay.return_value = FAKE_MARKET_DATA
        mock_confidence.return_value = FAKE_CONFIDENCE_RESULT
        mock_repo_cls.return_value.save.return_value = "uuid-5678"

        resp = client.post(
            "/api/appraise",
            json={"image_base64": TINY_PNG_B64, "guest_session_id": "guest-abc-123"},
        )

        assert resp.status_code == 200

        # Verify from_appraise_response was called (indirectly via the record)
        save_call = mock_repo_cls.return_value.save
        assert save_call.called
        saved_record = save_call.call_args[0][0]
        assert saved_record.guest_session_id == "guest-abc-123"

    @patch("backend.main.ValuationRepository")
    @patch("backend.main.calculate_market_confidence")
    @patch("backend.main.search_sold_listings")
    @patch("backend.main.identify_item_from_image")
    def test_omitted_guest_session_id_defaults_to_none(
        self, mock_ai, mock_ebay, mock_confidence, mock_repo_cls, client
    ):
        """AC3: Existing callers that omit guest_session_id still work."""
        mock_ai.return_value = _make_fake_identity()
        mock_ebay.return_value = FAKE_MARKET_DATA
        mock_confidence.return_value = FAKE_CONFIDENCE_RESULT
        mock_repo_cls.return_value.save.return_value = "uuid-9999"

        resp = client.post("/api/appraise", json={"image_base64": TINY_PNG_B64})

        assert resp.status_code == 200
        saved_record = mock_repo_cls.return_value.save.call_args[0][0]
        assert saved_record.guest_session_id is None
