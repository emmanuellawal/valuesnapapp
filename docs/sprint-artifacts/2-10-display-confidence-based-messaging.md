# Story 2.10: Display Confidence-Based Messaging

**Status:** complete

---

## Story

**As a** user,
**I want** appropriate messaging based on confidence level,
**So that** I know how to interpret the valuation.

---

## Business Context

### Why This Story Matters

This story consolidates and validates the confidence-based messaging work completed across Stories 2.6, 2.8, and 2.9. It ensures all three confidence levels (HIGH, MEDIUM, LOW) have appropriate visual treatments and messaging that guide users to interpret valuations correctly.

**Current State:**
- ✅ Story 2.6: HIGH confidence uses bold typography
- ✅ Story 2.6: MEDIUM/LOW use regular typography
- ✅ Story 2.6: Sample size captions ("Based on N sales" vs "Limited data")
- ✅ Story 2.9: LOW confidence shows Signal color warning
- ✅ Story 2.9: ConfidenceWarning component with verification link
- ❌ No comprehensive validation across all confidence levels
- ❌ No consistent messaging guidelines documented

**What This Story Delivers:**
- Validation that all three confidence levels display correctly
- Screenshot tests for HIGH, MEDIUM, and LOW states
- Documentation of confidence-based messaging patterns
- Minor refinements if gaps are found

### Value Delivery

- **User Value:** Consistent, predictable confidence indicators
- **Developer Value:** Clear patterns for future confidence features
- **Quality Assurance:** Comprehensive testing of edge cases

### Epic Context

This is Story 10 of 11 in Epic 2 (AI Valuation Engine). It's a **validation and documentation story** that consolidates prior work rather than building new features.

**Confidence Messaging Evolution:**
1. **Story 2.6:** Built ValuationCard with typography-based confidence
2. **Story 2.8:** Added error handling for AI failures
3. **Story 2.9:** Added LOW confidence warning with verification
4. **Story 2.10:** Validate and document complete system

---

## Acceptance Criteria

### AC1: HIGH Confidence Display (Validation)

**Given** a valuation with HIGH confidence (≥20 sales, <25% variance)
**When** displayed in ValuationCard
**Then** the price uses bold typography (font-bold)
**And** NO warning message appears below the card
**And** the caption reads "Based on N sales"
**And** NO Signal color is used

**Validation:** Already implemented in Story 2.6. Verify only.

---

### AC2: MEDIUM Confidence Display (Validation)

**Given** a valuation with MEDIUM confidence (5-19 sales, 25-40% variance)
**When** displayed in ValuationCard
**Then** the price uses regular typography (font-normal)
**And** NO warning message appears below the card
**And** the caption reads "Based on N sales"
**And** NO Signal color is used

**Validation:** Already implemented in Story 2.6. Verify only.

---

### AC3: LOW Confidence Display (Validation)

**Given** a valuation with LOW confidence (<5 sales or >40% variance)
**When** displayed in ValuationCard
**Then** the price uses regular typography (font-normal)
**And** the caption reads "Limited data (N sales)"
**And** a Signal color warning appears below the card
**And** the warning reads "Limited market data. Consider manual verification."
**And** a "Verify on eBay" link is provided

**Validation:** Already implemented in Stories 2.6 + 2.9. Verify only.

---

### AC4: Screenshot Tests for All Confidence Levels

**Given** the screenshot test suite
**When** tests are run
**Then** HIGH confidence screenshot exists and passes
**And** MEDIUM confidence screenshot exists and passes
**And** LOW confidence screenshot exists and passes
**And** tests cover both web and mobile viewports

---

### AC5: Confidence Messaging Documentation

**Given** the codebase
**When** documentation is reviewed
**Then** confidence-based messaging patterns are documented
**And** ValuationCard's confidence logic is well-commented
**And** ConfidenceWarning's conditional display is clear
**And** design rationale is captured in story artifacts

---

## Tasks / Subtasks

### Task 1: Validate HIGH Confidence Display (AC: #1)
**Estimated:** 15min

- [ ] 1.1: Create mock data with HIGH confidence (25 sales, 20% variance)
- [ ] 1.2: Render ValuationCard in Camera screen
- [ ] 1.3: Verify bold typography on price
- [ ] 1.4: Verify "Based on 25 sales" caption
- [ ] 1.5: Verify NO ConfidenceWarning appears
- [ ] 1.6: Visual inspection of spacing and alignment

