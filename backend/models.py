# backend/models.py
from pydantic import BaseModel, Field, field_validator
from typing import Any, Dict, List, Literal, Optional


class Identifiers(BaseModel):
    """Product identifiers visible in the image"""
    UPC: Optional[str] = Field(None, description="UPC barcode if visible")
    model_number: Optional[str] = Field(None, description="Model number from labels")
    serial_number: Optional[str] = Field(None, description="Serial number if visible")


# Type alias for AI identification confidence levels
AIConfidenceLevel = Literal["HIGH", "MEDIUM", "LOW"]

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


class ItemIdentity(BaseModel):
    """
    Strictly visual identification. No value judgment.
    GPT is a Visual Detective, not a Price Guide.
    """
    item_type: str = Field(description="Specific item category (e.g., 'wireless headphones')")
    brand: str = Field(description="Brand name if identifiable, otherwise 'unknown'")
    model: str = Field(default="unknown", description="Model name or number")
    
    # Condition is visual, so GPT keeps this, but renamed to be specific
    visual_condition: str = Field(
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
    
    @field_validator("search_keywords")
    @classmethod
    def ensure_keywords_not_empty(cls, v: List[str], info) -> List[str]:
        """Ensure at least 1 search keyword is provided."""
        if not v or len(v) == 0:
            # If we have access to item_type from the data, use it as fallback
            # Otherwise return a generic placeholder
            return ["item"]
        return v


# ~10 MB binary → base64 is ~133% size → 13_400_000 chars max
_MAX_IMAGE_BASE64_LEN = 13_400_000


class AnalyzeRequest(BaseModel):
    """Request body for /api/appraise endpoint"""
    image_base64: str

    @field_validator("image_base64")
    @classmethod
    def validate_image_size(cls, v: str) -> str:
        if len(v) > _MAX_IMAGE_BASE64_LEN:
            raise ValueError(
                f"Image too large: {len(v)} chars exceeds {_MAX_IMAGE_BASE64_LEN} char limit (~10 MB)"
            )
        return v











