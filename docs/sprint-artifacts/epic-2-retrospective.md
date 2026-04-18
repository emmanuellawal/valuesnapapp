# Epic 2: AI Valuation Engine - Retrospective

**Date:** April 2, 2026
**Epic Duration:** January 31, 2026 – March 18, 2026 (~7 weeks)
**Team:** Elawa (Developer)
**Status:** ✅ COMPLETE

---

## Epic Overview

**Goal:** Users can photograph an item and receive an AI-powered valuation with confidence-aware messaging.

**The Flow Delivered:**
```
Photo (Epic 1) → API Client → /api/appraise → GPT-4o-mini → eBay Browse API → Cache → Confidence → Display
```

**Stories Completed:** 11/11 (100%)

| Story | Title | Quality Score |
|-------|-------|---------------|
| ✅ 2-1 | Create Valuation API Endpoint | — |
| ✅ 2-2 | Integrate AI Item Identification | 9.5/10 |
| ✅ 2-3 | Implement Cache Layer for eBay API | — |
| ✅ 2-4 | Integrate eBay Market Data | 9/10 |
| ✅ 2-5 | Implement Confidence Calculation Service | 98% coverage |
| ✅ 2-6 | Build ValuationCard Component | — |
| ✅ 2-7 | Display Processing Progress States | 8/8 screenshot tests |
| ✅ 2-8 | Handle AI Identification Failures | — |
| ✅ 2-9 | Handle Insufficient Market Data | 9/10 (after validation) |
| ✅ 2-10 | Display Confidence-Based Messaging | 14/14 Playwright tests |
| ✅ 2-11 | Display Market Velocity Indicator | 4/4 screenshot tests |

---

## What Went Well ✅

### 1. **Forward-Proofing Strategy**

**Decision:** Five stories (2-5, 2-6, 2-7, 2-10, 2-11) had implementation work completed ahead of their scheduled order.

**Outcome:** Story 2-11 closed in ~25 minutes of net new work. Progress indicator, velocity caption, and confidence display were all wired up before stories formally started.

**Evidence:**
- `getVelocityCaption()`, `avgDaysToSell` types, and mock service distribution all pre-existed by the time Story 2-11 was scheduled
- Stories 2-7 and 2-8 reused `ProgressIndicator` + `ErrorState` components built during 2-6

**Key Learning:** Forward-proofing is high-leverage when story execution order is predictable. Building with downstream consumers in mind pays off immediately.

---

### 2. **Service Layer Architecture**

**Decision:** Isolated services (`ai.py`, `ebay.py`, `confidence.py`) with clear single responsibilities. Services call each other via clean interfaces, not shared state.

**Outcome:** Every service was independently testable. Adding retry logic to `ai.py` didn't touch `ebay.py`. Confidence calculation could be unit-tested with injected inputs, not real API calls.

**Evidence:**
- `confidence.py`: 288 lines, 27 unit tests, 6 integration tests, 98% coverage
- `ebay.py`: Cache-first pattern added without changing AI service
- Backend test suite finishes without real API keys via `USE_MOCK=true`

**Key Learning:** Explicit service boundaries scale well. The discipline cost upfront but eliminated cross-cutting debugging later.

---

### 3. **Validation-Driven Development**

**Practice:** Every story underwent structured validation before marking `done`. Validation asked: Are ACs met? Is the implementation path correct? Are there security or quality gaps?

**Outcome:** 4 critical issues found and fixed before shipping:

| Issue | Story | Severity | Fix |
|-------|-------|----------|-----|
| `reraise=True` missing — retry handler unreachable dead code | 2-2 | High | Added `reraise=True` to `@retry` decorator |
| No image size cap — unbounded base64 input was DoS surface | 2-2 | High | Added 13.4 MB cap with 413 response |
| AC3 implementation assigned to wrong module (`ebay.py` instead of `main.py`) | 2-9 | Critical | Corrected path, reverted story to ready-for-dev |
| Story 2-9 marked done despite AC3 unimplemented | 2-9 | Critical | Status corrected, implementation completed |

**Key Learning:** "Done" should require a validation pass, not just working-in-dev. The Story 2-9 case showed how optimistic status updates create technical debt silently.

---

### 4. **Cache-First eBay Strategy**

**Decision:** Supabase PostgreSQL as cache store (not in-memory, not Redis) with SHA-256 deterministic keys, 6-hour TTL, and graceful degradation on cache failures.

