# Plan: Accurate "Sell Fast" & "Sell Highest" Prices in the AI Report

> **Author:** Engineering research spike
> **Status:** Proposal (no code written yet)
> **Scope:** Backend valuation math + API contract + frontend report display for two *generated* strategy prices — **Sell Fast** and **Sell Highest** — plus the accuracy work required to make those numbers trustworthy.

---

## 0. TL;DR (Read This First)

The report currently shows a **Fair Market Value** (median) and a raw **price range** (`min`–`max`). It does **not** produce a "Sell Fast" or "Sell Highest" price at all — those are a new feature.

We can generate them cleanly with percentile math (Sell Fast ≈ p25, Sell Highest ≈ p75/p90). That part is straightforward and low-risk.

**The hard truth:** the numbers will only be as accurate as the data feeding them, and the data source has a fundamental defect:

- `backend/services/ebay.py::search_sold_listings()` is **misnamed**. It calls the eBay **Browse API**, which returns **active listings (asking prices)**, not completed/sold prices. See `docs/analysis/ebay-sold-data.md`.
- Asking prices are biased **upward** and include items that **never sell**. Any "Sell Highest" derived from asking prices will be optimistic, and "Sell Fast" will be less reliable than it looks.
- The only clean source of true sold prices is eBay's **Marketplace Insights API**, which per eBay's own developer questionnaire **"cannot be granted upon request"** and is gated to select partners. The old **Finding API `findCompletedItems`** was **decommissioned on Feb 5, 2025** — it is not an option.

So: **generating the two prices = easy and worth doing now.** **Making them genuinely accurate = blocked on a data-source decision that is partly outside our control.** This plan does both: it ships the feature honestly on the data we have, and it lays out exactly what "accurate" requires and the tradeoffs of each path.

---

## 1. What "accurate Sell Fast / Sell Highest" actually means

These are **strategy prices**, not a single point estimate:

| Price | User intent | Statistical definition (proposed) |
|-------|-------------|-----------------------------------|
| **Sell Fast** | "List it low enough that it moves quickly." | Low percentile of comparable sold prices — **p25** (configurable) |
| **Fair Market Value** | "What is it realistically worth?" | Median — **p50** (already exists as `fair_market_value`) |
| **Sell Highest** | "Squeeze the most out of it, accept a slower sale." | High percentile — **p75** default, **p90** aggressive (configurable) |

Why percentiles and not `min`/`max`:

- The current range uses `min(clean_prices)` and `max(clean_prices)`. Even after IQR filtering, `min` is often a broken / for-parts / incomplete unit and `max` is an overpriced listing that will never sell. Anchoring "Sell Fast" to `min` tells the user to give the item away; anchoring "Sell Highest" to `max` sets a price that never converts.
- Percentiles (p25/p75/p90) are robust, describe realistic outcomes, and degrade gracefully with small samples.

**Definition of "accurate" for this feature:** the generated prices reflect the distribution of *what comparable items in comparable condition actually transact for*, with the report honestly disclosing when the data is too thin or too biased to trust.

---

## 2. Current pipeline (as-is)

```
Image
  │
  ▼
services/ai.py  ── GPT-4o-mini (Visual Detective ONLY, no pricing)
  │    → ItemIdentity { brand, model, item_type, visual_condition, search_keywords, ai_identification_confidence }
  ▼
services/ebay.py::search_sold_listings()   ⚠️ actually Browse API = ACTIVE listings
  │    IQR outlier filter → returns:
  │    { price_range:{min,max}, fair_market_value(median), mean, std_dev, variance_pct, prices_analyzed }
  ▼
services/confidence.py::calculate_market_confidence()  → HIGH / MEDIUM / LOW (+ ai_only_flag)
  │
  ▼
main.py::appraise_item()  → { identity, valuation, confidence, valuation_id }
  │    (Step 3.5: widens price_range ±50% when confidence == LOW)
  ▼
models.py::ValuationRecord  → persists price_min, price_max, fair_market_value to Supabase
  ▼
Frontend: types/transformers.ts → types/market.ts (MarketData)
  │
  ▼
components/molecules/valuation-card.tsx  → shows fairMarketValue + "Range: $min – $max"
app/appraisal.tsx                        → "Summary" table (Range row)
app/listing/[id].tsx + organisms/listing-form.tsx → pre-fills listing price with fairMarketValue
```

