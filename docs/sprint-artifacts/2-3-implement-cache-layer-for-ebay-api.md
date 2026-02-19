# Story 2.3: Implement Cache Layer for eBay API

**Epic:** 2 - AI Valuation Engine  
**Story ID:** 2-3  
**Created:** January 31, 2026  
**Status:** Ready for Development  
**Priority:** Critical (Blocks Story 2.4)

---

## Story Statement

**As a** system architect,  
**I want** a cache layer for eBay market data with configurable TTL,  
**So that** API rate limits are respected, costs are minimized, and response times improve for repeated queries.

---

## Business Context

### Why This Story Matters

eBay Browse API has strict rate limits and costs. Without caching:
- Identical items get re-queried on every valuation
- Rate limits block users during peak usage
- API costs scale linearly with requests
- Response times remain slow even for popular items

Caching is **not optional** - it's a prerequisite for Story 2.4 (eBay Market Data Integration) to function sustainably.

### Value Delivery

- **User Value:** Faster valuations for popular items (cache hit = instant response)
- **Technical Value:** Prevents eBay rate limit exhaustion, reduces API costs
- **Business Value:** Enables scaling without proportional cost increase

### Epic Context

This is Story 3 of 11 in Epic 2 (AI Valuation Engine). It must be completed before Story 2.4, as the eBay service will check cache before making API calls.

**Note from Epic Planning:** Cache layer was originally planned for Epic 3 (Persistence) but was moved forward to Epic 2 because eBay integration cannot function sustainably without it.

---

## Acceptance Criteria

### AC1: Cache Table Schema (Backend)

**Given** the backend database needs a cache table  
**When** the schema is created  
**Then** the table includes:
- `key` (TEXT PRIMARY KEY) - Hash of query parameters
- `value` (JSONB NOT NULL) - Cached eBay response
- `ttl_seconds` (INTEGER NOT NULL) - Time-to-live in seconds
- `created_at` (TIMESTAMPTZ) - Timestamp of cache write
- `expires_at` (TIMESTAMPTZ GENERATED) - Computed as `created_at + ttl_seconds`

**And** an index exists on `expires_at` for efficient cleanup queries

**And** the schema matches the cache table specification in `docs/architecture.md#Caching Strategy`

### AC2: Cache Key Generation

**Given** an eBay market data query with search parameters  
**When** a cache key is generated  
**Then** the key includes:
- Item identification (brand, model, category)
- Query type (sold listings vs active listings)
- eBay marketplace (EBAY-US)

**And** the key is deterministic (same input = same key)

**And** the key is hashed (SHA-256) to ensure consistent length

**And** different search parameters produce different keys

### AC3: Cache Read with TTL Check

**Given** a cache entry exists for a query  
**When** the cache is queried  
**Then** the entry's `expires_at` is checked against current time

**And** if `NOW() < expires_at`, the cached value is returned (cache hit)

**And** if `NOW() >= expires_at`, the entry is treated as expired (cache miss)

**And** expired entries are not returned to the caller

### AC4: Cache Write with Configurable TTL

**Given** an eBay API call has completed successfully  
**When** the response is written to cache  
**Then** the TTL is configurable via environment variable `EBAY_CACHE_TTL_HOURS`

**And** the default TTL is 6 hours (21,600 seconds)

**And** the TTL range is validated (minimum 1 hour, maximum 24 hours)

**And** the cache entry includes the full eBay response as JSONB

### AC5: Cache Miss Flow

**Given** no valid cache entry exists for a query  
**When** the eBay service is called  
**Then** the eBay API is queried as normal

**And** the response is stored in cache before returning to caller

**And** cache write failures do not block the response (fail gracefully)

**And** cache write errors are logged but not exposed to user

### AC6: Cache Hit Flow

**Given** a valid cache entry exists for a query  
**When** the eBay service is called  
**Then** the cached response is returned immediately

**And** no eBay API call is made (verified via logging)

**And** the response format matches fresh API responses

**And** the cache hit is logged with key and timestamp

### AC7: Cache Cleanup Script

**Given** expired cache entries exist in the database  
**When** the cleanup script is executed  
**Then** entries where `NOW() > expires_at` are deleted

**And** a manual cleanup script exists (`backend/cleanup_cache.py`)

**And** cleanup execution is logged with count of deleted entries

**And** automatic scheduling deferred to production deployment (Epic 6)

### AC8: Mock Mode Bypasses Cache

**Given** the system is running with `USE_MOCK=true`  
**When** mock eBay data is requested  
**Then** the cache layer is bypassed entirely

**And** mock responses are returned directly (no cache read/write)

