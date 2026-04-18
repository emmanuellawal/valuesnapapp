import math
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from threading import Lock

from fastapi import HTTPException

from backend.config import settings


@dataclass(frozen=True)
class RateLimitRule:
    limit: int
    window_seconds: int

    @classmethod
    def parse(cls, value: str) -> "RateLimitRule":
        count, window = value.split("/", 1)
        limit = int(count.strip())
        window_key = window.strip().lower()

        windows = {
            "second": 1,
            "seconds": 1,
            "sec": 1,
            "minute": 60,
            "minutes": 60,
            "min": 60,
            "hour": 3600,
            "hours": 3600,
            "day": 86400,
            "days": 86400,
        }

        if window_key not in windows:
            raise ValueError(f"Unsupported rate limit window: {window}")
        if limit < 1:
            raise ValueError("Rate limit must allow at least one request")

        return cls(limit=limit, window_seconds=windows[window_key])


class InMemoryUserRateLimiter:
    def __init__(self) -> None:
        self._buckets: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str, rule: RateLimitRule) -> tuple[bool, int | None]:
        now = time.monotonic()
        window_start = now - rule.window_seconds

        with self._lock:
            bucket = self._buckets[key]
            while bucket and bucket[0] <= window_start:
                bucket.popleft()

            if len(bucket) >= rule.limit:
                retry_after = math.ceil(rule.window_seconds - (now - bucket[0]))
                return False, max(retry_after, 1)

            bucket.append(now)
            return True, None

    def reset(self) -> None:
        with self._lock:
            self._buckets.clear()


user_rate_limiter = InMemoryUserRateLimiter()


def enforce_user_rate_limit(user_id: str, scope: str, rule: RateLimitRule) -> None:
    if not settings.ratelimit_enabled:
        return

    allowed, retry_after = user_rate_limiter.check(f"{scope}:{user_id}", rule)
    if allowed:
        return

    raise HTTPException(
        status_code=429,
        detail="Rate limit exceeded. Please try again later.",
        headers={"Retry-After": str(retry_after)},
    )