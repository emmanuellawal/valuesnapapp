import base64
import pytest


@pytest.mark.asyncio
async def test_mock_ai_returns_itemidentity_schema(monkeypatch):
    from backend.services.mocks import mock_ai

    async def fake_sleep(_seconds: float):
        return None

    monkeypatch.setattr(mock_ai.asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(mock_ai.random, "uniform", lambda a, b: a)

    image_b64 = base64.b64encode(b"image-bytes-1").decode("ascii")
    result = await mock_ai.identify_item_from_image(image_b64)

    # Pydantic model should dump cleanly and contain required keys.
    dumped = result.model_dump()
    assert dumped["item_type"]
    assert dumped["brand"]
    assert "search_keywords" in dumped
    assert isinstance(dumped["search_keywords"], list)


@pytest.mark.asyncio
async def test_mock_ai_is_deterministic(monkeypatch):
    from backend.services.mocks import mock_ai

    async def fake_sleep(_seconds: float):
        return None

    monkeypatch.setattr(mock_ai.asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(mock_ai.random, "uniform", lambda a, b: a)

    image_b64 = base64.b64encode(b"same-image").decode("ascii")
    a = await mock_ai.identify_item_from_image(image_b64)
    b = await mock_ai.identify_item_from_image(image_b64)

    assert a.model_dump() == b.model_dump()


@pytest.mark.asyncio
async def test_mock_ai_rejects_invalid_base64(monkeypatch):
    from backend.services.mocks import mock_ai

    async def fake_sleep(_seconds: float):
        return None

    monkeypatch.setattr(mock_ai.asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(mock_ai.random, "uniform", lambda a, b: a)

    with pytest.raises(ValueError):
        await mock_ai.identify_item_from_image("not-base64!")


# Story 2.2: New tests for description and ai_identification_confidence


@pytest.mark.asyncio
async def test_mock_ai_includes_description(monkeypatch):
    """AC5: Mock AI returns description suitable for eBay listing."""
    from backend.services.mocks import mock_ai

    async def fake_sleep(_seconds: float):
        return None

    monkeypatch.setattr(mock_ai.asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(mock_ai.random, "uniform", lambda a, b: a)

    image_b64 = base64.b64encode(b"test-image-description").decode("ascii")
    result = await mock_ai.identify_item_from_image(image_b64)

    # AC5: description should be present and meaningful
    assert result.description, "description should not be empty"
    assert len(result.description) > 10, "description should be meaningful (>10 chars)"


@pytest.mark.asyncio
async def test_mock_ai_includes_confidence(monkeypatch):
    """AC2: Mock AI returns ai_identification_confidence field."""
    from backend.services.mocks import mock_ai

    async def fake_sleep(_seconds: float):
        return None

    monkeypatch.setattr(mock_ai.asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(mock_ai.random, "uniform", lambda a, b: a)

    image_b64 = base64.b64encode(b"test-image-confidence").decode("ascii")
    result = await mock_ai.identify_item_from_image(image_b64)

    # AC2: confidence should be one of HIGH, MEDIUM, LOW
    assert result.ai_identification_confidence in ["HIGH", "MEDIUM", "LOW"], \
        f"Unexpected confidence level: {result.ai_identification_confidence}"


@pytest.mark.asyncio
async def test_mock_ai_search_keywords_not_empty(monkeypatch):
    """AC2: search_keywords always has at least 1 entry."""
    from backend.services.mocks import mock_ai

    async def fake_sleep(_seconds: float):
        return None

    monkeypatch.setattr(mock_ai.asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(mock_ai.random, "uniform", lambda a, b: a)

    # Test with multiple images to cover all mock items
    for i in range(5):
        image_b64 = base64.b64encode(f"test-image-{i}".encode()).decode("ascii")
        result = await mock_ai.identify_item_from_image(image_b64)
        
        assert result.search_keywords, f"search_keywords should not be empty for image {i}"
        assert len(result.search_keywords) >= 1, f"Must have at least 1 keyword for image {i}"
