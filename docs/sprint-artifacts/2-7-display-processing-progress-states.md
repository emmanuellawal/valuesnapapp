# Story 2.7: Display Processing Progress States

**Status:** complete

---

## Story

**As a** user,
**I want** to see progress while my item is being valued,
**So that** I know the app is working and roughly how long to wait.

---

## Business Context

### Why This Story Matters

With the ValuationCard component validated (Story 2-6) and the backend valuation pipeline complete (Stories 2-1 through 2-5), users now need visual feedback during the AI processing phase. Without progress indicators, users may think the app has frozen or failed, leading to premature abandonment.

**Current State:**
- ✅ Backend `/api/appraise` endpoint functional
- ✅ ValuationCardSkeleton exists with shimmer animation
- ✅ Camera screen has basic "Analyzing your item..." text
- ❌ No progressive stage updates ("Identifying...", "Finding market data...")
- ❌ No estimated time remaining indicator
- ❌ No visual feedback during different processing stages

**What This Story Delivers:**
- Multi-stage progress indicators that match backend processing flow
- Typography-based feedback (Swiss Minimalist, no spinners/progress bars)
- ValuationCardSkeleton integration for "where result will appear" context
- Target <10 second total processing time visibility

### Value Delivery

- **User Value:** Confidence that the app is working, not stuck or broken
- **Trust Building:** Transparency about what's happening builds trust in AI processing
- **Reduced Abandonment:** Users wait longer when they see progress

### Epic Context

This is Story 7 of 11 in Epic 2 (AI Valuation Engine). It bridges the gap between photo capture (Story 1-6 from Epic 1) and result display (Story 2-6).

**Processing Flow (Backend):**
1. **Photo Upload** → Image sent to `/api/appraise`
2. **AI Identification** → GPT-4o-mini analyzes image (Story 2-2) - ~3-5 seconds
3. **Market Data Lookup** → eBay API search (Story 2-4) - ~2-4 seconds
4. **Confidence Calculation** → Statistical analysis (Story 2-5) - <1 second
5. **Result Display** → ValuationCard shown (Story 2-6)

**Frontend must reflect these stages visually.**

---

## Acceptance Criteria

### AC1: Typography-Based Progress Indicator with Minimal Progress Bar

**Given** a photo has been submitted for valuation
**When** processing begins
**Then** typography-based progress is shown ("Analyzing...")
**And** a minimal 1px horizontal progress bar is displayed (beneficial violation)
**And** stage text uses h3 variant (20px, bold) with ink color
**And** step counter uses caption variant (12px) with ink-muted color
**And** no spinners or circular progress bars are used

**Design Note:** The 1px progress bar is an accepted violation of pure Swiss design, justified by:
- Reduces perceived wait time by 35%
- Horizontal line aligns with Swiss geometric principles
- No rounded corners or decorative elements
- Improves user confidence that processing is happening

---

### AC2: Multi-Stage Progress Updates

**Given** the valuation is processing
**When** each backend stage completes
**Then** progress text updates to reflect current stage:
- Stage 1: "Analyzing photo..." (0-3s)
- Stage 2: "Identifying item..." (3-5s)
- Stage 3: "Finding market data..." (5-8s)
- Stage 4: "Calculating value..." (8-10s)

**And** transitions between stages are smooth (no jarring jumps)
**And** if processing completes faster than stage timing, skip ahead appropriately

---

### AC3: Skeleton Loader Visibility

**Given** processing has started
**When** progress is shown
**Then** ValuationCardSkeleton is displayed below progress text
**And** skeleton shows where the result will appear
**And** skeleton has shimmer animation (already implemented)
**And** skeleton uses Swiss design (no shadows, no border-radius)

---

### AC4: Total Processing Time Target

**Given** a typical valuation request
**When** processing completes
**Then** total time from submit to result is <10 seconds
**And** progress indicators remain visible for the full duration
**And** if processing exceeds 10 seconds, final stage text changes to "Almost done..."

---

## Tasks / Subtasks

### Task 1: Create ProgressIndicator Component (AC: #1, #2)
**Estimated:** 1-1.5h | **Actual:** 45min

- [x] 1.1: Create `apps/mobile/components/molecules/progress-indicator.tsx`
- [x] 1.2: Define ProgressStage type (`'analyzing' | 'identifying' | 'market_data' | 'calculating'`)
- [x] 1.3: Map stage to display text
- [x] 1.4: Display stage text (h3 variant, bold)
- [x] 1.5: Display step counter ("Step X of 4", caption variant, muted)
- [x] 1.6: Add 1px horizontal progress bar (width based on stage progress %)
- [x] 1.7: Props: `stage: ProgressStage`, `progress: number` (0-100)
- [x] 1.8: Export from `components/molecules/index.ts`

