# Epic 3: History & Persistence — Retrospective

**Date:** April 2, 2026
**Epic Duration:** March 19, 2026 – March 22, 2026 (~4 days)
**Team:** Elawa (Developer)
**Status:** ✅ COMPLETE

---

## Epic Overview

**Goal:** Transform ValueSnap from a one-shot valuation tool into a personal valuation ledger — every appraisal saved, browsable, and viewable in full detail.

**What was delivered:**
```
Photo → Appraise → AUTO-SAVE (Supabase + local)
                         ↓
           History Tab: Real data, responsive grid (1–4 cols)
                         ↓
           Tap card: Full detail view (price, confidence, timestamp, delete)
                         ↓
           Offline: Cached history shows, Camera tab gracefully disabled
                         ↓
           Desktop 1024px+: Sidebar navigation replaces bottom tab bar
```

**Stories Completed:** 6/6 (100%)

| Story | Title | Tests Added | Code Review |
|-------|-------|-------------|-------------|
| ✅ 3-1 | Create Valuations Database Schema | 6 backend | Clean |
| ✅ 3-2 | Implement Save Valuation Flow | Multiple (backend + mobile) | ✅ Applied 2026-03-19 |
| ✅ 3-3 | Build History List View | 5 (21 total) | ✅ Applied 2026-03-21 |
| ✅ 3-4 | Display Valuation Details | 6 (27 total) | Clean |
| ✅ 3-5 | Implement Offline Viewing | 3 (30 total) | Clean |
| ✅ 3-6 | Desktop Sidebar Navigation | 0 (no pure logic) | Clean |

---

## What Went Well ✅

### 1. **Epic Completed on Time — 4 Days vs 1.5–2 Week Estimate**

**Outcome:** The epic that was budgeted for 1.5–2 weeks completed in approximately 4 days.

**Contributing factors:**
- All 6 stories were strictly sequential — dependency chain was clean, no parallel risk or blockers
- Backend infrastructure (`get_supabase()`, migration patterns, Pydantic models) was genuinely reusable from Epic 2's cache work
- Zero new npm dependencies added across all 6 stories — no integration debugging or version conflicts
- Stories were well-scoped with explicit deferral boundaries (image hosting → Epic 6, eBay listing → Epic 5, auth → Epic 4)

**Key Learning:** When dependencies are clearly sequential, a sprint can move fast. The Epic 3 plan's chain layout (`3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6`) eliminated ambiguity about what to work on next.

---

### 2. **Guest Session Architecture Pre-Wired for Epic 4 Migration**

**Decision:** Rather than treating guests as a temporary hack, Story 3.2 built the full guest identity pattern upfront:
- Device-generated `guest_session_id` stored in `AsyncStorage`, sent with every appraisal request
- Backend stores guest valuations with `user_id = null` + `guest_session_id`
- Epic 4 claim migration (`UPDATE valuations SET user_id = ? WHERE guest_session_id = ?`) requires zero schema changes

**Outcome:** Epic 4 auth integration required no rework of the persistence layer, no data migration surprises, and no guest data was orphaned when users signed up.

**Key Learning:** Pre-wiring identity patterns for the next epic is worth the small upfront cost. A `guest_session_id` column costs nothing to add now and saves a painful backfill later.

---

### 3. **Best-Effort Persistence Semantics Protected User Experience**

**Decision (Story 3.2):** Backend saves are a side effect of a successful appraisal, not part of its correctness contract. If Supabase save fails, the user still receives their valuation (`HTTP 200` with `valuation_id: null`). No appraisal is blocked by a persistence failure.

**Outcome:** Users never experience a broken or missing valuation result because a database write timed out. The local `AsyncStorage` fallback provides a redundant second copy on the device.

**Key Learning:** For write-after-compute patterns, best-effort semantics with local fallback is strongly preferable over transactional all-or-nothing. The appraisal is the value; the save is bookkeeping.

---

### 4. **Zero New Dependencies**