**And** this allows frontend development without database dependency

**And** mock mode behavior is documented in README

---

## Technical Implementation

### Backend Changes

**File:** `backend/services/ebay.py`

**Current State:**
- `get_market_data_for_item()` calls eBay API directly
- No caching mechanism
- OAuth token cache exists in memory (`TOKEN_CACHE`)

**Required Changes:**
1. Add `_get_cache_key(item_identity: ItemIdentity) -> str` function
2. Add `_check_cache(cache_key: str) -> Optional[dict]` function  
3. Add `_write_cache(cache_key: str, data: dict, ttl_seconds: int)` function
4. Modify `get_market_data_for_item()` to check cache before API call
5. Add environment variable `EBAY_CACHE_TTL_HOURS` (default: 6)

**Database Integration:**

Using Supabase PostgreSQL for cache storage (aligns with production architecture):

**Step 1: Create Cache Table in Supabase**

Run this SQL in the Supabase SQL Editor (Dashboard → SQL Editor → New Query):

```sql
-- Create cache table for eBay market data
CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    ttl_seconds INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ GENERATED ALWAYS AS (created_at + (ttl_seconds || ' seconds')::interval) STORED
);

-- Index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache (expires_at);

-- Enable Row Level Security (optional for cache, but good practice)
ALTER TABLE cache ENABLE ROW LEVEL SECURITY;

-- Policy: Allow backend service role full access
CREATE POLICY "Service role full access" ON cache
    FOR ALL
    USING (true)
    WITH CHECK (true);
```

**Step 2: Backend Cache Module**

```python
# backend/cache.py (NEW FILE)
import hashlib
import logging
from typing import Optional
from datetime import datetime, timezone

from supabase import create_client, Client
from backend.config import settings

logger = logging.getLogger(__name__)

# Supabase client (initialized lazily)
_supabase_client: Optional[Client] = None


def get_supabase() -> Client:
    """Get or create Supabase client."""
    global _supabase_client
    if _supabase_client is None:
        if not settings.supabase_url or not settings.supabase_service_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be configured")
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_service_key
        )
    return _supabase_client


def get_cache_key(item_identity: dict) -> str:
    """Generate deterministic cache key from item identity."""
    # Include search_keywords for cache differentiation
    # (e.g., "like new" vs "for parts" items)
    keywords = item_identity.get("search_keywords", [])
    keywords_str = "|".join(sorted(keywords)) if keywords else ""
    
    key_parts = [
        item_identity.get("brand", ""),
        item_identity.get("model", ""),
        item_identity.get("item_type", ""),
        item_identity.get("category", ""),
        keywords_str
    ]
    key_string = "|".join(key_parts).lower()
    return hashlib.sha256(key_string.encode()).hexdigest()


def read_cache(cache_key: str) -> Optional[dict]:
    """Read from cache if entry exists and not expired."""
    try:
        supabase = get_supabase()
        
        # Query for non-expired entry
        result = supabase.table("cache").select("value").eq(
            "key", cache_key
        ).gt(
            "expires_at", datetime.now(timezone.utc).isoformat()
        ).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]["value"]
        return None
        
    except Exception as e:
        logger.warning(f"Cache read failed: {e}")
        return None  # Treat as cache miss


def write_cache(cache_key: str, data: dict, ttl_seconds: int) -> bool:
    """Write data to cache with TTL. Returns True on success."""
    try:
        supabase = get_supabase()
        
        # Upsert (insert or update on conflict)
        supabase.table("cache").upsert({
            "key": cache_key,
            "value": data,
            "ttl_seconds": ttl_seconds,
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        
        return True
        
    except Exception as e:
        logger.warning(f"Cache write failed: {e}")
        return False  # Fail gracefully


def cleanup_expired_cache() -> int:
    """Delete expired cache entries. Returns count of deleted rows."""
    try:
        supabase = get_supabase()
        
        # Delete expired entries
        result = supabase.table("cache").delete().lt(
            "expires_at", datetime.now(timezone.utc).isoformat()
        ).execute()
        
        deleted_count = len(result.data) if result.data else 0
        logger.info(f"Cache cleanup: deleted {deleted_count} expired entries")
        return deleted_count
        
    except Exception as e:
        logger.error(f"Cache cleanup failed: {e}")
        return 0


def get_cache_stats() -> dict:
    """Get cache statistics for debugging."""
    try:
        supabase = get_supabase()
        now = datetime.now(timezone.utc).isoformat()
        
        # Total entries
        total = supabase.table("cache").select("key", count="exact").execute()
        
        # Expired entries
        expired = supabase.table("cache").select("key", count="exact").lt(
            "expires_at", now
        ).execute()
        
        return {
            "total_entries": total.count or 0,
            "expired_entries": expired.count or 0,
            "active_entries": (total.count or 0) - (expired.count or 0)
        }
        
    except Exception as e:
        logger.error(f"Cache stats failed: {e}")
        return {"error": str(e)}
```

