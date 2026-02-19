# Story 2.9: Handle Insufficient Market Data

**Status:** complete

---

## Story

**As a** user,
**I want** to know when market data is limited,
**So that** I understand the valuation has higher uncertainty.

---

## Business Context

### Why This Story Matters

With Story 2.8 handling AI identification failures, users now need transparent feedback when market data exists but is insufficient for high-confidence valuations. This differs from AI failures—the item IS identified, but there aren't enough recent sales to provide a reliable price estimate.

**Insufficient Data Scenarios:**
- Rare/vintage items with few sales
- New products not yet in resale market
- Niche collectibles with low turnover
- Regional items with limited eBay listings

**Current State:**
- ✅ Backend confidence calculation with LOW threshold (< 5 sales)
- ✅ ValuationCard shows "Limited data (N sales)" for LOW confidence
- ✅ Confidence calculation includes sample size in factors
- ❌ No explicit guidance message for LOW confidence
- ❌ No visual differentiation for uncertainty
- ❌ No recommendation for manual verification

**What This Story Delivers:**
- Enhanced LOW confidence messaging in ValuationCard
- Visual indicator for uncertain valuations (Signal color accent)
- Guidance text recommending manual verification
- Wider price ranges automatically calculated by backend
- Clear explanation of why confidence is low

### Value Delivery

- **User Value:** Transparent about data limitations, manages expectations
- **Trust Building:** Honest about uncertainty builds credibility
- **Risk Mitigation:** Users know to verify before listing

### Epic Context

This is Story 9 of 11 in Epic 2 (AI Valuation Engine). It's the second error-handling/edge-case story ensuring users understand data quality limitations.

**Error/Edge Case Flow:**
1. **Story 2.8:** AI identification fails → Manual fallback
2. **Story 2.9:** Market data insufficient → LOW confidence with warnings
3. **Story 2.10:** Confidence-specific messaging → All confidence levels handled

---

## Acceptance Criteria

### AC1: Display LOW Confidence Indicator

**Given** a valuation with LOW confidence (< 5 sales)
**When** the ValuationCard is displayed
**Then** the confidence level shows as "LOW"
**And** the caption reads "Limited data (N sales)"
**And** the caption uses ink-muted color (not Signal color yet)
**And** sample size is clearly visible

---

### AC2: Show Guidance Message for LOW Confidence

