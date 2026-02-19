# backend/services/ebay.py
"""
eBay Value Engine - The Heavy Lifter
Handles: OAuth, Market Search, IQR Outlier Filtering, Statistical Analysis

Story 2-4: Enhanced with fallback logic, API call tracking, and retry resilience.
"""
import os
import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta

import httpx
import numpy as np
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

from ..config import settings
from ..cache import get_cache_key, read_cache, write_cache

logger = logging.getLogger(__name__)

# Configuration constants
FALLBACK_VARIANCE_THRESHOLD = 50.0  # Maximum acceptable variance percentage
MAX_REASONABLE_PRICE = 100000.0  # Sanity check for price outliers
TOKEN_EXPIRY_BUFFER_SECONDS = 120  # Refresh token 2 minutes before expiry

# Simple in-memory cache for OAuth token
# In production with 1000s of users, use Redis
TOKEN_CACHE: Dict[str, Any] = {"token": None, "expires_at": datetime.now()}

# API call counter for rate limit monitoring (thread-safe)
_api_call_count: Dict[str, int] = {"oauth": 0, "browse": 0, "last_logged": 0}
_api_counter_lock = asyncio.Lock()


async def _increment_api_counter(call_type: str) -> None:
    """Increment API call counter and log periodically (thread-safe)."""
    global _api_call_count
    async with _api_counter_lock:
        _api_call_count[call_type] += 1
        total = _api_call_count["oauth"] + _api_call_count["browse"]
        if total - _api_call_count["last_logged"] >= 100:
            logger.info(
                "API usage: OAuth=%d, Browse=%d, Total=%d",
                _api_call_count["oauth"],
                _api_call_count["browse"],
                total,
            )
            _api_call_count["last_logged"] = total


def get_api_stats() -> Dict[str, int]:
    """Get API call statistics for monitoring (snapshot)."""
    # Read-only, no lock needed for snapshot
    return {
        "oauth_calls": _api_call_count["oauth"],
        "browse_calls": _api_call_count["browse"],
        "total_calls": _api_call_count["oauth"] + _api_call_count["browse"],
    }


def reset_api_stats() -> None:
    """Reset API call statistics (for testing only)."""
    global _api_call_count
    # Note: Not async-safe, only use in single-threaded test environments
    _api_call_count = {"oauth": 0, "browse": 0, "last_logged": 0}


async def get_ebay_token() -> str:
    """
    Gets or refreshes eBay Application Token (Client Credentials flow).
    Caches token until 5 minutes before expiry.
    """
    global TOKEN_CACHE
    
    if TOKEN_CACHE["token"] and datetime.now() < TOKEN_CACHE["expires_at"]:
        return TOKEN_CACHE["token"]
    
    # Determine environment (sandbox vs production)
    use_sandbox = os.environ.get("EBAY_USE_SANDBOX", "true").lower() == "true"
    
    if use_sandbox:
        client_id = os.environ.get("EBAY_SANDBOX_APP_ID")
        client_secret = os.environ.get("EBAY_SANDBOX_CERT_ID")
        token_url = "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
    else:
        client_id = os.environ.get("EBAY_PROD_APP_ID")
        client_secret = os.environ.get("EBAY_PROD_CERT_ID")
        token_url = "https://api.ebay.com/identity/v1/oauth2/token"
    
    if not client_id or not client_secret:
        raise ValueError(f"eBay credentials not configured for {'sandbox' if use_sandbox else 'production'}")

    await _increment_api_counter("oauth")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "scope": "https://api.ebay.com/oauth/api_scope"
            },
            auth=(client_id, client_secret),
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        resp.raise_for_status()
        
        token_data = resp.json()
        TOKEN_CACHE["token"] = token_data["access_token"]
        # Use configurable buffer before expiry
        TOKEN_CACHE["expires_at"] = datetime.now() + timedelta(
            seconds=token_data["expires_in"] - TOKEN_EXPIRY_BUFFER_SECONDS
        )
        
        logger.info(f"eBay OAuth token refreshed ({'sandbox' if use_sandbox else 'production'})")
        return TOKEN_CACHE["token"]


