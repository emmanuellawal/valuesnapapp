# Story 2-5: Implement Confidence Calculation Service

**Epic:** Epic 2: AI Valuation Engine  
**Story ID:** 2-5  
**Priority:** HIGH  
**Estimated Effort:** 5 Story Points  
**Dependencies:** Story 2-4 (Integrate eBay Market Data)  
**Status:** READY  

---

## User Story

**As a** user,  
**I want** to see how confident the app is in its valuation,  
**So that** I know when to trust it and when to verify manually.

---

## Business Context

Confidence scoring is critical for building trust with users. Transparent confidence indicators help users make informed decisions about whether to rely on the valuation or seek additional verification. This aligns with our "trust-through-transparency" principle and addresses FR11, FR14, FR52.

The confidence calculation integrates data from both AI identification (Story 2-2) and eBay market data (Story 2-4) to provide a holistic confidence score that considers:
- AI identification certainty
- Market data sample size
- Price variance (consistency)
- Data source quality (primary vs fallback)

---

## Acceptance Criteria

### AC1: HIGH Confidence Calculation
**Given** market data has been retrieved  
**When** confidence is calculated  
**Then** HIGH confidence is assigned when ALL of the following are true:
- ≥20 items in price sample
- Variance coefficient ≤25%
- AI identification confidence = HIGH
- Data source = "primary" (not fallback)

### AC2: MEDIUM Confidence Calculation
**Given** market data has been retrieved  
**When** confidence is calculated  
**Then** MEDIUM confidence is assigned when:
- Does not qualify for HIGH, AND
- ≥5 items in price sample, AND
- Variance coefficient ≤40%, AND
- NOT AI_ONLY flag

### AC3: LOW Confidence Calculation
**Given** market data has been retrieved  
**When** confidence is calculated  
**Then** LOW confidence is assigned when ANY of the following are true:
- <5 items in price sample
- Variance coefficient >40%
- AI identification confidence = LOW
- AI_ONLY flag is set
- Data source = "fallback" AND another weakness exists

### AC4: AI_ONLY Flag
**Given** market data has `total_found < 3` OR `status != "success"`  
**When** confidence is calculated  
**Then** `ai_only_flag` is set to True  
**And** confidence is automatically LOW  
**And** response indicates valuation is based purely on AI estimation without market data

### AC5: Configurable Thresholds
**Given** confidence thresholds are defined  
**When** the service initializes  
**Then** thresholds are read from environment variables with defaults:
- `CONFIDENCE_HIGH_MIN_ITEMS = 20`
- `CONFIDENCE_MEDIUM_MIN_ITEMS = 5`
- `CONFIDENCE_HIGH_MAX_VARIANCE = 25.0`
- `CONFIDENCE_MEDIUM_MAX_VARIANCE = 40.0`

### AC6: Response Structure
**Given** confidence has been calculated  
**When** returned to caller  
**Then** response includes:
- `market_confidence`: "HIGH" | "MEDIUM" | "LOW"
- `confidence_factors`: Dict with breakdown (sample_size, variance, ai_confidence, data_source)
- `ai_only_flag`: bool
- `confidence_message`: Human-readable explanation

### AC7: Data Source Impact (Fallback Penalty)
**Given** market data with `data_source="fallback"`  
**When** confidence is calculated  
**Then** confidence cannot be HIGH (downgrades to MEDIUM at best)  
**And** if other weaknesses exist, confidence becomes LOW  
**And** `confidence_factors` includes `"data_source_penalty": True`

### AC8: Missing Data Defaults
**Given** market data is missing expected fields  
**When** confidence is calculated  
**Then** defaults are applied:
- Missing `variance_pct` → defaults to 100.0 (conservative, triggers LOW)
- Missing `prices_analyzed` → defaults to 0 (triggers AI_ONLY)
- Missing `data_source` → defaults to "primary"

---

## Technical Implementation

### Simplified Algorithm (Conditionals, Not Float Scoring)