**Outcome:** All 6 stories used only existing libraries — no new npm packages installed.

**Evidence:**
- Responsive grid: `useWindowDimensions()` (React Native built-in)
- Offline detection: `navigator.onLine` + `window` events (W3C standard, no library)
- Timestamp formatting: `Intl.DateTimeFormat` (JS built-in)
- Guest ID: `Math.random().toString(36)` or `crypto.randomUUID()` (platform built-in)
- Desktop sidebar: `tabBarPosition: 'left'` (React Navigation built-in prop)

**Key Learning:** Reaching for built-in platform APIs before npm packages reduces surface area, eliminates version conflicts, and keeps bundle size flat. Every new dependency is a long-term maintenance commitment.

---

### 5. **Pure Function Extraction Made Testing Frictionless**

**Pattern applied in three stories:**
- Story 3.3: `mapValuationsToGridItems()` at module level — unit-testable without mounting a component
- Story 3.4: `findValuationById()` pure function — 3 tests without a React renderer
- Story 3.5: `getInitialOnlineStatus()` pure function — 3 tests without hook scaffolding

**Outcome:** 30 frontend tests passing by end of epic; each test is fast, deterministic, and requires no setup beyond function arguments.

**Key Learning:** Before writing a component test, ask "can I extract the logic into a pure function?" If yes, do it — tests become trivially simple and run in milliseconds.

---

### 6. **Dual-Key Lookup Pattern Handled Optional IDs Gracefully**

**Problem:** Guest valuations saved without a backend UUID (persistence failure case) only have `createdAt` as a unique identifier.

**Solution:** `findValuationById()` and `deleteFromLocalHistory()` both try `v.id === id` first, then fall back to `v.createdAt === id`. Applied consistently across lookup and delete.

**Outcome:** Users never see a blank detail screen or a failed delete because their valuation lacked a server-assigned ID. The app degrades gracefully to timestamps as surrogate keys.

**Key Learning:** When a field is optional due to known failure modes, build the fallback key strategy into every operation that uses it — not just the happy path.

---

### 7. **Responsive Breakpoints Applied Consistently**

**Breakpoints defined once (`useWindowDimensions()`) and applied across three stories:**

| Width | History Grid Columns | Navigation |
|-------|---------------------|------------|
| < 600px | 1 | Bottom tab bar |
| 600–1023px | 2 | Bottom tab bar |
| 1024–1439px | 3 | Sidebar |
| ≥ 1440px | 4 | Sidebar |

**Outcome:** Consistent layout behavior across all screens without per-component breakpoint logic. Desktop sidebar and responsive grid use the same 1024px threshold.

**Key Learning:** Breakpoint values should be constants defined once and imported — not magic numbers scattered across components. Story 3.3 and 3.6 both hit the 1024px value; centralizing it prevents drift.

---

### 8. **Deferred Scope Was Well-Chosen and Held**

Three items were deferred at the start of Epic 3 and never crept back in:

| Deferred Item | Target Epic | Status |
|---------------|-------------|--------|
| Image hosting / thumbnails | Epic 6 | Stayed deferred — nullable column created, no S3 work |
| eBay listing action | Epic 5 | Stayed deferred — "Coming soon" alert stub |
| Auth integration | Epic 4 | Stayed deferred — guest pattern pre-wired only |

**Key Learning:** Explicit written deferral decisions in the plan document are more reliable than verbal agreements. When in doubt, document what is NOT in scope.

---

## What Could Be Improved ⚠️

### 1. **Latent Response Transformer Bug Was Not Caught Until Story 3.2**

**Problem:** The existing `transformValuationResponse` frontend transformer expected `raw.item_identity` and `raw.market_data` keys, but the actual backend had always returned `raw.identity` and `raw.valuation`. This mismatch had existed since Epic 2 Story 2-1 built the API client.

**Impact:** The end-to-end appraisal flow (real API, not mock) silently produced undefined results for `itemDetails` and `marketData` in the `Valuation` entity. It was only discovered when connecting the real history flow in Story 3.2.