**Outcome:** Cache never blocks a response. Repeated queries for common items hit cache instead of eBay API. Architecture is production-ready from day one.

**Evidence:**
- Expected 80–90% API call reduction for repeated item queries
- Cache read latency: <50ms, write latency: <100ms (async)
- 4 pre-existing eBay API test skips (real keys) don't block CI

**Key Learning:** Choosing Supabase over SQLite or Redis was correct. One infrastructure system (already in the stack) beats two.

---

### 5. **Graceful Degradation Throughout**

**Pattern applied consistently:** Cache failures log warnings but don't block responses. AI failures return actionable error UI, not blank screens. LOW confidence shows honest messaging with an eBay verification link, not a failure state.

**Outcome:** The app never reaches a true dead end. Every error path has a recovery option (retry, eBay search, or both).

**Evidence:**
- 6 distinct error types in `ErrorState`, each with context-appropriate suggestions
- `ConfidenceWarning` molecule with "Verify on eBay" pre-filled link
- 1.5× price range widening for LOW confidence to reflect genuine uncertainty

**Key Learning:** Error states are features, not exceptions. Investing in them upfront prevents support load later.

---

### 6. **Swiss Minimalist Consistency**

**Principle:** Typography conveys confidence; no spinners, no decorative icons, no color abuse. Bold = HIGH confidence. Regular = MEDIUM/LOW. Signal color reserved for warning text only.

**Outcome:** Design language consistent across all 11 stories without a dedicated design review phase.

**Evidence:**
- Story 2-7: 1px horizontal progress bar (the only intentional "violation" — improves perceived performance)
- Story 2-8: No red backgrounds, no alarm icons on error screens
- Story 2-9: Anti-patterns list (7 items) documented to prevent future drift

**Key Learning:** Documenting anti-patterns alongside design patterns is equally important. The 2-9 anti-pattern list prevented center-alignment, icon usage, and Signal-as-background from sneaking in.

---

### 7. **Screenshot Test Coverage as Regression Guard**

**Decision:** Playwright screenshot tests for all key display states (HIGH/MEDIUM/LOW confidence, velocity present/absent, error states, progress stages, all at web + mobile viewports).

**Outcome:** 18/18 Playwright tests passing at epic close. No visual regressions detected across confidence refactors.

**Evidence:**
- 6 confidence tests (3 levels × 2 viewports)
- 8 progress indicator tests
- 4 velocity indicator tests

**Key Learning:** Screenshot tests are disproportionately valuable for UI with conditional rendering. The investment in mock data fixtures (`MOCK_HIGH_CONFIDENCE_ITEM`, etc.) paid back immediately.

---

## What Could Be Improved ⚠️

### 1. **Duration Significantly Exceeded Estimate**

**Estimate:** 2–3 weeks
**Actual:** ~7 weeks

**Contributing Factors:**
- Backend "mostly built" was optimistic — real integration required significant validation, retry logic, and test coverage
- Story 2-9 had to be sent back to ready-for-dev after premature done marking (replanning cost)
- Swiss design iteration on ValuationCard (display size 48px adjusted down to h1 32px)
- eBay API discovery (active vs sold listings) required architectural re-evaluation

**Lesson Learned:** "Backend exists, needs validation" stories are not 2-3h stories. Validation, real-API testing, retry logic, and security hardening each add substantial time. Future estimates should treat "verify existing code" as a full story effort, not a shortcut.

---

### 2. **eBay Browse API Returns Active Listings, Not Sold**

**Problem:** The eBay Browse API returns currently-listed prices, not historical sold prices. Sold prices are a better proxy for fair market value.

**Current Mitigation:** IQR filtering reduces active-listing inflation. "Proxy-first" approach documented. This is accepted for MVP.

**Impact:** Valuations may skew toward asking price rather than what items actually sell for. Users may notice discrepancy vs manual eBay research.

**Lesson Learned:** API capability limitations need upfront spike work, not discovery mid-sprint. A 30-minute API capability investigation before Story 2-4 would have surfaced this.

---

### 3. **Camera Screen + API Integration Left Using Hardcoded Timeout**

**Problem:** The Camera screen (`app/(tabs)/index.tsx`) uses a 6-second hardcoded timeout simulation instead of a real API integration. Story 2-1 built the API client and hook, but the Camera screen binding was noted as "deferred to production."

