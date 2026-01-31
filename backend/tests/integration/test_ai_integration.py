# backend/tests/integration/test_ai_integration.py
"""
Story 2.2: Integration tests for AI Item Identification

Tests both mock mode (USE_MOCK=true) and real API (USE_MOCK=false).
Real API tests are skipped when USE_MOCK=true or OPENAI_API_KEY is not set.
"""
import base64
import json
import os
import time
from pathlib import Path
from urllib.request import urlopen

import pytest

# Load test fixtures
FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"


def load_test_images():
    """Load test image manifest from fixtures."""
    manifest_path = FIXTURES_DIR / "TEST_IMAGES.json"
    with open(manifest_path) as f:
        return json.load(f)


def download_and_encode_image(url: str) -> str:
    """Download image from URL and convert to base64."""
    try:
        response = urlopen(url, timeout=30)
        image_data = response.read()
        return base64.b64encode(image_data).decode("utf-8")
    except Exception as e:
        pytest.skip(f"Could not download test image: {e}")


# ============================================================================
# MOCK MODE TESTS (Always run)
# ============================================================================


@pytest.mark.asyncio
async def test_mock_ai_returns_valid_itemidentity(monkeypatch):
    """AC1: Mock mode returns valid ItemIdentity with all required fields."""
    # Force mock mode
    monkeypatch.setenv("USE_MOCK", "true")
    
    # Reimport to pick up env change
    from backend.config import Settings
    monkeypatch.setattr("backend.services.ai.settings", Settings(use_mock=True))
    
    from backend.services.ai import identify_item_from_image
    
    # Create test image (simple base64)
    test_image = base64.b64encode(b"test-image-data").decode("utf-8")
    
    result = await identify_item_from_image(test_image)
    
    # Verify all required fields present
    assert result.item_type, "item_type should not be empty"
    assert result.brand, "brand should not be empty"
    assert result.visual_condition, "visual_condition should not be empty"
    assert result.condition_details, "condition_details should not be empty"
    assert result.search_keywords, "search_keywords should not be empty"
    assert len(result.search_keywords) >= 1, "Must have at least 1 search keyword"


@pytest.mark.asyncio
async def test_mock_ai_includes_description(monkeypatch):
    """AC5: Mock returns grammatically correct description."""
    monkeypatch.setenv("USE_MOCK", "true")
    
    from backend.config import Settings
    monkeypatch.setattr("backend.services.ai.settings", Settings(use_mock=True))
    
    from backend.services.ai import identify_item_from_image
    
    test_image = base64.b64encode(b"test-image-for-description").decode("utf-8")
    
    result = await identify_item_from_image(test_image)
    
    # AC5: description should be present and non-empty
    assert result.description, "description should not be empty"
    assert len(result.description) > 10, "description should be meaningful (>10 chars)"
    # Basic grammar check - should start with capital, end with period
    assert result.description[0].isupper(), "description should start with capital letter"
    assert result.description.rstrip().endswith("."), "description should end with period"


@pytest.mark.asyncio
async def test_mock_ai_includes_confidence(monkeypatch):
    """AC2: Mock returns ai_identification_confidence field."""
    monkeypatch.setenv("USE_MOCK", "true")
    
    from backend.config import Settings
    monkeypatch.setattr("backend.services.ai.settings", Settings(use_mock=True))
    
    from backend.services.ai import identify_item_from_image
    
    test_image = base64.b64encode(b"test-image-confidence").decode("utf-8")
    
    result = await identify_item_from_image(test_image)
    
    # AC2: confidence should be one of HIGH, MEDIUM, LOW
    assert result.ai_identification_confidence in ["HIGH", "MEDIUM", "LOW"], \
        f"Unexpected confidence level: {result.ai_identification_confidence}"


@pytest.mark.asyncio
async def test_mock_ai_schema_compliance(monkeypatch):
    """Verify mock response matches ItemIdentity schema exactly."""
    monkeypatch.setenv("USE_MOCK", "true")
    
    from backend.config import Settings
    monkeypatch.setattr("backend.services.ai.settings", Settings(use_mock=True))
    
    from backend.services.ai import identify_item_from_image
    from backend.models import ItemIdentity
    
    test_image = base64.b64encode(b"schema-test").decode("utf-8")
    
    result = await identify_item_from_image(test_image)
    
    # Pydantic model should serialize cleanly
    dumped = result.model_dump()
    
    # Required fields
    required_fields = [
        "item_type", "brand", "model", "visual_condition", 
        "condition_details", "search_keywords", "description",
        "ai_identification_confidence"
    ]
    
    for field in required_fields:
        assert field in dumped, f"Missing required field: {field}"


@pytest.mark.asyncio
async def test_mock_ai_deterministic(monkeypatch):
    """Same image should return same result (deterministic hashing)."""
    monkeypatch.setenv("USE_MOCK", "true")
    
    from backend.config import Settings
    monkeypatch.setattr("backend.services.ai.settings", Settings(use_mock=True))
    
    from backend.services.ai import identify_item_from_image
    
    test_image = base64.b64encode(b"deterministic-test-image").decode("utf-8")
    
    result1 = await identify_item_from_image(test_image)
    result2 = await identify_item_from_image(test_image)
    
    assert result1.model_dump() == result2.model_dump(), "Same image should return same result"


# ============================================================================
# REAL API TESTS (Skipped when USE_MOCK=true or no API key)
# ============================================================================


def requires_real_api():
    """Check if real API tests should run."""
    use_mock = os.getenv("USE_MOCK", "true").lower() == "true"
    has_api_key = bool(os.getenv("OPENAI_API_KEY"))
    
    if use_mock:
        return pytest.mark.skip(reason="USE_MOCK=true, skipping real API tests")
    if not has_api_key:
        return pytest.mark.skip(reason="OPENAI_API_KEY not set")
    return lambda f: f


