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
    if "__SCENARIO_NONE__" in keywords:
        return "NONE"
    if "__SCENARIO_LOW__" in keywords:
        return "LOW"
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


def _summary(keywords: str, prices: List[float], total_found: int, confidence: str) -> Dict[str, Any]:
    if not prices:
        return {
            "status": "no_prices",
            "keywords": keywords,
            "total_found": total_found,
            "message": "Listings found but no valid prices extracted",
            "confidence": confidence,
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

    return {
        "status": "success",
        "keywords": keywords,
        "total_found": total_found,
        "prices_analyzed": len(prices),
        "outliers_removed": 0,
        "price_range": {"min": round(min_price, 2), "max": round(max_price, 2)},
        "fair_market_value": round(float(median), 2),
        "mean": round(float(mean), 2),
        "std_dev": round(float(std_dev), 2) if len(prices) > 1 else 0,
        "confidence": confidence,
    }


async def search_sold_listings(keywords: str) -> Dict[str, Any]:
    """Deterministic mock eBay market search with realistic latency."""
    await asyncio.sleep(random.uniform(0.5, 1.5))

    scenario = _scenario_from_keywords(keywords)
    if scenario == "NONE":
        return {
            "status": "no_data",
            "keywords": keywords,
            "message": "No listings found for these search terms",
            "total_found": 0,
            "confidence": "NONE",
        }

    item_type = _infer_item_type(keywords)
    pricing = MOCK_PRICING_DATA.get(item_type, MOCK_PRICING_DATA["wireless headphones"])

    digest = hashlib.sha256(keywords.encode("utf-8")).hexdigest()
    rng = random.Random(int(digest[:8], 16))

    base_low, base_high = pricing["base_price_range"]

    if scenario == "LOW":
        total_found = rng.randint(1, 4)
        prices = _generate_prices(rng, (base_low, base_high), total_found)
        return _summary(keywords, prices, total_found=total_found, confidence="LOW")

    # HIGH confidence
    total_found = rng.randint(10, 25)
    prices = _generate_prices(rng, (base_low, base_high), min(total_found, 50))
    return _summary(keywords, prices, total_found=total_found, confidence="HIGH")
