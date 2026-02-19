# backend/services/confidence.py
"""
Confidence Calculation Service (Story 2-5)

Calculates market confidence based on:
- AI identification confidence (from Story 2-2)
- Market data quality (from Story 2-4): sample size, variance, data source

Uses simple conditional logic for maintainability and testability.
"""
import logging
import os
from dataclasses import dataclass
from typing import Any, Dict, Literal

logger = logging.getLogger(__name__)

# Type aliases
MarketConfidenceLevel = Literal["HIGH", "MEDIUM", "LOW"]
AIConfidenceLevel = Literal["HIGH", "MEDIUM", "LOW"]


@dataclass
class ConfidenceFactors:
    """Breakdown of factors that influenced the confidence calculation."""
    sample_size: int
    variance_pct: float
    ai_confidence: str
    data_source: str
    data_source_penalty: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "sample_size": self.sample_size,
            "variance_pct": self.variance_pct,
            "ai_confidence": self.ai_confidence,
            "data_source": self.data_source,
            "data_source_penalty": self.data_source_penalty,
        }


@dataclass
class ConfidenceResult:
    """Result of confidence calculation."""
    market_confidence: MarketConfidenceLevel
    confidence_factors: ConfidenceFactors
    ai_only_flag: bool
    confidence_message: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "market_confidence": self.market_confidence,
            "confidence_factors": self.confidence_factors.to_dict(),
            "ai_only_flag": self.ai_only_flag,
            "confidence_message": self.confidence_message,
        }


# Default threshold values (can be overridden via environment variables)
DEFAULT_THRESHOLDS: Dict[str, float] = {
    "high_min_items": 20,
    "medium_min_items": 5,
    "high_max_variance": 25.0,
    "medium_max_variance": 40.0,
}

# Valid AI confidence values
VALID_AI_CONFIDENCE = frozenset({"HIGH", "MEDIUM", "LOW"})


def get_confidence_thresholds() -> Dict[str, float]:
    """
    Load confidence thresholds from environment variables with defaults.
    
    Falls back to defaults on invalid configuration (logs warning).
    
    Environment variables:
    - CONFIDENCE_HIGH_MIN_ITEMS: Minimum items for HIGH confidence (default: 20)
    - CONFIDENCE_MEDIUM_MIN_ITEMS: Minimum items for MEDIUM confidence (default: 5)
    - CONFIDENCE_HIGH_MAX_VARIANCE: Maximum variance % for HIGH confidence (default: 25.0)
    - CONFIDENCE_MEDIUM_MAX_VARIANCE: Maximum variance % for MEDIUM confidence (default: 40.0)
    """
    try:
        thresholds = {
            "high_min_items": int(os.environ.get("CONFIDENCE_HIGH_MIN_ITEMS", DEFAULT_THRESHOLDS["high_min_items"])),
            "medium_min_items": int(os.environ.get("CONFIDENCE_MEDIUM_MIN_ITEMS", DEFAULT_THRESHOLDS["medium_min_items"])),
            "high_max_variance": float(os.environ.get("CONFIDENCE_HIGH_MAX_VARIANCE", DEFAULT_THRESHOLDS["high_max_variance"])),
            "medium_max_variance": float(os.environ.get("CONFIDENCE_MEDIUM_MAX_VARIANCE", DEFAULT_THRESHOLDS["medium_max_variance"])),
        }
        
        # Validate ranges
        if thresholds["high_min_items"] < 1 or thresholds["medium_min_items"] < 1:
            raise ValueError("Minimum items must be >= 1")
        if thresholds["high_max_variance"] < 0 or thresholds["medium_max_variance"] < 0:
            raise ValueError("Variance thresholds must be >= 0")
        if thresholds["medium_min_items"] > thresholds["high_min_items"]:
            raise ValueError("medium_min_items cannot exceed high_min_items")
            
        return thresholds
        
    except (ValueError, TypeError) as e:
        logger.warning(f"Invalid confidence threshold config: {e}. Using defaults.")
        return DEFAULT_THRESHOLDS.copy()


def _check_ai_only(market_data: Dict[str, Any]) -> bool:
    """
    Check if valuation has insufficient market data (AI-only mode).
    
    Returns True if:
    - total_found < 3 (not enough comparable items)
    - OR status != "success" (API failed or no results)
    
    Args:
        market_data: Dictionary from eBay service with market statistics
        
    Returns:
        True if AI_ONLY flag should be set
    """
    total_found = market_data.get("total_found", 0)
    status = market_data.get("status", "error")
    
    return total_found < 3 or status != "success"


