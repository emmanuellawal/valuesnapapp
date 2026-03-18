# Story 2.10: Display Confidence-Based Messaging

**Status:** done

---

## Story

**As a** user,
**I want** appropriate messaging based on confidence level,
**So that** I know how to interpret the valuation.

---

## Business Context

### Why This Story Matters

Validation and documentation story. Most implementation done in Stories 2.5 (backend confidence), 2.6 (ValuationCard typography), 2.9 (ConfidenceWarning + price range widening). This story ensures all three levels work together correctly and are properly documented.

**Current State:**
- ✅ Backend: confidence calculation, message generation, LOW price range widening
- ✅ Frontend: ValuationCard (bold/normal typography), ConfidenceWarning (LOW-only, Signal color), appraisal page integration
- ✅ Tests: 6 Playwright screenshot tests (3 levels × 2 viewports)
- ❌ No validation that screenshots match current component state post-Story 2.9
- ❌ TSDoc may be stale after iterative changes

**Delivers:** End-to-end validation, regression testing, code documentation, targeted fixes if gaps found

### Value Delivery

- **User Value:** Consistent, predictable confidence indicators across all scenarios
- **Developer Value:** Clear, documented patterns for future confidence features
- **Quality Assurance:** Regression testing ensures Stories 2.6 + 2.9 work together correctly

### Epic Context

Story 10 of 11 in Epic 2 (AI Valuation Engine). This is a **validation and documentation story** — most implementation is complete from prior stories. The value is ensuring no gaps exist and documenting the system for future developers.

---

## Acceptance Criteria

### AC1: HIGH Confidence Display (Validation)