**Key files & exact touch-points:**

- `backend/services/ebay.py` (lines ~355–378): where `price_range`, `fair_market_value`, `mean`, `std_dev` are computed from `clean_prices`. **This is where p25/p75/p90 must be added** — `clean_prices` (the raw filtered list) exists here and is discarded after summary. This is the single most important insertion point.
- `backend/services/mocks/mock_ebay.py::_summary()` (lines ~114–128): mock must mirror any new fields or the mock-mode UI and tests diverge from prod.
- `backend/models.py::ValuationRecord` + `from_appraise_response()`: to persist the two new prices.
- `backend/main.py` Step 3.5 (lines ~156–170): the LOW-confidence range-widening must be reconciled with the new strategy prices.
- `apps/mobile/types/market.ts` + `types/transformers.ts`: add `sellFastPrice` / `sellHighestPrice` to `MarketData` and map `snake_case → camelCase`.
- `apps/mobile/components/molecules/valuation-card.tsx` + `app/appraisal.tsx`: render the two prices.

---

## 3. Root causes of inaccuracy (ranked by impact)

1. **Active-listing data, not sold data (CRITICAL).** Browse API returns asking prices. These over-state real value and include zombie listings that never sell. This caps the achievable accuracy of *both* strategy prices regardless of how good our math is.
2. **No condition matching (HIGH).** GPT produces `visual_condition` (new / used_excellent / … / damaged) but the eBay query **ignores it**. A "damaged" item is priced against "new" comps and vice versa. Condition is one of the largest price determinants — this alone can throw a valuation off by 2–5×.
3. **`min`/`max` used as the range (HIGH for this feature).** Naive extremes make naive strategy prices. Percentiles fix this.
4. **No sale-recency window (MEDIUM).** No 90-day filter. Stale/aspirational listings pollute the sample. (Browse can't fully fix this — it has no "sold date" — but recency-of-listing and buying-option filters help.)
5. **Single-marketplace / single-currency, keyword-only match (MEDIUM).** `EBAY_US` + `q=keywords` with no category constraint invites off-target comps (accessories, lots, wrong variant).
6. **Confidence doesn't gate the strategy spread (LOW-MEDIUM).** When data is thin, Sell Fast and Sell Highest should visibly converge/widen and be labeled as estimates, not presented as precise.

---

## 4. Target design

### 4.1 New backend fields (eBay service output)

Add to the `status == "success"` dict returned by `_fetch_ebay_listings()` (and the mock's `_summary()`):

```jsonc
{
  // existing …
  "price_range": { "min": 150.0, "max": 350.0 },
  "fair_market_value": 249.0,          // p50 (unchanged)
  // NEW:
  "sell_fast_price": 205.0,            // p25 of clean_prices
  "sell_highest_price": 312.0,         // p75 (or p90) of clean_prices
  "percentiles": { "p25": 205.0, "p50": 249.0, "p75": 312.0, "p90": 338.0 },
  "pricing_basis": "active_listings"   // honesty flag: "active_listings" | "sold" (future)
}
```

Implementation sketch in `ebay.py` (right after `clean_prices` is finalized):

```python
p25, p50, p75, p90 = np.percentile(clean_prices, [25, 50, 75, 90])
sell_highest = p90 if settings.sell_highest_aggressive else p75
result.update({
    "sell_fast_price": round(float(p25), 2),
    "sell_highest_price": round(float(sell_highest), 2),
    "percentiles": {k: round(float(v), 2) for k, v in
                    zip(("p25", "p50", "p75", "p90"), (p25, p50, p75, p90))},
    "pricing_basis": "active_listings",
})
```

Guardrails:
- Enforce ordering `sell_fast ≤ fair_market_value ≤ sell_highest`.
- With `< 4` prices IQR is skipped; with `< 3` prices we are already in `ai_only`/`no_data` territory — in that case **do not emit strategy prices**, emit `null` and let the UI show "not enough data".
- Percentile knobs (`p25`/`p75`/`p90`, aggressive toggle) live in `config.py`/env so they can be tuned without a redeploy of logic.

### 4.2 Condition-aware querying (accuracy lever #2)

Map `ItemIdentity.visual_condition` → eBay Browse `filter=conditions:{...}` (Browse supports `conditionIds`/`conditions`). Example mapping:

| `visual_condition` | eBay condition filter |
|--------------------|-----------------------|
| `new`              | `NEW` (1000/1500)     |
| `used_excellent`   | `USED` + top used IDs (2750/3000) |
| `used_good`        | `USED` (3000/4000)    |
| `used_fair`        | `USED` (4000/5000)    |
| `damaged`          | `FOR_PARTS_OR_NOT_WORKING` (7000) |

- Also add `buyingOptions:{FIXED_PRICE}` (auctions distort price/velocity) and keep `deliveryCountry:US,priceCurrency:USD`.
- **Fallback interaction:** the existing broadening fallback (`_extract_fallback_keywords`) should be allowed to *also* relax the condition filter as a second-tier fallback when a condition-scoped search returns `< 5` comps. Track this in `data_source` so confidence can penalize it.

### 4.3 Confidence gates the spread + labels (accuracy lever #6)

- `HIGH`: show all three prices as-is.
- `MEDIUM`: show all three, add caption "Estimated from N comparable listings."
- `LOW` / `ai_only`: **collapse** Sell Fast/Sell Highest into a single "rough estimate" band and label prominently as low-confidence. Reconcile with `main.py` Step 3.5 — instead of blindly widening `min`/`max` by ±50%, widen the *percentile band* and mark `pricing_basis`/confidence accordingly.

### 4.4 API contract → frontend

- `main.py` already returns `valuation` verbatim, so new fields flow through automatically. No endpoint signature change.
- `apps/mobile/types/market.ts`: add `sellFastPrice?: number; sellHighestPrice?: number; percentiles?: {...}; pricingBasis?: 'active_listings' | 'sold';`
- `apps/mobile/types/transformers.ts::transformMarketData()`: map the snake_case fields; guard with the same defensive parsing used elsewhere.
- `models.py::ValuationRecord`: add `sell_fast_price` / `sell_highest_price` and persist (new nullable columns → migration `003_add_strategy_prices.sql`). History detail can then show the strategy prices retroactively.

### 4.5 UI (the "report")

- `valuation-card.tsx`: below Fair Market Value, add a two-item row — **"Sell fast $X"** and **"Sell highest $Y"** — using the existing Swiss/typographic hierarchy (Sell Fast in muted weight, Sell Highest bold only on HIGH confidence).
- `app/appraisal.tsx` Summary table: add "Sell fast" and "Sell highest" rows alongside the existing "Range".
- Optional: link **Sell Fast** to the velocity signal (`avgDaysToSell`) already rendered — "Sell fast $X · ~7 days".
- `listing-form.tsx` currently pre-fills price with `fairMarketValue`. Consider defaulting the listing price to **Sell Fast** (moves inventory) while surfacing Sell Highest as an alternative — but that's a product call, flagged, not assumed.

---

## 5. The data-source decision (the real accuracy bottleneck)

| Option | True sold data? | Access reality (verified) | Integration cost | Recommendation |
|--------|-----------------|---------------------------|------------------|----------------|
| **A. Keep Browse API (active listings)** | ❌ No — asking prices | ✅ Already have it | None (default) | **Ship the feature on this now**, label `pricing_basis: "active_listings"`, apply a documented downward calibration heuristic (see below). |
| **B. Marketplace Insights API** | ✅ Yes — real `lastSoldPrice` | ⚠️ **Gated. eBay: "cannot be granted upon request."** Approval restricted to select partners. | Significant: new OAuth scope `buy.marketplace.insights`, new client, response mapping, confidence recalibration. | **Apply for access in parallel.** This is the only path to *genuinely* accurate prices. Gate behind `settings.pricing_source == "insights"` so we can flip it on if/when granted. |
| **C. Finding API `findCompletedItems`** | ✅ (historically) | ❌ **Decommissioned Feb 5, 2025.** Dead. | N/A | **Do not pursue.** `docs/analysis/ebay-sold-data.md` Option 1 is now obsolete — update that doc. |
| **D. Scraping sold listings** | ✅ Yes | ❌ Violates eBay ToS; brittle; legal/ban risk | High + ongoing maintenance | **Reject** for a production product. Note only as a known "grey" option. |

**Calibration heuristic for Option A (interim honesty measure):** sold prices on eBay typically land *below* asking. Applying a fixed factor (e.g. `sold ≈ 0.85–0.90 × asking`) is a **guess, not a measurement** — do NOT present it as precise. If we use it, make it a single tunable constant, disclose it in the report copy ("estimated from active listings"), and treat calibrating that constant as its own task once any sold sample exists (even a manual one).

---

## 6. Implementation phases

**Phase 1 — Ship the feature on current data (low risk, high value)**
1. Add p25/p75/p90 + `sell_fast_price`/`sell_highest_price`/`pricing_basis` to `ebay.py` and `mock_ebay.py`. Enforce ordering + small-sample guards.
2. Add config knobs to `config.py` (percentile choices, aggressive toggle, optional calibration factor default = 1.0 / off).
3. Extend `MarketData` type + `transformMarketData()`.
4. Render both prices in `valuation-card.tsx` and `appraisal.tsx`, with confidence-based labeling.
5. Tests: `test_ebay_market_data.py`, `test_mock_ebay.py`, `transformers.test.ts`, `valuation-card` / `listing-screen` snapshots.

**Phase 2 — Condition-aware accuracy (medium risk)**
6. Add `visual_condition → eBay condition filter` mapping; wire into `_fetch_ebay_listings`.
7. Extend fallback to relax condition as second tier; reflect in `data_source`/confidence.
8. Persist strategy prices (`ValuationRecord` + migration `003`).

**Phase 3 — Real sold data (blocked on eBay approval)**
9. Apply for Marketplace Insights API access.
10. Behind `settings.pricing_source`, add an Insights client; map `itemSales[].lastSoldPrice`; recompute percentiles on true sold data; set `pricing_basis: "sold"`.
11. Recalibrate confidence thresholds against real sold variance.
12. Rename `search_sold_listings()` honestly (it lies today) and update `docs/analysis/ebay-sold-data.md`.

---

## 7. Acceptance criteria

- Report shows **Sell Fast**, **Fair Market Value**, and **Sell Highest**, always satisfying `fast ≤ fair ≤ highest`.
- With `< 3` comps: no strategy prices; explicit "not enough data" state.
- `LOW`/`ai_only` valuations visibly label the prices as low-confidence estimates.
- Every response carries `pricing_basis` so the UI never implies "sold" accuracy while on Browse data.
- Mock mode and prod return the **same field shape** (mock parity enforced by tests).
- No regression in existing confidence, caching, or persistence tests.

---

## 8. Brutal-honesty section (per how I want this framed)

**Doable? How?**
Yes — the *generation* of Sell Fast / Sell Highest is genuinely easy and safe: it's percentile math over a list (`clean_prices`) we already compute and currently throw away. Phase 1 is a contained change across ~6 files with clear test seams. Condition-aware querying (Phase 2) is a real accuracy win and fully within our control via existing Browse filters.

**Not fully accurate? Why?**
Because "accurate" for resale prices means *sold* prices, and we're standing on *asking* prices. No amount of percentile cleverness converts asking data into sold data. That's a data-source limitation, not a math limitation. Marketplace Insights is the fix and eBay explicitly says it "cannot be granted upon request" — so I will not promise true accuracy on a timeline that depends on eBay's approval committee.

**Alternatives?**
Option A (ship now, labeled + calibrated) is the pragmatic default. Option B (Insights) is the correct long-term answer — apply now, wire behind a flag. Option C (Finding API) is dead. Option D (scraping) is a ToS/ban/legal liability I recommend against for anything user-facing.

**Where I might be wrong / open questions:**
- The p25/p75 vs p90 choice is a **product judgment**, not a fact. p90 "Sell Highest" reads great but converts slowly; if the app's promise is "actually sells," p75 is safer. Needs a decision (I defaulted to p75, aggressive p90 behind a flag).
- The `0.85–0.90 × asking` calibration is a **placeholder guess**. It could be materially off per category (electronics depreciate differently than collectibles). Treat it as untrusted until we have even a small real sold sample to fit it.
- Defaulting the listing form to Sell Fast vs Fair Market Value changes seller behavior — I flagged it rather than deciding it.
- eBay Browse condition filters and category constraints need live verification against the actual credentials (sandbox behavior differs); the spike in `ebay-sold-data.md` never had live console access, and neither did this one.