**Files to Create:**
```
apps/mobile/components/molecules/progress-indicator.tsx
```

**Files to Modify:**
```  
apps/mobile/components/molecules/index.ts
```

---

### Task 2: Implement Stage Timing Logic (AC: #2, #4)
**Estimated:** 1h | **Actual:** 30min

- [x] 2.1: Create `apps/mobile/lib/hooks/useProgressStages.ts`
- [x] 2.2: Hook manages stage transitions based on elapsed time
- [x] 2.3: Stage timings: analyzing (0-3s), identifying (3-5s), market_data (5-8s), calculating (8-10s)
- [x] 2.4: If processing completes early, jump to final stage
- [x] 2.5: If exceeds 10s, show "Almost done..." override
- [x] 2.6: Return current stage and elapsed time

**Files to Create:**
```
apps/mobile/lib/hooks/useProgressStages.ts
apps/mobile/lib/hooks/index.ts (if doesn't exist)
```

---

### Task 3: Integrate into Camera Screen (AC: #1, #2, #3)
**Estimated:** 30-45min | **Actual:** 15min

- [x] 3.1: Update `apps/mobile/app/(tabs)/index.tsx`
- [x] 3.2: Replace simple "Analyzing your item..." with ProgressIndicator
- [x] 3.3: Use `useProgressStages` hook when `isProcessing === true`
- [x] 3.4: Display ProgressIndicator + ValuationCardSkeleton together
- [x] 3.5: Pass current stage to ProgressIndicator
- [x] 3.6: Stop progress when valuation completes

**Files to Modify:**
```
apps/mobile/app/(tabs)/index.tsx
```

---

### Task 4: Testing & Validation (AC: #1, #2, #3, #4)
**Estimated:** 30min | **Actual:** 15min

- [x] 4.1: Test fast completion (<3s) - ensure stages don't linger ✅
- [x] 4.2: Test slow completion (8-10s) - ensure all stages show ✅
- [x] 4.3: Test timeout (>10s) - verify "Almost done..." appears ✅
- [x] 4.4: Screenshot test for progress UI (8/8 passed) ✅
- [x] 4.5: Verify ValuationCardSkeleton displays alongside progress text ✅

**Files to Modify:**
```
apps/mobile/tests/screenshots.spec.ts (optional screenshot test)
```

---

## Dev Notes

### Relevant Architecture Patterns

**From [docs/architecture.md](../architecture.md):**

#### Swiss Minimalist Progress Patterns
- **NO spinners, circular progress, or animated icons**
- **Typography-driven feedback**: Text changes convey progress
- **Subtle shimmer animations**: ValuationCardSkeleton already implements this
- **White space as indicator**: Progress text + skeleton loader with generous spacing

#### Processing Stages (Backend Reality)

**Backend Flow (from Story 2-1):**
```python
# backend/main.py /api/appraise endpoint
async def appraise_item(request: AnalyzeRequest):
    # Stage 1: AI Identification (3-5s typical, Story 2-2)
    identity = await identify_item_from_image(request.image_base64)
    
    # Stage 2: Market Data (2-4s typical, Story 2-4)
    market_data = await search_sold_listings(search_query, item_type=identity.item_type)
    
    # Stage 3: Confidence Calculation (<1s, Story 2-5)
    confidence_result = calculate_market_confidence(market_data, identity.ai_identification_confidence)
    
    # Stage 4: Response assembly
    return {
        "identity": identity.model_dump(),
        "valuation": market_data,
        "confidence": confidence_result.to_dict(),
    }
```

**Frontend Stage Mapping:**
- **"Analyzing photo..."** → Initial state, upload in progress
- **"Identifying item..."** → AI identification (GPT-4o-mini)
- **"Finding market data..."** → eBay API search
- **"Calculating value..."** → Confidence + range calculation

**Note:** Frontend cannot reliably detect when backend transitions between actual stages (no streaming response). Therefore, use **time-based stage simulation** that approximates backend timing.

### Current Implementation Inventory

**Already Exists:**
- ✅ `ValuationCardSkeleton` with shimmer animation
- ✅ Basic "Analyzing your item..." text in Camera screen
- ✅ `isProcessing` state management in Camera screen

**Needs Implementation:**
- ❌ `ProgressIndicator` component
- ❌ `useProgressStages` hook for stage timing
- ❌ Multi-stage progress text updates

### Design Specifications

**Component Structure (Swiss-Informed with Beneficial Violations):**
```tsx
<Stack gap={2}>
  {/* Stage text - Swiss typography */}
  <Text variant="h3" className="font-bold">
    {stageText}
  </Text>
  
  {/* Minimal progress bar - Beneficial violation */}
  <View className="h-[1px] bg-divider w-full">
    <View 
      className="h-full bg-ink transition-all duration-300"
      style={{ width: `${progress}%` }}
    />
  </View>
  
  {/* Step counter - Swiss typography */}
  <Text variant="caption" className="text-ink-muted">
    Step {currentStep} of 4
  </Text>
</Stack>
```

