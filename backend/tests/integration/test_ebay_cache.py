"""
Integration tests for eBay cache layer
Tests cache hit/miss scenarios with mocked eBay API
"""
import pytest
from unittest.mock import patch, AsyncMock
from backend.services.ebay import get_market_data_for_item
from backend.models import ItemIdentity


@pytest.mark.asyncio
@patch('backend.services.ebay.settings')
@patch('backend.services.ebay.write_cache')
@patch('backend.services.ebay.read_cache')
@patch('backend.services.ebay.search_sold_listings')
async def test_cache_miss_calls_api(mock_search, mock_read, mock_write, mock_settings):
    """Cache miss triggers API call and caches result."""
    # Setup mocks - must disable mock mode and enable cache
    mock_settings.use_mock = False
    mock_settings.cache_enabled = True
    mock_settings.ebay_cache_ttl_hours = 24
    mock_read.return_value = None  # Cache miss
    mock_search.return_value = {"price_range": {"min": 100, "max": 200}}
    mock_write.return_value = True
    
    item = {
        "brand": "TestBrand",
        "model": "TestModel",
        "item_type": "test",
        "category": "Test",
        "search_keywords": ["test keyword"]
    }
    
    result = await get_market_data_for_item(item)
    
    # Verify API was called with keywords and item_type
    mock_search.assert_called_once_with("test keyword", item_type="test")
    # Verify cache write was attempted
    mock_write.assert_called_once()
    # Verify result
    assert result == {"price_range": {"min": 100, "max": 200}}


@pytest.mark.asyncio
@patch('backend.services.ebay.settings')
@patch('backend.services.ebay.write_cache')
@patch('backend.services.ebay.read_cache')
@patch('backend.services.ebay.search_sold_listings')
async def test_cache_hit_skips_api(mock_search, mock_read, mock_write, mock_settings):
    """Cache hit returns cached data without API call."""
    # Setup mocks - must disable mock mode and enable cache
    mock_settings.use_mock = False
    mock_settings.cache_enabled = True
    cached_data = {"price_range": {"min": 2000, "max": 3000}, "cached": True}
    mock_read.return_value = cached_data
    
    item = {
        "brand": "Canon",
        "model": "EOS R5",
        "item_type": "camera",
        "category": "Cameras & Photo",
        "search_keywords": ["Canon EOS R5"]
    }
    
    result = await get_market_data_for_item(item)
    
    # Verify API was NOT called (cache hit)
    mock_search.assert_not_called()
    # Verify cache write was NOT called (already cached)
    mock_write.assert_not_called()
    # Verify result came from cache
    assert result == cached_data
    assert result.get("cached") is True


@pytest.mark.asyncio
@patch('backend.services.ebay.write_cache')
@patch('backend.services.ebay.read_cache')
@patch('backend.services.ebay.search_sold_listings')
async def test_cache_write_failure_doesnt_break_flow(mock_search, mock_read, mock_write):
    """Cache write failure doesn't block response."""
    # Setup mocks
    mock_read.return_value = None  # Cache miss
    mock_search.return_value = {"price_range": {"min": 500, "max": 600}}
    mock_write.return_value = False  # Cache write fails
    
    item = {
        "brand": "FailWrite",
        "model": "Test",
        "item_type": "test",
        "category": "Test",
        "search_keywords": ["fail write test"]
    }
    
    result = await get_market_data_for_item(item)
    
    # Verify API was called
    mock_search.assert_called_once()
    # Verify result is still returned despite cache write failure
    assert result == {"price_range": {"min": 500, "max": 600}}


@pytest.mark.asyncio
@patch('backend.services.ebay.search_sold_listings')
@patch('backend.config.settings')
async def test_mock_mode_bypasses_cache(mock_settings, mock_search):
    """Mock mode bypasses cache entirely."""
    # Setup mock mode
    mock_settings.use_mock = True
    mock_search.return_value = {"mock": "data"}
    
    item = {
        "brand": "MockTest",
        "model": "Test",
        "item_type": "test",
        "category": "Test",
        "search_keywords": ["mock test"]
    }
    
    # Note: In mock mode, cache functions should not be called
    with patch('backend.cache.read_cache') as mock_read:
        with patch('backend.cache.write_cache') as mock_write:
            result = await get_market_data_for_item(item)
            
            # Verify cache was bypassed
            mock_read.assert_not_called()
            mock_write.assert_not_called()
            # Verify mock API was called
            mock_search.assert_called_once()


@pytest.mark.asyncio
@patch('backend.services.ebay.settings')
@patch('backend.services.ebay.read_cache')
@patch('backend.services.ebay.search_sold_listings')
async def test_cache_different_items_different_keys(mock_search, mock_read, mock_settings):
    """Different items use different cache keys."""
    # Setup mocks - must disable mock mode and enable cache
    mock_settings.use_mock = False
    mock_settings.cache_enabled = True
    mock_settings.ebay_cache_ttl_hours = 24
    mock_read.return_value = None
    mock_search.return_value = {"data": "test"}
    
    item1 = {
        "brand": "Canon",
        "model": "R5",
        "item_type": "camera",
        "category": "Cameras",
        "search_keywords": ["Canon R5"]
    }
    
    item2 = {
        "brand": "Nikon",
        "model": "Z9",
        "item_type": "camera",
        "category": "Cameras",
        "search_keywords": ["Nikon Z9"]
    }
    
    await get_market_data_for_item(item1)
    await get_market_data_for_item(item2)
    
    # Verify cache was checked twice with different keys
    assert mock_read.call_count == 2
    call_keys = [call[0][0] for call in mock_read.call_args_list]
    assert call_keys[0] != call_keys[1]  # Different cache keys
