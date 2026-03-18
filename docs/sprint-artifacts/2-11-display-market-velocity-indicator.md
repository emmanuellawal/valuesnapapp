# Story 2.11: Display Market Velocity Indicator

**Status:** done

---

## Story

**As a** user,
**I want** to see how quickly similar items sell,
**So that** I can set realistic expectations for my listing.

---

## Business Context

### Why This Story Matters

Price alone is incomplete. A $249 camera that sells in 3 days is a very different proposition from a $55 art print that sits for 6 weeks. Velocity completes the valuation picture and closes out Epic 2.

**Current State:**
- ✅ Backend mock: `avg_days_to_sell` calculated via triangular distribution (3–45 days, seeded by keywords hash) — all success scenarios, NO data scenarios omit it
- ✅ Frontend type: `avgDaysToSell?: number` in `MarketData` interface
- ✅ Frontend transformer: `avgDaysToSell: raw.avg_days_to_sell` in `transformMarketData()`
- ✅ Mock factory: `createMockMarketData()` defaults to `avgDaysToSell: 7` for success status
- ✅ ValuationCard: `getVelocityCaption()` implemented, rendering below sample size caption
- ✅ History tab: mock items have realistic values (5, 14, 38 days)
- ❌ Appraisal page: does NOT accept `avgDaysToSell` URL param — cannot test velocity-absent via screenshot
- ❌ No dedicated velocity Playwright screenshot tests

**Delivers:** Add `avgDaysToSell` URL param to appraisal page + 4 velocity screenshot tests (present/absent × web/mobile). Closes Epic 2.

### Epic Context

Story 11 of 11 in Epic 2 (AI Valuation Engine). After this story, Epic 2 is done. Epic 3 (History & Persistence) begins.

---

## Acceptance Criteria

### AC1: Velocity Caption Correct (Validation)

**Given** a `MarketData` object with `avgDaysToSell` set to 14
**When** `ValuationCard` renders
**Then** caption reads "Sells in ~14 days"
**And** uses `caption` variant with `text-ink-muted` color
**And** appears below the sample size caption

**Given** `avgDaysToSell` is 38
**Then** caption reads "Slow mover"

**Validation:** `getVelocityCaption()` already implemented. Verify via code inspection + screenshot test.

---

### AC2: Velocity Hidden When Absent (Validation)

**Given** a `MarketData` object where `avgDaysToSell` is undefined or null
**When** `ValuationCard` renders
**Then** no velocity caption appears
**And** layout is not affected (no empty gap)

**Validation:** Null-check already in `getVelocityCaption()`. Verify via "velocity absent" screenshot test. 

---

### AC3: No Velocity for Non-Success Status (Validation)

**Given** a `MarketData` object with `status !== 'success'`
**When** `ValuationCard` renders
**Then** no velocity caption appears regardless of any `avgDaysToSell` value

**Validation:** Status check already in `getVelocityCaption()`. Existing behavior.

---

### AC4: Appraisal Page Supports `avgDaysToSell` URL Param (Feature)

**Given** the appraisal page at `/appraisal?avgDaysToSell=14`
**When** rendered
**Then** `ValuationCard` shows "Sells in ~14 days"

**Given** `/appraisal?avgDaysToSell=0` (zero = explicit absent)
**Then** no velocity caption shown

**Implementation:** Add `avgDaysToSell?: string` to `useLocalSearchParams` and wire to `createMockMarketData()`.
- If param is present and `> 0` → use `Number(params.avgDaysToSell)`
- If param is `"0"` or absent → omit from mock (pass `undefined`) so velocity is hidden

---

### AC5: Screenshot Tests Added for Velocity

**Given** the Playwright screenshot test suite
**When** tests are executed
**Then** 4 new velocity tests exist and pass:
  - `web - Velocity present` (avgDaysToSell=14, asserts "Sells in" text)
  - `web - Velocity absent` (avgDaysToSell=0, asserts "Sells in" NOT present)
  - `mobile - Velocity present`
  - `mobile - Velocity absent`

---

## Tasks / Subtasks

