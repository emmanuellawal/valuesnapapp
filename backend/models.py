# backend/models.py
import logging

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Any, Dict, List, Literal, Optional
from decimal import Decimal
from datetime import datetime

logger = logging.getLogger(__name__)


class Identifiers(BaseModel):
    """Product identifiers visible in the image"""
    UPC: Optional[str] = Field(None, description="UPC barcode if visible")
    model_number: Optional[str] = Field(None, description="Model number from labels")
    serial_number: Optional[str] = Field(None, description="Serial number if visible")


# Type alias for AI identification confidence levels
AIConfidenceLevel = Literal["HIGH", "MEDIUM", "LOW"]
VisualCondition = Literal[
    "new",
    "used_excellent",
    "used_good",
    "used_fair",
    "damaged",
]

# Type alias for Market confidence levels (Story 2-5)
MarketConfidenceLevel = Literal["HIGH", "MEDIUM", "LOW"]


class ConfidenceFactorsModel(BaseModel):
    """
    Breakdown of factors that influenced the market confidence calculation.
    (Story 2-5: Confidence Calculation Service)
    """
    sample_size: int = Field(description="Number of comparable items analyzed")
    variance_pct: float = Field(description="Price variance as percentage")
    ai_confidence: str = Field(description="AI identification confidence level")
    data_source: str = Field(description="Data source: 'primary' or 'fallback'")
    data_source_penalty: bool = Field(default=False, description="True if fallback search was used")


# Story 6-14: grounding floor + generic-word list. Tests import both; do not duplicate.
# 40 is a floor against empty/one-token observations, not a measure of description quality.
MIN_VISIBLE_OBSERVATIONS = 40
GENERIC_IDENTITY_TOKENS = frozenset(
    {"item", "object", "product", "thing", "unknown", "stuff", "miscellaneous", "misc"}
)
# Placeholder strings a model emits for "no brand/model"; stored as "unknown".
_UNKNOWN_ALIASES = frozenset({"n/a", "na", "none", "null", "unidentified"})
_STRIP_PUNCTUATION = " \t\n.,;:!?\"'"


def _normalize_token(value: str) -> str:
    return (value or "").strip(_STRIP_PUNCTUATION).lower()


def _is_placeholder_token(value: str) -> bool:
    """True when a token is blank, punctuation-only, generic, or an unknown-alias."""
    normalized = _normalize_token(value)
    return (
        not normalized
        or normalized in GENERIC_IDENTITY_TOKENS
        or normalized in _UNKNOWN_ALIASES
    )


def _normalize_identity_field(value: str) -> str:
    """Return 'unknown' for blank/generic/placeholder brand or model values."""
    stripped = (value or "").strip()
    if _is_placeholder_token(stripped):
        return "unknown"
    return stripped


class ItemIdentity(BaseModel):
    """
    Strictly visual identification. No value judgment.
    GPT is a Visual Detective, not a Price Guide.

    Field order is the structured-output order: visible_observations MUST be first
    so the model describes what it sees before it names a brand/model (Story 6-14).
    """
    visible_observations: str = Field(
        description=(
            "Describe ONLY what is visible, before naming anything: shape, colors, materials, "
            "text/logos exactly as read, form factor, connectors. "
            "Name a brand or model in this field only when that text is literally printed on the item."
        )
    )
    item_type: str = Field(description="Specific item category (e.g., 'wireless headphones')")
    brand: str = Field(description="Brand name if identifiable, otherwise 'unknown'")
    model: str = Field(default="unknown", description="Model name or number")
    
    # Condition is visual, so GPT keeps this, but renamed to be specific
    visual_condition: VisualCondition = Field(
        description="Visual state: new, used_excellent, used_good, used_fair, damaged"
    )
    condition_details: str = Field(
        description="Brief notes on scratches, dents, or packaging state"
    )
    
    estimated_age: str = Field(default="unknown", description="Age estimate (e.g., '1990s')")
    category_hint: str = Field(default="unknown", description="Best eBay category string for search")
    
    # Critical: These keywords drive the eBay API search
    search_keywords: List[str] = Field(
        default_factory=list, 
        description="3-5 precise keywords for eBay search API. Must have at least 1 keyword."
    )
    
    identifiers: Identifiers = Field(default_factory=Identifiers)
    
    # Story 2.2: Description generation for eBay listings (FR17)
    description: str = Field(
        default="",
        description="1-3 sentence description suitable for eBay listing. Factual, not promotional."
    )
    
    # Story 2.2: AI's confidence in its identification (distinct from market confidence in Story 2.5)
    ai_identification_confidence: AIConfidenceLevel = Field(
        default="MEDIUM",
        description="AI's certainty about identification: HIGH (brand/model clear), MEDIUM (category clear), LOW (mostly guessing)"
    )
    
    @model_validator(mode="after")
    def enforce_grounding_and_abstention(self) -> "ItemIdentity":
        """
        Story 6-14. One hook, in this order (a field validator would run before
        brand/model normalization and could not see it):
          1. normalize brand/model placeholders to 'unknown'
          2. drop blank, generic, and unknown-alias keywords
          3. replace a generic item_type with the first specific keyword, or raise
          4. coerce ai_identification_confidence against the stored identity
          5. if no keyword survived, fall back to the specific item_type

        Coercible HIGH is downgraded, not rejected. Only the generic-keyword dead end
        raises, because there is nothing left to search with. The LOW row stays as a
        backstop; a successful result no longer keeps a generic item_type.
        """
        self.brand = _normalize_identity_field(self.brand)
        self.model = _normalize_identity_field(self.model)

        # Drop blank, punctuation-only, generic, and unknown-alias keywords.
        # "" is not in GENERIC_IDENTITY_TOKENS, so a membership test alone keeps it.
        specific = [
            kw.strip()
            for kw in self.search_keywords
            if not _is_placeholder_token(kw)
        ]

        raw_item_type = (self.item_type or "").strip()
        if _is_placeholder_token(raw_item_type):
            if not specific:
                raise ValueError(
                    "No specific search keyword and item_type is generic; "
                    "cannot build a usable search"
                )
            # Abstention must keep a specific category. Use the descriptor the
            # model already produced instead of persisting "item".
            logger.warning(
                "Replacing generic item_type %r with specific keyword %r",
                self.item_type,
                specific[0],
            )
            self.item_type = specific[0]
        else:
            self.item_type = raw_item_type

        item_type_generic = _is_placeholder_token(self.item_type)
        name_unknown = self.brand == "unknown" or self.model == "unknown"
        observations_thin = len((self.visible_observations or "").strip()) < MIN_VISIBLE_OBSERVATIONS

        original = self.ai_identification_confidence
        coerced = original
        if name_unknown and item_type_generic:
            coerced = "LOW"
        elif original == "HIGH" and (name_unknown or observations_thin):
            coerced = "MEDIUM"

        if coerced != original:
            logger.warning(
                "Coercing ai_identification_confidence %s -> %s "
                "(brand=%r, model=%r, item_type=%r, observations_len=%d)",
                original,
                coerced,
                self.brand,
                self.model,
                self.item_type,
                len((self.visible_observations or "").strip()),
            )
            self.ai_identification_confidence = coerced

        if not specific:
            specific = [self.item_type]
        self.search_keywords = specific

        return self