**Impact:** The end-to-end flow (photo → real API call → display result) is not fully wired in the current implementation. Mock mode works; real API flow requires this final binding.

**Lesson Learned:** Stories that are "done" but leave the integration point un-wired create ambiguous handoff. The Camera screen binding should have been Story 2-1's explicit acceptance criterion.

---

### 4. **Three Pre-Existing Backend Test Failures Left Unresolved**

**Problem:** By Story 2-10, 3 backend tests were failing due to pre-existing cache test issues (not caused by Epic 2 work). They were acknowledged as "unrelated" and left in.

**Impact:** Test suite never goes fully green. Future contributors may treat failures as acceptable baseline.

**Lesson Learned:** Pre-existing failures should be triaged immediately when encountered, not deferred. A 30-minute fix is always cheaper than normalizing red tests.

---

### 5. **Story Status Tracking Was Occasionally Optimistic**

**Problem:** Story 2-9 was marked `done` in status notes before AC3 was implemented. Caught during validation, but cost a re-planning cycle.

**Lesson Learned:** Status should only advance when all ACs are explicitly checked, not when "it feels done." A checklist walkthrough at story close prevents this.

---

## Metrics & Velocity

### Story Completion

| Story | Phase | Estimated | Notes |
|-------|-------|-----------|-------|
| 2-1 | Backend | 2–3h | API client + hook created |
| 2-2 | Backend | 2–3h | +retry logic, +image validation, +validation pass |
| 2-3 | Backend | 2–3h | Architecture pivot: SQLite → Supabase PostgreSQL |
| 2-4 | Backend | 3–4h | Fallback logic, API monitoring, eBay limitation documented |
| 2-5 | Backend | 2–3h | Forward-proofed; 27 unit tests, 98% coverage |
| 2-6 | Frontend | 3–4h | ValuationCard 202 lines, Swiss design |
| 2-7 | Frontend | 2–3h | ProgressIndicator + useProgressStages hook |
| 2-8 | Frontend | 2–3h | ErrorState, 6 error types, retry flow |
| 2-9 | Frontend | 2–3h | Sent back to ready-for-dev; re-implemented correctly |
| 2-10 | Frontend | 2–3h | 14/14 tests; TSDoc fixes; mock constants |
| 2-11 | Frontend | 2–3h | ~25min net new work (forward-proofed) |
| **Total** | | **~28–37h estimated** | **~7 weeks elapsed** |

**Velocity Assessment:** Elapsed time far exceeded hour estimates. Stories ran sequentially with extended validation and iteration cycles. Epic 1 velocity model (3h/story average) did not hold for the complexity of API integration and UI polish.

---

### Code Quality

| Area | Metric |
|------|--------|
| Backend key service files | 2,286 lines (ai, ebay, confidence, cache, main, valuations) |
| Backend test files | 3,347 lines across 16 test files |
| Frontend key components | ~548 lines (ValuationCard, ProgressIndicator, ErrorState) |
| Backend test pass rate | 110/113 (97.3%) |
| Frontend test pass rate | 18/18 Playwright (100%) |
| Confidence module coverage | 98% |
| Critical issues found + fixed | 4 |
| Anti-patterns documented | 20+ across story dev notes |

---

### Architecture Deliverables

| Component | Lines | Tests |
|-----------|-------|-------|
| `backend/services/ai.py` | 221 | Covered in integration suite |
| `backend/services/ebay.py` | 529 | Full unit + integration |
| `backend/services/confidence.py` | 288 | 27 unit + 6 integration |
| `backend/cache.py` | 192 | 12 unit + 5 integration |
| `ValuationCard` | 207 | Screenshot tests |
| `ProgressIndicator` | 121 | 8 screenshot tests |
| `ErrorState` | 220 | Error flow validated |

---

## Key Learnings

### Technical

1. **eBay API capability requires upfront spike** — Don't assume "search sold listings" means sold prices exist in the API. Verify the capability before building the story.

2. **`reraise=True` is required in tenacity `@retry` for custom error handlers** — Without it, the error handler is dead code. Pattern to check in all retry decorators.

3. **Expiration columns in PostgreSQL should be computed in Python, not as generated columns** — Generated columns are immutable; calculating `expires_at = now + ttl` in the application layer avoids the constraint.

