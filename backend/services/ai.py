# backend/services/ai.py
"""
AI Service - Visual Detection Only
GPT is a Visual Detective, NOT a Price Guide.
"""
import os
import time
import logging
from openai import RateLimitError, APITimeoutError, APIConnectionError

from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from ..config import settings
from ..models import ItemIdentity

logger = logging.getLogger(__name__)

# Retry configuration
RETRY_EXCEPTIONS = (RateLimitError, APITimeoutError, APIConnectionError)


def _get_client():
    from openai import AsyncOpenAI

    return AsyncOpenAI(
        api_key=os.environ.get("OPENAI_API_KEY"),
        timeout=30.0,  # 30 second timeout per request
    )

# The prompt focuses entirely on identification accuracy to feed eBay API
IDENTIFICATION_PROMPT = """
Act as an expert archivist and product identifier. Analyze this image visually.

## STRICT RULES
- Do NOT estimate value or price
- Do NOT guess rarity or demand
- Do NOT make market predictions
- Say "unknown" if you cannot confidently identify something

## YOUR TASK
Extract precise identification data that would retrieve this exact item from eBay's database.

1. **Identify**: Brand, Model, Item Type
   - Be specific: "Sony WH-1000XM4" not just "headphones"
   - Include generation/version if visible

2. **Visual Condition**: Describe ONLY what you see
   - new: Factory sealed, tags attached, pristine packaging
   - used_excellent: No visible wear, appears complete
   - used_good: Minor cosmetic wear (light scratches, small scuffs)
   - used_fair: Moderate wear, visible use signs
   - damaged: Cracks, dents, missing parts, broken components

3. **Condition Details**: List specific observations
   - Location and severity of any wear
   - Missing components you can identify
   - Packaging state if visible

4. **Extract Identifiers**: Read any visible text
   - Model numbers, serial numbers, UPC codes
   - Only report what you can clearly read

5. **Search Keywords**: Generate 3-5 PRECISE terms for eBay search
   - Format: "[Brand] [Model] [Key descriptor]"
   - Include condition modifier if relevant
   - Think: what would a buyer search to find this exact item?
   - IMPORTANT: Always provide at least 1 keyword, even for unknown items

6. **Description**: Write a 1-3 sentence description suitable for an eBay listing
   - Focus on key features and condition
   - Be factual, not promotional
   - Include brand, model, and notable characteristics

7. **AI Identification Confidence**: Rate your identification confidence
   - HIGH: Brand and model clearly visible and identifiable
   - MEDIUM: Category clear but brand/model specifics uncertain
   - LOW: Mostly guessing based on limited visual information

Output JSON matching the ItemIdentity schema.
"""


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=4),
    retry=retry_if_exception_type(RETRY_EXCEPTIONS),
    reraise=True,
    before_sleep=lambda retry_state: logger.warning(
        f"AI API retry attempt {retry_state.attempt_number} after error: {retry_state.outcome.exception()}"
    ),
)
async def _call_openai_api(client, base64_image: str) -> ItemIdentity:
    """
    Internal function to call OpenAI API with retry logic.
    
    Args:
        client: AsyncOpenAI client
        base64_image: Base64 encoded image string
        
    Returns:
        ItemIdentity with visual identification data
        
    Raises:
        Exception: If all retries fail
    """
    response = await client.beta.chat.completions.parse(
        model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": IDENTIFICATION_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
                    },
                ],
            }
        ],
        response_format=ItemIdentity,
    )
    return response.choices[0].message.parsed


async def identify_item_from_image(base64_image: str) -> ItemIdentity:
    """
    Analyze image and extract visual identification data.
    
    Args:
        base64_image: Base64 encoded image string
        
    Returns:
        ItemIdentity with visual identification data
        
    Raises:
        AIIdentificationError: If API call fails after all retries
    """
    if settings.use_mock:
        from .mocks.mock_ai import identify_item_from_image as mock_identify

        return await mock_identify(base64_image)

    start_time = time.time()
    
    try:
        logger.info("Calling OpenAI for visual identification")

        client = _get_client()
        
        result = await _call_openai_api(client, base64_image)
        
        elapsed = time.time() - start_time
        logger.info(f"AI identification took {elapsed:.2f}s - Identified: {result.brand} {result.model} ({result.item_type})")
        
        if elapsed > 2.5:
            logger.warning(f"AI identification slow: {elapsed:.2f}s > 2.5s threshold")
        
        # Ensure search_keywords always has at least 1 entry
        if not result.search_keywords:
            result.search_keywords = [f"{result.item_type}"]
            logger.warning("AI returned empty search_keywords, using item_type as fallback")
        
        return result
        
    except RETRY_EXCEPTIONS as e:
        elapsed = time.time() - start_time
        logger.error(f"AI Identification failed after retries ({elapsed:.2f}s): {e}")
        raise AIIdentificationError(
            code="AI_IDENTIFICATION_FAILED",
            message=f"Failed to identify item after multiple retries: {str(e)}",
            original_error=e,
        )
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"AI Identification Error ({elapsed:.2f}s): {e}")
        raise AIIdentificationError(
            code="AI_IDENTIFICATION_FAILED",
            message=f"Image analysis failed: {str(e)}",
            original_error=e,
        )


# Default suggestions for AI identification failures
DEFAULT_SUGGESTIONS = [
    "Try a clearer photo with better lighting",
    "Include brand name or model number in frame",
    "Position item against a plain background",
]


class AIIdentificationError(Exception):
    """Custom exception for AI identification failures."""
    
    def __init__(
        self, 
        code: str, 
        message: str, 
        original_error: Exception = None,
        suggestions: list[str] = None,
    ):
        self.code = code
        self.message = message
        self.original_error = original_error
        self.suggestions = suggestions or DEFAULT_SUGGESTIONS
        super().__init__(message)