```python
def calculate_market_confidence(market_data: Dict, ai_confidence: str) -> ConfidenceResult:
    # Extract with safe defaults
    items = market_data.get("prices_analyzed", 0)
    variance = market_data.get("variance_pct", 100.0)
    data_source = market_data.get("data_source", "primary")
    status = market_data.get("status", "error")
    total_found = market_data.get("total_found", 0)
    
    # Check AI_ONLY first
    ai_only = total_found < 3 or status != "success"
    if ai_only:
        return ConfidenceResult(level="LOW", ai_only_flag=True, ...)
    
    # HIGH: All conditions must be met
    if (items >= HIGH_MIN_ITEMS and 
        variance <= HIGH_MAX_VARIANCE and 
        ai_confidence == "HIGH" and 
        data_source == "primary"):
        return ConfidenceResult(level="HIGH", ...)
    
    # LOW: Any disqualifying condition
    if (items < MEDIUM_MIN_ITEMS or 
        variance > MEDIUM_MAX_VARIANCE or 
        ai_confidence == "LOW"):
        return ConfidenceResult(level="LOW", ...)
    
    # MEDIUM: Everything else
    return ConfidenceResult(level="MEDIUM", ...)
```

### Architecture

```
backend/services/confidence.py
- calculate_market_confidence(market_data, ai_confidence) -> ConfidenceResult
- _check_ai_only(market_data) -> bool
- _generate_confidence_message(level, factors, ai_only) -> str
- get_confidence_thresholds() -> Dict[str, float]
```

### Data Flow

1. **Input:** Market data from eBay service (Story 2-4) + AI confidence (Story 2-2)
2. **Process:** Check AI_ONLY → Check HIGH → Check LOW → Default MEDIUM
3. **Output:** ConfidenceResult with level, factors, message

### Integration Points

- **Input from Story 2-2:** `ai_identification_confidence` field from ItemIdentity
- **Input from Story 2-4:** `variance_pct`, `data_source`, `limited_data`, `prices_analyzed`, `total_found`, `status`
- **Output to API:** Added to `/api/v1/valuations` response
- **Output to Frontend:** Used in ValuationCard component (Story 2-6)

---

## Tasks

### Task 1: Create Confidence Service Module
**Description:** Set up the confidence calculation service with configuration support
- [ ] 1.1: Create `backend/services/confidence.py`
- [ ] 1.2: Define `ConfidenceResult` dataclass with `market_confidence`, `confidence_factors`, `ai_only_flag`, `confidence_message`
- [ ] 1.3: Add threshold constants with environment variable support
- [ ] 1.4: Implement `get_confidence_thresholds()` with validation

**Verification:** Thresholds load from env vars with fallback to defaults

---

### Task 2: Implement AI_ONLY Detection
**Description:** Detect when valuation has no real market data
- [ ] 2.1: Implement `_check_ai_only(market_data: Dict) -> bool`
- [ ] 2.2: Return True if `total_found < 3` OR `status != "success"`
- [ ] 2.3: Add unit tests for edge cases

**Verification:** AI_ONLY flag set correctly when market data absent/insufficient

---

### Task 3: Implement Main Confidence Logic
**Description:** Simple conditional logic for confidence tiers
- [ ] 3.1: Implement `calculate_market_confidence(market_data: Dict, ai_confidence: str) -> ConfidenceResult`
- [ ] 3.2: Check AI_ONLY first (always LOW)
- [ ] 3.3: Check HIGH conditions (all must be true)
- [ ] 3.4: Check LOW conditions (any disqualifier)
- [ ] 3.5: Default to MEDIUM

**Verification:** All test scenarios return expected levels

---

### Task 4: Implement Safe Defaults
**Description:** Handle missing or malformed data gracefully
- [ ] 4.1: Default `variance_pct` to 100.0 if missing
- [ ] 4.2: Default `prices_analyzed` to 0 if missing
- [ ] 4.3: Default `data_source` to "primary" if missing
- [ ] 4.4: Add tests for None/missing field handling

**Verification:** No crashes on incomplete data; conservative defaults applied

---

### Task 5: Generate Confidence Messages
**Description:** Create human-readable explanations for each level
- [ ] 5.1: Implement `_generate_confidence_message(level, factors, ai_only) -> str`
- [ ] 5.2: Templates:
  - HIGH: "Strong confidence based on {n} comparable sales with consistent pricing"
  - MEDIUM: "Moderate confidence based on {n} sales"
  - LOW: "Limited data ({n} items) - consider manual verification"
  - AI_ONLY: "No market data available - AI estimate only"
