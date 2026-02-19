# Story 2.11: Display Market Velocity Indicator

**Status:** complete

---

## Story

**As a** user,
**I want** to see how quickly similar items sell,
**So that** I can set realistic expectations for my listing.

---

## Business Context

### Why This Story Matters

A fair price only helps the user if they also know how long they'll wait for a sale. A $249 camera that sells in 3 days is a very different proposition from a $55 art print that sits for 6 weeks. Market velocity completes the valuation picture.

**Current Gap:**
- ✅ Price estimate displayed (Story 2.6)
- ✅ Confidence level shown (Story 2.6, 2.10)
- ❌ No indication of how quickly item sells
- ❌ No `avgDaysToSell` field in backend or frontend types

**What This Story Delivers:**
- `avg_days_to_sell` field added to mock eBay service response
- `avgDaysToSell` field added to `MarketData` TypeScript type
- Velocity label derived from days value:
  - ≤7 days → `"Sells in ~N days"`
  - 8–30 days → `"Sells in ~N days"`
  - >30 days → `"Slow mover"`
  - null / absent → no velocity shown
- Velocity caption shown in `ValuationCard` below the sample size caption

### Velocity Label Logic

| `avgDaysToSell` | Display Text        |
|-----------------|---------------------|
| 1–7             | "Sells in ~N days"  |
| 8–30            | "Sells in ~N days"  |
| >30             | "Slow mover"        |
| null / absent   | (nothing shown)     |

### Epic Context

This is Story 11 of 11 in Epic 2 (AI Valuation Engine). Completing it closes out Epic 2.

---

## Acceptance Criteria

### AC1: Backend Mock Returns `avg_days_to_sell`

**Given** the mock eBay service
**When** `search_sold_listings()` returns a `success` response
**Then** the response includes an `avg_days_to_sell` integer field
**And** the value is deterministic (seeded by keywords hash, same as prices)
**And** the value is absent (null or omitted) for `no_data` / `no_prices` responses

---

### AC2: Frontend Type Includes `avgDaysToSell`

**Given** the `MarketData` TypeScript interface
**When** a successful market response is received
**Then** `avgDaysToSell?: number` is present in the type
**And** the transformer maps `avg_days_to_sell` → `avgDaysToSell`
**And** the mock factory `createMockMarketData()` supports an optional `avgDaysToSell` override

---

### AC3: ValuationCard Shows Velocity Caption

**Given** a `MarketData` object with `avgDaysToSell` set
**When** `ValuationCard` renders
**Then** a velocity caption appears below the sample size caption
**And** the text reads "Sells in ~N days" for ≤30 days
**And** the text reads "Slow mover" for >30 days
**And** uses the same `caption` variant and `text-ink-muted` color as adjacent captions

---

### AC4: Velocity Hidden When Data Absent

**Given** a `MarketData` object where `avgDaysToSell` is undefined or null
**When** `ValuationCard` renders
**Then** no velocity caption appears
**And** layout is not affected (no empty gap)

---

### AC5: Screenshot Tests Updated

**Given** the screenshot test suite
**When** tests run
**Then** existing appraisal screenshots now include velocity text
**And** a dedicated "velocity absent" screenshot confirms graceful hide

---

## Tasks / Subtasks

### Task 1: Backend — add `avg_days_to_sell` to mock response (AC: #1)
**Estimated:** 15min

- [ ] 1.1: In `backend/services/mocks/mock_ebay.py` `_summary()`, add `avg_days_to_sell`
- [ ] 1.2: Derive the value deterministically from the existing RNG seed already used for prices
- [ ] 1.3: Range: triangular distribution between 3–45 days
- [ ] 1.4: Round to nearest integer
- [ ] 1.5: Omit from `no_data` / `no_prices` / `error` branches

**Files:**
```
backend/services/mocks/mock_ebay.py
```

---

### Task 2: Frontend types + transformer (AC: #2)
**Estimated:** 15min

