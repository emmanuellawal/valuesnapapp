import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import allowed_origins, settings
from backend.models import AnalyzeRequest
from backend.services.ai import identify_item_from_image, AIIdentificationError
from backend.services.confidence import calculate_market_confidence
from backend.services.ebay import search_sold_listings, get_api_stats, reset_api_stats
from backend.services.valuations import ValuationRepository
from backend.models import ValuationRecord
from backend.cache import get_cache_stats

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ValueSnap Engine")

# CORS - Allow your Expo App to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["*"],  # Allow all for dev, tighten for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "system": "ValueSnap V2",
        "status": "operational",
        "mode": "swiss_minimalist",
        "sandbox": settings.ebay_use_sandbox,
        "cors": allowed_origins or ["*"],
    }


@app.post("/api/appraise")
async def appraise_item(request: AnalyzeRequest):
    """
    Main appraisal endpoint.
    
    Flow:
    1. GPT analyzes image (Visual Detective) -> Item Identity
    2. eBay searches market (Value Engine) -> Price Statistics
    3. Calculate market confidence based on data quality
    4. Combined response with identity + valuation + confidence
    """
    # Step 1: Visual Identification (GPT)
    try:
        identity = await identify_item_from_image(request.image_base64)
    except AIIdentificationError as e:
        # Return structured error response for frontend handling (Story 2-8)
        logger.error(f"AI identification failed: {e.code} - {e.message}")
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": {
                    "code": e.code,
                    "message": e.message,
                    "suggestions": e.suggestions,
                },
            },
        )
    except Exception as e:
        logger.error(f"Unexpected AI identification error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "GENERIC_ERROR",
                    "message": "Something went wrong during image analysis",
                    "suggestions": [
                        "Please try again",
                        "If the issue persists, contact support",
                    ],
                },
            },
        )
    
    # Step 2: Market Valuation (eBay)
    # Construct search query from AI's optimized keywords
    if identity.search_keywords:
        search_query = " ".join(identity.search_keywords[:3])  # Top 3 keywords
    else:
        # Fallback: construct from brand + model
        search_query = f"{identity.brand} {identity.model}".strip()
    
    # Pass item_type for fallback search optimization (Story 2-5, Task 6.2)
    market_data = await search_sold_listings(search_query, item_type=identity.item_type)
    
    # Step 3: Calculate Market Confidence (Story 2-5)
    confidence_result = calculate_market_confidence(
        market_data=market_data,
        ai_confidence=identity.ai_identification_confidence,
    )
    
    # Step 3.5: Widen price range for LOW confidence (Story 2-9, AC3)
    # LOW confidence = fewer data points = more uncertainty → wider range
    # Applied here because only main.py has both market_data and confidence_result
    if confidence_result.market_confidence == "LOW":
        price_range = market_data.get("price_range", {})
        if price_range and "min" in price_range and "max" in price_range:
            center = (price_range["min"] + price_range["max"]) / 2
            half_width = (price_range["max"] - price_range["min"]) / 2
            # Expand range by 50% on each side to reflect uncertainty
            market_data = dict(market_data)
            market_data["price_range"] = {
                "min": round(max(0, center - half_width * 1.5), 2),
                "max": round(center + half_width * 1.5, 2),
            }
            logger.info("LOW confidence: wider price range applied")
    
    # Step 4: Persist the valuation (best-effort — never blocks success)
    valuation_id = None
    try:
        record = ValuationRecord.from_appraise_response(
            identity_dict=identity.model_dump(),
            valuation_dict=market_data,
            confidence_dict=confidence_result.to_dict(),
            guest_session_id=request.guest_session_id,
        )
        repo = ValuationRepository()
        valuation_id = repo.save(record)
        logger.info(f"Valuation saved: {valuation_id}")
    except Exception as e:
        logger.error(f"Failed to persist valuation (non-fatal): {e}")
    
    # Step 5: Combine and Return
    return {
        "identity": identity.model_dump(),
        "valuation": market_data,
        "confidence": confidence_result.to_dict(),
        "valuation_id": valuation_id,
    }


@app.get("/health")
def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}


# ============================================================================
# Admin/Observability Endpoints (Story 2-4)
# ============================================================================

EBAY_DAILY_QUOTA = 5000
QUOTA_WARNING_THRESHOLD = 0.80  # 80% = 4000 calls


@app.get("/admin/api-stats")
def get_api_statistics():
    """
    Get API usage statistics for monitoring (Story 2-4, Task 8).
    
    Returns:
        - eBay API call counts (OAuth, Browse, total)
        - Cache statistics (total entries, expired entries)
        - Quota usage information
    
    Warning: Logs a warning if quota usage exceeds 80%.
    """
    # Get eBay API stats
    api_stats = get_api_stats()
    
    # Get cache stats (gracefully handles errors)
    try:
        cache_stats = get_cache_stats()
    except Exception as e:
        logger.warning(f"Failed to get cache stats: {e}")
        cache_stats = {"total_entries": 0, "expired_entries": 0, "error": str(e)}
    
    # Calculate quota usage
    total_calls = api_stats["total_calls"]
    quota_used_pct = (total_calls / EBAY_DAILY_QUOTA) * 100
    
    # Proactive warning at 80% quota (4000 calls)
    if total_calls >= EBAY_DAILY_QUOTA * QUOTA_WARNING_THRESHOLD:
        logger.warning(
            f"⚠️ eBay API quota at {quota_used_pct:.1f}% ({total_calls}/{EBAY_DAILY_QUOTA}). "
            "Consider increasing cache TTL or reducing API calls."
        )
    
    return {
        "ebay_oauth_calls": api_stats["oauth_calls"],
        "ebay_browse_calls": api_stats["browse_calls"],
        "total_calls": api_stats["total_calls"],
        "quota": {
            "daily_limit": EBAY_DAILY_QUOTA,
            "used": total_calls,
            "used_pct": round(quota_used_pct, 2),
            "warning_threshold_pct": QUOTA_WARNING_THRESHOLD * 100,
        },
        "cache_stats": cache_stats,
    }


@app.post("/admin/api-stats/reset")
def reset_api_statistics():
    """
    Reset API call counters (for testing purposes only).
    
    Warning: Only use in development/testing. Production should track
    cumulative usage for accurate quota monitoring.
    """
    reset_api_stats()
    logger.info("API statistics reset by admin endpoint")
    return {"status": "reset", "message": "API call counters have been reset"}


