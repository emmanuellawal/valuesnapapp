# Story 0.4: Set Up Mock Infrastructure

**Status:** done

**Depends on:** Story 0.3 (Primitive components created)

---

## Story

**As a** developer,  
**I want** mock services for AI and eBay APIs,  
**So that** I can develop frontend and backend independently without external API calls.

---

## Acceptance Criteria

1. **AC1:** `USE_MOCK=true` environment variable enables mock mode
2. **AC2:** Mock AI interpreter returns valid `ItemDetails` response matching production API format
3. **AC3:** Mock eBay fetcher returns valid market data with price range matching production API format
4. **AC4:** Mock responses include realistic delays (500-1500ms) to simulate network latency
5. **AC5:** Mock mode is documented in README with usage instructions
6. **AC6:** Mock implementations work immediately after extraction (quality gate ARCH-7)
7. **AC7:** Mock services include unit tests verifying response schema matches production contract
8. **AC8:** Mock data covers 3 edge case scenarios: happy path, low confidence (1-4 results), and no results (0 results)

---

## Tasks / Subtasks

- [ ] **Task 1: Extract Mock AI Interpreter from Prototype** (AC: 2, 6)
  - [ ] 1.1: Locate `mock_gpt_interpreter.py` in prototype codebase
  - [ ] 1.2: Create `backend/app/services/mocks/` directory structure
  - [ ] 1.3: Copy and adapt `mock_gpt_interpreter.py` to `backend/app/services/mocks/mock_ai.py`
  - [ ] 1.4: Ensure mock returns `ItemDetails` format matching production API contract
  - [ ] 1.5: Implement deterministic item selection based on image hash (for consistent testing)
  - [ ] 1.6: Add realistic delay (500-1500ms random) to simulate API latency

- [ ] **Task 2: Extract Mock eBay Fetcher from Prototype** (AC: 3, 6)
  - [ ] 2.1: Locate `mock_ebay_fetcher.py` in prototype codebase
  - [ ] 2.2: Copy and adapt `mock_ebay_fetcher.py` to `backend/app/services/mocks/mock_ebay.py`
  - [ ] 2.3: Ensure mock returns market data with price range matching production API format
  - [ ] 2.4: Implement realistic pricing data based on item type (use MOCK_PRICING_DATA pattern)
  - [ ] 2.5: Add realistic delay (500-1500ms random) to simulate API latency
  - [ ] 2.6: Generate mock listing counts and sample sizes

- [ ] **Task 3: Implement Environment Variable Toggle** (AC: 1)
  - [ ] 3.1: Add `USE_MOCK` environment variable to backend `.env.example`
  - [ ] 3.2: Create `backend/app/config.py` to read `USE_MOCK` from environment
  - [ ] 3.3: Default `USE_MOCK=true` for development, `false` for production
  - [ ] 3.4: Update service layer to check `USE_MOCK` flag and route to mocks when enabled

- [ ] **Task 4: Integrate Mocks into Service Layer** (AC: 2, 3)
  - [ ] 4.1: Update `ai_interpreter.py` (or create if not exists) to use `mock_ai.py` when `USE_MOCK=true`
  - [ ] 4.2: Update `ebay_market.py` (or create if not exists) to use `mock_ebay.py` when `USE_MOCK=true`
  - [ ] 4.3: Ensure mock and production services share same interface/contract
  - [ ] 4.4: Add logging to indicate when mock mode is active

- [ ] **Task 5: Document Mock Infrastructure** (AC: 5)
  - [ ] 5.1: Add mock infrastructure section to `backend/README.md`
  - [ ] 5.2: Document `USE_MOCK` environment variable usage
  - [ ] 5.3: Document how to run backend in mock mode
  - [ ] 5.4: Document mock data patterns and how to extend them
  - [ ] 5.5: Add note about mock mode enabling parallel frontend/backend development

- [ ] **Task 6: Create Automated Unit Tests** (AC: 7, 8)
  - [ ] 6.1: Create `backend/tests/test_mock_ai.py` with schema validation tests
  - [ ] 6.2: Create `backend/tests/test_mock_ebay.py` with schema validation tests
  - [ ] 6.3: Test happy path scenario (10+ results, HIGH confidence)
  - [ ] 6.4: Test low confidence scenario (1-4 results, LOW confidence)
  - [ ] 6.5: Test no results scenario (0 results, NONE confidence)
  - [ ] 6.6: Verify deterministic behavior (same image hash → same result)
  - [ ] 6.7: Add tests to CI pipeline