# ~10 MB binary → base64 is ~133% size → 13_400_000 chars max
_MAX_IMAGE_BASE64_LEN = 13_400_000


class AnalyzeRequest(BaseModel):
    """Request body for /api/appraise endpoint"""
    image_base64: str
    guest_session_id: Optional[str] = None

    @field_validator("image_base64")
    @classmethod
    def validate_image_size(cls, v: str) -> str:
        if len(v) > _MAX_IMAGE_BASE64_LEN:
            raise ValueError(
                f"Image too large: {len(v)} chars exceeds {_MAX_IMAGE_BASE64_LEN} char limit (~10 MB)"
            )
        return v


class MigrateGuestRequest(BaseModel):
    """Request body for /api/migrate-guest."""

    guest_session_id: str = Field(..., min_length=1)


class ValuationRecord(BaseModel):
    """
    Persistent valuation record matching the `valuations` table schema.
    Story 3.1: Database representation of a completed appraisal.
    """
    id: Optional[str] = None
    user_id: Optional[str] = None
    guest_session_id: Optional[str] = None
    image_thumbnail_url: Optional[str] = None
    item_name: str
    item_type: str
    brand: str
    price_min: Optional[Decimal] = None
    price_max: Optional[Decimal] = None
    fair_market_value: Optional[Decimal] = None
    confidence: MarketConfidenceLevel
    sample_size: Optional[int] = None
    ai_response: Optional[Dict[str, Any]] = None
    ebay_data: Optional[Dict[str, Any]] = None
    confidence_data: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

    @classmethod
    def from_appraise_response(
        cls,
        identity_dict: Dict[str, Any],
        valuation_dict: Dict[str, Any],
        confidence_dict: Dict[str, Any],
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None,
    ) -> "ValuationRecord":
        """Construct a ValuationRecord from the /api/appraise response dicts."""
        brand = identity_dict.get("brand", "unknown")
        model = identity_dict.get("model", "unknown")
        item_type = identity_dict.get("item_type", "unknown")

        # Item name: "{brand} {model}" → "{brand} {item_type}" → "{item_type}"
        if model and model != "unknown":
            item_name = f"{brand} {model}".strip()
        elif brand and brand != "unknown":
            item_name = f"{brand} {item_type}".strip()
        else:
            item_name = item_type

        price_range = valuation_dict.get("price_range") or {}
        market_confidence = confidence_dict.get("market_confidence")
        if market_confidence not in ("HIGH", "MEDIUM", "LOW"):
            raise ValueError(
                f"Invalid or missing market_confidence in confidence_dict: {market_confidence!r}"
            )

        return cls(
            user_id=user_id,
            guest_session_id=guest_session_id,
            item_name=item_name,
            item_type=item_type,
            brand=brand,
            price_min=price_range.get("min"),
            price_max=price_range.get("max"),
            fair_market_value=valuation_dict.get("fair_market_value"),
            confidence=market_confidence,
            sample_size=valuation_dict.get("prices_analyzed"),
            ai_response=identity_dict,
            ebay_data=valuation_dict,
            confidence_data=confidence_dict,
        )