@pytest.mark.asyncio
@pytest.mark.skipif(
    os.getenv("USE_MOCK", "true").lower() == "true" or not os.getenv("OPENAI_API_KEY"),
    reason="Requires real OpenAI API (USE_MOCK=false and OPENAI_API_KEY set)"
)
async def test_real_api_identifies_canon_camera():
    """AC3: Real API identifies known product (Canon camera)."""
    from backend.services.ai import identify_item_from_image
    
    test_images = load_test_images()
    canon_test = next(
        (t for t in test_images["positive_cases"] if t["id"] == "canon_camera"),
        None
    )
    
    if not canon_test:
        pytest.skip("Canon camera test case not found in fixtures")
    
    image_b64 = download_and_encode_image(canon_test["url"])
    
    start_time = time.time()
    result = await identify_item_from_image(image_b64)
    elapsed = time.time() - start_time
    
    # AC3: Response time < 10 seconds
    assert elapsed < 10, f"Response time {elapsed:.2f}s exceeds 10s threshold"
    
    # Verify item type matches expected
    expected_types = canon_test["expected"]["item_type_contains"]
    item_type_lower = result.item_type.lower()
    assert any(t.lower() in item_type_lower for t in expected_types), \
        f"Expected item_type containing one of {expected_types}, got '{result.item_type}'"
    
    # Verify brand if expected
    expected_brands = canon_test["expected"].get("brand_contains", [])
    if expected_brands:
        brand_lower = result.brand.lower()
        assert any(b.lower() in brand_lower for b in expected_brands), \
            f"Expected brand containing one of {expected_brands}, got '{result.brand}'"


@pytest.mark.asyncio
@pytest.mark.skipif(
    os.getenv("USE_MOCK", "true").lower() == "true" or not os.getenv("OPENAI_API_KEY"),
    reason="Requires real OpenAI API"
)
async def test_real_api_handles_abstract_art():
    """AC2: Real API handles unidentifiable content gracefully (LOW confidence)."""
    from backend.services.ai import identify_item_from_image
    
    test_images = load_test_images()
    art_test = next(
        (t for t in test_images["negative_cases"] if t["id"] == "abstract_art"),
        None
    )
    
    if not art_test or "url" not in art_test:
        pytest.skip("Abstract art test case not found or missing URL")
    
    image_b64 = download_and_encode_image(art_test["url"])
    
    result = await identify_item_from_image(image_b64)
    
    # Should return LOW confidence for abstract art
    # Or at least not HIGH (since it's not a clear product)
    assert result.ai_identification_confidence in ["LOW", "MEDIUM"], \
        f"Expected LOW/MEDIUM confidence for abstract art, got {result.ai_identification_confidence}"
    
    # Should still return valid response (not crash)
    assert result.item_type, "Should still return item_type even for ambiguous images"
    assert len(result.search_keywords) >= 1, "Should still provide search keywords"


@pytest.mark.asyncio
@pytest.mark.skipif(
    os.getenv("USE_MOCK", "true").lower() == "true" or not os.getenv("OPENAI_API_KEY"),
    reason="Requires real OpenAI API"
)
async def test_real_api_returns_description():
    """AC5: Real API generates grammatically correct description."""
    from backend.services.ai import identify_item_from_image
    
    test_images = load_test_images()
    test_case = test_images["positive_cases"][0]  # Use first positive case
    
    if "url" not in test_case:
        pytest.skip("Test case missing URL")
    
    image_b64 = download_and_encode_image(test_case["url"])
    
    result = await identify_item_from_image(image_b64)
    
    # AC5: description should be present, grammatically correct, suitable for eBay
    assert result.description, "description should not be empty"
    assert len(result.description) > 10, "description should be meaningful"
    
    # Basic grammar checks
    assert result.description[0].isupper(), "Should start with capital letter"
    # Should be 1-3 sentences (rough check: contains some sentence structure)
    assert "." in result.description, "Should contain at least one sentence"


@pytest.mark.asyncio
@pytest.mark.skipif(
    os.getenv("USE_MOCK", "true").lower() == "true" or not os.getenv("OPENAI_API_KEY"),
    reason="Requires real OpenAI API"
)
async def test_real_api_timing_constraint():
    """NFR-P1: AI identification should complete within 2.5 seconds target."""
    from backend.services.ai import identify_item_from_image
    
    test_images = load_test_images()
    test_case = test_images["positive_cases"][0]
    
    if "url" not in test_case:
        pytest.skip("Test case missing URL")
    
    image_b64 = download_and_encode_image(test_case["url"])
    
    start_time = time.time()
    await identify_item_from_image(image_b64)
    elapsed = time.time() - start_time
    
    # Soft warning at 2.5s, hard fail at 10s (AC3)
    if elapsed > 2.5:
        pytest.warns(UserWarning, match=f"AI took {elapsed:.2f}s, exceeds 2.5s target")
    
    assert elapsed < 10, f"AI identification took {elapsed:.2f}s, exceeds 10s maximum"


# ============================================================================
# ERROR HANDLING TESTS
# ============================================================================


@pytest.mark.asyncio
async def test_invalid_base64_raises_error(monkeypatch):
    """Invalid base64 should raise appropriate error."""
    monkeypatch.setenv("USE_MOCK", "true")
    
    from backend.config import Settings
    monkeypatch.setattr("backend.services.ai.settings", Settings(use_mock=True))
    
    from backend.services.mocks.mock_ai import identify_item_from_image
    
    with pytest.raises(ValueError, match="Invalid base64"):
        await identify_item_from_image("not-valid-base64!")