- [ ] 2.1: Add `avgDaysToSell?: number` to `MarketData` interface in `types/market.ts`
- [ ] 2.2: Add `avg_days_to_sell?: number` to `RawMarketData` in `types/transformers.ts`
- [ ] 2.3: Map field in `transformMarketData()` transformer
- [ ] 2.4: Add optional `avgDaysToSell` override to `createMockMarketData()` factory
- [ ] 2.5: Update mock HISTORY items: set realistic values (canon ~5 days, art print ~38 days)

**Files:**
```
apps/mobile/types/market.ts
apps/mobile/types/transformers.ts
apps/mobile/types/mocks.ts
```

---

### Task 3: ValuationCard velocity caption (AC: #3, #4)
**Estimated:** 20min

- [ ] 3.1: Add `getVelocityCaption(market: MarketData): string | null` helper
- [ ] 3.2: Returns "Sells in ~N days" for `avgDaysToSell` 1–30
- [ ] 3.3: Returns "Slow mover" for `>30`
- [ ] 3.4: Returns `null` when `avgDaysToSell` is absent
- [ ] 3.5: Render caption below `sampleSizeCaption` using `caption` variant + `text-ink-muted`
- [ ] 3.6: Conditional render — skip when `velocityCaption` is null

**Files:**
```
apps/mobile/components/molecules/valuation-card.tsx
```

---

### Task 4: Screenshot tests (AC: #5)
**Estimated:** 15min

- [ ] 4.1: Re-run existing screenshot suite (appraisal screenshots now include velocity)
- [ ] 4.2: Add one new test: "web - Velocity absent" using `confidence=NONE` (no velocity text)
- [ ] 4.3: Verify all tests pass

**Files:**
```
apps/mobile/tests/screenshots.spec.ts
```

---

## Dev Notes

### Backend Approach

The existing mock uses a seeded `random.Random(hash)` for price generation. Reuse the same RNG to generate `avg_days_to_sell` with a triangular distribution:

```python
avg_days_to_sell = round(rng.triangular(3, 45, 12))  # mode: 12 days
```

This ensures:
- Same keywords → same days (deterministic)
- Realistic skew toward lower values (most items sell reasonably fast)
- Fixed variation across test items

### Frontend Velocity Helper

```typescript
function getVelocityCaption(market: MarketData): string | null {
  if (market.status !== 'success' || !market.avgDaysToSell) return null;
  if (market.avgDaysToSell > 30) return 'Slow mover';
  return `Sells in ~${market.avgDaysToSell} days`;
}
```

### Design

- Same `caption` typography variant as existing captions
- `text-ink-muted` color (same as range/sample captions)
- No icons — typography-only per Swiss design
- No color differentiation (velocity is informational, not alarmist)

---

## Acceptance Criteria Checklist

- [ ] **AC1:** Mock eBay returns `avg_days_to_sell` on success
- [ ] **AC2:** `avgDaysToSell` in type + transformer + mock factory
- [ ] **AC3:** ValuationCard shows velocity caption
- [ ] **AC4:** Velocity hidden gracefully when absent
- [ ] **AC5:** Screenshots updated and passing

---

## Definition of Done

- [ ] Backend mock returns `avg_days_to_sell`
- [ ] TypeScript types updated and transformer mapped
- [ ] ValuationCard renders velocity caption
- [ ] Velocity hidden when data absent (no layout shift)
- [ ] All screenshot tests passing
- [ ] TypeScript compiles without errors
- [ ] Story marked complete

---

## Dependencies

**Depends On:**
- Story 2.6: ValuationCard component (✅ complete)
- Story 2.10: Confidence messaging validated (✅ complete)

**Blocks:**
- Epic 2 closure (this is the final Epic 2 story)
- Epic 3 can begin after this story

---

## Estimated Effort

**Total:** ~1 hour

- Task 1: 15min (backend mock)
- Task 2: 15min (types + transformer)
- Task 3: 20min (ValuationCard caption)
- Task 4: 15min (screenshots)

---

## Notes

**Story Type:** Feature — new field through full stack (backend → type → transformer → component).

**Scope discipline:** This story adds exactly one field (`avg_days_to_sell`) and one caption. No new components, no new colors, no new routing. The full implementation fits in 4 focused files.

**After this story:** Epic 2 is complete. All 11 stories done. Move to Epic 3 (History & Persistence).
