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
├── services/
│   ├── ai.py                  # GPT-4o-mini integration
│   ├── ebay.py                # eBay Browse API
│   └── mocks/
│       ├── mock_ai.py         # Mock AI responses
│       └── mock_ebay.py       # Mock eBay responses
├── tests/
│   ├── test_mock_ai.py        # Unit tests (mock mode)
│   ├── test_mock_ebay.py      # Unit tests (mock mode)
│   ├── fixtures/
│   │   └── TEST_IMAGES.json   # Test image manifest
│   └── integration/
│       └── test_ai_integration.py  # Integration tests
└── README.md                  # This file
```
