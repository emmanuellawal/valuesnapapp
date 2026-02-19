"""
Unit tests for cache module
Tests cache key generation and mocked Supabase operations
"""
import pytest
from unittest.mock import MagicMock, patch
from backend.cache import get_cache_key, read_cache, write_cache, cleanup_expired_cache, get_cache_stats


class TestCacheKeyGeneration:
    """Test cache key generation logic"""
    
    def test_cache_key_deterministic(self):
        """Same input produces same cache key."""
        item1 = {"brand": "Canon", "model": "EOS R5", "item_type": "camera", "search_keywords": ["Canon"]}
        item2 = {"brand": "Canon", "model": "EOS R5", "item_type": "camera", "search_keywords": ["Canon"]}
        
        assert get_cache_key(item1) == get_cache_key(item2)
    
    def test_cache_key_different_inputs(self):
        """Different inputs produce different keys."""
        item1 = {"brand": "Canon", "model": "EOS R5", "item_type": "camera", "search_keywords": ["Canon"]}
        item2 = {"brand": "Nikon", "model": "Z9", "item_type": "camera", "search_keywords": ["Nikon"]}
        
        assert get_cache_key(item1) != get_cache_key(item2)
    
    def test_cache_key_empty_keywords(self):
        """Empty search_keywords still produces valid key."""
        item = {"brand": "Canon", "model": "EOS R5", "item_type": "camera", "search_keywords": []}
        key = get_cache_key(item)
        
        assert key is not None
        assert len(key) == 64  # SHA-256 hex length
    
    def test_cache_key_keyword_order_normalized(self):
        """Keywords are sorted, so order doesn't matter."""
        item1 = {"brand": "Canon", "model": "R5", "item_type": "camera", "search_keywords": ["used", "mint"]}
        item2 = {"brand": "Canon", "model": "R5", "item_type": "camera", "search_keywords": ["mint", "used"]}
        
        assert get_cache_key(item1) == get_cache_key(item2)


class TestCacheRead:
    """Test cache read with mocked Supabase"""
    
    @patch('backend.cache.get_supabase')
    def test_cache_read_returns_data(self, mock_supabase):
        """Cache read returns data when entry exists and not expired."""
        mock_client = MagicMock()
        mock_supabase.return_value = mock_client
        mock_client.table.return_value.select.return_value.eq.return_value.gt.return_value.execute.return_value.data = [
            {"value": {"price_range": {"min": 100, "max": 200}}}
        ]
        
        result = read_cache("test_key")
        
        assert result == {"price_range": {"min": 100, "max": 200}}
    
    @patch('backend.cache.get_supabase')
    def test_cache_read_returns_none_on_miss(self, mock_supabase):
        """Cache read returns None when no entry exists."""
        mock_client = MagicMock()
        mock_supabase.return_value = mock_client
        mock_client.table.return_value.select.return_value.eq.return_value.gt.return_value.execute.return_value.data = []
        
        result = read_cache("nonexistent_key")
        
        assert result is None
    
    @patch('backend.cache.get_supabase')
    def test_cache_read_graceful_on_error(self, mock_supabase):
        """Cache read returns None on Supabase error (graceful degradation)."""
        mock_supabase.side_effect = Exception("Connection failed")
        
        result = read_cache("test_key")
        
        assert result is None  # Treated as cache miss


class TestCacheWrite:
    """Test cache write with mocked Supabase"""
    
    @patch('backend.cache.get_supabase')
    def test_cache_write_success(self, mock_supabase):
        """Cache write returns True on success."""
        mock_client = MagicMock()
        mock_supabase.return_value = mock_client
        
        result = write_cache("test_key", {"data": "test"}, 3600)
        
        assert result is True
        mock_client.table.return_value.upsert.assert_called_once()
    
    @patch('backend.cache.get_supabase')
    def test_cache_write_graceful_on_error(self, mock_supabase):
        """Cache write returns False on error (graceful degradation)."""
        mock_supabase.side_effect = Exception("Connection failed")
        
        result = write_cache("test_key", {"data": "test"}, 3600)
        
        assert result is False


class TestCacheCleanup:
    """Test cache cleanup with mocked Supabase"""
    
    @patch('backend.cache.get_supabase')
    def test_cleanup_returns_count(self, mock_supabase):
        """Cleanup returns count of deleted entries."""
        mock_client = MagicMock()
        mock_supabase.return_value = mock_client
        mock_client.table.return_value.delete.return_value.lt.return_value.execute.return_value.data = [
            {"key": "expired1"}, {"key": "expired2"}
        ]
        
        result = cleanup_expired_cache()
        
        assert result == 2
    
    @patch('backend.cache.get_supabase')
    def test_cleanup_graceful_on_error(self, mock_supabase):
        """Cleanup returns 0 on error."""
        mock_supabase.side_effect = Exception("Connection failed")
        
        result = cleanup_expired_cache()
        
        assert result == 0


class TestCacheStats:
    """Test cache statistics with mocked Supabase"""
    
    @patch('backend.cache.get_supabase')
    def test_stats_returns_counts(self, mock_supabase):
        """Stats returns total, expired, and active counts."""
        mock_client = MagicMock()
        mock_supabase.return_value = mock_client
        
        # Mock total count
        mock_total = MagicMock()
        mock_total.count = 10
        mock_client.table.return_value.select.return_value.execute.return_value = mock_total
        
        # Mock expired count
        mock_expired = MagicMock()
        mock_expired.count = 3
        mock_client.table.return_value.select.return_value.lt.return_value.execute.return_value = mock_expired
        
        result = get_cache_stats()
        
        assert result["total_entries"] == 10
        assert result["expired_entries"] == 3
        assert result["active_entries"] == 7
