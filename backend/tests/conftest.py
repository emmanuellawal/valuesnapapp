"""Shared pytest fixtures for backend tests."""

import pytest

from backend.rate_limit import user_rate_limiter


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Prevent cross-test pollution from the in-memory appraise rate limiter."""
    user_rate_limiter.reset()
    yield
    user_rate_limiter.reset()