**Stage Text Mapping:**
```typescript
const STAGE_TEXT: Record<ProgressStage, string> = {
  analyzing: "Analyzing photo...",
  identifying: "Identifying item...",
  market_data: "Finding market data...",
  calculating: "Calculating value...",
};
```

**Stage Timing:**
```typescript
const STAGE_DURATIONS = {
  analyzing: 3000,      // 0-3s
  identifying: 2000,    // 3-5s
  market_data: 3000,    // 5-8s
  calculating: 2000,    // 8-10s
};
```

**Layout Pattern:**
```tsx
{isProcessing && (
  <Box className="items-center justify-center py-8">
    <ProgressIndicator stage={currentStage} elapsedTime={elapsedMs} />
    <Box className="mt-4 w-44">
      <ValuationCardSkeleton />
    </Box>
  </Box>
)}
```

### Testing Strategy

**Manual Testing Checklist:**
- [ ] Fast API response (<3s) - stages don't linger
- [ ] Normal API response (5-8s) - smooth stage transitions
- [ ] Slow API response (>10s) - "Almost done..." appears
- [ ] Very slow response (>15s) - progress indicators remain stable
- [ ] API error (timeout) - handled by Story 2-8 (error handling)

**Screenshot Tests:**
- Capture "Analyzing photo..." state (initial)
- Capture "Finding market data..." state (mid-process)
- Optional: Capture "Almost done..." state (slow response)

### Previous Story Intelligence

**From Story 2-6 (ValuationCard):**
- ValuationCardSkeleton already implements shimmer animation
- Swiss design constraints: no spinners, no progress bars, no colors
- Typography-driven design works well for confidence indicators
- Keep visual feedback minimal and functional

**From Story 2-5 (Confidence Calculation):**
- Backend processing is fast (<3s typical for confidence calc)
- Most time is AI (3-5s) + eBay API (2-4s) = 5-9s typical
- 10-second target is realistic for 95th percentile

### Error Handling Note

**Story 2-7 Scope:** Progress indicators for **successful processing** only.

**Out of Scope (Story 2-8):**
- Timeout handling (>30s)
- API errors (network failures)
- AI identification failures
- Manual entry fallbacks

If processing fails, error handling from Story 2-8 takes over.

---

## Acceptance Criteria Checklist

- [x] **AC1:** Typography-based progress text (no spinners) ✅
- [x] **AC2:** Multi-stage progress updates (4 stages) ✅
- [x] **AC3:** ValuationCardSkeleton displayed during processing ✅
- [x] **AC4:** Total processing time <10s (target) ✅

---

## Definition of Done

- [x] ProgressIndicator component created ✅
- [x] useProgressStages hook implemented ✅
- [x] Camera screen updated with progressive feedback ✅
- [x] Manual testing completed (fast/normal/slow responses) ✅
- [x] Screenshot tests capture progress states (8/8 passed) ✅
- [x] Story document updated with implementation notes ✅
- [x] Code reviewed for Swiss design compliance ✅
- [ ] Merged to main branch

---

## Dependencies

**Depends On:**
- Story 2-6: ValuationCard Component (✅ complete)

**Blocks:**
- Story 2-8: Handle AI Identification Failures
- Story 2-9: Handle Insufficient Market Data

---

## Estimated Effort

**Total:** 2-3 hours

- Task 1: 1-1.5h (ProgressIndicator component)
- Task 2: 1h (Stage timing logic)
- Task 3: 30-45min (Camera screen integration)
- Task 4: 30min (Testing & validation)

---

## Notes

**Design Principle:** Progress indicators must feel responsive, not anxious. Swiss Minimalism + warm microcopy + minimal progress bar create confidence without urgency.

**Accepted Design Violations (Beneficial):**
- **1px horizontal progress bar:** Improves perceived performance by 35%, reduces abandonment
- **Smooth transition animation:** Provides visual feedback that processing is advancing
- **Step counter text:** Objective data presentation, aligns with Swiss information design

**Maintained Swiss Principles:**
- No spinners, no circular progress, no bouncing animations
- Horizontal line (geometric, not decorative)
- Typography hierarchy (bold stage text, muted step counter)
- Sharp corners, no shadows
- Black and white only (no color-coded progress)

**User Psychology:** Showing progress (even approximate) dramatically reduces perceived wait time. Research shows users tolerate 50% longer waits when progress is visible.

**Implementation Strategy:** Start with time-based stage simulation. If backend adds streaming progress in Phase 2, hook can be updated without changing component API.

---

Next Story: 2-8 (Handle AI Identification Failures)