### Task 1: Add `avgDaysToSell` URL Param to Appraisal Page (AC: #4)
**Estimated:** 10min

- [x] 1.1: Add `avgDaysToSell?: string` to the `useLocalSearchParams` type in `apps/mobile/app/appraisal.tsx`
- [x] 1.2: In the `createMockMarketData()` call, add:
  ```typescript
  avgDaysToSell: params.avgDaysToSell && Number(params.avgDaysToSell) > 0
    ? Number(params.avgDaysToSell)
    : undefined,
  ```
- [x] 1.3: Verify `/appraisal?avgDaysToSell=14` shows "Sells in ~14 days" in ValuationCard
- [x] 1.4: Verify `/appraisal?avgDaysToSell=0` shows no velocity caption

**Files:**
```
apps/mobile/app/appraisal.tsx
```

**Key Constraint:** The `createMockMarketData()` factory was updated to use `'avgDaysToSell' in overrides` check instead of `?? 7`, so explicitly passing `undefined` now correctly omits velocity (rather than defaulting to 7). The appraisal page wrapper also has `testID="appraisal-valuation"` for scoped test assertions.

---

### Task 2: Add Velocity Screenshot Tests (AC: #5)
**Estimated:** 15min

- [x] 2.1: Add 4 velocity tests to `apps/mobile/tests/screenshots.spec.ts` in the Web section and Mobile section
- [x] 2.2: "Velocity present": navigate to `/appraisal?confidence=HIGH&pricesAnalyzed=24&fairMarketValue=249&avgDaysToSell=21` and assert "Sells in ~21 days" text visible
- [x] 2.3: "Velocity absent": navigate to `/appraisal?confidence=HIGH&pricesAnalyzed=24&fairMarketValue=249&avgDaysToSell=0` and assert "Sells in" NOT visible within `appraisal-valuation` testID
- [x] 2.4: Take screenshots for both (4 total: web + mobile for each)
- [x] 2.5: Run tests — verify all pass

**Files:**
```
apps/mobile/tests/screenshots.spec.ts
apps/mobile/screenshots/  ← 4 new PNGs
```

**Test Template (web section, add after existing confidence LOW test):**
```typescript
// Velocity tests (Story 2.11)
test('web - Velocity present', async ({ page }) => {
  await page.goto('/appraisal?confidence=HIGH&pricesAnalyzed=24&fairMarketValue=249&brand=Canon&model=AE-1&avgDaysToSell=14');
  await waitForAppReady(page);
  await page.getByRole('heading', { name: 'Appraisal report' }).waitFor({ timeout: 15000 });
  await page.getByText('Sells in').waitFor({ timeout: 5000 });
  await page.screenshot({
    path: path.join(screenshotsDir, 'web-velocity-present.png'),
    fullPage: true,
  });
});

test('web - Velocity absent', async ({ page }) => {
  await page.goto('/appraisal?confidence=HIGH&pricesAnalyzed=24&fairMarketValue=249&brand=Canon&model=AE-1&avgDaysToSell=0');
  await waitForAppReady(page);
  await page.getByRole('heading', { name: 'Appraisal report' }).waitFor({ timeout: 15000 });
  await expect(page.getByText('Sells in')).not.toBeVisible();
  await page.screenshot({
    path: path.join(screenshotsDir, 'web-velocity-absent.png'),
    fullPage: true,
  });
});
```
Duplicate both tests in the mobile section with `mobile-velocity-present.png` / `mobile-velocity-absent.png`.

---

### Task 3: Run Full Screenshot Suite (AC: #1–5 Validation)
**Estimated:** 10min

- [x] 3.1: Run `npx playwright test tests/screenshots.spec.ts --reporter=list` (auto-starts server)
- [x] 3.2: Verify all 18 tests pass (14 existing + 4 new velocity tests)
- [x] 3.3: Manually inspect `web-velocity-present.png` — confirm "Sells in ~21 days" caption visible
- [x] 3.4: Manually inspect `web-velocity-absent.png` — confirm no velocity text visible
- [x] 3.5: Check existing appraisal screenshots — "Sells in ~7 days" now appears (mock default)

