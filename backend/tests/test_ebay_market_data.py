"""
Unit tests for Story 2-4: Integrate eBay Market Data
Tests for data_source, limited_data, fallback logic, retry, and variance checks
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import httpx
from backend.services.ebay import (
    search_sold_listings,
    _extract_fallback_keywords,
    calculate_variance_coefficient,
    get_api_stats,
    reset_api_stats,
    RateLimitError,
    _ebay_api_request,
    _fetch_ebay_listings,
)


# ============================================================================
# Test 1: Variance coefficient calculation
# ============================================================================
class TestVarianceCoefficient:
    """Tests for calculate_variance_coefficient function."""
    
    def test_uniform_prices_low_variance(self):
        """Prices with low variance should return low CV."""
        prices = [100.0, 102.0, 98.0, 101.0, 99.0]
        cv = calculate_variance_coefficient(prices)
        assert cv < 5  # Very tight distribution
    
    def test_diverse_prices_high_variance(self):
        """Prices with high variance should return high CV."""
        prices = [50.0, 100.0, 200.0, 400.0, 800.0]
        cv = calculate_variance_coefficient(prices)
        assert cv > 50  # Wide distribution
    
    def test_empty_list_returns_zero(self):
        """Empty price list should return 0."""
        cv = calculate_variance_coefficient([])
        assert cv == 0
    
    def test_single_price_returns_zero(self):
        """Single price should return 0 (no variance)."""
        cv = calculate_variance_coefficient([100.0])
        assert cv == 0


# ============================================================================
# Test 2: Fallback keyword extraction
# ============================================================================
class TestFallbackKeywords:
    """Tests for _extract_fallback_keywords function."""
    
    def test_removes_model_number(self):
        """Should remove model numbers for broader search."""
        # Need more than 2 words for simplification
        result = _extract_fallback_keywords("Sony WH-1000XM4 headphones", "headphones")
        assert "WH-1000XM4" not in result
        assert "Sony" in result
        assert "headphones" in result
    
    def test_keeps_brand_and_type(self):
        """Should keep brand and item type."""
        result = _extract_fallback_keywords("Canon EOS R5 camera body", "camera")
        assert "Canon" in result
    
    def test_returns_original_if_minimal(self):
        """Returns original if only 2 words (can't simplify)."""
        result = _extract_fallback_keywords("vintage watch", "watch")
        assert result == "vintage watch"
    
    def test_handles_empty_item_type(self):
        """Should handle None item_type gracefully."""
        result = _extract_fallback_keywords("Sony WH-1000XM4 headphones", None)
        assert len(result) > 0


# ============================================================================
# Test 3: API call counter
# ============================================================================
class TestAPICounter:
    """Tests for API call counting functionality."""
    
    def test_reset_clears_counts(self):
        """reset_api_stats should clear all counters."""
        reset_api_stats()
        stats = get_api_stats()
        assert stats["oauth_calls"] == 0
        assert stats["browse_calls"] == 0
    
    def test_stats_structure(self):
        """get_api_stats should return proper structure."""
        reset_api_stats()
        stats = get_api_stats()
        assert "oauth_calls" in stats
        assert "browse_calls" in stats
        assert "total_calls" in stats


# ============================================================================
# Test 4: Response fields (data_source and limited_data)
# ============================================================================
@pytest.mark.asyncio
class TestResponseFields:
    """Tests for data_source and limited_data fields in response."""
    
    @patch('backend.services.ebay.settings')
    async def test_mock_mode_includes_data_source(self, mock_settings):
        """Mock mode should return data_source field."""
        mock_settings.use_mock = True
        
        result = await search_sold_listings("Sony headphones __SCENARIO_HAPPY__")
        
        assert "data_source" in result
        assert result["data_source"] in ["primary", "fallback"]
    
    @patch('backend.services.ebay.settings')
    async def test_mock_mode_includes_limited_data(self, mock_settings):
        """Mock mode should return limited_data field."""
        mock_settings.use_mock = True
        
        result = await search_sold_listings("Sony headphones __SCENARIO_HAPPY__")
        
        assert "limited_data" in result
        assert isinstance(result["limited_data"], bool)
    
    @patch('backend.services.ebay.settings')
    async def test_low_data_marked_as_limited(self, mock_settings):
        """Low data scenario should be marked as limited."""
        mock_settings.use_mock = True
        
        result = await search_sold_listings("test __SCENARIO_LOW__")
        
        assert result.get("limited_data") is True
    
    @patch('backend.services.ebay.settings')
    async def test_high_data_not_limited(self, mock_settings):
        """High data scenario should not be marked as limited."""
        mock_settings.use_mock = True
        
        result = await search_sold_listings("test __SCENARIO_HAPPY__")
        
        assert result.get("limited_data") is False


# ============================================================================
# Test 5: Variance percentage in response
# ============================================================================
@pytest.mark.asyncio
class TestVarianceInResponse:
    """Tests for variance_pct field in response."""
    
    @patch('backend.services.ebay.settings')
    async def test_success_response_includes_variance(self, mock_settings):
        """Successful response should include variance_pct."""
        mock_settings.use_mock = True
        
        result = await search_sold_listings("Sony headphones __SCENARIO_HAPPY__")
        
        assert result.get("status") == "success"
        assert "variance_pct" in result
        assert isinstance(result["variance_pct"], (int, float))


# ============================================================================
# Test 6: Rate limit error handling
# ============================================================================
class TestRateLimitError:
    """Tests for RateLimitError exception."""
    
    def test_rate_limit_error_is_exception(self):
        """RateLimitError should be an Exception."""
        error = RateLimitError("Test")
        assert isinstance(error, Exception)
    
    def test_rate_limit_error_message(self):
        """RateLimitError should preserve message."""
        error = RateLimitError("Rate limit exceeded")
        assert str(error) == "Rate limit exceeded"


# ============================================================================
# Test 7: 429 response handling
# ============================================================================
@pytest.mark.asyncio
class Test429Handling:
    """Tests for 429 rate limit response handling."""
    
    @patch('backend.services.ebay.httpx.AsyncClient')
    async def test_429_raises_rate_limit_error(self, mock_client):
        """429 response should raise RateLimitError, not retry."""
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.text = "Rate limit exceeded"
        
        mock_instance = MagicMock()
        mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_instance.__aexit__ = AsyncMock(return_value=None)
        mock_instance.get = AsyncMock(return_value=mock_response)
        mock_client.return_value = mock_instance
        
        with pytest.raises(RateLimitError):
            await _ebay_api_request("https://test.com", {}, {})


# ============================================================================
# Test 8: Fallback search not used when primary sufficient
# ============================================================================
@pytest.mark.asyncio
class TestFallbackLogic:
    """Tests for fallback search logic."""
    
    @patch('backend.services.ebay._fetch_ebay_listings')
    @patch('backend.services.ebay.settings')
    async def test_no_fallback_when_primary_sufficient(self, mock_settings, mock_fetch):
        """Should not trigger fallback when primary has ≥5 items."""
        mock_settings.use_mock = False
        mock_fetch.return_value = {
            "status": "success",
            "prices_analyzed": 10,
            "variance_pct": 20,
            "keywords": "test",
            "total_found": 10,
            "price_range": {"min": 100, "max": 200},
            "fair_market_value": 150,
            "mean": 150,
            "std_dev": 20,
        }
        
        result = await search_sold_listings("Sony WH-1000XM4")
        
        # Should only call fetch once (no fallback)
        assert mock_fetch.call_count == 1
        assert result.get("data_source") == "primary"
    
    @patch('backend.services.ebay._fetch_ebay_listings')
    @patch('backend.services.ebay.settings')
    async def test_fallback_not_used_if_disabled(self, mock_settings, mock_fetch):
        """Should not use fallback when allow_fallback=False."""
        mock_settings.use_mock = False
        mock_fetch.return_value = {
            "status": "success",
            "prices_analyzed": 2,  # Low count
            "variance_pct": 20,
            "keywords": "test",
            "total_found": 2,
            "price_range": {"min": 100, "max": 200},
            "fair_market_value": 150,
            "mean": 150,
            "std_dev": 20,
        }
        
        result = await search_sold_listings(
            "Sony WH-1000XM4",
            item_type="headphones",
            allow_fallback=False
        )
        
        # Should only call fetch once (fallback disabled)
        assert mock_fetch.call_count == 1
        assert result.get("limited_data") is True


# ============================================================================
# Test 9: Fallback variance rejection
# ============================================================================
@pytest.mark.asyncio
class TestFallbackVarianceCheck:
    """Tests for fallback variance quality gate."""
    
    @patch('backend.services.ebay._fetch_ebay_listings')
    @patch('backend.services.ebay.settings')
    async def test_fallback_rejected_if_high_variance(self, mock_settings, mock_fetch):
        """Fallback with >50% variance should be rejected."""
        mock_settings.use_mock = False
        
        # Primary: low count
        primary_result = {
            "status": "success",
            "prices_analyzed": 2,
            "variance_pct": 30,
            "keywords": "Sony WH-1000XM4",
            "total_found": 2,
            "price_range": {"min": 200, "max": 250},
            "fair_market_value": 225,
            "mean": 225,
            "std_dev": 25,
        }
        
        # Fallback: more items but high variance (>50%)
        fallback_result = {
            "status": "success",
            "prices_analyzed": 10,
            "variance_pct": 75,  # Too high
            "keywords": "Sony headphones",
            "total_found": 10,
            "price_range": {"min": 50, "max": 500},
            "fair_market_value": 200,
            "mean": 200,
            "std_dev": 150,
        }
        
        mock_fetch.side_effect = [primary_result, fallback_result]
        
        result = await search_sold_listings(
            "Sony WH-1000XM4",
            item_type="headphones"
        )
        
        # Should return primary (fallback rejected due to high variance)
        assert result.get("data_source") == "primary"
        assert result.get("limited_data") is True


# ============================================================================
# Test 10: Fallback accepted with good variance
# ============================================================================
@pytest.mark.asyncio
class TestFallbackAccepted:
    """Tests for fallback being accepted when variance is acceptable."""
    
    @patch('backend.services.ebay._extract_fallback_keywords')
    @patch('backend.services.ebay._fetch_ebay_listings')
    @patch('backend.services.ebay.settings')
    async def test_fallback_accepted_if_low_variance(
        self, mock_settings, mock_fetch, mock_extract
    ):
        """Fallback with ≤50% variance and more items should be accepted."""
        mock_settings.use_mock = False
        # Force different keywords so fallback is triggered
        mock_extract.return_value = "Sony headphones"
        
        # Primary: low count
        primary_result = {
            "status": "success",
            "prices_analyzed": 2,
            "variance_pct": 30,
            "keywords": "Sony WH-1000XM4 headphones",
            "total_found": 2,
            "price_range": {"min": 200, "max": 250},
            "fair_market_value": 225,
            "mean": 225,
            "std_dev": 25,
        }
        
        # Fallback: more items with acceptable variance (≤50%)
        fallback_result = {
            "status": "success",
            "prices_analyzed": 15,
            "variance_pct": 35,  # Acceptable
            "keywords": "Sony headphones",
            "total_found": 15,
            "price_range": {"min": 150, "max": 300},
            "fair_market_value": 220,
            "mean": 220,
            "std_dev": 50,
        }
        
        mock_fetch.side_effect = [primary_result, fallback_result]
        
        result = await search_sold_listings(
            "Sony WH-1000XM4 headphones",
            item_type="headphones"
        )
        
        # Should return fallback (accepted due to more items and low variance)
        assert result.get("data_source") == "fallback"
        assert result.get("limited_data") is True  # Fallback always limited


# ============================================================================
# Test 11: Both searches insufficient
# ============================================================================
@pytest.mark.asyncio
class TestBothSearchesInsufficient:
    """Tests for when both primary and fallback are insufficient."""
    
    @patch('backend.services.ebay._fetch_ebay_listings')
    @patch('backend.services.ebay.settings')
    async def test_returns_primary_when_both_insufficient(self, mock_settings, mock_fetch):
        """When both searches have <5 items, return primary."""
        mock_settings.use_mock = False
        
        # Primary: low count
        primary_result = {
            "status": "success",
            "prices_analyzed": 2,
            "variance_pct": 25,
            "keywords": "Rare Item XYZ123",
            "total_found": 2,
            "price_range": {"min": 500, "max": 600},
            "fair_market_value": 550,
            "mean": 550,
            "std_dev": 50,
        }
        
        # Fallback: also low count
        fallback_result = {
            "status": "success",
            "prices_analyzed": 3,  # Still <5
            "variance_pct": 30,
            "keywords": "Rare Item",
            "total_found": 3,
            "price_range": {"min": 450, "max": 650},
            "fair_market_value": 550,
            "mean": 550,
            "std_dev": 80,
        }
        
        mock_fetch.side_effect = [primary_result, fallback_result]
        
        result = await search_sold_listings(
            "Rare Item XYZ123",
            item_type="collectible"
        )
        
        # Should return primary (fallback not better)
        assert result.get("data_source") == "primary"
        assert result.get("limited_data") is True


# ============================================================================
# Test 12: Error responses include required fields
# ============================================================================
@pytest.mark.asyncio
class TestErrorResponses:
    """Tests for error response fields."""
    
    @patch('backend.services.ebay.settings')
    async def test_no_data_response_has_fields(self, mock_settings):
        """No data response should include data_source and limited_data."""
        mock_settings.use_mock = True
        
        result = await search_sold_listings("test __SCENARIO_NONE__")
        
        assert result.get("status") == "no_data"
        assert "data_source" in result
        assert "limited_data" in result
        assert result["limited_data"] is True


# ============================================================================
# Test 13: Mock LIMITED scenario
# ============================================================================
@pytest.mark.asyncio
class TestLimitedScenario:
    """Tests for __SCENARIO_LIMITED__ mock behavior."""
    
    @patch('backend.services.ebay.settings')
    async def test_limited_scenario_returns_fallback_source(self, mock_settings):
        """LIMITED scenario should return fallback data_source."""
        mock_settings.use_mock = True
        
        result = await search_sold_listings("test __SCENARIO_LIMITED__")
        
        assert result.get("data_source") == "fallback"
        assert result.get("limited_data") is True
        assert result.get("status") == "success"


# ============================================================================
# Test 14: API budget compliance (max 2 API calls)
# ============================================================================
@pytest.mark.asyncio
class TestAPIBudgetCompliance:
    """Tests for API budget compliance (NFR-SC5: ≤2 API calls)."""
    
    @patch('backend.services.ebay._fetch_ebay_listings')
    @patch('backend.services.ebay.settings')
    async def test_max_two_api_calls_per_search(self, mock_settings, mock_fetch):
        """Search should make at most 2 API calls (primary + fallback)."""
        mock_settings.use_mock = False
        reset_api_stats()
        
        # Primary: low count triggers fallback
        primary_result = {
            "status": "success",
            "prices_analyzed": 2,
            "variance_pct": 25,
            "keywords": "Test",
            "total_found": 2,
            "price_range": {"min": 100, "max": 200},
            "fair_market_value": 150,
            "mean": 150,
            "std_dev": 20,
        }
        
        # Fallback result
        fallback_result = {
            "status": "success",
            "prices_analyzed": 10,
            "variance_pct": 40,
            "keywords": "Test broader",
            "total_found": 10,
            "price_range": {"min": 100, "max": 200},
            "fair_market_value": 150,
            "mean": 150,
            "std_dev": 25,
        }
        
        mock_fetch.side_effect = [primary_result, fallback_result]
        
        await search_sold_listings("Test Model123", item_type="test")
        
        # Should have called fetch exactly 2 times (primary + fallback)
        assert mock_fetch.call_count <= 2