**Given** a valuation with HIGH confidence (≥20 sales, <25% variance)
**When** displayed in ValuationCard on the appraisal page
**Then** the price uses bold typography (`font-bold`)
**And** NO ConfidenceWarning component appears below the card
**And** the caption reads "Based on N sales"
**And** NO Signal color (#E53935) is used anywhere

**Validation:** Already implemented in Story 2.6. Verify via screenshot test.

---

### AC2: MEDIUM Confidence Display (Validation)

**Given** a valuation with MEDIUM confidence (5-19 sales, 25-40% variance)
**When** displayed in ValuationCard on the appraisal page
**Then** the price uses regular typography (`font-normal`)
**And** NO ConfidenceWarning component appears below the card
**And** the caption reads "Based on N sales"
**And** NO Signal color is used

**Validation:** Already implemented in Story 2.6. Verify via screenshot test.

---

### AC3: LOW Confidence Display (Validation)

**Given** a valuation with LOW confidence (<5 sales or >40% variance)
**When** displayed in ValuationCard on the appraisal page
**Then** the price uses regular typography (`font-normal`)
**And** the caption reads "Limited data (N sales)"
**And** ConfidenceWarning appears below the card with Signal color text
**And** the warning reads "Limited market data. Consider manual verification."
**And** a "Verify on eBay" link is provided with `text-ink underline` styling (**not** Signal color — Signal is reserved for the warning sentence only)
**And** warning text has `accessibilityRole="alert"` and verify link has `accessibilityRole="link"`

**Validation:** Already implemented in Stories 2.6 + 2.9. Verify via screenshot test + manual inspection.

---

### AC4: Screenshot Tests Pass for All Confidence Levels

**Given** the Playwright screenshot test suite
**When** tests are executed
**Then** all 6 confidence screenshot tests pass (3 levels × 2 viewports)
**And** tests confirm DOM elements load correctly (heading, LOW text assertions)
**And** output screenshots are manually inspected for visual regressions from Story 2.9 changes

**Note:** Tests use `page.screenshot()` (file write), NOT `toMatchSnapshot()` (pixel comparison). DOM assertions (heading visible, "Limited market data" text) are automated. Visual regression detection is **manual** — compare output PNGs against expected appearance.

**Test files:** `apps/mobile/tests/screenshots.spec.ts`
**Screenshot dir:** `apps/mobile/screenshots/`

---

### AC5: Confidence Messaging Documentation

**Given** the codebase
**When** reviewed for documentation
**Then** ValuationCard confidence logic has clear inline comments
**And** the confidence messaging matrix is documented in this story artifact
**And** design rationale (why bold for HIGH, why Signal for LOW) is captured

---

## Tasks / Subtasks

### Task 1: Run Existing Screenshot Tests (AC: #4)
**Estimated:** 15-20min

- [x] 1.1: Run Playwright screenshot tests (`npx playwright test tests/screenshots.spec.ts`) — server auto-starts via `webServer` config
- [x] 1.2: Verify all 6 confidence tests pass (web + mobile viewports)
- [x] 1.3: If any tests fail, investigate DOM assertion failures vs visual regressions
- [x] 1.4: Manually inspect output screenshots for visual correctness (no automated pixel comparison exists)
- [x] 1.5: If screenshots have changed since Story 2.9, confirm the new appearance is correct and commit updated PNGs

**Files:**
```
apps/mobile/tests/screenshots.spec.ts  ← Run tests
apps/mobile/screenshots/               ← Verify outputs
```

**Test Commands:**
```bash
cd apps/mobile
npx playwright test tests/screenshots.spec.ts --reporter=list
# Playwright auto-starts "npm run web" on port 8083 via webServer config in playwright.config.ts
# If starting manually instead: npm run web (uses port 8083, NOT default 8081)
# DO NOT use "npx expo start --web" directly — it uses wrong port and tests will timeout
```

**Expected 6 Confidence Tests:**
| Test Name | URL Params | Key Assertions |
|-----------|-----------|----------------|
| web - Confidence HIGH | `confidence=HIGH&pricesAnalyzed=25` | Heading visible |
| web - Confidence MEDIUM | `confidence=MEDIUM&pricesAnalyzed=12` | Heading visible |
| web - Confidence LOW | `confidence=LOW&pricesAnalyzed=3` | Heading + "Limited market data" visible |
| mobile - Confidence HIGH | Same as web | Heading visible |
| mobile - Confidence MEDIUM | Same as web | Heading visible |
| mobile - Confidence LOW | Same as web | Heading + "Limited market data" visible |

---

### Task 2: Validate HIGH Confidence Display (AC: #1)
**Estimated:** 10min

- [x] 2.1: Open appraisal page with HIGH confidence params: `/appraisal?confidence=HIGH&pricesAnalyzed=25&fairMarketValue=249&brand=Canon&model=AE-1`
- [x] 2.2: Verify price text uses `font-bold` class (inspect element or visual check)
- [x] 2.3: Verify caption reads "Based on 25 sales"
- [x] 2.4: Verify NO ConfidenceWarning renders (no "Limited market data" text, no "Verify on eBay" link)
- [x] 2.5: Compare with `web-confidence-high.png` screenshot

**Files to Verify (read-only):**
```
apps/mobile/components/molecules/valuation-card.tsx   ← isHighConfidence logic at L118-119
apps/mobile/app/appraisal.tsx                         ← ConfidenceWarning at L79-84
```

---

### Task 3: Validate MEDIUM Confidence Display (AC: #2)
**Estimated:** 10min

- [x] 3.1: Open appraisal page with MEDIUM confidence params: `/appraisal?confidence=MEDIUM&pricesAnalyzed=12&fairMarketValue=145&brand=Anglepoise&model=Type%2075`
- [x] 3.2: Verify price text uses `font-normal` class
- [x] 3.3: Verify caption reads "Based on 12 sales"
- [x] 3.4: Verify NO ConfidenceWarning renders
- [x] 3.5: Compare with `web-confidence-medium.png` screenshot

**Implementation Note:** Backend currently returns `'MEDIUM'` only when items are 5-19 with variance 25-40%. The frontend `ConfidenceLevel` type includes `'MEDIUM'` but the type definition notes `"not currently used by backend"` — this is inaccurate since backend's `calculate_market_confidence()` DOES return MEDIUM (see `backend/services/confidence.py` L284). Consider correcting this TSDoc if found.

---

### Task 4: Validate LOW Confidence Display (AC: #3)
**Estimated:** 10min

- [x] 4.1: Open appraisal page with LOW confidence params: `/appraisal?confidence=LOW&pricesAnalyzed=3&fairMarketValue=55&brand=Unknown&model=Vintage%20botanical`
- [x] 4.2: Verify price text uses `font-normal` class
- [x] 4.3: Verify caption reads "Limited data (3 sales)"
- [x] 4.4: Verify ConfidenceWarning renders with text "Limited market data. Consider manual verification."
- [x] 4.5: Verify Signal color (#E53935) is applied to warning text
- [x] 4.6: Verify "Verify on eBay" link appears with `text-ink underline` styling (NOT Signal color)
- [x] 4.7: Verify `accessibilityRole="alert"` on warning text and `accessibilityRole="link"` on verify pressable
- [x] 4.8: Verify link opens eBay sold search URL (click test)
- [x] 4.9: Compare with `web-confidence-low.png` screenshot

**Files to Verify (read-only):**
```
apps/mobile/components/molecules/confidence-warning.tsx  ← LOW-only render at L86-89
apps/mobile/components/molecules/valuation-card.tsx      ← getSampleSizeCaption() at L83-98
```

---

### Task 5: Document Confidence Messaging Patterns (AC: #5)
**Estimated:** 20-30min

- [x] 5.1: Review ValuationCard comments — ensure `getSampleSizeCaption()` and `isHighConfidence` logic are well-documented
- [x] 5.2: Review ConfidenceWarning comments — ensure conditional rendering and Signal color usage are documented
- [x] 5.3: If any TSDoc inaccuracies found (e.g., MEDIUM "not used" comment in `types/market.ts` L16), fix them
- [x] 5.4: Add `MOCK_MEDIUM_CONFIDENCE_ITEM` and `MOCK_LOW_CONFIDENCE_ITEM` named exports to `apps/mobile/types/mocks.ts` (prevents inline recreation in future stories like 2.11)
- [x] 5.5: Ensure the confidence messaging matrix is documented in this story's dev notes (see below)
- [x] 5.6: Update this story artifact with validation results and any gap fixes

**Files to Modify:**
```
apps/mobile/types/market.ts                              ← Fix MEDIUM "not used" comment (L16 is inaccurate)
apps/mobile/types/mocks.ts                               ← Add MOCK_MEDIUM_CONFIDENCE_ITEM, MOCK_LOW_CONFIDENCE_ITEM constants
apps/mobile/components/molecules/valuation-card.tsx      ← Add/update JSDoc comments if needed
apps/mobile/components/molecules/confidence-warning.tsx  ← Verify JSDoc accuracy
```

**Mock constant patterns (add after existing MOCK_UNKNOWN_ITEM):**
```typescript
/** MEDIUM confidence scenario: moderate sample size, some variance */
export const MOCK_MEDIUM_CONFIDENCE_ITEM = createMockMarketData({
  confidence: 'MEDIUM',
  totalFound: 12,
  pricesAnalyzed: 12,
  fairMarketValue: 145,
  priceRange: { min: 95, max: 210 },
});

/** LOW confidence scenario: few sales, high uncertainty */
export const MOCK_LOW_CONFIDENCE_ITEM = createMockMarketData({
  confidence: 'LOW',
  totalFound: 3,
  pricesAnalyzed: 3,
  fairMarketValue: 55,
  priceRange: { min: 30, max: 85 },
});
```

---

## Dev Notes

### Confidence Messaging Matrix (Complete Reference)

| Level | Threshold | Price Typography | Caption | Warning | Signal Color | Verify Link |
|-------|-----------|-----------------|---------|---------|-------------|-------------|
| **HIGH** | ≥20 sales, <25% var, AI=HIGH, primary source | `font-bold` | "Based on N sales" | None | No | No |
| **MEDIUM** | 5-19 sales, <40% var (or fallback+penalty) | `font-normal` | "Based on N sales" | None | No | No |
| **LOW** | <5 sales OR >40% var OR AI=LOW | `font-normal` | "Limited data (N sales)" | Yes | Yes (#E53935) | Yes |
| **NONE** | Frontend-only (0 sales, error states) | `font-normal` | null | N/A | N/A | N/A |

### Backend ↔ Frontend Confidence Mapping

| Backend `market_confidence` | Backend `ai_only_flag` | Frontend `ConfidenceLevel` | Frontend Behavior |
|---|---|---|---|
| `"HIGH"` | `false` | `'HIGH'` | Bold price, "Based on N sales" |
| `"MEDIUM"` | `false` | `'MEDIUM'` | Regular price, "Based on N sales" |
| `"LOW"` | `false` | `'LOW'` | Regular price, "Limited data", Signal warning |
| `"LOW"` | `true` | Mapped to `'LOW'` or `'NONE'` | Depends on frontend mapping logic |

**Note:** The backend returns `Literal["HIGH", "MEDIUM", "LOW"]` (3 levels). The frontend defines `'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'` (4 levels). The `'NONE'` value is used for error/no-data states and is set by frontend mock data (`createMockMarketData()` returns `'NONE'` when status is not `'success'`).

### Backend Confidence Messages

| Condition | Message Format |
|---|---|
| AI_ONLY (total_found <3 or status ≠ success) | `"No market data available - AI estimate only"` |
| HIGH | `"Strong confidence based on {N} comparable sales with consistent pricing"` |
| MEDIUM (normal) | `"Moderate confidence based on {N} sales"` |
| MEDIUM (fallback source) | `"Moderate confidence based on {N} sales (broader search used)"` |
| LOW (with reasons) | `"Limited data ({reasons}) - consider manual verification"` |
| LOW (no specific reasons) | `"Limited data ({N} items) - consider manual verification"` |

LOW reasons include: `"only N comparable items found"`, `"high price variation (X%)"`, `"uncertain item identification"`.

### Architecture Compliance

**From [docs/architecture.md](../architecture.md):**
- Confidence calculation is a first-class service with isolated logic
- All valuation inputs logged for retroactive accuracy validation
- Confidence factors exposed in API responses for transparency

**From [docs/ux-design-specification.md](../ux-design-specification.md):**
- Typography weight (Bold/Regular/Light) instead of color for confidence levels
- HIGH = Bold, MEDIUM = Regular, LOW = Light/Regular — pure typographic hierarchy
- Confidence indicators must be "instantly scannable; LOW confidence should guide, not discourage"
- Signal color reserved for LOW confidence warning only (caution, not alarm)

**Implementation Note:** The UX spec mentions LOW = "Light" weight, but the implementation uses `font-normal` (Regular, 400). This is a deliberate deviation — `font-light` (300) can be hard to read on small screens and in varying font stacks. `font-normal` with "Limited data" caption + Signal color warning provides sufficient differentiation.

### Current Codebase Confidence Components

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| `getSampleSizeCaption()` | `valuation-card.tsx` | L83-98 | Returns level-specific caption text |
| `isHighConfidence` | `valuation-card.tsx` | L118-119 | Boolean for typography weight selection |
| `getVelocityCaption()` | `valuation-card.tsx` | L107-114 | Market velocity (Story 2.11 ready) |
| `ConfidenceWarning` | `confidence-warning.tsx` | L85-119 | LOW-only warning with verification link |
| `buildEbaySoldSearchUrl()` | `lib/utils/ebay-search.ts` | L49+ | Generates eBay sold search URL |
| `ConfidenceLevel` type | `types/market.ts` | L20 | `'HIGH' \| 'MEDIUM' \| 'LOW' \| 'NONE'` |

### Existing Test Infrastructure

**Playwright Screenshot Tests:** `apps/mobile/tests/screenshots.spec.ts`
- 6 confidence tests already exist (web + mobile viewports for HIGH/MEDIUM/LOW)
- Tests navigate to `/appraisal?confidence=X&...` and take full-page screenshots
- LOW confidence tests additionally assert "Limited market data" text visibility
- Screenshots stored in `apps/mobile/screenshots/`

**Backend Confidence Tests:** `backend/tests/test_confidence_service.py`
- 33 tests covering all confidence levels, thresholds, and edge cases (98% coverage)
- Integration tests in `backend/tests/integration/test_confidence_integration.py`
- 3 price range widening tests added in Story 2.9

### Mock Data for Testing

**Factory functions** in `apps/mobile/types/mocks.ts`:
- `createMockMarketData({ confidence: 'HIGH' })` — override any field
- `createMockMarketData({ confidence: 'MEDIUM', pricesAnalyzed: 12 })` — MEDIUM scenario
- `createMockMarketData({ confidence: 'LOW', pricesAnalyzed: 3 })` — LOW scenario

**Pre-built scenarios:**
- `MOCK_CANON_CAMERA` — HIGH confidence, 24 sales
- `MOCK_SONY_HEADPHONES` — HIGH confidence, 24 sales
- `MOCK_UNKNOWN_ITEM` — NONE confidence, no_data status

**Gap (addressed in Task 5.4):** No pre-built MEDIUM or LOW mock scenario constants. Task 5 adds `MOCK_MEDIUM_CONFIDENCE_ITEM` and `MOCK_LOW_CONFIDENCE_ITEM` to `mocks.ts`.

### Design Rationale

**Why Bold for HIGH Only:**
- Swiss design reserves bold for emphasis
- HIGH confidence data deserves emphasis (trustworthy, actionable)
- MEDIUM/LOW use regular weight to implicitly signal lower certainty

**Why Signal Color for LOW Only:**
- Signal color (#E53935) is the system's "attention" color
- Overuse would dilute its effectiveness
- LOW confidence is the only state requiring user awareness and action
- MEDIUM confidence is acceptable for most use cases — warning would create unnecessary anxiety

**Why "Limited data" Instead of "LOW confidence":**
- "Limited data" explains the cause, not just the label
- Users understand data scarcity; "LOW confidence" sounds like a judgment
- Pairing with sample count ("3 sales") makes it concrete

### Anti-patterns to Avoid

- ❌ **Don't add background fills** for any confidence level — typography and text color only
- ❌ **Don't use icons** (⚠️ warning triangles) — Swiss design is typography-driven
- ❌ **Don't center warning text** — Swiss design is flush-left
- ❌ **Don't show warnings for MEDIUM** — MEDIUM is acceptable, warnings would erode trust
- ❌ **Don't create new components** — existing ValuationCard + ConfidenceWarning cover all ACs
- ❌ **Don't modify confidence calculation logic** — backend is stable from Story 2.5

### Previous Story Intelligence

**From Story 2.9 (Handle Insufficient Market Data):**
- Backend price range widening added in `main.py` (post-confidence processing)
- ConfidenceWarning component created with Signal color + eBay verification link
- `buildEbaySoldSearchUrl()` already filters out "Unknown" brand/model values
- Integration in appraisal page confirmed working

**From Story 2.6 (Build ValuationCard Component):**
- `getSampleSizeCaption()` tested with all confidence levels
- `isHighConfidence` boolean drives `font-bold` vs `font-normal`
- ValuationCard is a pure display component (no side effects)

**Key Learning:** Story 2.10 is validation-focused. The developer should NOT write new features but instead verify the existing system works as documented. If gaps are found, implement targeted fixes.

---

## Acceptance Criteria Checklist

- [x] **AC1:** HIGH confidence displays correctly (bold price, "Based on N sales", no warning)
- [x] **AC2:** MEDIUM confidence displays correctly (regular price, "Based on N sales", no warning)
- [x] **AC3:** LOW confidence displays correctly (regular price, "Limited data", Signal warning, verify link)
- [x] **AC4:** All 6 screenshot tests pass (3 levels × 2 viewports)
- [x] **AC5:** Confidence messaging patterns documented in code and story artifact

---

## Definition of Done

- [x] All 6 Playwright screenshot tests pass
- [x] HIGH confidence validated (visual + functional)
- [x] MEDIUM confidence validated (visual + functional)
- [x] LOW confidence validated (visual + functional)
- [x] TSDoc inaccuracies fixed if found (e.g., MEDIUM "not used" comment)
- [x] Confidence messaging matrix documented (see Dev Notes above)
- [x] Design rationale captured (above)
- [x] Story document updated with validation results
- [x] No visual regressions detected
- [x] Code reviewed for Swiss design compliance

---

## Dependencies

**Depends On:**
- Story 2.5: Implement Confidence Calculation Service (✅ complete — backend logic)
- Story 2.6: Build ValuationCard Component (✅ complete — typography and captions)
- Story 2.9: Handle Insufficient Market Data (✅ complete — ConfidenceWarning + wider range)

**Blocks:**
- Story 2.11: Display Market Velocity Indicator (final Epic 2 story — `getVelocityCaption()` already exists in ValuationCard)

---

## Estimated Effort

**Total:** 1-1.5 hours

- Task 1: 15-20min (Run screenshot tests)
- Task 2: 10min (HIGH confidence validation)
- Task 3: 10min (MEDIUM confidence validation)
- Task 4: 10min (LOW confidence validation)
- Task 5: 20-30min (Documentation and TSDoc fixes)

---

## Notes

**Story Type:** Validation and documentation — not a feature story. Most implementation was completed in Stories 2.6 and 2.9. The main risk is visual regressions from iterative changes or TSDoc staleness.

**Design Philosophy Reminder:** Confidence indicators are **informational**, not **alarmist**. HIGH = trust, MEDIUM = reasonable, LOW = verify. This aligns with ValueSnap's transparent, user-first approach.

**Testing Tip:** Screenshot tests navigate to `/appraisal?confidence=X&...` which constructs mock data from URL params using `createMockMarketData()`. No backend is needed for screenshot tests.

---

## Dev Agent Record

### Agent Model Used

GitHub Copilot (Claude Opus 4.6)

### Completion Notes List

- Story created via exhaustive codebase analysis
- All existing components verified in place
- 6 Playwright screenshot tests already exist
- Primary work: validation, test execution, documentation
- **Validation Results (2026-03-10):**
  - All 14 Playwright tests pass (6 confidence + 8 general); 0 failures
  - 6 confidence screenshots freshly generated, no visual regressions detected
  - Backend: 110 passed, 3 failed (pre-existing cache test failures, not related to this story)
  - TypeScript: 0 errors (clean compilation)
- **Code Changes:**
  - Fixed inaccurate TSDoc in `types/market.ts` — MEDIUM was documented as "Not currently used by backend" but IS used
  - Updated ConfidenceLevel docs with accurate thresholds from `calculate_market_confidence()`
  - Added `MOCK_MEDIUM_CONFIDENCE_ITEM` and `MOCK_LOW_CONFIDENCE_ITEM` to `types/mocks.ts` for reuse in Story 2.11+
  - Added new mock exports to `types/index.ts` barrel
- **Existing JSDoc verified adequate:** `getSampleSizeCaption()`, `isHighConfidence`, `ConfidenceWarning` all have comprehensive documentation including confidence messaging tables

### Change Log

- 2026-03-10: Completed validation — all ACs satisfied, TSDoc fixed, mock constants added

### File List

**Verified (no changes):**
- `apps/mobile/components/molecules/valuation-card.tsx` — JSDoc already comprehensive
- `apps/mobile/components/molecules/confidence-warning.tsx` — JSDoc already comprehensive
- `apps/mobile/app/appraisal.tsx` — Integration verified working
- `apps/mobile/tests/screenshots.spec.ts` — All 14 tests pass
- `apps/mobile/screenshots/` — 6 confidence screenshots freshly generated

**Modified:**
- `apps/mobile/types/market.ts` — Fixed ConfidenceLevel TSDoc (MEDIUM IS used by backend)
- `apps/mobile/types/mocks.ts` — Added MOCK_MEDIUM_CONFIDENCE_ITEM, MOCK_LOW_CONFIDENCE_ITEM
- `apps/mobile/types/index.ts` — Added new mock exports to barrel
- `docs/sprint-artifacts/2-10-display-confidence-based-messaging.md` — Updated with validation results
- `docs/sprint-artifacts/sprint-status.yaml` — Status: ready-for-dev → in-progress → review