**Integration into `ebay.py`:**

```python
# backend/services/ebay.py
from backend.cache import (
    get_cache_key, 
    read_cache, 
    write_cache
)
from backend.config import settings

# No initialization needed - Supabase client is lazy-loaded

async def get_market_data_for_item(item_identity: ItemIdentity) -> dict:
    """Get market data from cache or eBay API."""
    
    # Mock mode bypasses cache entirely
    if settings.use_mock:
        from .mocks.mock_ebay import get_mock_market_data
        return get_mock_market_data(item_identity)
    
    # Generate cache key
    cache_key = get_cache_key(item_identity.model_dump())
    
    # Check cache first
    cached_data = read_cache(cache_key)
    if cached_data:
        logger.info(f"Cache hit for key: {cache_key[:8]}...")
        return cached_data
    
    # Cache miss - call eBay API
    logger.info(f"Cache miss for key: {cache_key[:8]}...")
    market_data = await search_sold_listings(item_identity.search_keywords[0])
    
    # Write to cache (fail gracefully)
    ttl_hours = getattr(settings, 'ebay_cache_ttl_hours', 6)
    ttl_seconds = ttl_hours * 3600
    if write_cache(cache_key, market_data, ttl_seconds):
        logger.info(f"Cached market data with TTL {ttl_hours}h")
    
    return market_data
```

**Configuration:**

```python
# backend/config.py
class Settings(BaseSettings):
    # ... existing fields ...
    ebay_cache_ttl_hours: int = 6  # Default 6 hours
    
    @validator('ebay_cache_ttl_hours')
    def validate_ttl(cls, v):
        if v < 1 or v > 24:
            raise ValueError("EBAY_CACHE_TTL_HOURS must be between 1 and 24")
        return v
```

### Testing Strategy

**Unit Tests:** `backend/tests/test_cache.py` (NEW)

```python
import pytest
from datetime import datetime, timedelta
from backend.cache import (
    init_cache_db,
    get_cache_key,
    read_cache,
    write_cache,
    cleanup_expired_cache
)

def test_cache_key_deterministic():
    """Same input produces same cache key."""
    item1 = {"brand": "Canon", "model": "EOS R5", "item_type": "camera", "search_keywords": ["Canon"]}
    item2 = {"brand": "Canon", "model": "EOS R5", "item_type": "camera", "search_keywords": ["Canon"]}
    
    assert get_cache_key(item1) == get_cache_key(item2)

def test_cache_key_different_inputs():
    """Different inputs produce different keys."""
    item1 = {"brand": "Canon", "model": "EOS R5", "item_type": "camera", "search_keywords": ["Canon"]}
    item2 = {"brand": "Nikon", "model": "Z9", "item_type": "camera", "search_keywords": ["Nikon"]}
    
    assert get_cache_key(item1) != get_cache_key(item2)

def test_cache_key_empty_keywords():
    """Empty search_keywords still produces valid key."""
    item = {"brand": "Canon", "model": "EOS R5", "item_type": "camera", "search_keywords": []}
    key = get_cache_key(item)
    
    assert key is not None
    assert len(key) == 64  # SHA-256 hex length

@patch('backend.cache.get_supabase')
def test_cache_read_returns_data(mock_supabase):
    """Cache read returns data when entry exists and not expired."""
    mock_client = MagicMock()
    mock_supabase.return_value = mock_client
    mock_client.table.return_value.select.return_value.eq.return_value.gt.return_value.execute.return_value.data = [
        {"value": {"price_range": {"min": 100, "max": 200}}}
    ]
    
    result = read_cache("test_key")
    
    assert result == {"price_range": {"min": 100, "max": 200}}

@patch('backend.cache.get_supabase')
def test_cache_read_returns_none_on_miss(mock_supabase):
    """Cache read returns None when no entry exists."""
    mock_client = MagicMock()
    mock_supabase.return_value = mock_client
    mock_client.table.return_value.select.return_value.eq.return_value.gt.return_value.execute.return_value.data = []
    
    result = read_cache("nonexistent_key")
    
    assert result is None

@patch('backend.cache.get_supabase')
def test_cache_read_graceful_on_error(mock_supabase):
    """Cache read returns None on Supabase error (graceful degradation)."""
    mock_supabase.side_effect = Exception("Connection failed")
    
    result = read_cache("test_key")
    
    assert result is None  # Treated as cache miss
```