4. **SHA-256 hashing of sorted fields = deterministic, collision-resistant cache keys** — Better than concatenation, immune to field-order variations.

5. **Image size validation is a security boundary, not optional** — Unbounded base64 input creates a DoS surface. Always cap at system boundary (13.4 MB = 10 MB image with encoding overhead).

6. **Typography weight as the only confidence signal** — BOLD → HIGH, regular → MEDIUM/LOW is readable, accessible, and avoids color-as-meaning anti-pattern.

### Process

7. **"Exists, needs validation" ≠ "2-3 hour story"** — Existing code needs retry logic, error handling, security hardening, and tests. Full story effort.

8. **Forward-proofing pays off when story order is known** — Build components with downstream consumers in mind. Story 2-11 was essentially free because of it.

9. **Anti-pattern documentation is as valuable as pattern documentation** — Prevents common mistakes from re-appearing with new contributors or in new sprints.

10. **Validation before done-marking is non-negotiable** — Story 2-9 showed how unchecked status marking creates silent rework. A 10-minute AC checklist prevents a 2-hour re-planning cycle.

---

## Risks Mitigated

| Risk | Mitigation Applied | Status |
|------|--------------------|--------|
| eBay API rate limits (5,000/day sandbox) | Cache-first strategy, 80-90% call reduction | ✅ Resolved |
| OpenAI API costs at dev velocity | `USE_MOCK=true` throughout development | ✅ Resolved |
| GPT response time variability (3–15s) | Progressive loading states, graceful overtime handling | ✅ Resolved |
| AI misidentification dead ends | 6 error types, retry, manual eBay search fallback | ✅ Resolved |
| Type mismatches backend/frontend | Transformer functions, TypeScript types validated | ✅ Resolved |
| DoS via unbounded image input | 13.4 MB cap with 413 response | ✅ Resolved (found during validation) |
| eBay active vs sold listings discrepancy | Documented limitation, IQR filtering mitigates | ⚠️ Accepted for MVP |
| Camera screen integration gap | Noted as deferred, not marked done | ⚠️ Carry forward |

---

## Recommendations for Epic 3+

### 1. Resolve Camera Screen API Integration (High Priority)

Before declaring the valuation engine "done" in production terms, the Camera screen's hardcoded 6s timeout should be replaced with the real `useValuation` hook and `api.ts` client built in Story 2-1. This is likely a 1-2 hour task. Consider adding it as a Story 2-1a or front-loading into Epic 3.

---

### 2. Fix Pre-Existing Test Failures (Medium Priority)

The 3 failing backend cache tests should be triaged before Epic 3 begins. A clean green baseline makes regressions unambiguous.

---

### 3. Spike eBay Sold Listings API (Medium Priority)

Before building any listing-price feature, spike the eBay `buy/marketplace_insights` or `sell/analytics` APIs to determine if sold-price data is available. 30 minutes of investigation now prevents a significant re-architecture later.

---

### 4. Carry Forward Epic 2 Patterns to Epic 3

| Pattern | Apply Where |
|---------|-------------|
| Cache-first | Any external API in Epic 3 |
| Graceful degradation | Save failures should not lose captured valuations |
| Anti-patterns list | Every story dev notes should include one |
| Validation pass before done | All stories |
| Screenshot tests for conditional rendering | History list, detail view |

---

### 5. Revise Estimation Model

Epic 1: ~3h/story average.
Epic 2: ~3–6h/story effective (excluding multi-week elapsed calendar time).

For Epic 3+, use **4–6 hours as baseline** for stories involving:
- External service integration
- New UI components with conditional display states
- Stories building on "existing" code that needs hardening

---

## Action Items

### Immediate (Before Epic 3 begins)
- [ ] Fix 3 pre-existing backend cache test failures
- [ ] Wire Camera screen to real `useValuation` hook (Story 2-1a or Epic 3 prerequisite)
- [ ] Mark `epic-2-retrospective: completed` in `sprint-status.yaml`

### Short-Term (During Epic 3)
- [ ] Spike eBay sold-listings API availability
- [ ] Apply anti-patterns documentation to every Epic 3 story
- [ ] Run validation pass before marking any story done

### Long-Term
- [ ] Revisit eBay data source if valuation accuracy feedback is negative (active vs sold)
- [ ] Evaluate migrating 3 backend test failures from "unrelated" to fixed