- [ ] **Task 7: Manual Verification** (AC: All)
  - [ ] 7.1: Set `USE_MOCK=true` in `.env`
  - [ ] 7.2: Start backend server and verify no errors
  - [ ] 7.3: Test mock AI endpoint returns HTTP 200 with valid schema
  - [ ] 7.4: Test mock eBay endpoint returns HTTP 200 with valid schema
  - [ ] 7.5: Verify realistic delays are present (500-1500ms)
  - [ ] 7.6: Verify logging indicates mock mode is active
  - [ ] 7.7: Run `pytest backend/tests/test_mock_*.py` and verify all pass

---

## Dev Notes

### ⚠️ CRITICAL: Mock Infrastructure is P0 Priority

This story establishes **critical development infrastructure** that enables:
- Frontend development without backend dependencies
- Backend development without external API dependencies  
- CI/CD without API rate limits
- Parallel team development

**Source:** [docs/architecture.md - lines 221-227 - Mock Infrastructure Priority]

---

### Architecture Requirements

**Mock Infrastructure Location:**
```
backend/app/services/mocks/
├── __init__.py
├── mock_ai.py          # Mock AI interpreter (from prototype)
└── mock_ebay.py       # Mock eBay fetcher (from prototype)

backend/tests/
├── __init__.py
├── test_mock_ai.py     # Unit tests for mock AI
└── test_mock_ebay.py   # Unit tests for mock eBay
```

**Service Interface Contract (REQUIRED):**

If `ai_interpreter.py` doesn't exist, create with this interface:
```python
# backend/app/services/ai_interpreter.py
from typing import Dict, Any
from app.config import USE_MOCK
import asyncio

async def interpret_image(image_base64: str) -> Dict[str, Any]:
    """
    Interpret item from image using AI.
    
    Args:
        image_base64: Base64 encoded image string
        
   backend/mock_gpt_interpreter.py` (lines 11871-12050) → `backend/app/services/mocks/mock_ai.py`
- `backend/mock_ebay_fetcher.py` (lines 11493-11650) → `backend/app/services/mocks/mock_ebay.py`

**Prototype Location:** `docs/prototype-repomix.txt`

**Critical Implementation Patterns from Prototype:**

1. **Deterministic Image Selection (mock_ai.py):**
```python
import hashlib

# Select mock item based on image hash (ensures same image → same result)
image_hash = hashlib.sha256(decoded_data).hexdigest()
item_index = int(image_hash[:8], 16) % len(MOCK_ITEMS)
mock_item = MOCK_ITEMS[item_index].copy()
```

2. **MOCK_ITEMS Database (mock_ai.py):**
```python
MOCK_ITEMS = [
    {
        "item_type": "vintage wristwatch",
        "brand": "Rolex",
        "model": "Submariner",
        "condition": "very_good",
        "key_features": ["automatic movement", "stainless steel case"],
        "market_indicators": {
            "rarity": "uncommon",
            "demand_level": "high"
        }
    },
    # ... 3 more items
]
```

3. **MOCK_PRICING_DATA (mock_ebay.py):**
```python
MOCK_PRICING_DATA = {
    "vintage wristwatch": {
        "base_price_range": (500, 5000),
        "condition_multipliers": {
            "like_new": 1.0,
            "very_good": 0.8,
            "good": 0.6
        },
        "brand_multipliers": {
            "Rolex": 3.0,
            "Omega": 1.5
        }
    }
}
```

4. **Realistic Delay (both files):**
```python
import asyncio
import random

# Add at start of function
await asyncio.sleep(random.uniform(0.5, 1.5))
```

**Extraction Requirements:**
- ✅ Preserve deterministic behavior (image hash-based selection)
- ✅ Preserve MOCK_PRICING_DATA and MOCK_ITEMS patterns
- ⚠️ Update import paths: `from app.config import USE_MOCK`
- ⚠️ Make functions async: `async def interpret_image(...)`
- ⚠️ Match Pydantic response models (see Mock Response Format section)