- [ ] 5.3: Include relevant factor in message (variance, sample size, etc.)

**Verification:** Messages are clear and actionable

---

### Task 6: Integrate into Valuation API
**Description:** Add confidence calculation to the appraisal endpoint
- [ ] 6.1: Import confidence service in `backend/main.py`
- [ ] 6.2: Pass `item_type` from identity to `search_sold_listings()` call
- [ ] 6.3: Call `calculate_market_confidence()` with market_data and `identity.ai_identification_confidence`
- [ ] 6.4: Add confidence fields to API response
- [ ] 6.5: Update OpenAPI schema docstring

**Verification:** `/api/appraise` returns confidence data

---

### Task 7: Update Pydantic Models
**Description:** Add confidence types to response models
- [ ] 7.1: Add `MarketConfidenceLevel = Literal["HIGH", "MEDIUM", "LOW"]` to models.py
- [ ] 7.2: Add `ConfidenceFactors` TypedDict or dataclass
- [ ] 7.3: Document field meanings in docstrings

**Verification:** Models validate correctly with new fields

---

### Task 8: Create Mock Confidence Scenarios
**Description:** Support deterministic testing via keywords
- [ ] 8.1: Add `__SCENARIO_HIGH_CONFIDENCE__` → returns HIGH
- [ ] 8.2: Add `__SCENARIO_LOW_CONFIDENCE__` → returns LOW with AI_ONLY
- [ ] 8.3: Integrate into mock_ebay.py response scenarios

**Verification:** Frontend can test confidence UI with predictable responses

---

### Task 9: Write Unit Tests
**Description:** Focused tests for confidence logic
- [ ] 9.1: Test HIGH confidence scenario (all conditions met)
- [ ] 9.2: Test MEDIUM confidence scenario (borderline)
- [ ] 9.3: Test LOW confidence scenarios (each disqualifier)
- [ ] 9.4: Test AI_ONLY detection (total_found < 3, status != success)
- [ ] 9.5: Test fallback penalty (blocks HIGH)
- [ ] 9.6: Test missing data defaults
- [ ] 9.7: Test message generation
- [ ] 9.8: Test config loading

**Test File:** `backend/tests/test_confidence_service.py`  
**Target:** 12-15 focused unit tests

---

### Task 10: Write Integration Tests
**Description:** Test confidence in full valuation flow
- [ ] 10.1: Test end-to-end with mock eBay (HIGH confidence path)
- [ ] 10.2: Test end-to-end with limited data (LOW confidence path)
- [ ] 10.3: Test AI_ONLY scenario
- [ ] 10.4: Test API response includes all confidence fields

**Test File:** `backend/tests/integration/test_confidence_integration.py`  
**Target:** 4-5 integration tests

---

### Task 11: Update Documentation
**Description:** Document confidence service in README
- [ ] 11.1: Add "Confidence Calculation (Story 2-5)" section to backend/README.md
- [ ] 11.2: Document configuration variables
- [ ] 11.3: Document confidence tiers and their meaning
- [ ] 11.4: Add example response with confidence fields

**Verification:** README includes complete confidence service documentation

---

## Definition of Done

- [ ] All 11 tasks completed
- [ ] `calculate_market_confidence()` returns correct confidence levels
- [ ] Configuration thresholds are externalized and documented
- [ ] AI_ONLY flag works when market data is absent
- [ ] Confidence messages are clear and helpful
- [ ] 12-15 unit tests passing
- [ ] 4-5 integration tests passing
- [ ] All existing tests still pass (no regressions)
- [ ] Documentation updated in README
- [ ] Code review completed

---

## Test Scenarios

### Scenario 1: HIGH Confidence (All Conditions Met)
**Given:**
- 25 items in sample
- Variance = 18%
- AI confidence = HIGH
- Data source = primary

**Expected:** `market_confidence = "HIGH"`

---

### Scenario 2: MEDIUM Confidence (Fallback Source)
**Given:**
- 30 items in sample
- Variance = 20%
- AI confidence = HIGH
- Data source = fallback ← blocks HIGH

