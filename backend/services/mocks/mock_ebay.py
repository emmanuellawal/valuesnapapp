import asyncio
import hashlib
import random
from typing import Any, Dict, List, Tuple


MOCK_PRICING_DATA: Dict[str, Dict[str, Any]] = {
    "vintage wristwatch": {
        "base_price_range": (500, 5000),
        "brand_multipliers": {"Rolex": 3.0, "Omega": 1.5},
    },
    "wireless headphones": {
        "base_price_range": (50, 400),
        "brand_multipliers": {"Sony": 1.2, "Bose": 1.1},
    },
    "hardcover novel": {
        "base_price_range": (5, 80),
        "brand_multipliers": {"unknown": 1.0},
    },
    "office chair": {
        "base_price_range": (50, 1200),
        "brand_multipliers": {"Herman Miller": 1.6, "Steelcase": 1.2},
    },
}


def _scenario_from_keywords(keywords: str) -> str:
    # Story 2-5: Confidence testing scenarios
    if "__SCENARIO_HIGH_CONFIDENCE__" in keywords:
        return "HIGH_CONFIDENCE"
    if "__SCENARIO_LOW_CONFIDENCE__" in keywords:
        return "LOW_CONFIDENCE"
    # Story 2-4: API error simulation
    if "__SCENARIO_API_ERROR__" in keywords:
        return "API_ERROR"
    if "__SCENARIO_RATE_LIMIT__" in keywords:
        return "RATE_LIMIT"
    # Original scenarios
    if "__SCENARIO_NONE__" in keywords:
        return "NONE"
    if "__SCENARIO_LOW__" in keywords:
        return "LOW"
    if "__SCENARIO_LIMITED__" in keywords:
        return "LIMITED"
    if "__SCENARIO_HAPPY__" in keywords:
        return "HIGH"

    digest = hashlib.sha256(keywords.encode("utf-8")).hexdigest()
    bucket = int(digest[:2], 16) % 3
    return ("HIGH", "LOW", "NONE")[bucket]


def _infer_item_type(keywords: str) -> str:
    lowered = keywords.lower()
    if "rolex" in lowered or "submariner" in lowered or "watch" in lowered:
        return "vintage wristwatch"
    if "headphone" in lowered or "wh-" in lowered or "sony" in lowered:
        return "wireless headphones"
    if "chair" in lowered or "aeron" in lowered or "herman" in lowered:
        return "office chair"
    if "book" in lowered or "novel" in lowered or "hardcover" in lowered:
        return "hardcover novel"
    return "wireless headphones"


def _generate_prices(rng: random.Random, base_range: Tuple[float, float], count: int) -> List[float]:
    low, high = base_range
    prices: List[float] = []
    for _ in range(count):
        # Triangular distribution: more realistic clustering around the middle
        value = rng.triangular(low, high, (low + high) / 2)
        prices.append(round(float(value), 2))
    return prices


def _summary(
    keywords: str,
    prices: List[float],
    total_found: int,
    confidence: str,
    data_source: str = "primary",
    limited_data: bool = False,
    avg_days_to_sell: int | None = None,
) -> Dict[str, Any]:
    if not prices:
        return {
            "status": "no_prices",
            "keywords": keywords,
            "total_found": total_found,
            "message": "Listings found but no valid prices extracted",
            "confidence": confidence,
            "data_source": data_source,
            "limited_data": True,
        }

    min_price = min(prices)
    max_price = max(prices)
    sorted_prices = sorted(prices)
    mid = len(sorted_prices) // 2
    median = (
        sorted_prices[mid]
        if len(sorted_prices) % 2 == 1
        else (sorted_prices[mid - 1] + sorted_prices[mid]) / 2
    )
    mean = sum(sorted_prices) / len(sorted_prices)

    # Simple population stddev
    variance = sum((p - mean) ** 2 for p in sorted_prices) / len(sorted_prices)
    std_dev = variance ** 0.5
    
    # Coefficient of variation (CV) as percentage
    variance_pct = (std_dev / mean * 100) if mean > 0 else 0

    result = {
        "status": "success",
        "keywords": keywords,
        "total_found": total_found,
        "prices_analyzed": len(prices),
        "outliers_removed": 0,
        "variance_pct": round(variance_pct, 2),
        "price_range": {"min": round(min_price, 2), "max": round(max_price, 2)},
        "fair_market_value": round(float(median), 2),
        "mean": round(float(mean), 2),
        "std_dev": round(float(std_dev), 2) if len(prices) > 1 else 0,
        "confidence": confidence,
        "data_source": data_source,
        "limited_data": limited_data,
    }
    # Story 2.11: Market velocity indicator
    if avg_days_to_sell is not None:
        result["avg_days_to_sell"] = avg_days_to_sell
    return result


