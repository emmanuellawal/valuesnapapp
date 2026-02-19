"""
Integration tests for Story 2-4: eBay Market Data Integration

These tests verify end-to-end behavior with mock mode enabled,
testing the full data flow through the eBay service.
"""
import os
import pytest
from unittest.mock import patch


# ============================================================================
# Test 1: Full flow with mock mode - response includes all fields
# ============================================================================
@pytest.mark.asyncio
class TestMockModeIntegration:
    """Integration tests using mock mode (USE_MOCK=true)."""
    
    @patch.dict(os.environ, {"USE_MOCK": "true"})
    async def test_happy_path_includes_all_response_fields(self):
        """Happy path should include all required response fields."""
        # Import after patching env
        from backend.services.ebay import search_sold_listings
        from backend.config import settings
        settings.use_mock = True
        
        result = await search_sold_listings("Sony headphones __SCENARIO_HAPPY__")
        
        # Core fields
        assert "status" in result
        assert result["status"] == "success"
        
        # Story 2-4: New fields
        assert "data_source" in result
        assert result["data_source"] in ["primary", "fallback"]
        assert "limited_data" in result
        assert isinstance(result["limited_data"], bool)
        assert "variance_pct" in result
        
        # Statistical fields
        assert "total_found" in result
        assert "prices_analyzed" in result
        assert "price_range" in result
        assert "fair_market_value" in result
        assert "mean" in result
    
    @patch.dict(os.environ, {"USE_MOCK": "true"})
    async def test_limited_scenario_flags_correctly(self):
        """LIMITED scenario should set data_source='fallback' and limited_data=True."""
        from backend.services.ebay import search_sold_listings
        from backend.config import settings
        settings.use_mock = True
        
        result = await search_sold_listings("test __SCENARIO_LIMITED__")
        
        assert result["data_source"] == "fallback"
        assert result["limited_data"] is True
        assert result["status"] == "success"
    
    @patch.dict(os.environ, {"USE_MOCK": "true"})
    async def test_low_data_scenario(self):
        """LOW scenario should have limited_data=True with primary source."""
        from backend.services.ebay import search_sold_listings
        from backend.config import settings
        settings.use_mock = True
        
        result = await search_sold_listings("test __SCENARIO_LOW__")
        
        assert result["limited_data"] is True
        assert result["data_source"] == "primary"
        assert result.get("total_found", 0) < 5
    
    @patch.dict(os.environ, {"USE_MOCK": "true"})
    async def test_no_data_scenario(self):
        """NONE scenario should return no_data status with required fields."""
        from backend.services.ebay import search_sold_listings
        from backend.config import settings
        settings.use_mock = True
        
        result = await search_sold_listings("test __SCENARIO_NONE__")
        
        assert result["status"] == "no_data"
        assert "data_source" in result
        assert "limited_data" in result
        assert result["limited_data"] is True


# ============================================================================
# Test 2: API error scenarios
# ============================================================================
@pytest.mark.asyncio  
class TestErrorScenarios:
    """Tests for error scenarios via mock mode."""
    
    @patch.dict(os.environ, {"USE_MOCK": "true"})
    async def test_api_error_scenario(self):
        """API_ERROR scenario should return error status."""
        from backend.services.ebay import search_sold_listings
        from backend.config import settings
        settings.use_mock = True
        
        result = await search_sold_listings("test __SCENARIO_API_ERROR__")
        
        assert result["status"] == "error"
        assert result["error"] == "api_error"
        assert "data_source" in result
        assert "limited_data" in result
    
    @patch.dict(os.environ, {"USE_MOCK": "true"})
    async def test_rate_limit_scenario(self):
        """RATE_LIMIT scenario should return rate_limit error."""
        from backend.services.ebay import search_sold_listings
        from backend.config import settings
        settings.use_mock = True
        
        result = await search_sold_listings("test __SCENARIO_RATE_LIMIT__")
        
        assert result["status"] == "error"
        assert result["error"] == "rate_limit"