**Integration Tests:** `backend/tests/integration/test_ebay_cache.py` (NEW)

```python
import pytest
from unittest.mock import patch, MagicMock
from backend.services.ebay import get_market_data_for_item
from backend.models import ItemIdentity

@pytest.mark.asyncio
async def test_cache_hit_no_api_call():
    """Cache hit returns cached data without API call."""
    item = ItemIdentity(
        brand="Canon",
        model="EOS R5",
        item_type="camera",
        category="Cameras & Photo",
        search_keywords=["Canon EOS R5"],
        description="Professional mirrorless camera with 45MP sensor",
        ai_identification_confidence="HIGH"
    )
    
    # First call - populates cache
    with patch('backend.services.ebay.search_sold_listings') as mock_api:
        mock_api.return_value = {"price_range": {"min": 2000, "max": 3000}}
        result1 = await get_market_data_for_item(item)
    
    # Second call - should hit cache
    with patch('backend.services.ebay.search_sold_listings') as mock_api:
        result2 = await get_market_data_for_item(item)
        mock_api.assert_not_called()  # API not called on cache hit
    
    assert result1 == result2

@pytest.mark.asyncio
async def test_cache_miss_calls_api():
    """Cache miss triggers API call and caches result."""
    item = ItemIdentity(
        brand="Unique",
        model="TestItem123",
        item_type="test",
        category="Test",
        search_keywords=["test"],
        description="Test item for cache miss scenario",
        ai_identification_confidence="LOW"
    )
    
    with patch('backend.services.ebay._call_ebay_api') as mock_api:
        mock_api.return_value = {"price_range": {"min": 100, "max": 200}}
        result = await get_market_data_for_item(item)
        
        mock_api.assert_called_once()
        assert result == {"price_range": {"min": 100, "max": 200}}
```

---

## Tasks

### Task 0: Configure Supabase Connection (30 min)
- [ ] Get Supabase URL and Service Role Key from dashboard
- [ ] Add `SUPABASE_URL` to backend `.env` and `config.py`
- [ ] Add `SUPABASE_SERVICE_KEY` to backend `.env` and `config.py`
- [ ] Install `supabase` Python package: `pip install supabase`
- [ ] Add to `requirements.txt`
- [ ] Verify connection works with simple test query

### Task 1: Create Cache Table in Supabase (30 min)
- [ ] Run cache table SQL in Supabase SQL Editor
- [ ] Verify table created with correct schema
- [ ] Verify index on `expires_at` exists
- [ ] Test generated `expires_at` column works correctly
- [ ] Enable RLS and create service role policy

### Task 2: Create Cache Module (1 hour)
- [ ] Create `backend/cache.py` with Supabase implementation
- [ ] Implement `get_supabase()` lazy client initialization
- [ ] Implement `get_cache_key()` with SHA-256 hashing
- [ ] Implement `read_cache()` with TTL check
- [ ] Implement `write_cache()` with upsert
- [ ] Implement `cleanup_expired_cache()` for maintenance
- [ ] Implement `get_cache_stats()` for debugging

### Task 3: Add Cache Configuration (30 min)
- [ ] Add `ebay_cache_ttl_hours` to `backend/config.py`
- [ ] Add `supabase_url` and `supabase_service_key` to config
- [ ] Add validator for TTL range (1-24 hours)
- [ ] Set default TTL to 6 hours
- [ ] Document configuration in `.env.example`

### Task 4: Integrate Cache into eBay Service (1 hour)
- [ ] Import cache functions into `backend/services/ebay.py`
- [ ] Add `get_market_data_for_item()` wrapper function
- [ ] Check cache before API call
- [ ] Add cache write after successful API calls
- [ ] Add graceful failure handling for cache writes
- [ ] Add logging for cache hits/misses

### Task 5: Write Unit Tests (1-2 hours)
- [ ] Create `backend/tests/test_cache.py`
- [ ] Test cache key generation (deterministic, different inputs)
- [ ] Test cache key with empty search_keywords
- [ ] Mock Supabase client for unit tests
- [ ] Test graceful degradation on Supabase errors
- [ ] Achieve >90% coverage on cache module

### Task 6: Write Integration Tests (1 hour)
- [ ] Create `backend/tests/integration/test_ebay_cache.py`
- [ ] Test cache hit scenario (no API call)
- [ ] Test cache miss scenario (API call + cache write)
- [ ] Test mock mode bypasses cache
- [ ] Test cache write failure doesn't break flow
- [ ] Use test Supabase project or mock