**Files to Verify:**
```
apps/mobile/components/molecules/valuation-card.tsx
apps/mobile/app/(tabs)/index.tsx
```

---

### Task 2: Validate MEDIUM Confidence Display (AC: #2)
**Estimated:** 15min

- [ ] 2.1: Create mock data with MEDIUM confidence (10 sales, 30% variance)
- [ ] 2.2: Render ValuationCard in Camera screen
- [ ] 2.3: Verify regular typography on price
- [ ] 2.4: Verify "Based on 10 sales" caption
- [ ] 2.5: Verify NO ConfidenceWarning appears
- [ ] 2.6: Visual inspection of spacing and alignment

**Files to Verify:**
```
apps/mobile/components/molecules/valuation-card.tsx
apps/mobile/app/(tabs)/index.tsx
```

---

### Task 3: Validate LOW Confidence Display (AC: #3)
**Estimated:** 15min

- [ ] 3.1: Create mock data with LOW confidence (3 sales, 50% variance)
- [ ] 3.2: Render ValuationCard + ConfidenceWarning in Camera screen
- [ ] 3.3: Verify regular typography on price
- [ ] 3.4: Verify "Limited data (3 sales)" caption
- [ ] 3.5: Verify Signal color warning appears below card
- [ ] 3.6: Verify "Verify on eBay" link works
- [ ] 3.7: Visual inspection of Signal color contrast ratio (4.5:1)

**Files to Verify:**
```
apps/mobile/components/molecules/valuation-card.tsx
apps/mobile/components/molecules/confidence-warning.tsx
apps/mobile/app/appraisal.tsx
```

---

### Task 4: Create Screenshot Tests (AC: #4)
**Estimated:** 30-45min

- [ ] 4.1: Add HIGH confidence test to `screenshots.spec.ts`
- [ ] 4.2: Add MEDIUM confidence test to `screenshots.spec.ts`
- [ ] 4.3: Add LOW confidence test to `screenshots.spec.ts`
- [ ] 4.4: Run tests for web desktop viewport
- [ ] 4.5: Run tests for mobile viewport
- [ ] 4.6: Verify all tests pass
- [ ] 4.7: Update snapshots if needed

**Files to Modify:**
```
apps/mobile/tests/screenshots.spec.ts
```

---

### Task 5: Document Confidence Messaging Patterns (AC: #5)
**Estimated:** 30min

- [ ] 5.1: Add comprehensive comments to ValuationCard confidence logic
- [ ] 5.2: Document ConfidenceWarning conditional display
- [ ] 5.3: Update story artifacts with implementation notes
- [ ] 5.4: Create summary table of confidence levels and treatments
- [ ] 5.5: Document design rationale (Swiss typography patterns)

**Files to Modify:**
```
apps/mobile/components/molecules/valuation-card.tsx
apps/mobile/components/molecules/confidence-warning.tsx
docs/sprint-artifacts/2-10-display-confidence-based-messaging.md
```

---

## Dev Notes

### Confidence Messaging Matrix

| Confidence | Typography | Caption | Warning | Verify Link | Signal Color |
|------------|-----------|---------|---------|-------------|--------------|
| **HIGH** (≥20 sales, <25% var) | **Bold** | "Based on N sales" | None | None | None |
| **MEDIUM** (5-19 sales, 25-40% var) | Regular | "Based on N sales" | None | None | None |
| **LOW** (<5 sales, >40% var) | Regular | "Limited data (N sales)" | Yes | Yes | Yes |

### Current Implementation Status

**Already Implemented:**
- ✅ ValuationCard typography weight (Story 2.6)
- ✅ ValuationCard caption logic (Story 2.6)
- ✅ ConfidenceWarning component (Story 2.9)
- ✅ Signal color warning message (Story 2.9)
- ✅ eBay verification link (Story 2.9)

**This Story's Work:**
- 🔍 Validation and testing
- 📝 Documentation and comments
- 📸 Screenshot tests

### Testing Strategy

**Manual Testing Checklist:**
- [ ] HIGH confidence: Bold price, "Based on 25 sales", no warning
- [ ] MEDIUM confidence: Regular price, "Based on 10 sales", no warning
- [ ] LOW confidence: Regular price, "Limited data (3 sales)", Signal warning, verify link
- [ ] Edge case: NONE confidence (0 sales) - should show appropriate error
- [ ] Typography contrast ratios meet WCAG AA (4.5:1)
- [ ] Signal color contrast ratio meets WCAG AA (4.5:1)

