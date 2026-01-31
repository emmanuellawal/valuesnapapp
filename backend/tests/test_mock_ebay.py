import pytest


def _assert_market_contract(payload):
    # Minimal contract compatible with production output in backend/services/ebay.py
    assert payload["keywords"]
    assert payload["status"] in {"success", "no_data", "no_prices", "error", "no_prices"}


@pytest.mark.asyncio
async def test_mock_ebay_happy_path(monkeypatch):
    from backend.services.mocks import mock_ebay

    async def fake_sleep(_seconds: float):
        return None

    monkeypatch.setattr(mock_ebay.asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(mock_ebay.random, "uniform", lambda a, b: a)

    result = await mock_ebay.search_sold_listings("Rolex Submariner __SCENARIO_HAPPY__")
    _assert_market_contract(result)

    assert result["status"] == "success"
    assert result["confidence"] == "HIGH"
    assert result["total_found"] >= 10
    assert "price_range" in result
    assert result["price_range"]["min"] <= result["price_range"]["max"]


@pytest.mark.asyncio
async def test_mock_ebay_low_confidence(monkeypatch):
    from backend.services.mocks import mock_ebay

    async def fake_sleep(_seconds: float):
        return None

    monkeypatch.setattr(mock_ebay.asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(mock_ebay.random, "uniform", lambda a, b: a)

    result = await mock_ebay.search_sold_listings("Sony WH-1000XM4 __SCENARIO_LOW__")
    _assert_market_contract(result)

    assert result["status"] == "success"
    assert result["confidence"] == "LOW"
    assert 1 <= result["total_found"] <= 4


@pytest.mark.asyncio
async def test_mock_ebay_no_results(monkeypatch):
    from backend.services.mocks import mock_ebay

    async def fake_sleep(_seconds: float):
        return None

    monkeypatch.setattr(mock_ebay.asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(mock_ebay.random, "uniform", lambda a, b: a)

    result = await mock_ebay.search_sold_listings("Anything __SCENARIO_NONE__")
    _assert_market_contract(result)

    assert result["status"] == "no_data"
    assert result["confidence"] == "NONE"
    assert result["total_found"] == 0