async def search_sold_listings(keywords: str) -> Dict[str, Any]:
    """Deterministic mock eBay market search with realistic latency."""
    await asyncio.sleep(random.uniform(0.5, 1.5))

    scenario = _scenario_from_keywords(keywords)
    
    # Story 2-4: API error scenario for testing error handling
    if scenario == "API_ERROR":
        return {
            "status": "error",
            "error": "api_error",
            "details": "Mock simulated API error for testing",
            "keywords": keywords,
            "data_source": "primary",
            "limited_data": True,
        }
    
    # Story 2-4: Rate limit scenario for testing 429 handling
    if scenario == "RATE_LIMIT":
        return {
            "status": "error",
            "error": "rate_limit",
            "details": "eBay API rate limit exceeded. Please try again later.",
            "keywords": keywords,
            "data_source": "primary",
            "limited_data": True,
        }
    
    # Story 2-5: HIGH_CONFIDENCE scenario - ideal conditions for HIGH market confidence
    # 25 items, ~18% variance, primary data source
    if scenario == "HIGH_CONFIDENCE":
        # Use deterministic RNG for velocity (same keywords = same days)
        digest = hashlib.sha256(keywords.encode("utf-8")).hexdigest()
        rng = random.Random(int(digest[:8], 16))
        avg_days = round(rng.triangular(3, 14, 7))  # Fast sellers (HIGH confidence)
        
        return {
            "status": "success",
            "keywords": keywords,
            "total_found": 25,
            "prices_analyzed": 25,
            "outliers_removed": 0,
            "variance_pct": 18.0,
            "price_range": {"min": 150.0, "max": 280.0},
            "fair_market_value": 215.0,
            "mean": 210.0,
            "std_dev": 37.8,
            "avg_days_to_sell": avg_days,
            "confidence": "HIGH",
            "data_source": "primary",
            "limited_data": False,
        }
    
    # Story 2-5: LOW_CONFIDENCE scenario - triggers AI_ONLY (total_found < 3)
    if scenario == "LOW_CONFIDENCE":
        return {
            "status": "no_data",
            "keywords": keywords,
            "message": "Insufficient market data - AI estimate only",
            "total_found": 2,
            "prices_analyzed": 0,
            "confidence": "LOW",
            "data_source": "primary",
            "limited_data": True,
        }
    
    if scenario == "NONE":
        return {
            "status": "no_data",
            "keywords": keywords,
            "message": "No listings found for these search terms",
            "total_found": 0,
            "confidence": "NONE",
            "data_source": "primary",
            "limited_data": True,
        }

    item_type = _infer_item_type(keywords)
    pricing = MOCK_PRICING_DATA.get(item_type, MOCK_PRICING_DATA["wireless headphones"])

    digest = hashlib.sha256(keywords.encode("utf-8")).hexdigest()
    rng = random.Random(int(digest[:8], 16))

    base_low, base_high = pricing["base_price_range"]

    if scenario == "LOW":
        total_found = rng.randint(1, 4)
        prices = _generate_prices(rng, (base_low, base_high), total_found)
        avg_days = round(rng.triangular(15, 45, 30))  # Slow sellers
        return _summary(
            keywords,
            prices,
            total_found=total_found,
            confidence="LOW",
            data_source="primary",
            limited_data=True,
            avg_days_to_sell=avg_days,
        )
    
    if scenario == "LIMITED":
        # LIMITED scenario: returns data but flags it as limited (for testing)
        total_found = rng.randint(5, 10)
        prices = _generate_prices(rng, (base_low, base_high), total_found)
        avg_days = round(rng.triangular(7, 30, 14))  # Medium velocity
        return _summary(
            keywords,
            prices,
            total_found=total_found,
            confidence="MEDIUM",
            data_source="fallback",
            limited_data=True,
            avg_days_to_sell=avg_days,
        )

    # HIGH confidence
    total_found = rng.randint(10, 25)
    prices = _generate_prices(rng, (base_low, base_high), min(total_found, 50))
    avg_days = round(rng.triangular(3, 14, 7))  # Fast sellers
    return _summary(
        keywords,
        prices,
        total_found=total_found,
        confidence="HIGH",
        data_source="primary",
        limited_data=False,
        avg_days_to_sell=avg_days,
    )