**Root Cause:** Mock mode (`EXPO_PUBLIC_USE_MOCK=true`) had been used throughout Epic 2 development, so the transformer was never exercised against the real API response shape.

**Fix:** Updated `transformValuationResponse` to map `raw.identity` → `itemDetails`, `raw.valuation` → `marketData`, and added `raw.confidence` threading.

**Lesson Learned:** API contract tests (a test that sends a real-shaped response through the transformer and asserts the output) should exist at the boundary. Mock mode is invaluable for development speed but must not be the only path that's ever tested. Add at least one transformer test using the actual backend response shape.

---

### 2. **Two Stories Required Code Review Fixes (Could Have Been Caught Sooner)**

**Story 3.2 code review caught:** Response transformer key mismatch (above), and `Valuation.id` optionality type error.

**Story 3.3 code review caught:**
- Double-fetch: independent `useEffect` + `useFocusEffect` both triggered on mount
- Missing `accessibilityLabel` on "Start Valuing" CTA button
- `useCallback` dependency array incorrect in `useFocusEffect`

**Pattern:** Both issues are the kind that a pre-submission checklist would catch:
- "Did I check for handler deduplication in `useFocusEffect` + `useEffect` coexistence?"
- "Do all interactive elements have `accessibilityLabel`?"

**Lesson Learned:** A short pre-review checklist for frontend stories (focus effect duplication, accessibility labels, dependency arrays) would move these catches earlier — before code review, not during.

---

### 3. **Cross-Device Image Gap Is a Known UX Hole**

**Problem:** `imageUri` is a local device file path stored in the `Valuation` entity. It is not uploaded to a server. History cards on the device that took the photo show the image correctly. On any other device (or after app reinstall), `imageUri` resolves to nothing and a placeholder is shown.

**Current mitigation:** Column created (`image_thumbnail_url`) but nullable. Documented gap in Epic 3 plan and each story that touches images.

**User impact:** If a user signs in across two devices in Epic 4, their history cards will show blank image placeholders for records created on the other device. This will feel broken.

**Lesson Learned:** Documenting a gap is not the same as closing it. This needs a concrete owner before Epic 4 cross-device sync is advertised to users. Consider surfacing it as a story in Epic 5 or Epic 6 now rather than leaving it as a vague "Epic 6 PWA polish" note.

---

### 4. **Desktop Sidebar Collapse Not Included**

**Decision made:** Sidebar shipped as a fixed 240px width, with no collapse/expand toggle in this story.

**Impact at 1024px viewport:** The sidebar occupies a significant fraction of a 1024px screen. The content area is ~784px wide, which is functional but slightly cramped. Users who prefer more content space have no way to collapse the nav.

**Superseded planning note:** Future desktop refinement is now governed by the 10/45/45 workstation model adopted in the Epic 5 retrospective, not by preserving this fixed-width assumption.

**Lesson Learned:** For layout features that affect available content area, "non-collapsible" is an MVP shortcut, but it creates a perception of "unfinished" on smaller desktops. Flagging this as a story (rather than a vague future enhancement) would help prioritize it.

---

### 5. **History Tab: No Server-Side Endpoint Yet**

**Plan called for:** `GET /api/history` as a new backend endpoint (Story 3.3).
**What was built:** `getLocalHistory()` reading from `AsyncStorage` — no backend history endpoint implemented.

The story notes explicitly say this is the guest path. Story 3.3 was planned as full-stack ("new GET `/api/history` endpoint"), but the actual implementation only wired up local storage. The backend endpoint (`GET /api/history`) will be needed when Epic 4 auth connects server-side history for authenticated users.

**Impact:** Epic 4 will need to build the history endpoint that Epic 3 planned but deferred. This isn't a failure — the guest path is the right MVP order — but the scope shift should be documented as carry-forward.