**Expected:** `market_confidence = "MEDIUM"`

---

### Scenario 3: LOW Confidence (High Variance)
**Given:**
- 15 items in sample
- Variance = 55% ← exceeds 40% threshold
- AI confidence = MEDIUM
- Data source = primary

**Expected:** `market_confidence = "LOW"`

---

### Scenario 4: LOW Confidence (Small Sample)
**Given:**
- 3 items in sample ← below 5 threshold
- Variance = 20%
- AI confidence = HIGH
- Data source = primary

**Expected:** `market_confidence = "LOW"`

---

### Scenario 5: AI_ONLY Flag
**Given:**
- total_found = 2 ← triggers AI_ONLY
- Status = "no_data"

**Expected:**
- `market_confidence = "LOW"`
- `ai_only_flag = True`
- Message: "No market data available - AI estimate only"

---

### Scenario 6: Missing Variance (Conservative Default)
**Given:**
- 10 items in sample
- variance_pct = None (missing)
- AI confidence = HIGH
- Data source = primary

**Expected:** `market_confidence = "LOW"` (defaults variance to 100%)

---

## Dependencies

### Upstream (Required Before Start)
- ✅ Story 2-2: AI Item Identification (provides `ai_identification_confidence`)
- ✅ Story 2-4: Integrate eBay Market Data (provides `variance_pct`, `data_source`, `limited_data`)

### Downstream (Blocked Until Complete)
- Story 2-6: Build ValuationCard Component (displays confidence)
- Story 2-10: Display Confidence-Based Messaging (uses confidence for messaging)

---

## Non-Functional Requirements

- **NFR-P1:** Confidence calculation adds <50ms to valuation response time
- **NFR-D1:** Confidence calculation is deterministic (same inputs → same output)
- **NFR-S1:** Confidence thresholds configurable via environment variables

---

## Notes

**Design Decisions:**
1. **Simple conditionals over float scoring** - Easier to understand, test, and maintain
2. **Fallback blocks HIGH** - Even perfect fallback data can't be HIGH confidence
3. **Conservative defaults** - Missing data → assume worst case
4. **AI_ONLY checked first** - No point calculating confidence without market data

**AI Confidence vs Market Confidence:**
- AI confidence (Story 2-2) reflects identification certainty ("Is this a Sony WH-1000XM4?")
- Market confidence (this story) reflects pricing data quality ("Can we trust the price range?")
- Both shown to user but serve different purposes

**Frontend Display Guidance:**
- Typography weight mapping (Swiss design): Bold = HIGH, Regular = MEDIUM/LOW
- Color: All confidence levels use Ink (#000000), not traffic light colors
- Messages shown in caption style below price range

**Configuration Example:**
```bash
# .env (all optional, defaults shown)
CONFIDENCE_HIGH_MIN_ITEMS=20
CONFIDENCE_MEDIUM_MIN_ITEMS=5
CONFIDENCE_HIGH_MAX_VARIANCE=25.0
CONFIDENCE_MEDIUM_MAX_VARIANCE=40.0
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Confidence too strict (always LOW) | Medium | High | Configurable thresholds; monitor in production |
| Confidence too lenient (false HIGH) | Medium | Critical | Conservative defaults; code review |
| Missing data crashes | Low | High | Safe defaults for all fields |
| Performance impact | Very Low | Low | Simple conditionals; <1ms overhead |

---

## Acceptance Checklist

- [ ] HIGH confidence only when ALL conditions met
- [ ] MEDIUM confidence for borderline cases
- [ ] LOW confidence when ANY disqualifier present
- [ ] Fallback data source blocks HIGH
- [ ] AI_ONLY flag set when total_found < 3
- [ ] Missing fields use conservative defaults
- [ ] Confidence messages are helpful
- [ ] Configuration works correctly
- [ ] All tests pass
- [ ] Documentation is complete

---

**Story Created:** January 31, 2026  
**Last Updated:** January 31, 2026 (Party Mode: A+ simplification)  
**Target Sprint:** Sprint 3  
**Story Points:** 5 (3 dev + 1.5 test + 0.5 doc)