def filter_outliers_iqr(prices: List[float]) -> List[float]:
    """
    Remove extreme low/high prices using Interquartile Range method.
    This finds the true market value by excluding anomalies.
    
    Args:
        prices: List of prices from listings
        
    Returns:
        Filtered list with outliers removed
    """
    if len(prices) < 4:
        return prices

    q1 = np.percentile(prices, 25)
    q3 = np.percentile(prices, 75)
    iqr = q3 - q1
    
    lower_bound = q1 - (1.5 * iqr)
    upper_bound = q3 + (1.5 * iqr)
    
    filtered = [x for x in prices if lower_bound <= x <= upper_bound]
    
    if len(filtered) < len(prices):
        logger.info(f"IQR filter: {len(prices)} -> {len(filtered)} prices (removed {len(prices) - len(filtered)} outliers)")
    
    return filtered


def calculate_variance_coefficient(prices: List[float]) -> float:
    """Calculate coefficient of variation (std_dev / mean * 100) as percentage."""
    if len(prices) < 2:
        return 0.0
    mean = np.mean(prices)
    if mean == 0:
        return 0.0
    return float(np.std(prices) / mean * 100)


def _extract_fallback_keywords(keywords: str, item_type: Optional[str] = None) -> str:
    """
    Create broader search keywords by removing specific model identifiers.
    Preserves brand and general item type for category-level search.
    
    Example: "Sony WH-1000XM4 headphones" → "Sony headphones"
    """
    # Split into words and filter empty
    words = [w for w in keywords.split() if w]
    
    if len(words) <= 2:
        # Already minimal, can't reduce further
        return keywords
    
    # Try to identify brand (usually first word if capitalized)
    brand = words[0] if words and words[0] and words[0][0].isupper() else ""
    
    # Try to identify item type (usually last word or provided)
    item_type_word = item_type if item_type else words[-1]
    
    # Remove model numbers but keep descriptive words
    filtered = []
    for word in words:
        # Keep brand
        if word == brand:
            filtered.append(word)
            continue
        # Keep item type
        if word.lower() == item_type_word.lower():
            filtered.append(word)
            continue
        # Skip model identifiers (contain numbers or multiple dashes)
        if any(c.isdigit() for c in word) or word.count('-') > 1:
            continue
        # Keep all other descriptive words (more flexible than whitelist)
        filtered.append(word)
    
    result = " ".join(filtered) if filtered else keywords
    logger.info("Fallback keywords: '%s' → '%s'", keywords, result)
    return result


