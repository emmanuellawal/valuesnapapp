# backend/tests/integration/test_confidence_integration.py
"""
Integration tests for Confidence Calculation Service (Story 2-5)

Tests the confidence calculation in the full valuation flow,
including integration with the API endpoint.
"""
import pytest
from unittest.mock import patch, AsyncMock

from fastapi.testclient import TestClient


class TestConfidenceInApiFlow:
    """Test confidence calculation in the /api/appraise endpoint."""
    
    @pytest.fixture
    def client(self):
        """Create test client with mocked services."""
        from backend.main import app
        return TestClient(app)
    
    @pytest.fixture
    def mock_ai_high_confidence(self):
        """Mock AI service returning HIGH confidence identification."""
        from backend.models import ItemIdentity
        
        mock_identity = ItemIdentity(
            item_type="wireless headphones",
            brand="Sony",
            model="WH-1000XM4",
            visual_condition="used_excellent",
            condition_details="Minor wear on headband",
            search_keywords=["Sony", "WH-1000XM4", "headphones"],
            ai_identification_confidence="HIGH",
        )
        return mock_identity
    
    @pytest.fixture
    def mock_ebay_high_confidence_data(self):
        """Mock eBay data that qualifies for HIGH market confidence."""
        return {
            "status": "success",
            "keywords": "Sony WH-1000XM4 headphones",
            "total_found": 25,
            "prices_analyzed": 25,
            "outliers_removed": 0,
            "variance_pct": 18.0,
            "price_range": {"min": 150.0, "max": 280.0},
            "fair_market_value": 215.0,
            "mean": 210.0,
            "std_dev": 37.8,
            "confidence": "HIGH",
            "data_source": "primary",
            "limited_data": False,
        }
    
    @pytest.fixture
    def mock_ebay_low_confidence_data(self):
        """Mock eBay data that triggers AI_ONLY (LOW confidence)."""
        return {
            "status": "no_data",
            "keywords": "rare vintage item",
            "message": "Insufficient market data",
            "total_found": 2,
            "prices_analyzed": 0,
            "data_source": "primary",
            "limited_data": True,
        }
    
    def test_api_returns_confidence_data(
        self, client, mock_ai_high_confidence, mock_ebay_high_confidence_data
    ):
        """API response includes confidence section with all fields."""
        with patch(
            "backend.main.identify_item_from_image",
            new_callable=AsyncMock,
            return_value=mock_ai_high_confidence,
        ), patch(
            "backend.main.search_sold_listings",
            new_callable=AsyncMock,
            return_value=mock_ebay_high_confidence_data,
        ):
            response = client.post(
                "/api/appraise",
                json={"image_base64": "test_image_data"},
            )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify confidence section exists
        assert "confidence" in data
        confidence = data["confidence"]
        
        # Verify all required fields
        assert "market_confidence" in confidence
        assert "confidence_factors" in confidence
        assert "ai_only_flag" in confidence
        assert "confidence_message" in confidence
        
        # Verify factors breakdown
        factors = confidence["confidence_factors"]
        assert "sample_size" in factors
        assert "variance_pct" in factors
        assert "ai_confidence" in factors
        assert "data_source" in factors
    
    def test_high_confidence_end_to_end(
        self, client, mock_ai_high_confidence, mock_ebay_high_confidence_data
    ):
        """End-to-end test for HIGH confidence path."""
        with patch(
            "backend.main.identify_item_from_image",
            new_callable=AsyncMock,
            return_value=mock_ai_high_confidence,
        ), patch(
            "backend.main.search_sold_listings",
            new_callable=AsyncMock,
            return_value=mock_ebay_high_confidence_data,
        ):
            response = client.post(
                "/api/appraise",
                json={"image_base64": "test_image_data"},
            )
        
        assert response.status_code == 200
        confidence = response.json()["confidence"]
        
        assert confidence["market_confidence"] == "HIGH"
        assert confidence["ai_only_flag"] is False
        assert "Strong confidence" in confidence["confidence_message"]
    
    def test_low_confidence_ai_only_end_to_end(
        self, client, mock_ai_high_confidence, mock_ebay_low_confidence_data
    ):
        """End-to-end test for LOW confidence with AI_ONLY flag."""
        with patch(
            "backend.main.identify_item_from_image",
            new_callable=AsyncMock,
            return_value=mock_ai_high_confidence,
        ), patch(
            "backend.main.search_sold_listings",
            new_callable=AsyncMock,
            return_value=mock_ebay_low_confidence_data,
        ):
            response = client.post(
                "/api/appraise",
                json={"image_base64": "test_image_data"},
            )
        
        assert response.status_code == 200
        confidence = response.json()["confidence"]
        
        assert confidence["market_confidence"] == "LOW"
        assert confidence["ai_only_flag"] is True
        assert "AI estimate only" in confidence["confidence_message"]
    
    def test_medium_confidence_with_fallback(self, client, mock_ai_high_confidence):
        """Test MEDIUM confidence when fallback data source is used."""
        mock_fallback_data = {
            "status": "success",
            "keywords": "Sony headphones",
            "total_found": 15,
            "prices_analyzed": 15,
            "variance_pct": 30.0,
            "price_range": {"min": 100.0, "max": 300.0},
            "fair_market_value": 180.0,
            "mean": 190.0,
            "std_dev": 57.0,
            "data_source": "fallback",  # Fallback source
            "limited_data": True,
        }
        
        with patch(
            "backend.main.identify_item_from_image",
            new_callable=AsyncMock,
            return_value=mock_ai_high_confidence,
        ), patch(
            "backend.main.search_sold_listings",
            new_callable=AsyncMock,
            return_value=mock_fallback_data,
        ):
            response = client.post(
                "/api/appraise",
                json={"image_base64": "test_image_data"},
            )
        
        assert response.status_code == 200
        confidence = response.json()["confidence"]
        
        # Fallback blocks HIGH, so should be MEDIUM or LOW
        assert confidence["market_confidence"] in ["MEDIUM", "LOW"]
        assert confidence["confidence_factors"]["data_source_penalty"] is True

    def test_low_confidence_wider_price_range(
        self, client, mock_ai_high_confidence
    ):
        """Story 2-9 AC3: LOW confidence widens price range by 50% each side."""
        # 3 sales with high variance → LOW confidence
        mock_low_data = {
            "status": "success",
            "keywords": "rare vintage item",
            "total_found": 3,
            "prices_analyzed": 3,
            "outliers_removed": 0,
            "variance_pct": 45.0,
            "price_range": {"min": 100.0, "max": 200.0},
            "fair_market_value": 150.0,
            "mean": 150.0,
            "std_dev": 50.0,
            "data_source": "primary",
            "limited_data": True,
        }

        with patch(
            "backend.main.identify_item_from_image",
            new_callable=AsyncMock,
            return_value=mock_ai_high_confidence,
        ), patch(
            "backend.main.search_sold_listings",
            new_callable=AsyncMock,
            return_value=mock_low_data,
        ):
            response = client.post(
                "/api/appraise",
                json={"image_base64": "test_image_data"},
            )

        assert response.status_code == 200
        data = response.json()

        # Confirm LOW confidence
        assert data["confidence"]["market_confidence"] == "LOW"

        # Original range: 100–200, center=150, half_width=50
        # Widened: 150 - 50*1.5 = 75, 150 + 50*1.5 = 225
        valuation = data["valuation"]
        assert valuation["price_range"]["min"] == 75.0
        assert valuation["price_range"]["max"] == 225.0

    def test_high_confidence_no_price_range_widening(
        self, client, mock_ai_high_confidence, mock_ebay_high_confidence_data
    ):
        """Story 2-9 AC5: HIGH confidence does NOT widen price range."""
        with patch(
            "backend.main.identify_item_from_image",
            new_callable=AsyncMock,
            return_value=mock_ai_high_confidence,
        ), patch(
            "backend.main.search_sold_listings",
            new_callable=AsyncMock,
            return_value=mock_ebay_high_confidence_data,
        ):
            response = client.post(
                "/api/appraise",
                json={"image_base64": "test_image_data"},
            )

        assert response.status_code == 200
        data = response.json()

        # Confirm HIGH confidence
        assert data["confidence"]["market_confidence"] == "HIGH"

        # Price range should be unchanged
        valuation = data["valuation"]
        assert valuation["price_range"]["min"] == 150.0
        assert valuation["price_range"]["max"] == 280.0

    def test_low_confidence_wider_range_floor_at_zero(
        self, client, mock_ai_high_confidence
    ):
        """Story 2-9: Widened range minimum cannot go below zero."""
        mock_cheap_item = {
            "status": "success",
            "keywords": "cheap item",
            "total_found": 3,
            "prices_analyzed": 3,
            "outliers_removed": 0,
            "variance_pct": 60.0,
            "price_range": {"min": 5.0, "max": 25.0},
            "fair_market_value": 15.0,
            "mean": 15.0,
            "std_dev": 10.0,
            "data_source": "primary",
            "limited_data": True,
        }

        with patch(
            "backend.main.identify_item_from_image",
            new_callable=AsyncMock,
            return_value=mock_ai_high_confidence,
        ), patch(
            "backend.main.search_sold_listings",
            new_callable=AsyncMock,
            return_value=mock_cheap_item,
        ):
            response = client.post(
                "/api/appraise",
                json={"image_base64": "test_image_data"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["confidence"]["market_confidence"] == "LOW"

        # Original range: 5–25, center=15, half_width=10
        # Widened: 15 - 10*1.5 = 0, 15 + 10*1.5 = 30
        valuation = data["valuation"]
        assert valuation["price_range"]["min"] == 0.0
        assert valuation["price_range"]["max"] == 30.0


class TestConfidenceWithMockMode:
    """Test confidence scenarios using mock mode."""
    
    @pytest.fixture
    def mock_mode_client(self):
        """Create test client with USE_MOCK=true."""
        with patch.dict("os.environ", {"USE_MOCK": "true"}):
            # Need to reimport to pick up the mock setting
            from backend.main import app
            return TestClient(app)
    
    def test_mock_high_confidence_scenario(self):
        """Test __SCENARIO_HIGH_CONFIDENCE__ mock keyword."""
        from backend.services.mocks.mock_ebay import search_sold_listings
        import asyncio
        
        result = asyncio.get_event_loop().run_until_complete(
            search_sold_listings("__SCENARIO_HIGH_CONFIDENCE__")
        )
        
        assert result["status"] == "success"
        assert result["total_found"] >= 20
        assert result["variance_pct"] <= 25.0
        assert result["data_source"] == "primary"
    
    def test_mock_low_confidence_scenario(self):
        """Test __SCENARIO_LOW_CONFIDENCE__ mock keyword."""
        from backend.services.mocks.mock_ebay import search_sold_listings
        import asyncio
        
        result = asyncio.get_event_loop().run_until_complete(
            search_sold_listings("__SCENARIO_LOW_CONFIDENCE__")
        )
        
        assert result["total_found"] < 3  # Triggers AI_ONLY
        assert result["status"] == "no_data"
