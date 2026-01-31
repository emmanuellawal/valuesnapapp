# backend/services/ebay.py
"""
eBay Value Engine - The Heavy Lifter
Handles: OAuth, Market Search, IQR Outlier Filtering, Statistical Analysis
"""
import os
import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta

from ..config import settings

logger = logging.getLogger(__name__)

# Simple in-memory cache for OAuth token
# In production with 1000s of users, use Redis
TOKEN_CACHE = {"token": None, "expires_at": datetime.now()}


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

    import httpx
    
    async with httpx.AsyncClient() as client:
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
        # Expire 5 minutes early to be safe
        TOKEN_CACHE["expires_at"] = datetime.now() + timedelta(
            seconds=token_data["expires_in"] - 300
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

    import numpy as np
    
    q1 = np.percentile(prices, 25)
    q3 = np.percentile(prices, 75)
    iqr = q3 - q1
    
    lower_bound = q1 - (1.5 * iqr)
    upper_bound = q3 + (1.5 * iqr)
    
    filtered = [x for x in prices if lower_bound <= x <= upper_bound]
    
    if len(filtered) < len(prices):
        logger.info(f"IQR filter: {len(prices)} -> {len(filtered)} prices (removed {len(prices) - len(filtered)} outliers)")
    
    return filtered


async def search_sold_listings(keywords: str) -> Dict[str, Any]:
    """
    Query eBay Browse API for market data.
    
    Note: Browse API returns current listings. For true sold data,
    you'd need the Finding API with completedItems filter or
    marketplace insights API (requires additional eBay approval).
    
    Args:
        keywords: Search query string
        
    Returns:
        Dict with statistical analysis of prices
    """
    if settings.use_mock:
        from .mocks.mock_ebay import search_sold_listings as mock_search

        return await mock_search(keywords)

    import httpx
    import numpy as np

    try:
        token = await get_ebay_token()
    except Exception as e:
        logger.error(f"Failed to get eBay token: {e}")
        return {"status": "error", "error": "eBay authentication failed", "details": str(e)}
    
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
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(base_url, headers=headers, params=params)
        
        if resp.status_code != 200:
            logger.error(f"eBay API error: {resp.status_code} - {resp.text}")
            return {
                "status": "error",
                "error": "eBay API request failed",
                "details": resp.text,
                "keywords": keywords
            }
        
        data = resp.json()
        items = data.get("itemSummaries", [])
        
        if not items:
            logger.info(f"No listings found for: {keywords}")
            return {
                "status": "no_data",
                "keywords": keywords,
                "message": "No listings found for these search terms"
            }
        
        # Extract prices
        prices = []
        for item in items:
            try:
                price = float(item["price"]["value"])
                prices.append(price)
            except (KeyError, ValueError, TypeError):
                continue
        
        if not prices:
            return {
                "status": "no_prices",
                "keywords": keywords,
                "total_found": len(items),
                "message": "Listings found but no valid prices extracted"
            }
        
        # HEAVY LIFTING: Statistical Analysis with IQR filtering
        clean_prices = filter_outliers_iqr(prices)
        
        if not clean_prices:
            clean_prices = prices  # Fallback to unfiltered if IQR removes all
        
        return {
            "status": "success",
            "keywords": keywords,
            "total_found": len(items),
            "prices_analyzed": len(clean_prices),
            "outliers_removed": len(prices) - len(clean_prices),
            "price_range": {
                "min": round(min(clean_prices), 2),
                "max": round(max(clean_prices), 2),
            },
            "fair_market_value": round(float(np.median(clean_prices)), 2),
            "mean": round(float(np.mean(clean_prices)), 2),
            "std_dev": round(float(np.std(clean_prices)), 2) if len(clean_prices) > 1 else 0,
        }











