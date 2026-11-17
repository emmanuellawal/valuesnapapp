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

    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not configured")

    return AsyncOpenAI(
        api_key=settings.openai_api_key,
        timeout=30.0,  # 30 second timeout per request
    )

# The prompt focuses entirely on identification accuracy to feed eBay API
IDENTIFICATION_PROMPT = """
Act as an expert archivist and product identifier. Analyze this image visually.

## STRICT RULES
- Do NOT estimate value or price
- Do NOT guess rarity or demand
- Do NOT make market predictions
- Do not use Unknown as a substitute for useful descriptors (this applies to item_type and search_keywords, never to a brand/model you are guessing)
- A brand or model must be earned by what you can see. Never name a famous product because the shape is vaguely similar

## YOUR TASK
Extract precise identification data that would retrieve this exact item from eBay's database. Work in this order: describe first, name second.

1. **Visible Observations (write this FIRST, into `visible_observations`)**: Describe only what is physically visible
   - Shape, colors, materials, size cues, form factor, connectors, buttons, ports
   - Text and logos exactly as you can read them. If text is blurry or partial, say so; do not complete it from memory
   - Do NOT name a brand or model in this field unless that name is literally printed on the item
   - Write at least a full sentence or two. A one-word or empty description means you cannot name the item

2. **Identify**: Brand, Model, Item Type — derive these only from the visible observations you just wrote
   - The brand and model must be supported by the observations above (printed text, a distinctive logo, or an unmistakable design). If they are not, they are unknown
   - Tier 1: Grounded naming only. If the brand, model, generation, or version is visible in your observations or unmistakable from them, identify it precisely
   - Tier 2: If the observations do not support a brand/model, set brand and model to "unknown" and make item_type and search_keywords specific with visual descriptors
   - Item type must stay specific even when brand/model is unknown: "over-ear wireless headphones" not "item" or "product"
   - Be specific: "Sony WH-1000XM4 wireless headphones" not just "headphones", but only when the observations support it
   - Include generation/version only if visible or unmistakable from the observations

3. **Visual Condition**: Describe ONLY what you see
   - Use only one of these exact values for visual_condition:
     - new: Factory sealed, tags attached, pristine packaging
     - used_excellent: No visible wear, appears complete
     - used_good: Minor cosmetic wear (light scratches, small scuffs)
     - used_fair: Moderate wear, visible use signs
     - damaged: Cracks, dents, missing parts, broken components
   - Do not output free-text condition labels

4. **Condition Details**: List specific observations
   - Location and severity of any wear
   - Missing components you can identify
   - Packaging state if visible

5. **Extract Identifiers**: Read any visible text
   - Model numbers, serial numbers, UPC codes
   - Only report what you can clearly read

6. **Search Keywords**: Generate 3-5 PRECISE terms for eBay search
   - Put the single most specific phrase FIRST (only the first few are searched)
   - Known brand/model format: "[Brand] [Model] [Key descriptor]"
   - Include condition modifier if relevant
   - Think: what would a buyer search to find this exact item?
   - For unknown brand/model, use visual descriptors: material, color, form factor, visible logos/text, connector type, era, size, and distinctive features
   - Never use a placeholder word such as "item", "object", "product", "thing", or "stuff" as a keyword
   - Example unknown-brand keyword: "premium over-ear wireless headphones space gray aluminum"

7. **Description**: Write a 1-3 sentence description suitable for an eBay listing
   - Focus on key features and condition
   - Be factual, not promotional
   - Mention a brand or model only if that field is not "unknown"

8. **AI Identification Confidence**: Rate your identification confidence
   - HIGH: Brand and model are both named AND supported by your visible observations (printed text or unmistakable design)
   - MEDIUM: Category clear but brand/model specifics uncertain or unsupported
   - LOW: Mostly guessing based on limited visual information
   - HIGH is not allowed when brand or model is "unknown"

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
        model=settings.openai_model,
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
        if result is None:
            raise ValueError("OpenAI returned no parsed ItemIdentity")

        elapsed = time.time() - start_time
        logger.info(f"AI identification took {elapsed:.2f}s - Identified: {result.brand} {result.model} ({result.item_type})")
        
        if elapsed > 2.5:
            logger.warning(f"AI identification slow: {elapsed:.2f}s > 2.5s threshold")
        
        # ItemIdentity's model_validator already guarantees specific, non-generic
        # search_keywords (or raised). Do not reintroduce a placeholder fallback here.
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