**Lesson Learned:** When a story evolves from "full-stack" to "frontend only (guest path)", record the change in the story notes. The backend piece didn't disappear — it deferred to Epic 4.

---

## Metrics & Velocity

### Story Completion

| Story | Phase | Type | Duration |
|-------|-------|------|----------|
| 3-1 | Backend | DB Schema + Repository | ~1 day |
| 3-2 | Backend + Frontend | Save flow + transformer fix | ~1 day |
| 3-3 | Frontend | History list + responsive grid | ~1 day |
| 3-4 | Frontend | Detail view + delete | <1 day |
| 3-5 | Frontend | Offline hook + UI | <1 day |
| 3-6 | Frontend | Sidebar navigation | <1 day |
| **Total** | | | **~4 days** |

**Estimate accuracy:** Outstanding. Planned 1.5–2 weeks, delivered in ~4 days. Fastest epic to date.

**Velocity explanation:** Sequential dependency chain was clear, no external API integration involved (Supabase is internal infrastructure), Epic 2's cache patterns were directly reusable, and zero new dependencies meant no debugging of library integration.

---

### Code Quality

| Area | Metric |
|------|--------|
| Key Epic 3 backend files | 465 lines (valuations.py, migration SQL, cache.py reused) |
| Key Epic 3 frontend files | 859 lines (history.tsx, swiss-sidebar.tsx, history-grid.tsx, localHistory.ts, useOnlineStatus.ts) |
| Frontend test files added | 3 new (`valuationDetail.test.ts`, `historyMapping.test.ts`, `localHistory.test.ts`) |
| Frontend test suite total | 30 passing at epic close |
| TypeScript errors | 0 (excluding pre-existing unrelated demo files) |
| New npm dependencies | 0 |
| Code review issues applied | 5 (Story 3.2: 2, Story 3.3: 3) |

### Architecture Deliverables

| Component | Lines | Purpose |
|-----------|-------|---------|
| `backend/services/valuations.py` | 169 | ValuationRecord + ValuationRepository (4 methods) |
| `backend/migrations/002_create_valuations_table.sql` | 112 | 14 columns, 4 indexes, 4 RLS policies |
| `apps/mobile/lib/localHistory.ts` | 120 | Guest storage (save, get, delete, guest ID) |
| `apps/mobile/lib/hooks/useOnlineStatus.ts` | 64 | Online/offline detection hook |
| `apps/mobile/app/(tabs)/history.tsx` | 282 | History list with responsive grid |
| `apps/mobile/components/organisms/swiss-sidebar.tsx` | 74 | Desktop sidebar navigation |

---

## Key Learnings

### Technical

1. **API contract tests are not optional when mock mode exists** — If `EXPO_PUBLIC_USE_MOCK=true` is ever used during development, there must be at least one test that exercises the real response shape through the transformer. Silent key mismatches are the worst kind of bug.

2. **`navigator.onLine` on Hermes native defaults to `true` (undefined)** — Guard with `typeof navigator === 'undefined'` before checking `.onLine`. Safe default is online, not offline.

3. **`model_dump(mode='json', exclude_none=True)` is the correct Pydantic pattern for Supabase insertion** — `mode='json'` serializes datetime to ISO strings (avoids JSON crash), `exclude_none=True` omits null `id` so Postgres uses its UUID default.

4. **`tabBarPosition: 'left'` in React Navigation drives sidebar layout automatically** — No manual flex wrapper engineering needed. The navigator handles placing the sidebar beside the content area.

5. **Dual-key lookups (`id ?? createdAt`) should be applied consistently across all operations** — If a record can be found by either key, it should also be deleted, displayed, and updated by either key. Inconsistency creates subtle bugs where show works but delete fails.

6. **`useFocusEffect` + `useEffect` on the same screen creates double-fetch** — Use a single `useFocusEffect` with a `useRef` initial-load flag. The ref prevents re-showing the skeleton on tab re-focus while still loading on mount.

### Process