**Screenshot Test Structure:**
```typescript
test('Confidence Levels - HIGH', async ({ page }) => {
  await page.goto('/');
  // Trigger HIGH confidence valuation
  await page.screenshot({ path: 'screenshots/confidence-high-web.png' });
  expect(screenshot).toMatchSnapshot();
});

test('Confidence Levels - MEDIUM', async ({ page }) => {
  await page.goto('/');
  // Trigger MEDIUM confidence valuation
  await page.screenshot({ path: 'screenshots/confidence-medium-web.png' });
  expect(screenshot).toMatchSnapshot();
});

test('Confidence Levels - LOW', async ({ page }) => {
  await page.goto('/');
  // Trigger LOW confidence valuation
  await page.screenshot({ path: 'screenshots/confidence-low-web.png' });
  expect(screenshot).toMatchSnapshot();
});
```

### Previous Story Intelligence

**From Story 2.6 (ValuationCard):**
- `isHighConfidence` determines typography weight
- `getSampleSizeCaption()` handles LOW vs MEDIUM/HIGH captions
- Component is production-ready, just needs validation

**From Story 2.9 (ConfidenceWarning):**
- Only renders for LOW confidence
- Returns `null` for HIGH/MEDIUM
- Signal color used intentionally for caution

**Integration is complete.** This story validates the system works as designed.

### Design Rationale

**Why Bold for HIGH Only:**
- Swiss design reserves bold for emphasis
- HIGH confidence deserves emphasis (trustworthy data)
- MEDIUM/LOW use regular to signal caution without alarm

**Why Signal Color for LOW Only:**
- Signal color (#E53935) is reserved for user attention
- Overuse dilutes its effectiveness
- LOW confidence requires user awareness (verify before listing)

**Why No Warning for MEDIUM:**
- MEDIUM confidence is acceptable for most use cases
- Sample size caption provides sufficient context
- Warning would create unnecessary anxiety

---

## Acceptance Criteria Checklist

- [ ] **AC1:** HIGH confidence displays correctly (bold, no warning)
- [ ] **AC2:** MEDIUM confidence displays correctly (regular, no warning)
- [ ] **AC3:** LOW confidence displays correctly (regular, Signal warning, verify link)
- [ ] **AC4:** Screenshot tests for all three levels
- [ ] **AC5:** Confidence messaging patterns documented

---

## Definition of Done

- [ ] HIGH confidence validated (visual + functional)
- [ ] MEDIUM confidence validated (visual + functional)
- [ ] LOW confidence validated (visual + functional)
- [ ] Screenshot tests created for all three levels
- [ ] All tests passing (Playwright screenshots)
- [ ] Code comments added for clarity
- [ ] Design rationale documented
- [ ] Story document updated with validation results
- [ ] No visual regressions detected
- [ ] Merged to main branch

---

## Dependencies

**Depends On:**
- Story 2.6: Build ValuationCard Component (✅ complete)
- Story 2.9: Handle Insufficient Market Data (✅ complete)

**Blocks:**
- Story 2.11: Display Market Velocity Indicator (final Epic 2 story)

---

## Estimated Effort

**Total:** 1.5-2 hours

- Task 1: 15min (HIGH validation)
- Task 2: 15min (MEDIUM validation)
- Task 3: 15min (LOW validation)
- Task 4: 30-45min (Screenshot tests)
- Task 5: 30min (Documentation)

---

## Notes

**Story Type:** This is a **validation and documentation story**, not a feature story. Most implementation is complete from prior stories. The value here is ensuring consistency, catching edge cases, and documenting patterns for future developers.

**Why This Story Exists:** In Agile, it's common to have consolidation stories that validate work across multiple prior stories. This ensures no gaps exist in the user experience and provides a checkpoint before moving to the next epic.

**Minimal New Code:** If validation reveals gaps, small patches may be needed. But the expectation is that Stories 2.6 and 2.9 completed the implementation correctly.

**Design Philosophy Reminder:** Confidence indicators are **informational**, not **alarmist**. HIGH = trust, MEDIUM = reasonable, LOW = verify. This aligns with ValueSnap's transparent, user-first approach.

**Future Enhancement (Phase 2):** Add tooltips or expandable sections that explain how confidence is calculated (sample size + variance + AI confidence). For MVP, current messaging is sufficient.

---

Next Story: 2-11 (Display Market Velocity Indicator)