### Task 7: Add Cache Cleanup Script (30 min)
- [ ] Create `backend/cleanup_cache.py` script
- [ ] Add CLI command to run cleanup manually
- [ ] Document cleanup in README (manual for now, Supabase pg_cron in production)
- [ ] Test cleanup script removes expired entries

### Task 8: Documentation (30 min)
- [ ] Update `backend/README.md` with Cache Layer section
- [ ] Document Supabase setup instructions
- [ ] Document cache key generation logic
- [ ] Document TTL configuration
- [ ] Document cleanup process
- [ ] Add `get_cache_stats()` usage example

---

## Definition of Done

- [ ] All 8 tasks completed
- [ ] Supabase project configured with cache table
- [ ] Cache module (`cache.py`) created with all functions
- [ ] Supabase connection working (verified with test query)
- [ ] eBay service integrated with cache (check before call, write after)
- [ ] Configuration added with TTL validation
- [ ] Unit tests written and passing (>90% coverage)
- [ ] Integration tests written and passing
- [ ] Integration tests written and passing
- [ ] Cache hit prevents eBay API call (verified via logging)
- [ ] Cache miss triggers API call and writes to cache
- [ ] Mock mode bypasses cache entirely
- [ ] Expired entries do not return cached data
- [ ] Cleanup script functional
- [ ] Documentation updated in README.md
- [ ] All existing tests still pass
- [ ] Code reviewed and approved

---

## Dependencies

### Upstream (Must Complete First)
- ✅ Story 2-1: Create Valuation API Endpoint
- ✅ Story 2-2: Integrate AI Item Identification

### Downstream (Blocked Until This Completes)
- ⏸️ Story 2-4: Integrate eBay Market Data (BLOCKED by this story)

### External Dependencies
- SQLite (built into Python, no installation needed)
- Backend database configuration

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cache key collisions (different items, same key) | High | Use comprehensive key with brand+model+category+type, SHA-256 hash |
| Cache DB corruption | Medium | SQLite is robust; add DB backup in production |
| Cache grows too large | Medium | Cleanup script + TTL ensures self-limiting growth |
| Cache write failures block responses | Low | Fail gracefully (log error, return response anyway) |

### Scope Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase integration scope creep | Medium | Use SQLite for MVP, Supabase migration is Story 3-1 |
| Complex TTL configuration | Low | Single env var, validated range, clear default |

---

## Non-Functional Requirements

### Performance (NFR-P)
- **NFR-P1:** Cache hit must return in <100ms (no network call)
- **NFR-P2:** Cache write must not add >50ms to response time

### Scalability (NFR-SC)
- **NFR-SC5:** Cache reduces eBay API calls from N to ~N/10 for popular items

### Reliability (NFR-R)
- **NFR-R1:** Cache write failure must not break valuation flow (fail gracefully)

---

## References

- [Source: docs/architecture.md#Caching Strategy] - Cache table schema (ARCH-28)
- [Source: docs/architecture.md#Core Architectural Decisions] - TTL configuration (4-24 hours)
- [Source: docs/epics.md#Story 2.3] - Acceptance criteria
- [Source: docs/sprint-artifacts/epic-2-plan.md] - Epic context and story dependencies
- [Source: backend/services/ebay.py] - Current eBay service implementation
- [Source: backend/models.py] - ItemIdentity model

---

## Dev Agent Record

### Agent Model Used

_To be filled during implementation_

### Debug Log References

_To be filled during implementation_

### Completion Notes List

_To be filled during implementation_

### Change Log

**2026-01-31:** Story created with full context from Epic 2 plan and architecture docs

**2026-01-31:** Story validated - 5 improvements applied:
- Added search_keywords to cache key generation for better differentiation
- Updated integration test fixtures with required ItemIdentity fields (description, ai_identification_confidence)
- Changed from ISO timestamps to Unix timestamps for reliable expiration comparison
- Fixed ARCH-28 reference to correct section path (docs/architecture.md#Caching Strategy)
- Simplified AC7: manual cleanup script for MVP, automatic scheduling deferred to Epic 6

**2026-01-31:** Party mode review - 3 additional improvements applied:
- Added test for empty search_keywords edge case
- Added graceful degradation test for Supabase errors
- Updated mock targets to use actual function names (search_sold_listings)

**2026-01-31:** Switched from SQLite to Supabase PostgreSQL:
- Added Task 0: Configure Supabase connection
- Added Task 1: Create cache table in Supabase SQL Editor
- Updated cache.py to use supabase-py client
- Added get_cache_stats() for debugging
- Updated unit tests to mock Supabase client
- Updated total tasks from 7 to 8

### File List

_To be filled during implementation - files created/modified_