# ============================================================================
# Test 3: Confidence test scenarios (Story 2-5 preparation)
# ============================================================================
@pytest.mark.asyncio
class TestConfidenceScenarios:
    """Tests for confidence-related scenarios."""
    
    @patch.dict(os.environ, {"USE_MOCK": "true"})
    async def test_high_confidence_scenario(self):
        """HIGH_CONFIDENCE should return ideal data for high confidence."""
        from backend.services.ebay import search_sold_listings
        from backend.config import settings
        settings.use_mock = True
        
        result = await search_sold_listings("test __SCENARIO_HIGH_CONFIDENCE__")
        
        assert result["status"] == "success"
        assert result["data_source"] == "primary"
        assert result["limited_data"] is False
        assert result["prices_analyzed"] >= 20
        assert result["variance_pct"] < 25
    
    @patch.dict(os.environ, {"USE_MOCK": "true"})
    async def test_low_confidence_scenario(self):
        """LOW_CONFIDENCE should return insufficient data."""
        from backend.services.ebay import search_sold_listings
        from backend.config import settings
        settings.use_mock = True
        
        result = await search_sold_listings("test __SCENARIO_LOW_CONFIDENCE__")
        
        assert result["limited_data"] is True
        assert result.get("total_found", 0) < 5


# ============================================================================
# Test 4: API stats counter integration
# ============================================================================
class TestAPIStatsIntegration:
    """Tests for API stats counter."""
    
    def test_stats_structure(self):
        """get_api_stats should return proper structure."""
        from backend.services.ebay import get_api_stats, reset_api_stats
        
        reset_api_stats()
        stats = get_api_stats()
        
        assert "oauth_calls" in stats
        assert "browse_calls" in stats
        assert "total_calls" in stats
        assert stats["total_calls"] == stats["oauth_calls"] + stats["browse_calls"]
    
    def test_reset_clears_all_counts(self):
        """reset_api_stats should zero all counters."""
        from backend.services.ebay import get_api_stats, reset_api_stats
        
        reset_api_stats()
        stats = get_api_stats()
        
        assert stats["oauth_calls"] == 0
        assert stats["browse_calls"] == 0
        assert stats["total_calls"] == 0


# ============================================================================
# Test 5: get_market_data_for_item integration
# ============================================================================
@pytest.mark.asyncio
class TestMarketDataForItemIntegration:
    """Tests for get_market_data_for_item wrapper function."""
    
    @patch.dict(os.environ, {"USE_MOCK": "true"})
    async def test_wrapper_uses_search_keywords(self):
        """get_market_data_for_item should use search_keywords from item identity."""
        from backend.services.ebay import get_market_data_for_item
        from backend.config import settings
        settings.use_mock = True
        
        item_identity = {
            "brand": "Sony",
            "model": "WH-1000XM4",
            "item_type": "headphones",
            "category": "Electronics",
            "search_keywords": ["Sony WH-1000XM4 __SCENARIO_HAPPY__"]
        }
        
        result = await get_market_data_for_item(item_identity)
        
        assert result["status"] == "success"
        assert "data_source" in result
        assert "limited_data" in result
    
    @patch.dict(os.environ, {"USE_MOCK": "true"})
    async def test_wrapper_handles_empty_keywords(self):
        """get_market_data_for_item should handle empty search_keywords."""
        from backend.services.ebay import get_market_data_for_item
        from backend.config import settings
        settings.use_mock = True
        
        item_identity = {
            "brand": "Unknown",
            "model": "Unknown",
            "item_type": "unknown",
            "category": "Unknown",
            "search_keywords": []  # Empty keywords
        }
        
        # Should not raise, should use fallback
        result = await get_market_data_for_item(item_identity)
        assert "status" in result


# ============================================================================
# Test 6: Response schema consistency
# ============================================================================
@pytest.mark.asyncio
class TestResponseSchemaConsistency:
    """Tests that verify response schema is consistent across scenarios."""
    
    @patch.dict(os.environ, {"USE_MOCK": "true"})
    @pytest.mark.parametrize("scenario,expected_status", [
        ("__SCENARIO_HAPPY__", "success"),
        ("__SCENARIO_HIGH_CONFIDENCE__", "success"),
        ("__SCENARIO_LOW__", "success"),
        ("__SCENARIO_LIMITED__", "success"),
        ("__SCENARIO_NONE__", "no_data"),
        ("__SCENARIO_API_ERROR__", "error"),
        ("__SCENARIO_RATE_LIMIT__", "error"),
    ])
    async def test_all_scenarios_have_required_fields(self, scenario, expected_status):
        """All scenarios should include data_source and limited_data."""
        from backend.services.ebay import search_sold_listings
        from backend.config import settings
        settings.use_mock = True
        
        result = await search_sold_listings(f"test {scenario}")
        
        assert result["status"] == expected_status
        assert "data_source" in result, f"Missing data_source in {scenario}"
        assert "limited_data" in result, f"Missing limited_data in {scenario}"