**Given** a valuation with LOW confidence
**When** displayed on the Camera screen (full view)
**Then** a guidance message appears below the ValuationCard
**And** the message reads: "Limited market data. Consider manual verification."
**And** the message uses Signal color (#E53935) for emphasis
**And** the message uses body variant typography
**And** the message is flush-left (not centered)

---

### AC3: Wider Price Range for LOW Confidence

**Given** a valuation with LOW confidence
**When** the backend calculates the price range
**Then** the price range is wider to reflect uncertainty
**And** the range uses a larger multiplier (IQR * 2.0 instead of 1.5)
**And** the range calculation is logged with "LOW confidence, wider range"
**And** the fair market value may be null (range-only display)

---

### AC4: Manual Verification Link

**Given** a valuation with LOW confidence displayed with guidance
**When** the guidance message is shown
**Then** an optional "Verify on eBay" link is provided
**And** the link opens eBay sold search with item details pre-filled
**And** the link uses underlined text with ink color
**And** link has proper accessibility labels

---

### AC5: HIGH/MEDIUM Confidence No Warning

**Given** a valuation with HIGH or MEDIUM confidence
**When** the ValuationCard is displayed
**Then** NO guidance message appears
**And** NO Signal color accents are used
**And** the standard "Based on N sales" caption shows
**And** confidence-based typography weight is applied (AC from Story 2.6)

---

## Tasks / Subtasks

### Task 1: Update Backend Confidence Messaging (AC: #3)
**Estimated:** 30-45min

- [ ] 1.1: Review `backend/services/confidence.py` range calculation
- [ ] 1.2: Ensure LOW confidence uses wider IQR multiplier (2.0 vs 1.5)
- [ ] 1.3: Add logging for LOW confidence range calculation
- [ ] 1.4: Update `confidence_message` to include verification suggestion
- [ ] 1.5: Test with mock data (3 sales, high variance)

**Files to Modify:**
```
backend/services/confidence.py
backend/services/ebay.py (if range calculation lives there)
```

---

### Task 2: Create ConfidenceWarning Component (AC: #2, #4)
**Estimated:** 45min-1h

- [ ] 2.1: Create `apps/mobile/components/molecules/confidence-warning.tsx`
- [ ] 2.2: Props: `confidence: ConfidenceLevel`, `itemType?: string`
- [ ] 2.3: Show warning only for LOW confidence
- [ ] 2.4: Message: "Limited market data. Consider manual verification."
- [ ] 2.5: Use Signal color for text emphasis
- [ ] 2.6: Add optional "Verify on eBay" link with eBay sold search
- [ ] 2.7: Export from `components/molecules/index.ts`

**Files to Create:**
```
apps/mobile/components/molecules/confidence-warning.tsx
```

**Files to Modify:**
```
apps/mobile/components/molecules/index.ts
```

---

### Task 3: Integrate into Camera Screen (AC: #2, #4, #5)
**Estimated:** 30min

- [ ] 3.1: Update `apps/mobile/app/(tabs)/index.tsx`
- [ ] 3.2: Import ConfidenceWarning component
- [ ] 3.3: Display ConfidenceWarning below ValuationCard (in success state)
- [ ] 3.4: Pass confidence level from valuation response
- [ ] 3.5: Pass itemType for eBay search pre-fill
- [ ] 3.6: Test with HIGH/MEDIUM/LOW confidence mocks

**Files to Modify:**
```
apps/mobile/app/(tabs)/index.tsx
```

---

### Task 4: Update ValuationCard Display Logic (AC: #1)
**Estimated:** 15-30min

- [ ] 4.1: Review `apps/mobile/components/molecules/valuation-card.tsx`
- [ ] 4.2: Verify LOW confidence shows "Limited data (N sales)"
- [ ] 4.3: Verify typography weight for LOW confidence (regular, not bold)
- [ ] 4.4: Ensure caption is visible and readable
- [ ] 4.5: Test rendering with different sample sizes (1, 3, 5, 20)

**Files to Modify:**
```
apps/mobile/components/molecules/valuation-card.tsx (verify existing logic)
```

---

### Task 5: Testing & Validation (AC: #1-5)
**Estimated:** 30-45min

- [ ] 5.1: Test LOW confidence display (3 sales)
- [ ] 5.2: Test MEDIUM confidence display (8 sales, no warning)
- [ ] 5.3: Test HIGH confidence display (25 sales, no warning)
- [ ] 5.4: Test wider price range calculation for LOW
- [ ] 5.5: Test "Verify on eBay" link opens correct search
- [ ] 5.6: Screenshot test for LOW confidence warning
- [ ] 5.7: Verify accessibility (ARIA, color contrast)

**Files to Modify:**
```
apps/mobile/tests/screenshots.spec.ts (optional)
backend/tests/test_confidence_service.py (verify range calculation)
```

---

## Dev Notes

### Relevant Architecture Patterns

**From [docs/architecture.md](../architecture.md):**

#### Confidence-Based Display Strategy
- **HIGH:** Bold typography, no warnings
- **MEDIUM:** Regular typography, sample size visible
- **LOW:** Regular typography, Signal color guidance, verification link

#### Swiss Design for Warnings
- Use Signal color (#E53935) for caution, not decoration
- Typography-driven (no icons)
- Flush-left text (not centered)
- Brief, factual messaging

### Current Implementation Inventory

**Already Exists:**
- ✅ Backend confidence calculation with thresholds (Story 2.5)
- ✅ ValuationCard with LOW confidence caption (Story 2.6)
- ✅ Signal color token for warnings
- ✅ eBay search URL utilities (Story 2.8)

**Needs Implementation:**
- ❌ ConfidenceWarning component
- ❌ Integration into Camera screen success state
- ❌ Wider price range calculation for LOW confidence
- ❌ Verification link with eBay sold search

### Design Specifications

**ConfidenceWarning Component Structure:**
```tsx
{confidence === 'LOW' && (
  <Stack gap={2} className="w-full max-w-sm mt-4">
    {/* Warning message - Signal color for emphasis */}
    <Text variant="body" className="text-signal">
      Limited market data. Consider manual verification.
    </Text>
    
    {/* Verification link - optional */}
    <SwissPressable 
      onPress={() => openUrl(buildEbaySoldSearchUrl(itemType))}
      accessibilityLabel="Verify sold prices on eBay"
      accessibilityRole="link"
    >
      <Text variant="body" className="text-ink underline">
        Verify on eBay
      </Text>
    </SwissPressable>
  </Stack>
)}
```

**Backend Range Calculation (Wider for LOW):**
```python
# backend/services/confidence.py or ebay.py
def calculate_price_range(prices: list, confidence: str) -> PriceRange:
    q1, q3 = np.percentile(prices, [25, 75])
    iqr = q3 - q1
    
    # Wider range for LOW confidence (more uncertainty)
    multiplier = 2.0 if confidence == "LOW" else 1.5
    
    min_price = max(0, q1 - (iqr * multiplier))
    max_price = q3 + (iqr * multiplier)
    
    if confidence == "LOW":
        logger.info(f"LOW confidence: wider range multiplier {multiplier}x")
    
    return PriceRange(min=min_price, max=max_price)
```

**Integration in Camera Screen:**
```tsx
{/* Success state: ValuationCard + confidence warning */}
{valuation && (
  <Stack gap={0} className="w-full max-w-sm">
    <ValuationCard
      itemDetails={valuation.identity}
      marketData={valuation.valuation}
      imageUri={photoUri}
    />
    <ConfidenceWarning
      confidence={valuation.valuation.confidence}
      itemType={valuation.identity.itemType}
    />
  </Stack>
)}
```

### Testing Strategy

**Manual Testing Checklist:**
- [ ] Trigger LOW confidence (mock 3 sales with high variance)
- [ ] Trigger MEDIUM confidence (mock 8 sales) - no warning shown
- [ ] Trigger HIGH confidence (mock 25 sales) - no warning shown
- [ ] Test "Verify on eBay" link opens sold search
- [ ] Test wider price range for LOW confidence
- [ ] Test Signal color contrast ratio (4.5:1 minimum)
- [ ] Test accessibility: screen reader announces warning

**Backend Tests:**
```python
# backend/tests/test_confidence_service.py
def test_low_confidence_wider_range():
    """LOW confidence should use 2.0x IQR multiplier."""
    prices = [100, 110, 120]  # Small sample
    result = calculate_confidence(prices, ai_confidence="HIGH")
    
    assert result.market_confidence == "LOW"
    assert result.price_range.max - result.price_range.min > 50
    # Verify wider range than MEDIUM would produce
```

### Previous Story Intelligence

**From Story 2.6 (ValuationCard):**
- getSampleSizeCaption() already handles LOW vs MEDIUM/HIGH
- "Limited data (N sales)" text exists for LOW
- Typography weight already confidence-based

**From Story 2.8 (Error Handling):**
- buildEbaySearchUrl() utility exists
- SwissPressable patterns for links
- Signal color usage patterns

**Integration Point:**
ConfidenceWarning appears BELOW ValuationCard, not inside it. This separates data display (card) from guidance (warning).

### User Psychology

**Managing Uncertainty:**
- **Don't hide limitations:** Transparency builds trust
- **Offer verification:** Give users control to validate
- **Explain "why":** "Limited data" is clearer than just "LOW"
- **Use color intentionally:** Signal color = caution, not error

**Confidence Level Spectrum:**
- **HIGH (20+ sales):** "Trust this" → Bold typography, no warnings
- **MEDIUM (5-19 sales):** "Reasonable estimate" → Regular typography
- **LOW (< 5 sales):** "Verify this" → Signal color, verification link

---

## Acceptance Criteria Checklist

- [ ] **AC1:** LOW confidence displays "Limited data (N sales)"
- [ ] **AC2:** Guidance message appears for LOW confidence (Signal color)
- [ ] **AC3:** Wider price range for LOW confidence (2.0x IQR)
- [ ] **AC4:** "Verify on eBay" link for manual verification
- [ ] **AC5:** HIGH/MEDIUM confidence shows no warning

---

## Definition of Done

- [ ] Backend confidence range calculation verified (wider for LOW)
- [ ] ConfidenceWarning component created
- [ ] Camera screen integrated with warning
- [ ] Verification link working (opens eBay sold search)
- [ ] ValuationCard LOW confidence display verified
- [ ] Screenshot tests capture LOW confidence state
- [ ] Accessibility verified (color contrast, ARIA)
- [ ] Story document updated with implementation notes
- [ ] Code reviewed for Swiss design compliance
- [ ] Merged to main branch

---

## Dependencies

**Depends On:**
- Story 2.6: Build ValuationCard Component (✅ complete)
- Story 2.8: Handle AI Identification Failures (✅ complete - eBay search utilities)
- Story 2.5: Implement Confidence Calculation Service (backend logic exists)

**Blocks:**
- Story 2.10: Display Confidence-Based Messaging (extends this work)

---

## Estimated Effort

**Total:** 2-3 hours

- Task 1: 30-45min (Backend confidence messaging)
- Task 2: 45min-1h (ConfidenceWarning component)
- Task 3: 30min (Camera screen integration)
- Task 4: 15-30min (ValuationCard verification)
- Task 5: 30-45min (Testing & validation)

---

## Notes

**Design Principle:** Uncertainty is not failure. LOW confidence is a valid outcome that deserves clear communication, not alarmism. Signal color indicates "caution" (verify this), not "error" (something broke).

**Swiss Design for Warnings:** Signal color is used sparingly—only for text that requires user attention. No background fills, no icons, just typography with intentional color.

**Price Range Strategy:** Wider ranges for LOW confidence reflect statistical reality—fewer data points = more uncertainty. This prevents false precision ("$245 FMV" when we only have 3 sales).

**Verification Empowerment:** The "Verify on eBay" link gives users agency. If they're skeptical, they can check themselves. This builds trust more than hiding the option.

**Future Enhancement (Phase 2):** Add "Request more data" button that triggers a broader eBay search (e.g., expand date range, include international listings). For MVP, manual verification is sufficient.

---

Next Story: 2-10 (Display Confidence-Based Messaging)