**Command:**
```bash
cd apps/mobile
npx playwright test tests/screenshots.spec.ts --reporter=list
```

---

## Dev Notes

### What's Already Done — Do NOT Re-Implement

| Component | File | Status |
|-----------|------|--------|
| Backend `avg_days_to_sell` calculation | `backend/services/mocks/mock_ebay.py` | ✅ Done |
| `avgDaysToSell?: number` in MarketData | `apps/mobile/types/market.ts` | ✅ Done |
| `avg_days_to_sell?: number` in RawMarketData | `apps/mobile/types/transformers.ts` | ✅ Done |
| `avgDaysToSell: raw.avg_days_to_sell` mapping | `apps/mobile/types/transformers.ts` L178 | ✅ Done |
| `avgDaysToSell: 7` default in mock factory | `apps/mobile/types/mocks.ts` L90 | ✅ Done |
| `getVelocityCaption()` in ValuationCard | `apps/mobile/components/molecules/valuation-card.tsx` L107–117 | ✅ Done |
| Velocity rendered in ValuationCard | `apps/mobile/components/molecules/valuation-card.tsx` L166–170 | ✅ Done |
| History mock items with velocity values | `apps/mobile/app/(tabs)/history.tsx` L40/68/92 | ✅ Done |

### Velocity Caption Logic (Already Implemented)

```typescript
// From valuation-card.tsx L107–117
function getVelocityCaption(market: MarketData): string | null {
  if (market.status !== 'success' || market.avgDaysToSell == null) {
    return null;
  }
  if (market.avgDaysToSell > 30) {
    return 'Slow mover';
  }
  return `Sells in ~${market.avgDaysToSell} days`;
}
```

### Backend Velocity Distribution

All success scenarios use seeded triangular distribution:
```python
rng = random.Random(int(digest[:8], 16))
# HIGH confidence: fast sellers
avg_days = round(rng.triangular(3, 14, 7))
# LOW confidence: slow sellers
avg_days = round(rng.triangular(15, 45, 30))
# MEDIUM/LIMITED: medium velocity
avg_days = round(rng.triangular(7, 30, 14))
```
Same keywords → same days (deterministic). `no_data` / `no_prices` responses omit `avg_days_to_sell`.

### Appraisal Page URL Param Contract

**Current params accepted** (from `useLocalSearchParams`):
- `imageUri`, `brand`, `model`, `itemType`, `fairMarketValue`, `priceMin`, `priceMax`, `confidence`, `pricesAnalyzed`

**After Task 1:**
- `avgDaysToSell` added — `"0"` or absent = no velocity; positive number = shows velocity

**appraisal.tsx mock construction pattern:**
```typescript
const REPORT_MARKET = createMockMarketData({
  keywords: `${params.brand || 'Canon'} ${params.model || 'AE-1'}`,
  totalFound: Number(params.pricesAnalyzed) || 24,
  pricesAnalyzed: Number(params.pricesAnalyzed) || 24,
  priceRange: { min: Number(params.priceMin) || 150, max: Number(params.priceMax) || 350 },
  fairMarketValue: Number(params.fairMarketValue) || 249,
  mean: Number(params.fairMarketValue) || 262,
  stdDev: 41,
  confidence: (params.confidence as ConfidenceLevel) || 'HIGH',
  // ← add avgDaysToSell here (Task 1)
});
```

### Mock Data Defaults for Velocity

- `createMockMarketData()` success defaults: `avgDaysToSell: 7`
- This means ALL existing appraisal screenshots will now show "Sells in ~7 days" after this story
- This is expected and correct — not a regression

### Velocity Display Styling

- Typography: `caption` variant
- Color: `text-ink-muted`
- Position: below `sampleSizeCaption`, above nothing (last caption in the stack)
- ❌ No icons — Swiss design typography-only
- ❌ No color differentiation — velocity is informational, not alarmist
- ❌ No new components — existing `Text` caption in ValuationCard

### Screenshot Test Placement

