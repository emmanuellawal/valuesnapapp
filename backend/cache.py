"""
Cache Layer for eBay Market Data
Uses Supabase PostgreSQL for persistent cache storage
"""
import hashlib
import logging
from typing import Optional
from datetime import datetime, timedelta, timezone

from supabase import Client, ClientOptions, create_client

from .config import settings

logger = logging.getLogger(__name__)

# Supabase client (initialized lazily)
_supabase_client: Optional[Client] = None


def _create_supabase_client(supabase_key: str, auth_token: Optional[str] = None) -> Client:
    options = ClientOptions(auto_refresh_token=False, persist_session=False)
    if auth_token:
        options.headers["Authorization"] = f"Bearer {auth_token}"

    return create_client(settings.supabase_url, supabase_key, options=options)


def get_supabase() -> Client:
    """Get or create Supabase client."""
    global _supabase_client
    if _supabase_client is None:
        if not settings.supabase_url or not settings.supabase_service_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be configured")
        _supabase_client = _create_supabase_client(settings.supabase_service_key)
        logger.info("Supabase client initialized")
    return _supabase_client


def get_user_supabase(access_token: str) -> Client:
    """Create a short-lived authenticated client so RLS applies to user operations."""
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be configured")

    return _create_supabase_client(settings.supabase_anon_key, auth_token=access_token)


def get_cache_key(item_identity: dict) -> str:
    """
    Generate deterministic cache key from item identity.
    
    Args:
        item_identity: Dict with brand, model, item_type, category, search_keywords
        
    Returns:
        SHA-256 hash string (64 characters)
    """
    # Include search_keywords for cache differentiation
    # (e.g., "like new" vs "for parts" items)
    keywords = item_identity.get("search_keywords", [])
    keywords_str = "|".join(sorted(keywords)) if keywords else ""
    
    key_parts = [
        item_identity.get("brand", ""),
        item_identity.get("model", ""),
        item_identity.get("item_type", ""),
        item_identity.get("category", ""),
        keywords_str
    ]
    key_string = "|".join(key_parts).lower()
    return hashlib.sha256(key_string.encode()).hexdigest()


def read_cache(cache_key: str) -> Optional[dict]:
    """
    Read from cache if entry exists and not expired.
    
    Args:
        cache_key: SHA-256 hash string
        
    Returns:
        Cached dict or None if cache miss or error
    """
    try:
        supabase = get_supabase()
        
        # Query for non-expired entry
        result = supabase.table("cache").select("value").eq(
            "key", cache_key
        ).gt(
            "expires_at", datetime.now(timezone.utc).isoformat()
        ).execute()
        
        if result.data and len(result.data) > 0:
            logger.info(f"Cache hit: {cache_key[:8]}...")
            return result.data[0]["value"]
        
        logger.info(f"Cache miss: {cache_key[:8]}...")
        return None
        
    except Exception as e:
        logger.warning(f"Cache read failed: {e}")
        return None  # Treat as cache miss (graceful degradation)


def write_cache(cache_key: str, data: dict, ttl_seconds: int) -> bool:
    """
    Write data to cache with TTL.
    
    Args:
        cache_key: SHA-256 hash string
        data: Dict to cache
        ttl_seconds: Time-to-live in seconds
        
    Returns:
        True on success, False on failure
    """
    try:
        supabase = get_supabase()
        
        # Calculate expires_at in application (not database generated column)
        created_at = datetime.now(timezone.utc)
        expires_at = created_at + timedelta(seconds=ttl_seconds)
        
        # Upsert (insert or update on conflict)
        supabase.table("cache").upsert({
            "key": cache_key,
            "value": data,
            "ttl_seconds": ttl_seconds,
            "created_at": created_at.isoformat(),
            "expires_at": expires_at.isoformat()
        }).execute()
        
        logger.info(f"Cache write: {cache_key[:8]}... (TTL: {ttl_seconds}s)")
        return True
        
    except Exception as e:
        logger.warning(f"Cache write failed: {e}")
        return False  # Fail gracefully


def cleanup_expired_cache() -> int:
    """
    Delete expired cache entries.
    
    Returns:
        Count of deleted rows
    """
    try:
        supabase = get_supabase()
        
        # Delete expired entries
        result = supabase.table("cache").delete().lt(
            "expires_at", datetime.now(timezone.utc).isoformat()
        ).execute()
        
        deleted_count = len(result.data) if result.data else 0
        logger.info(f"Cache cleanup: deleted {deleted_count} expired entries")
        return deleted_count
        
    except Exception as e:
        logger.error(f"Cache cleanup failed: {e}")
        return 0


def get_cache_stats() -> dict:
    """
    Get cache statistics for debugging.
    
    Returns:
        Dict with total_entries, expired_entries, active_entries
    """
    try:
        supabase = get_supabase()
        now = datetime.now(timezone.utc).isoformat()
        
        # Total entries
        total = supabase.table("cache").select("key", count="exact").execute()
        
        # Expired entries
        expired = supabase.table("cache").select("key", count="exact").lt(
            "expires_at", now
        ).execute()
        
        return {
            "total_entries": total.count or 0,
            "expired_entries": expired.count or 0,
            "active_entries": (total.count or 0) - (expired.count or 0)
        }
        
    except Exception as e:
        logger.error(f"Cache stats failed: {e}")
        return {"error": str(e)}