class RateLimitError(Exception):
    """Raised when eBay API returns 429 rate limit error."""
    pass


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=4),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def _ebay_api_request(
    url: str, headers: Dict[str, str], params: Dict[str, Any]
) -> httpx.Response:
    """
    Make eBay API request with retry logic for transient errors.
    
    Retries on: TimeoutException, ConnectError, 503
    Does NOT retry on: 400, 401, 403, 404, 429 (rate limit)
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=headers, params=params)
        
        # Don't retry rate limit - fail immediately
        if resp.status_code == 429:
            raise RateLimitError("eBay API rate limit exceeded")
        
        # Retry on 503 by raising timeout-like error
        if resp.status_code == 503:
            raise httpx.TimeoutException("Service unavailable (503)")
        
        return resp


async def _fetch_ebay_listings(keywords: str) -> Dict[str, Any]:
    """
    Internal function to fetch listings from eBay Browse API.
    Used by search_sold_listings for both primary and fallback searches.
    
    Returns:
        Dict with status, items, prices, and statistics
    """
    try:
        token = await get_ebay_token()
    except Exception as e:
        logger.error(f"Failed to get eBay token: {e}")
        return {
            "status": "error",
            "error": "eBay authentication failed",
            "details": str(e),
            "keywords": keywords,
            "data_source": "primary",
            "limited_data": True,
        }
    
    # Determine environment
    use_sandbox = os.environ.get("EBAY_USE_SANDBOX", "true").lower() == "true"
    base_url = (
        "https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search"
        if use_sandbox else
        "https://api.ebay.com/buy/browse/v1/item_summary/search"
    )
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US"
    }
    
    params = {
        "q": keywords,
        "limit": 50,
        "filter": "deliveryCountry:US,priceCurrency:USD"
    }
    
    await _increment_api_counter("browse")
    
    try:
        resp = await _ebay_api_request(base_url, headers, params)
    except RateLimitError as e:
        logger.error(f"eBay rate limit hit: {e}")
        return {
            "status": "error",
            "error": "rate_limit",
            "details": "eBay API rate limit exceeded. Please try again later.",
            "keywords": keywords,
            "data_source": "primary",
            "limited_data": True,
        }
    except Exception as e:
        logger.error(f"eBay API request failed after retries: {e}")
        return {
            "status": "error",
            "error": "api_error",
            "details": str(e),
            "keywords": keywords,
            "data_source": "primary",
            "limited_data": True,
        }
    
    if resp.status_code != 200:
        logger.error(f"eBay API error: {resp.status_code} - {resp.text}")
        return {
            "status": "error",
            "error": "eBay API request failed",
            "details": resp.text,
            "keywords": keywords,
            "data_source": "primary",
            "limited_data": True,
        }
    
    data = resp.json()
    items = data.get("itemSummaries", [])
    
    if not items:
        logger.info(f"No listings found for: {keywords}")
        return {
            "status": "no_data",
            "keywords": keywords,
            "message": "No listings found for these search terms",
            "total_found": 0,
            "data_source": "primary",
            "limited_data": True,
        }
    
    # Extract prices with sanity check
    prices = []
    for item in items:
        try:
            price = float(item["price"]["value"])
            # Sanity check: skip unreasonably high prices
            if 0 < price <= MAX_REASONABLE_PRICE:
                prices.append(price)
            elif price > MAX_REASONABLE_PRICE:
                logger.warning("Skipping unreasonable price: $%.2f", price)
        except (KeyError, ValueError, TypeError):
            continue
    
    if not prices:
        return {
            "status": "no_prices",
            "keywords": keywords,
            "total_found": len(items),
            "message": "Listings found but no valid prices extracted",
            "data_source": "primary",
            "limited_data": True,
        }
    
    # IQR filtering
    clean_prices = filter_outliers_iqr(prices)
    if not clean_prices:
        clean_prices = prices
    
    variance_pct = calculate_variance_coefficient(clean_prices)
    
    return {
        "status": "success",
        "keywords": keywords,
        "total_found": len(items),
        "prices_analyzed": len(clean_prices),
        "outliers_removed": len(prices) - len(clean_prices),
        "variance_pct": round(variance_pct, 2),
        "price_range": {
            "min": round(min(clean_prices), 2),
            "max": round(max(clean_prices), 2),
        },
        "fair_market_value": round(float(np.median(clean_prices)), 2),
        "mean": round(float(np.mean(clean_prices)), 2),
        "std_dev": round(float(np.std(clean_prices)), 2) if len(clean_prices) > 1 else 0,
        "data_source": "primary",
        "limited_data": False,
    }


async def search_sold_listings(
    keywords: str,
    item_type: Optional[str] = None,
    allow_fallback: bool = True,
) -> Dict[str, Any]:
    """
    Query eBay Browse API for market data with optional fallback search.
    
    Note: Browse API returns current listings. For true sold data,
    you'd need the Finding API with completedItems filter or
    marketplace insights API (requires additional eBay approval).
    
    Args:
        keywords: Search query string
        item_type: Optional item type for fallback keyword generation
        allow_fallback: Whether to try broader search if primary yields <5 items
        
    Returns:
        Dict with statistical analysis of prices, data_source, and limited_data flags
    """
    if settings.use_mock:
        from .mocks.mock_ebay import search_sold_listings as mock_search

        return await mock_search(keywords)

    # Primary search
    primary_result = await _fetch_ebay_listings(keywords)
    
    # Check if primary has sufficient data (≥5 items)
    primary_count = primary_result.get("prices_analyzed", 0)
    
    if primary_count >= 5:
        # Sufficient data, use primary
        primary_result["data_source"] = "primary"
        primary_result["limited_data"] = False
        return primary_result
    
    # Primary has <5 items - consider fallback
    if not allow_fallback:
        primary_result["data_source"] = "primary"
        primary_result["limited_data"] = primary_count < 5
        return primary_result
    
    # Try fallback search with broader keywords
    fallback_keywords = _extract_fallback_keywords(keywords, item_type)
    
    # Don't fallback if keywords didn't change
    if fallback_keywords == keywords:
        logger.info("Fallback skipped: keywords unchanged after simplification")
        primary_result["data_source"] = "primary"
        primary_result["limited_data"] = primary_count < 5
        return primary_result
    
    logger.info("Primary search yielded %d items, trying fallback: '%s'", primary_count, fallback_keywords)
    
    fallback_result = await _fetch_ebay_listings(fallback_keywords)
    fallback_count = fallback_result.get("prices_analyzed", 0)
    
    # Use fallback only if:
    # 1. Has more items than primary
    # 2. Has at least 5 items
    # 3. Variance is within acceptable threshold
    fallback_variance = fallback_result.get("variance_pct", 100)
    
    if (
        fallback_count > primary_count
        and fallback_count >= 5
        and fallback_variance <= FALLBACK_VARIANCE_THRESHOLD
    ):
        fallback_result["data_source"] = "fallback"
        fallback_result["limited_data"] = True  # Fallback is always "limited" (less specific)
        fallback_result["original_keywords"] = keywords
        fallback_result["fallback_keywords"] = fallback_keywords
        logger.info(
            "Using fallback: %d items, %.1f%% variance",
            fallback_count,
            fallback_variance,
        )
        return fallback_result
    
    # Fallback not better, return primary
    primary_result["data_source"] = "primary"
    primary_result["limited_data"] = primary_count < 5
    if fallback_count > 0:
        logger.info(
            "Fallback rejected: %d items, %.1f%% variance (>%.0f%% threshold)",
            fallback_count,
            fallback_variance,
            FALLBACK_VARIANCE_THRESHOLD,
        )
    return primary_result


async def get_market_data_for_item(item_identity: dict) -> Dict[str, Any]:
    """
    Get market data from cache or eBay API.
    
    This wrapper adds caching to eBay API calls to:
    - Reduce API rate limit exhaustion
    - Minimize API costs
    - Improve response times for popular items
    
    Args:
        item_identity: Dict with brand, model, item_type, category, search_keywords
        
    Returns:
        Market data dict with price_range, fair_market_value, data_source, limited_data
    """
    search_keywords = item_identity.get("search_keywords") or ["unknown"]
    keywords = search_keywords[0] if search_keywords else "unknown"
    item_type = item_identity.get("item_type")
    
    # Mock mode bypasses cache entirely
    if settings.use_mock:
        return await search_sold_listings(keywords, item_type=item_type)
    
    # Check if cache is disabled
    if not settings.cache_enabled:
        return await search_sold_listings(keywords, item_type=item_type)
    
    # Generate cache key
    cache_key = get_cache_key(item_identity)
    
    # Check cache first (read_cache already logs hit/miss)
    cached_data = read_cache(cache_key)
    if cached_data:
        return cached_data
    
    # Cache miss - call eBay API
    market_data = await search_sold_listings(keywords, item_type=item_type)
    
    # Write to cache (fail gracefully)
    ttl_hours = settings.ebay_cache_ttl_hours
    ttl_seconds = ttl_hours * 3600
    if write_cache(cache_key, market_data, ttl_seconds):
        logger.info(f"Cached market data with TTL {ttl_hours}h")
    
    return market_data