7. **Sequential dependency chains are fastest to execute** — When stories can't be parallelized, the upside is that there's never ambiguity about what to work on next. Epic 3's strict chain was a feature, not a constraint.

8. **"Full-stack story" scope should be audited at start** — Story 3.3 was planned as full-stack but delivered as frontend-only (guest path). Call this out explicitly when scope shifts mid-story so the deferred backend piece has a clear owner.

9. **Explicit nullable columns with documented deferred intent** — `image_thumbnail_url` was created nullable with documented intent (Epic 6). This is correct pattern — the schema is forward-compatible, the gap is acknowledged. What's needed is a concrete story in the backlog, not just a comment.

10. **Pre-review checklist would move code review findings earlier** — Both Story 3.2 and 3.3 review findings (wrong keys, double-fetch, missing labels) are catchable with a 5-minute pre-submission checklist. Worth formalizing.

---

## Risks Mitigated

| Risk | Mitigation Applied | Status |
|------|--------------------|--------|
| Supabase migration breaking cache table | Migration in separate file; cache uses separate table | ✅ Resolved |
| JSONB columns slow down history queries | Indexed scalar columns for list view; JSONB only in detail view | ✅ Resolved |
| AsyncStorage race conditions (guest) | Sequential async operations in `localHistory.ts` | ✅ Resolved |
| Offline detection unreliable on native | Safe default `true`; existing API error handling handles actual failures | ✅ Resolved |
| Cross-device image gap | Documented; nullable column; placeholder shown | ⚠️ Accepted for now |
| No server-side history endpoint | Guest path via AsyncStorage works for all Epic 3 users | ⚠️ Backend endpoint carry-forward to Epic 4 |

---

## Epic 3 Exit Criteria — Final Check

| Criterion | Status |
|-----------|--------|
| Users can complete a valuation and find it in History 30 seconds later | ✅ |
| History tab shows real persisted data (not mocks) | ✅ |
| Tapping a history card opens a full detail view | ✅ |
| Guest users see up to 5 valuations in history | ✅ |
| App shows cached history when offline (no crash, no empty screen) | ✅ |
| All 6 stories reach `done` in `sprint-status.yaml` | ✅ |

---

## Recommendations for Epic 4+

### 1. Add API Contract Test for `transformValuationResponse` (High Priority)

Before Epic 4 connects server-side history, add a test that fixtures the real `/api/appraise` response shape and asserts the transformer output. This is the highest-risk silent failure point in the codebase.

### 2. Carry Forward: Build `GET /api/history` Backend Endpoint

Story 3.3 deferred the server-side history endpoint. Epic 4 auth integration almost certainly needs it (authenticated users' history must come from Supabase, not AsyncStorage). Plan this as an explicit early story in Epic 4, not an afterthought.

### 3. Create a Story for Image Hosting (Assign to Epic 5 or 6)

The `image_thumbnail_url` nullable column is waiting. Cross-device history without images will feel broken once Epic 4 enables multi-device sign-in. Assign ownership now: either Epic 5 (listing creation, which needs images anyway) or a dedicated Epic 6 story.

### 4. Desktop Sidebar Collapse (Backlog)

Flag as a backlog story — not blocking, but clearly needed for polished desktop UX. The original 240px implementation felt too heavy at 1024px; future Epic 6 work should evaluate collapse and density against the restrained 10/45/45 workstation rail.

### 5. Pre-Review Checklist for Frontend Stories

Create a short pre-review checklist for frontend stories:
- [ ] No duplicate `useEffect` + `useFocusEffect` for same data
- [ ] All interactive elements have `accessibilityLabel`
- [ ] `useCallback` dependency arrays complete
- [ ] API transformer tested against real response shape (if touching)
- [ ] All operations using an optional ID field handle the fallback key

### 6. Centralize Breakpoint Constants

Stories 3.3 and 3.6 both use 1024px. Define `BREAKPOINTS = { desktop: 1024 }` in a shared constants file before more screens are added.