**Source:** [docs/prototype-repomix.txt - lines 11493-11650, 11871-12050
        from app.services.openai_client import interpret_image as prod_interpret
        return await prod_interpret(image_base64)
```

If `ebay_market.py` doesn't exist, create with this interface:
```python
# backend/app/services/ebay_market.py
from typing import Dict, Any
from app.config import USE_MOCK

async def fetch_market_data(item_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fetch market pricing data for item.
    
    Args:
        item_data: Dict containing item_type, brand, model, condition
        
    Returns:
        Dict with keys: price_range (dict), sample_size (int), confidence (str)
        
    Raises:
        ValueError: If item_data is missing required fields
        RuntimeError: If API call fails
    """
    if USE_MOCK:
        from app.services.mocks.mock_ebay import fetch_market_data as mock_fetch
        return await mock_fetch(item_data)
    else:
        # Production eBay API call
        from app.services.ebay_client import fetch_market_data as prod_fetch
        return await prod_fetch(item_data)
```

**Source:** [docs/architecture.md - lines 203-204 - Mock file locations]  
**Source:** [docs/project_context.md - lines 169-170 - Backend structure]  
**Source:** [docs/prototype-repomix.txt - lines 11871-12050 - Prototype mock implementation]

---

### Prototype Code Extraction

**Key Files to Extract:**
- `mock_gpt_interpreter.py` → `backend/app/services/mocks/mock_ai.py`
- `mock_ebay_fetcher.py` → `backend/app/services/mocks/mock_ebay.py`

**Prototype Location:** Check `docs/prototype-repomix.txt` for original mock implementations

**Extraction Requirements:**
- Preserve deterministic behavior (image hash-based selection)
- Preserve realistic data patterns (MOCK_PRICING_DATA, MOCK_ITEMS)
- Adapt to new project structure (import paths, config)
- Ensure compatibility with Pydantic v2 response models

**Source:** [docs/architecture.md - lines 199-208 - Prototype extraction table]

---

### Mock Response Format Requirements

**Mock AI Interpreter Response (ItemDetails):**
```python
{
    "item_name": str,           # e.g., "Vintage Camera"
    "item_type": str,           # e.g., "vintage camera"
    "category": str,            # e.g., "Electronics > Cameras"
    "condition": str,           # e.g., "Good", "Like New"
    "description": str,         # AI-generated description
    "attributes": dict,         # Key-value pairs (brand, model, etc.)
    "confidence": str           # "HIGH", "MEDIUM", "LOW"
}
```

**Mock eBay Fetcher Response (MarketData):**
```python
{
    "price_range": {
        "min": float,           # Low estimate
        "max": float            # High estimate
    },
    "sample_size": int,         # Number of listings found
    "listings_count": int,      # Total active listings
    "sold_count": int,          # Number of sold items (for confidence)
    "confidence": str,          # "HIGH", "MEDIUM", "LOW"
    "market_velocity": str      # e.g., "Sells in ~5 days"
}
```

**Source:** [docs/project_context.md - lines 88-113 - API Response Format]  
**Source:** [docs/epics.md - Story 0.6 - Type definitions will be created next]

---

### Environment Configuration

**Backend `.env.example` addition:**
```bash
# Development
USE_MOCK=false              # Set to true for mock mode
DEBUG=true
```

**Backend `.env.local` (development):**
```bash
USE_MOCK=true               # Enable mocks for local development
```

**Source:** [docs/project_context.md - lines 372-395 - Environment Variables]  
**Source:** [docs/architecture.md - lines 1171-1172 - USE_MOCK config]

---

### Realistic Delay Implementation

**Delay Requirements:**
- Random delay between 500-1500ms
- Simulates real API network latency
- Use `asyncio.sleep()` for async functions
- Use `time.sleep()` for sync functions (if any)

**Implementation Pattern:**
```python
import asyncio
import random

async def mock_interpret(image_base64: str):
    # Simulate network delay
    delay = random.uniform(0.5, 1.5)
    await asyncio.sleep(delay)
    
    # Return mock data
  Automated Unit Tests (REQUIRED - AC7):**

Create `backend/tests/test_mock_ai.py`:
```python
import pytest
from app.services.mocks.mock_ai import interpret_image
import base64

@pytest.mark.asyncio
async def test_mock_ai_happy_path():
    """Test mock AI returns valid schema with deterministic result."""
    test_image = base64.b64encode(b"fake_image_data_12345" * 10).decode()
    result = await interpret_image(test_image)
    
    # Verify schema
    assert "description" in result
    assert "research_notes" in result
    assert "structured_data" in result
    assert result["structured_data"]["item_type"] != "unknown"
    assert result["structured_data"]["brand"] != "unknown"

@pytest.mark.asyncio
async def test_mock_ai_deterministic():
    """Same image should return same result."""
    test_image = base64.b64encode(b"test_data_abc").decode()
    result1 = await interpret_image(test_image)
    result2 = await interpret_image(test_image)
    
    assert result1["structured_data"]["item_type"] == result2["structured_data"]["item_type"]
    assert result1["structured_data"]["brand"] == result2["structured_data"]["brand"]

@pytest.mark.asyncio
async def test_mock_ai_invalid_image():
    """Invalid image should return error state."""
    result = await interpret_image("invalid_base64!!!")
    
    assert result["structured_data"]["item_type"] == "unknown"
    assert "error" in result["research_notes"].lower() or "invalid" in result["research_notes"].lower()
```

Create `backend/tests/test_mock_ebay.py`:
```python
import pytest
from app.services.mocks.mock_ebay import fetch_market_data

@pytest.mark.asyncio
async def test_mock_ebay_happy_path():
    """Test mock eBay returns valid pricing (HIGH confidence)."""
    item_data = {
        "item_type": "vintage wristwatch",
        "brand": "Rolex",
        "condition": "very_good"
    }
    result = await fetch_market_data(item_data)
    
    # Verify schema
    assert "price_range" in result
    assert "min" in result["price_range"]
    assert "max" in result["price_range"]
    assert result["price_range"]["min"] < result["price_range"]["max"]
    assert "sample_size" in result
    assert result["sample_size"] >= 10  # Happy path = HIGH confidence
    assert result["confidence"] == "HIGH"

@pytest.mark.asyncio
async def test_mock_ebay_low_confidence():
    """Test LOW confidence scenario (1-4 results)."""
    item_data = {
        "item_type": "rare_collectible",
        "brand": "unknown",
        "condition": "good"
    }
    # Mock should detect unknown brand/rare items and return LOW confidence
    result = await fetch_market_data(item_data)
    
    assert result["sample_size"] <= 4
    assert result["confidence"] == "LOW"

@pytest.mark.asyncio
async def test_mock_ebay_no_results():
    """Test NONE confidence scenario (0 results)."""
    item_data = {
        "item_type": "unknown",
        "brand": "unknown",
        "condition": "unknown"
    }
    result = await fetch_market_data(item_data)
    
    assert result["sample_size"] == 0
    assert result["confidence"] == "NONE"
    assert result["price_range"]["min"] == 0
    assert result["price_range"]["max"] == 0
```

**Edge Case Scenarios (REQUIRED - AC8):**

Document 3 mock response scenarios in `backend/app/services/mocks/README.md`:

1. **Happy Path (HIGH Confidence):**
   - 10+ market results
   - Well-known brand (Rolex, Sony, Herman Miller)
   - Clear price range with IQR filtering
   - Sample: `{"sample_size": 15, "confidence": "HIGH", "price_range": {"min": 450, "max": 850}}`

2. **Low Confidence (1-4 Results):**
   - Rare/uncommon item
   - Unknown or niche brand
   - Limited market data
   - Sample: `{"sample_size": 2, "confidence": "LOW", "price_range": {"min": 50, "max": 200}}`

3. **No Results (NONE Confidence):**
   - Completely unknown item
   - No comparable sales
   - Manual review required
   - Sample: `{"sample_size": 0, "confidence": "NONE", "price_range": {"min": 0, "max": 0}, "message": "No market data available"}`

**Manual Testing Checklist:**
1. Run automated tests: `pytest backend/tests/test_mock_*.py -v`
2. Set `USE_MOCK=true` in `.env`
3. Start backend: `cd backend && python -m uvicorn app.main:app --reload`
4. Verify logs show "Mock mode enabled"
5. Test `/api/v1/valuations` endpoint with test image → HTTP 200
6. Verify delay is present (500-1500ms)
7. Test same image twice → verify deterministic results
8. Review all test scenarios pass

**Quality Gate (ARCH-7):**
- ✅ All unit tests pass (`pytest` exit code 0)
- ✅ Mock endpoints return HTTP 200 with valid schema
- ✅ No external API calls when `USE_MOCK=true`
- ✅ No missing dependencies or import errors
- ✅ Response format matches production API contract
- ✅ All 3 edge case scenarios work correctly

**Source:** [docs/architecture.md - line 284 - Quality gate requirement]  
**Source:** [docs/prototype-repomix.txt - lines 26444-26602 - Prototype test patterns
def get_image_hash(image_base64: str) -> str:
    return hashlib.md5(image_base64.encode()).hexdigest()

# Select mock item deterministically
item_index = int(image_hash[:8], 16) % len(MOCK_ITEMS)
mock_item = MOCK_ITEMS[item_index]
```

**Source:** [docs/prototype-repomix.txt - mock_gpt_interpreter.py pattern]

---

### Logging Requirements

**Mock Mode Indicators:**
- Log when mock mode is enabled on service initialization
- Log when mock AI interpreter is used (instead of OpenAI)
- Log when mock eBay fetcher is used (instead of real API)
- Use appropriate log levels (INFO for normal operation, WARNING for fallbacks)

**Logging Pattern:**
```python
import logging

logger = logging.getLogger(__name__)

if USE_MOCK:
    logger.info("Mock mode enabled - using mock AI interpreter")
    return await mock_interpret(image_base64)
else:
    logger.info("Using production OpenAI API")
    return await openai_client.interpret(image_base64)
```

**Source:** [docs/project_context.md - Error handling patterns]

---

### Testing Strategy

**Manual Testing Checklist:**
1. Set `USE_MOCK=true` in `.env`
2. Start backend: `cd backend && python -m uvicorn app.main:app --reload`
3. Verify logs show "Mock mode enabled"
4. Test mock AI endpoint: `POST /api/v1/valuations` with test image
5. Verify response includes valid `ItemDetails` structure
6. Verify delay is present (500-1500ms)
7. Test mock eBay endpoint (if separate endpoint exists)
8. Verify response includes valid `MarketData` structure
9. Test same image twice - verify deterministic results

**Quality Gate (ARCH-7):**
- Mock mode must work immediately after extraction
- No external API calls when `USE_MOCK=true`
- No missing dependencies or import errors
- Response format matches production API contract

**Source:** [docs/architecture.md - line 284 - Quality gate requirement]

---

### Learnings from Previous Stories

**From Story 0.1:**
- Project uses Expo Router with file-based routing
- TypeScript strict mode enabled
- Import paths use `@/` alias for clean imports

**From Story 0.2:**
- NativeWind v4 is configured and working
- Environment variables use `EXPO_PUBLIC_` prefix for frontend
- Backend uses standard `.env` file

**From Story 0.3:**
- All components follow Swiss Minimalist design constraints
- TypeScript types are critical for consistency
- Barrel exports (`index.ts`) enable clean imports

**Key Pattern:** Always verify TypeScript types match between mock and production implementations

**Source:** [docs/sprint-artifacts/0-3-create-primitive-components.md - Dev Agent Record]

---

### Project Structure Notes

**Backend Structure (from architecture):**
```
backend/
├── app/
│   ├── main.py
│   ├── config.py              ← Create (for USE_MOCK)
│   ├── services/
│   │   ├── ai_interpreter.py  ← Update (add mock routing)
│   │   ├── ebay_market.py     ← Update (add mock routing)
│   │   └── mocks/             ← Create directory
│   │       ├── __init__.py
│   │       ├── mock_ai.py     ← Extract from prototype
│   │       └── mock_ebay.py   ← Extract from prototype
│   └── models/
│       └── schemas.py         ← Pydantic models (verify compatibility)
├── .env.example              ← Update (add USE_MOCK)
└── README.md                 ← Update (document mock mode)
```

**Source:** [docs/project_context.md - lines 158-178 - Backend structure]  
**Source:** [docs/architecture.md - lines 1041-1044 - Mock file locations]

---

### References

**Epic Context:**
- [docs/epics.md - Epic 0: Developer Foundation, lines 453-463]
- [docs/epics.md - Story 0.4, lines 517-532]
- [docs/epics.md - ARCH-4 to ARCH-7 requirements, lines 191-196]

**Architecture Context:**
- [docs/architecture.md - Mock Infrastructure Priority, lines 221-227]
- [docs/architecture.md - Prototype Extraction Strategy, lines 199-208]
- [docs/architecture.md - Environment Configuration, lines 1134-1173]

**Project Context:**
- [docs/project_context.md - Mock Mode section, lines 332-341]
- [docs/project_context.md - Backend structure, lines 158-178]
- [docs/project_context.md - Environment Variables, lines 363-395]

**Prototype Reference:**
- [docs/prototype-repomix.txt - mock_gpt_interpreter.py implementation]
- [docs/prototype-repomix.txt - mock_ebay_fetcher.py implementation]

---

## Dev Agent Record

### Context Reference

- docs/epics.md (Epic 0, Story 0.4, lines 517-532)
- docs/architecture.md (Mock infrastructure, prototype extraction, lines 199-227)
- docs/project_context.md (Mock mode, backend structure, environment config)
- docs/sprint-artifacts/0-3-create-primitive-components.md (Previous story learnings)

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-19 | Story created with comprehensive mock infrastructure context | create-story workflow |