Tests should be added in pairs at the end of each describe block:
- Web section: after `web - Confidence LOW` test (~line 107)
- Mobile section: after `mobile - Confidence LOW` test (~line 195)

**Total tests after this story: 18** (14 existing + 4 new)

### Previous Story Intelligence

**From Story 2.10 (Confidence messaging validation):**
- `MOCK_MEDIUM_CONFIDENCE_ITEM` and `MOCK_LOW_CONFIDENCE_ITEM` added to `mocks.ts`
- Both have `avgDaysToSell` set (from mock factory default of 7) — no changes needed
- Screenshot test infrastructure confirmed working, Playwright auto-starts on port 8083

**From Story 2.9 (Insufficient market data):**
- `ConfidenceWarning` renders for LOW confidence below `ValuationCard`
- Velocity caption renders INSIDE `ValuationCard`, not conflicting with `ConfidenceWarning`

### Anti-patterns to Avoid

- ❌ **Don't change `getVelocityCaption()`** — already correctly implemented
- ❌ **Don't add `avgDaysToSell` to `no_data` backend responses** — already correctly omitted
- ❌ **Don't add velocity-specific color** — use `text-ink-muted` same as other captions
- ❌ **Don't add a "fast/slow" semantic indicator component** — text only per Swiss design
- ❌ **Don't skip the `avgDaysToSell=0` absent test** — it validates the null-guard in `getVelocityCaption()`

---

## Acceptance Criteria Checklist

- [x] **AC1:** Velocity caption correct — "Sells in ~N days" for ≤30, "Slow mover" for >30
- [x] **AC2:** Velocity hidden when `avgDaysToSell` absent
- [x] **AC3:** No velocity for non-success status
- [x] **AC4:** Appraisal page accepts `avgDaysToSell` URL param
- [x] **AC5:** 4 velocity screenshot tests added and passing

---

## Definition of Done

- [x] `avgDaysToSell` URL param working in appraisal page
- [x] 4 velocity Playwright tests added
- [x] All 18 screenshot tests pass (14 existing + 4 new)
- [x] `web-velocity-present.png` and `web-velocity-absent.png` screenshots correct
- [x] TypeScript compiles without errors
- [x] Story marked complete in story file
- [x] Epic 2 complete — all 11 stories done

---

## Dependencies

**Depends On:**
- Story 2.6: ValuationCard component (✅ complete)
- Story 2.10: Confidence messaging validated (✅ complete) — screenshot infrastructure confirmed working

**Blocks:**
- Epic 2 closure
- Epic 3: History & Persistence (can begin after this story — `avgDaysToSell` values already in history.tsx mock)

---

## Estimated Effort

**Total:** ~30–40 minutes (most is already done)

- Task 1: 10min — add URL param to appraisal.tsx (trivial)
- Task 2: 15min — add 4 screenshot tests
- Task 3: 10min — run tests, inspect outputs

---

## Notes

**Story Type:** Small feature + validation. Only 2 files need new code: `appraisal.tsx` (1 param) and `screenshots.spec.ts` (4 tests). Everything else is already done.

**Epic 2 Close-out:** After this story, all 11 Epic 2 stories are complete. Update `epic-2` status in sprint-status.yaml to `done` as part of the DoD.

**Next Epic:** Epic 3 — History & Persistence. Story 3.1 (Valuations Database Schema) is first.

---

## Dev Agent Record

### Agent Model Used

GitHub Copilot (Claude Sonnet 4.6)

### Completion Notes List

_To be filled during implementation_

### Change Log

_To be filled during implementation_

### File List

**To Modify:**
- `apps/mobile/app/appraisal.tsx` — Add `avgDaysToSell` URL param
- `apps/mobile/tests/screenshots.spec.ts` — Add 4 velocity tests

**To Verify (no changes expected):**
- `apps/mobile/components/molecules/valuation-card.tsx` — `getVelocityCaption()` already correct
- `apps/mobile/types/market.ts` — `avgDaysToSell` already present
- `apps/mobile/types/transformers.ts` — Mapping already present
- `backend/services/mocks/mock_ebay.py` — `avg_days_to_sell` already calculated
