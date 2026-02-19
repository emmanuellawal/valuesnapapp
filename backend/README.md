# ValueSnap Backend

## Quick Start

### Run

From repo root:

```bash
cd backend
source ../.venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Verify

```bash
curl -X POST http://localhost:8000/api/appraise \
  -H 'Content-Type: application/json' \
  -d '{"image_base64":"aGVsbG8="}'
```

You should see:
- `identity` shaped like `backend.models.ItemIdentity`
- `valuation` shaped like `backend.services.ebay.search_sold_listings` output

---

## AI Service (Story 2.2)

### Overview

The AI service (`backend/services/ai.py`) uses GPT-4o-mini to identify items from photos.

**Key Features:**
- Structured output via Pydantic `ItemIdentity` model
- Retry logic with exponential backoff (tenacity)
- Mock mode for development without API calls
- Description generation for eBay listings
- AI identification confidence scoring

### Mock Mode

Set `USE_MOCK=true` to run without external OpenAI/eBay calls.

```bash
export USE_MOCK=true
```

- Mocks live in `backend/services/mocks/`
- AI calls route through `backend/services/ai.py`
- eBay calls route through `backend/services/ebay.py`
- Mock implementations simulate network latency (500–1500ms) but unit tests patch out the delay

### Error Codes

| Code | Description | Retry? |
|------|-------------|--------|
| `AI_IDENTIFICATION_FAILED` | AI service failed after all retries | No |
| `AI_TIMEOUT` | Request exceeded 30s timeout | Maybe |
| `AI_RATE_LIMITED` | OpenAI rate limit exceeded | Yes (with backoff) |
| `INVALID_IMAGE` | Invalid base64 or corrupt image | No |

### Retry Behavior

The AI service uses `tenacity` for retry logic:

- **Max Retries:** 3 attempts total
- **Backoff:** Exponential (1s, 2s, 4s)
- **Retried Errors:** `RateLimitError`, `APITimeoutError`, `APIConnectionError`
- **Timeout:** 30 seconds per request

### Example Response

```json
{
  "identity": {
    "item_type": "wireless headphones",
    "brand": "Sony",
    "model": "WH-1000XM4",
    "visual_condition": "used_good",
    "condition_details": "Light scuffs on earcups; headband padding intact.",
    "estimated_age": "2020s",
    "category_hint": "Headphones",
    "search_keywords": ["Sony WH-1000XM4", "WH1000XM4 noise cancelling", "Sony over ear"],
    "identifiers": {
      "UPC": null,
      "model_number": "WH-1000XM4",
      "serial_number": null
    },
    "description": "Sony WH-1000XM4 wireless noise-cancelling over-ear headphones in good used condition. Light cosmetic wear on earcups, headband padding fully intact.",
    "ai_identification_confidence": "HIGH"
  },
  "valuation": { ... }
}
```

### AI Identification Confidence

| Level | Meaning |
|-------|---------|
| `HIGH` | Brand and model clearly visible and identifiable |
| `MEDIUM` | Category clear but brand/model specifics uncertain |
| `LOW` | Mostly guessing based on limited visual information |

**Note:** This is the AI's certainty about identification, distinct from market confidence (Story 2.5) which is based on available sales data.

---

## Cache Layer (Story 2.3)

### Overview

The cache layer (`backend/cache.py`) stores eBay market data in Supabase PostgreSQL to reduce API calls and improve response times.

**Key Features:**
- 6-hour default TTL (configurable 1-24 hours)
- SHA-256 cache keys based on item identity
- Graceful degradation on cache failures
- Automatic expiration via PostgreSQL timestamps
- Mock mode bypass (cache not used in dev mode)

### Supabase Setup

1. **Create Supabase Project:** https://supabase.com/dashboard
2. **Create Cache Table:** Run this SQL in Supabase SQL Editor:

```sql
-- Create cache table
CREATE TABLE cache (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    ttl_seconds INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Add index for efficient expiration queries
CREATE INDEX idx_cache_expires ON cache (expires_at);

-- Enable RLS (service key bypasses this)
ALTER TABLE cache ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON cache
    FOR ALL
    USING (true)
    WITH CHECK (true);
```

3. **Configure Environment Variables:**

Add to `backend/.env`:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Cache TTL (hours, 1-24)
EBAY_CACHE_TTL_HOURS=6
```

Find your credentials in Supabase Dashboard → Settings → API.

### Usage

The cache layer is automatically used by the eBay service:

```python
from backend.services.ebay import get_market_data_for_item

# Automatically checks cache first, falls back to API
item_identity = {
    "brand": "Canon",
    "model": "EOS R5",
    "item_type": "camera",
    "category": "Cameras & Photo",
    "search_keywords": ["Canon EOS R5"]
}

market_data = await get_market_data_for_item(item_identity)
```

**Cache Flow:**
1. Generate cache key from item identity (SHA-256 hash)
2. Check cache for unexpired entry
3. On **cache hit**: Return cached data
4. On **cache miss**: Call eBay API → Cache result → Return data
5. On **cache error**: Log warning and proceed with API call

### Cache Key Generation

Cache keys are deterministic SHA-256 hashes of:
- Brand
- Model
- Item type
- Category
- Sorted search keywords (order-independent)

Example:
```python
from backend.cache import get_cache_key

item = {
    "brand": "Sony",
    "model": "A7III",
    "item_type": "camera",
    "category": "Cameras",
    "search_keywords": ["Sony A7III", "mirrorless"]
}

cache_key = get_cache_key(item)
# Returns: "a3f8c2e1..." (64-char SHA-256 hex)
```

### Cache Cleanup

Expired entries are NOT automatically deleted (to keep cache reads fast). Run cleanup manually or schedule via cron:

```bash
# Show statistics
python backend/cleanup_cache.py --stats

# Dry run (show what would be deleted)
python backend/cleanup_cache.py --dry-run

# Actually delete expired entries
python backend/cleanup_cache.py
```

**Cron Example (daily at 3 AM):**
```cron
0 3 * * * cd /path/to/valuesnapapp && python backend/cleanup_cache.py >> /var/log/cache_cleanup.log 2>&1
```

### Configuration

Cache behavior is controlled via `backend/config.py`:

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| `SUPABASE_URL` | None | N/A | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | None | N/A | Service role key |
| `EBAY_CACHE_TTL_HOURS` | 6 | 1-24 | Cache entry lifetime |

**Note:** If Supabase credentials are missing, cache operations fail gracefully (logged as warnings, API calls proceed).

### Testing

Cache tests are in `backend/tests/`:

```bash
# Unit tests (mocked Supabase)
pytest backend/tests/test_cache.py -v

# Integration tests (mocked eBay + cache)
pytest backend/tests/integration/test_ebay_cache.py -v
```

**Test Coverage:**
- Cache key generation (deterministic, normalization)
- Read/write operations with error handling
- Expiration logic
- Cache hit/miss behavior
- Integration with eBay service

---

## eBay Market Data Integration (Story 2.4)

### Overview

The eBay service (`backend/services/ebay.py`) provides market data from eBay Browse API with intelligent fallback search and response field enhancements.

**Key Features:**
- **data_source field:** Indicates whether data came from "primary" (specific) or "fallback" (broader) search
- **limited_data field:** Flags when market data may be less reliable
- **Variance-checked fallback:** Automatically tries broader search when primary yields <5 items
- **API call counter:** Tracks OAuth and Browse API calls for debugging
- **Retry logic:** Exponential backoff for transient failures (excludes rate limits)
- **Rate limit protection:** 429 errors are NOT retried (preserves API quota)

### Response Fields

All market data responses now include:

| Field | Type | Description |
|-------|------|-------------|
| `data_source` | string | `"primary"` (exact search) or `"fallback"` (broader search) |
| `limited_data` | bool | `true` if data is less reliable (few items or fallback used) |
| `variance_pct` | float | Coefficient of variation as percentage (lower = more consistent prices) |

### Fallback Search Logic

When primary search returns fewer than 5 items:

1. **Extract broader keywords:** Removes model numbers, keeps brand + category
   - `"Sony WH-1000XM4 headphones"` → `"Sony headphones"`
2. **Execute fallback search** (if keywords changed)
3. **Validate fallback quality:**
   - Must have more items than primary
   - Must have at least 5 items
   - Must have variance ≤50% (price consistency)
4. **Use fallback** only if all quality checks pass

**API Budget:** Maximum 2 API calls per valuation (OAuth + Browse), compliant with NFR-SC5.

### Retry Behavior

The eBay service uses `tenacity` for retry logic:

- **Max Retries:** 3 attempts total
- **Backoff:** Exponential (1s, 2s, 4s)
- **Retried Errors:** Timeouts, connection errors, 503 Service Unavailable
- **NOT Retried:** 429 Rate Limit (raises `RateLimitError` immediately)

### API Call Counter

Monitor API usage during development:

```python
from backend.services.ebay import get_api_stats, reset_api_stats

# Check current counts
stats = get_api_stats()
print(stats)
# {'oauth_calls': 1, 'browse_calls': 2, 'total_calls': 3}

# Reset for testing
reset_api_stats()
```

### Mock Mode Scenarios

Use keywords with scenario markers for testing:

| Marker | Behavior |
|--------|----------|
| `__SCENARIO_HAPPY__` | Returns 10-25 items, high confidence |
| `__SCENARIO_LOW__` | Returns 1-4 items, limited_data=True |
| `__SCENARIO_NONE__` | Returns no data |
| `__SCENARIO_LIMITED__` | Returns data with data_source="fallback" |
| `__SCENARIO_HIGH_CONFIDENCE__` | Returns ideal data for HIGH confidence (25 items, 18% variance) |
| `__SCENARIO_LOW_CONFIDENCE__` | Returns insufficient data (triggers AI_ONLY) |
| `__SCENARIO_API_ERROR__` | Simulates API error response |
| `__SCENARIO_RATE_LIMIT__` | Simulates 429 rate limit error |

### Observability Endpoint

Monitor API usage via the admin endpoint:

```bash
curl http://localhost:8000/admin/api-stats
```

**Response:**
```json
{
  "ebay_oauth_calls": 145,
  "ebay_browse_calls": 892,
  "total_calls": 1037,
  "quota": {
    "daily_limit": 5000,
    "used": 1037,
    "used_pct": 20.74,
    "warning_threshold_pct": 80
  },
  "cache_stats": {
    "total_entries": 523,
    "expired_entries": 12
  }
}
```

**Proactive Warning:** Logs a warning when API usage exceeds 80% (4,000 calls) of the daily quota.

**Reset Counters (testing only):**
```bash
curl -X POST http://localhost:8000/admin/api-stats/reset
```

### Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `RateLimitError` | eBay 429 response | Wait and retry, or increase cache TTL |
| `status: "error"` | API request failed | Check eBay credentials, network connectivity |
| `limited_data: true` | Few comparable items | Normal for niche items, confidence will be lower |
| High `variance_pct` | Inconsistent prices | May indicate broad search, consider more specific keywords |

### Example Response

```json
{
  "status": "success",
  "keywords": "Sony WH-1000XM4 headphones",
  "total_found": 23,
  "prices_analyzed": 20,
  "outliers_removed": 3,
  "variance_pct": 18.5,
  "price_range": {"min": 180.00, "max": 280.00},
  "fair_market_value": 225.00,
  "mean": 218.50,
  "std_dev": 22.15,
  "data_source": "primary",
  "limited_data": false
}
```

### Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `EBAY_CLIENT_ID` | None | eBay application credentials |
| `EBAY_CLIENT_SECRET` | None | eBay application credentials |
| `EBAY_USE_SANDBOX` | "true" | Use sandbox or production API |

---

## Confidence Calculation (Story 2.5)

### Overview

The confidence service (`backend/services/confidence.py`) calculates market confidence based on AI identification certainty and market data quality.

**Key Features:**
- **Simple conditional logic:** Easy to understand, test, and maintain
- **AI_ONLY detection:** Flags when valuation is based purely on AI estimation
- **Configurable thresholds:** Adjust via environment variables
- **Safe defaults:** Missing data is handled conservatively

### Confidence Levels

| Level | Meaning | Criteria |
|-------|---------|----------|
| `HIGH` | Strong confidence | ≥20 items, variance ≤25%, AI=HIGH, data_source=primary |
| `MEDIUM` | Moderate confidence | ≥5 items, variance ≤40%, not AI_ONLY |
| `LOW` | Limited data | <5 items, variance >40%, AI=LOW, or AI_ONLY |

### AI_ONLY Flag

Set when market data is insufficient:
- `total_found < 3` (not enough comparable items)
- `status != "success"` (API failed or no results)

When AI_ONLY is set, confidence is automatically LOW.

### Response Structure

```json
{
  "confidence": {
    "market_confidence": "HIGH",
    "confidence_factors": {
      "sample_size": 25,
      "variance_pct": 18.0,
      "ai_confidence": "HIGH",
      "data_source": "primary",
      "data_source_penalty": false
    },
    "ai_only_flag": false,
    "confidence_message": "Strong confidence based on 25 comparable sales with consistent pricing"
  }
}
```

### Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `CONFIDENCE_HIGH_MIN_ITEMS` | 20 | Minimum items for HIGH confidence |
| `CONFIDENCE_MEDIUM_MIN_ITEMS` | 5 | Minimum items for MEDIUM confidence |
| `CONFIDENCE_HIGH_MAX_VARIANCE` | 25.0 | Maximum variance % for HIGH confidence |
| `CONFIDENCE_MEDIUM_MAX_VARIANCE` | 40.0 | Maximum variance % for MEDIUM confidence |

### Mock Mode Scenarios

| Marker | Behavior |
|--------|----------|
| `__SCENARIO_HIGH_CONFIDENCE__` | Returns ideal data for HIGH confidence |
| `__SCENARIO_LOW_CONFIDENCE__` | Returns insufficient data (triggers AI_ONLY) |

### Confidence Messages

| Level | Example Message |
|-------|-----------------|
| HIGH | "Strong confidence based on 25 comparable sales with consistent pricing" |
| MEDIUM | "Moderate confidence based on 15 sales" |
| LOW | "Limited data (only 3 comparable items found) - consider manual verification" |
| AI_ONLY | "No market data available - AI estimate only" |

### Testing

```bash
# Unit tests
python -m pytest backend/tests/test_confidence_service.py -v

# Integration tests
python -m pytest backend/tests/integration/test_confidence_integration.py -v
```

---

## Testing

### Run All Backend Tests

```bash
cd /path/to/valuesnapapp
source .venv/bin/activate
python -m pytest backend/tests/ -v
```

### Run Mock Tests Only

```bash
python -m pytest backend/tests/test_mock_ai.py -v
```

### Run Integration Tests (Mock Mode)

```bash
USE_MOCK=true python -m pytest backend/tests/integration/ -v
```

### Run Integration Tests (Real API)

```bash
USE_MOCK=false OPENAI_API_KEY=sk-... python -m pytest backend/tests/integration/ -v
```

### Test Image Fixtures

Test images are defined in `backend/tests/fixtures/TEST_IMAGES.json`:
- 10 positive cases (known products)
- 4 negative cases (edge scenarios: abstract art, blurry photos, etc.)

---

## Project Structure

```
backend/
├── main.py                    # FastAPI app entry
├── config.py                  # Settings & env vars
├── models.py                  # Pydantic models (ItemIdentity, etc.)
├── cache.py                   # Supabase cache layer (Story 2.3)
├── cleanup_cache.py           # Cache cleanup CLI script
├── services/
│   ├── ai.py                  # GPT-4o-mini integration
│   ├── ebay.py                # eBay Browse API
│   ├── confidence.py          # Confidence calculation (Story 2.5)
│   └── mocks/
│       ├── mock_ai.py         # Mock AI responses
│       └── mock_ebay.py       # Mock eBay responses
├── tests/
│   ├── test_mock_ai.py        # Unit tests (mock mode)
│   ├── test_mock_ebay.py      # Unit tests (mock mode)
│   ├── test_cache.py          # Cache unit tests
│   ├── test_confidence_service.py  # Confidence unit tests (Story 2.5)
│   ├── fixtures/
│   │   └── TEST_IMAGES.json   # Test image manifest
│   └── integration/
│       ├── test_ai_integration.py   # AI integration tests
│       ├── test_ebay_cache.py       # Cache integration tests
│       └── test_confidence_integration.py  # Confidence integration tests
└── README.md                  # This file
```