def _generate_confidence_message(
    level: MarketConfidenceLevel, 
    factors: ConfidenceFactors, 
    ai_only: bool
) -> str:
    """
    Generate a human-readable confidence explanation.
    
    Args:
        level: The calculated confidence level
        factors: The factors that contributed to the calculation
        ai_only: Whether this is an AI-only valuation
        
    Returns:
        User-friendly message explaining the confidence level
    """
    if ai_only:
        return "No market data available - AI estimate only"
    
    sample_size = factors.sample_size
    
    if level == "HIGH":
        return f"Strong confidence based on {sample_size} comparable sales with consistent pricing"
    
    if level == "MEDIUM":
        if factors.data_source_penalty:
            return f"Moderate confidence based on {sample_size} sales (broader search used)"
        return f"Moderate confidence based on {sample_size} sales"
    
    # LOW confidence - explain why
    thresholds = get_confidence_thresholds()
    reasons = []
    
    if sample_size < thresholds["medium_min_items"]:
        reasons.append(f"only {sample_size} comparable items found")
    if factors.variance_pct > thresholds["medium_max_variance"]:
        reasons.append(f"high price variation ({factors.variance_pct:.0f}%)")
    if factors.ai_confidence == "LOW":
        reasons.append("uncertain item identification")
    
    if reasons:
        reason_str = ", ".join(reasons)
        return f"Limited data ({reason_str}) - consider manual verification"
    
    return f"Limited data ({sample_size} items) - consider manual verification"


def calculate_market_confidence(
    market_data: Dict[str, Any], 
    ai_confidence: str
) -> ConfidenceResult:
    """
    Calculate market confidence based on market data and AI identification confidence.
    
    Algorithm:
    1. Check AI_ONLY first (insufficient market data) → always LOW
    2. Check HIGH conditions (ALL must be true) → HIGH
    3. Check LOW disqualifiers (ANY is true) → LOW  
    4. Everything else → MEDIUM
    
    Args:
        market_data: Dictionary from eBay service containing:
            - prices_analyzed: Number of prices used in calculation
            - variance_pct: Price variance as percentage
            - data_source: "primary" or "fallback"
            - total_found: Total items found in search
            - status: "success" or error status
        ai_confidence: AI identification confidence ("HIGH", "MEDIUM", "LOW")
        
    Returns:
        ConfidenceResult with level, factors, ai_only_flag, and message
    """
    # Validate and normalize AI confidence input
    if ai_confidence not in VALID_AI_CONFIDENCE:
        logger.warning(f"Invalid ai_confidence '{ai_confidence}', defaulting to MEDIUM")
        ai_confidence = "MEDIUM"
    
    # Load thresholds
    thresholds = get_confidence_thresholds()
    high_min_items = thresholds["high_min_items"]
    medium_min_items = thresholds["medium_min_items"]
    high_max_variance = thresholds["high_max_variance"]
    medium_max_variance = thresholds["medium_max_variance"]
    
    # Extract with safe defaults (AC8: Missing Data Defaults)
    items = market_data.get("prices_analyzed", 0)
    variance = market_data.get("variance_pct")
    if variance is None:
        variance = 100.0  # Conservative default - triggers LOW
    data_source = market_data.get("data_source", "primary")
    
    # Check for AI_ONLY (AC4)
    ai_only = _check_ai_only(market_data)
    
    # Build factors for response
    data_source_penalty = data_source == "fallback"
    factors = ConfidenceFactors(
        sample_size=items,
        variance_pct=variance,
        ai_confidence=ai_confidence,
        data_source=data_source,
        data_source_penalty=data_source_penalty,
    )
    
    # AI_ONLY is always LOW (AC4)
    if ai_only:
        message = _generate_confidence_message("LOW", factors, ai_only=True)
        return ConfidenceResult(
            market_confidence="LOW",
            confidence_factors=factors,
            ai_only_flag=True,
            confidence_message=message,
        )
    
    # HIGH: All conditions must be met (AC1)
    if (
        items >= high_min_items
        and variance <= high_max_variance
        and ai_confidence == "HIGH"
        and data_source == "primary"
    ):
        message = _generate_confidence_message("HIGH", factors, ai_only=False)
        return ConfidenceResult(
            market_confidence="HIGH",
            confidence_factors=factors,
            ai_only_flag=False,
            confidence_message=message,
        )
    
    # LOW: Any disqualifying condition (AC3)
    has_low_disqualifier = (
        items < medium_min_items
        or variance > medium_max_variance
        or ai_confidence == "LOW"
    )
    
    # Fallback + another weakness = LOW (AC7)
    has_other_weakness = (
        items < high_min_items
        or variance > high_max_variance
        or ai_confidence != "HIGH"
    )
    fallback_with_weakness = data_source_penalty and has_other_weakness
    
    if has_low_disqualifier or fallback_with_weakness:
        message = _generate_confidence_message("LOW", factors, ai_only=False)
        return ConfidenceResult(
            market_confidence="LOW",
            confidence_factors=factors,
            ai_only_flag=False,
            confidence_message=message,
        )
    
    # MEDIUM: Everything else (AC2)
    message = _generate_confidence_message("MEDIUM", factors, ai_only=False)
    return ConfidenceResult(
        market_confidence="MEDIUM",
        confidence_factors=factors,
        ai_only_flag=False,
        confidence_message=message,
    )
