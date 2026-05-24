# Epic 6: Platform & PWA

**Date:** April 28, 2026
**Epic Duration:** Estimated 4-6 days
**Stories:** 14 implementation stories + retrospective
**Dependencies:** Epic 5.5 readiness gates complete

---

## Executive Summary

Epic 6 moves ValueSnap from a mobile-first Expo app toward a credible web/PWA surface. The critical risk is not "can the app render on desktop" — it already can. The risk is that desktop turns into a stretched phone UI with vague acceptance criteria.

This plan locks the workstation model before Epic 6 begins:

- Mobile keeps the existing bottom tab bar.
- Desktop uses the existing `SwissSidebar` from Story 3-6 as the rail.
- Appraisal work follows the adopted 10/45/45 workstation model: restrained navigation rail, image pane, data pane.
- PWA work includes concrete manifest, offline, static-export, font-preload, and layout-stability gates.
- Network-resilience stories validate against the real Render endpoint: `https://valuesnapapp.onrender.com`.
- Story **6-13** adds an **appraisal idempotency contract** (`Idempotency-Key` header preferred, or an equivalent body field) plus server-side dedupe so Story 5.5-7 client retries and future migration/offline retries cannot create duplicate valuation rows for the same logical submit.
- Story **6-14** restores AI listing quality as a first-class delivery track (not polish): visual-grounded identification + safer confidence behavior, based on the 5.5-10 finding that both mini and 4o scored 0/5.

---

## Epic 6 Design Rules

### Breakpoint Policy

Use `BREAKPOINTS` from `apps/mobile/constants/breakpoints.ts` for runtime layout decisions:

```ts
export const BREAKPOINTS = {
  tablet: 600,
  desktop: 1024,
  largeDesktop: 1440,
} as const;
```

Acceptance criteria and implementation notes must reference `BREAKPOINTS.desktop` and `BREAKPOINTS.largeDesktop`, not inline desktop breakpoint literals. Tailwind/NativeWind responsive classes may use `lg:` where appropriate because the resolved Tailwind config includes default screens, including `lg: 1024px`; component logic that depends on actual window width should use `useWindowDimensions()` + `BREAKPOINTS.desktop`.

### Workstation Model

At desktop widths, active appraisal work follows:

- Rail: existing `SwissSidebar`, visually restrained, max 10% of the viewport and capped at 144px at `BREAKPOINTS.largeDesktop`
- Image pane: receives half of the remaining content width
- Data pane: receives half of the remaining content width

If the rail is below the 10% cap on smaller desktop widths, the remaining width splits 50/50 between image and data panes. Do not leave dead space to preserve a literal 45/45 split.

### Render Validation Endpoint

Network-dependent stories validate against:

```text
https://valuesnapapp.onrender.com
```

Health check:

```bash
curl -sS "https://valuesnapapp.onrender.com/health"
```

Expected response:

```json
{"status":"healthy"}
```

Free-tier cold starts are expected after idle periods. Stories that test retry or network behavior must account for the first request taking roughly 30-60 seconds after spin-down.

### Appraise idempotency (Story 6-13)

Story 5.5-7 introduced `fetchWithRetry` for `POST /api/appraise`. Without idempotency, a successful write followed by a dropped response can produce **duplicate valuations** on retry. Story **6-13** defines the contract (prefer **`Idempotency-Key`** HTTP header; body field acceptable if header is impractical on a given client), server-side dedupe storage (TTL or scoped uniqueness), and client generation rules so Stories **6-7**, **6-12**, and any expanded retry UX build on a safe foundation.

---

## Story Dependency Graph

```text
6-13  Appraise idempotency key         depends on 5.5-7 (retries live); should land before expanding retry/migration behavior
6-14  AI listing quality overhaul       depends on 5.5-10 findings; should start early to de-risk listing reliability
6-1   Tab navigation                  depends on 5.5-5, Story 3-6 SwissSidebar
6-2   Responsive grid system           depends on 6-1 breakpoint policy
6-3   PWA manifest                     no code dependency, must use Swiss color tokens
6-4   Service worker / offline         depends on 6-3 manifest baseline
6-5   Marketing landing page           depends on 6-2 grid tokens
6-6   Network errors                   depends on Render endpoint from 5.5-2
6-7   Retry mechanism                  depends on Render endpoint from 5.5-2 + 6-6 error mapping + 6-13 for safe appraise retries
6-8   Rate-limit exceeded              depends on Render endpoint from 5.5-2
6-9   Mobile UX patterns               depends on 6-1 preserving mobile tabs
6-10  Desktop UX patterns              depends on 6-1 rail + 6-2 grid
6-11  Desktop sidebar collapse         depends on 6-1/6-10 rail constraints
6-12  Offline migration retry queue    depends on 6-4 offline foundation + Render endpoint; migration writes should follow 6-13 patterns where applicable
```

Recommended execution order:

```text
Phase 1:  6-13, 6-14, 6-1, 6-3, 6-6
Phase 2:  6-2, 6-4, 6-7, 6-8, 6-9
Phase 3:  6-10, 6-11, 6-12
Phase 4:  6-5, retrospective
```

---

## Story Details

---

### Story 6-1: Implement Tab Navigation

**Origin:** Epic 6 baseline navigation requirement + Epic 5.5 Story 5.5-5 planning lock
**Category:** Responsive navigation
**Estimate:** 2-4 hours

**Problem:**
The app already has mobile tabs and a shipped desktop sidebar from Story 3-6, but Epic 6 needs a locked navigation contract so future PWA and desktop stories do not create a second rail, duplicate routes, or reintroduce bottom tabs on desktop.

**What's Needed:**

Reuse the existing `SwissSidebar` from `apps/mobile/components/organisms/swiss-sidebar.tsx` inside the current tab layout. Keep the same three destinations — Camera, History, Settings — across mobile and desktop. Do not create a new sidebar component unless the story documents why `SwissSidebar` cannot be safely adapted.

The current `SwissSidebar` still has a fixed `style={{ width: 240, flex: 1 }}` from Story 3-6. Story 6-1 must replace that fixed workstation width with a responsive rail width derived from viewport width, capped at 144px at `BREAKPOINTS.largeDesktop` and no smaller than 80px. The old 240px value should not remain on the workstation surface.

**Acceptance Criteria:**

- [ ] On `width < BREAKPOINTS.desktop`, the existing bottom tab bar renders with Camera, History, and Settings tabs
- [ ] On `width >= BREAKPOINTS.desktop`, the bottom tab bar is hidden and the existing `SwissSidebar` renders as the left navigation rail
- [ ] Desktop gate uses `BREAKPOINTS.desktop` imported from `apps/mobile/constants/breakpoints.ts`; no new desktop breakpoint literals are introduced in component logic
- [ ] The rail is capped at 10% of viewport width and 144px at `BREAKPOINTS.largeDesktop`; it never uses the old fixed 240px width on the workstation surface
- [ ] Rail has a minimum width of 80px on smaller desktop widths so labels remain legible
- [ ] Camera, History, and Settings are reachable from both mobile tabs and desktop rail
- [ ] Active route state is visually correct in both nav surfaces
- [ ] No new routes or duplicate route files are introduced

**Files to touch:**

- `apps/mobile/app/(tabs)/_layout.tsx`
- `apps/mobile/components/organisms/swiss-sidebar.tsx`
- `apps/mobile/constants/breakpoints.ts` (reference only; edit only if absolutely necessary)
- Existing navigation tests or a new focused test under `apps/mobile/__tests__/`

---

### Story 6-2: Implement Responsive Grid System

**Origin:** Epic 6 platform layout foundation
**Category:** Responsive layout
**Estimate:** 3-5 hours

**Problem:**
Screens currently rely on local layout decisions. Epic 6 needs a shared responsive grid approach so history, marketing, and workstation layouts do not each invent their own spacing and breakpoint behavior.

**What's Needed:**

Define reusable layout primitives or patterns for mobile single-column, tablet two-column, and desktop multi-column surfaces while preserving the Swiss spacing scale already in NativeWind config.

**Acceptance Criteria:**

- [ ] Mobile layouts remain single-column by default
- [ ] Tablet layouts may use two columns where content density benefits from it
- [ ] Desktop card/list surfaces can render 3-4 columns where appropriate
- [ ] Runtime desktop gates use `BREAKPOINTS.desktop` when code needs window dimensions
- [ ] Tailwind responsive classes may use default `lg:` only when static CSS behavior is enough
- [ ] Spacing uses existing Swiss tokens from `apps/mobile/tailwind.config.js`; no ad hoc spacing scale is introduced
- [ ] Existing mobile layouts do not regress visually

**Files to touch:**

- Shared layout primitives under `apps/mobile/components/`
- Screens that need grid behavior, especially history and marketing surfaces
- `apps/mobile/tailwind.config.js` only if a named grid token is justified

---

### Story 6-3: Configure PWA Manifest

**Origin:** Professor feedback adopted in Epic 5 retrospective + Epic 5.5 Story 5.5-5 planning lock
**Category:** PWA foundation
**Estimate:** 1-2 hours

**Problem:**
The app does not have a locked Swiss PWA manifest contract. Without explicit fields, the installable web experience can drift from the product identity or fail app-store-like install expectations.

**What's Needed:**

Configure the Expo web manifest with required identity, display, color, and icon fields. Use Swiss design tokens: ink for `theme_color` and paper for `background_color`.

Current `apps/mobile/app.json` has top-level `"name": "mobile"`. This story must rename the shipped app identity to `"ValueSnap"` rather than adding a conflicting web-only name. In Expo config, use camelCase fields such as `expo.web.themeColor` and `expo.web.backgroundColor`; Expo emits the underscore-form `theme_color` and `background_color` in the exported web manifest.

The current asset folder has `icon.png`, `adaptive-icon.png`, `favicon.png`, and `splash-icon.png`, but no explicit 192x192 or 512x512 PWA icons. Create those PNG assets under `apps/mobile/assets/images/`, using the existing app icon as the visual source unless a final branded icon is supplied.

**Acceptance Criteria:**

- [ ] `apps/mobile/app.json` changes top-level `expo.name` from `"mobile"` to `"ValueSnap"`
- [ ] Expo web config sets `themeColor: "#0A0A0A"` and exported manifest includes `"theme_color": "#0A0A0A"`
- [ ] Expo web config sets `backgroundColor: "#FAFAF8"` and exported manifest includes `"background_color": "#FAFAF8"`
- [ ] Manifest includes `"display": "standalone"`
- [ ] Manifest includes `"name": "ValueSnap"`
- [ ] Manifest includes `"short_name": "ValueSnap"`
- [ ] New PNG icon assets at 192x192 and 512x512 exist under `apps/mobile/assets/images/`
- [ ] Manifest references the 192x192 and 512x512 PNG icon assets
- [ ] `expo export --platform web` includes the manifest in the exported web output
- [ ] No placeholder icon asset ships as the final install icon

**Files to touch:**

- `apps/mobile/app.json` or Expo config file if present
- `apps/mobile/assets/images/` for 192x192 and 512x512 icon assets
- Exported web manifest verification notes in the story file

---

### Story 6-4: Implement Service Worker for Offline

**Origin:** Epic 6 PWA offline requirement
**Category:** Offline / PWA
**Estimate:** 4-6 hours

**Problem:**
PWA installation without offline behavior is weak. The app should at least cache the shell and provide a controlled offline experience instead of failing unpredictably.

**What's Needed:**

Add service-worker support appropriate for the Expo web export path. Keep the first implementation conservative: cache app shell/static assets and show known error states for API-dependent workflows while offline.

**Acceptance Criteria:**

- [ ] Exported web build registers a service worker without console errors
- [ ] App shell loads after refresh while offline once it has been visited online
- [ ] API-dependent appraisal actions do not pretend to succeed while offline
- [ ] Offline state uses existing Swiss error messaging patterns
- [ ] Cache strategy avoids storing secrets, auth tokens, or private API responses
- [ ] Service worker update behavior is documented in the story completion notes

**Files to touch:**

- Expo web/service-worker config files
- Offline/error-state utilities in `apps/mobile/`
- Focused tests or manual verification notes for offline refresh behavior

---

### Story 6-5: Build Marketing Landing Page

**Origin:** Epic 6 web platform expansion
**Category:** Marketing / web
**Estimate:** 4-8 hours

**Problem:**
The web app needs a public landing surface that communicates ValueSnap's purpose before asking a user to appraise an item.

**What's Needed:**

Create a Swiss minimalist landing page that explains photo-to-valuation, real sold-comps, confidence, and listing workflow. It should route cleanly into the app without disrupting mobile tab navigation.

**Acceptance Criteria:**

- [ ] Landing page exists as a web-friendly route
- [ ] Primary CTA routes to the appraisal/camera flow
- [ ] Copy explains that valuations are estimates based on available market data, not guaranteed sale prices
- [ ] Layout is responsive using Epic 6 grid rules
- [ ] Page avoids decorative gradients, rounded cards, and shadow-heavy SaaS styling
- [ ] Static export includes the landing page without route errors

**Files to touch:**

- Expo Router route for landing surface
- Shared marketing components if needed
- Export verification notes

---

### Story 6-6: Handle Network Errors

**Origin:** Epic 6 resilience requirement + Render backend from Story 5.5-2
**Category:** Network resilience
**Estimate:** 2-4 hours

**Problem:**
Network failures currently risk surfacing as generic or overly technical errors. Users need clear messaging and recovery actions when the Render backend, Wi-Fi, or browser connectivity fails.

**What's Needed:**

Normalize network error handling around a real validation endpoint, not a mock-only path. Use `https://valuesnapapp.onrender.com` for manual and automated probes.

**Idempotency:** Story **6-13** owns the `/api/appraise` idempotency contract. This story (6-6) should not introduce new retry loops that assume duplicate POSTs are harmless until 6-13 is `done` for the appraise path.

This story owns user-facing error mapping that Story 6-7 must preserve. Keep the error surface explicit enough that retry progress, terminal failure, and rate-limit handling can build on it without rewriting the same `lib/api.ts` branches.

**Acceptance Criteria:**

- [ ] Network failures from appraisal submission show a user-readable error message
- [ ] Error copy distinguishes connection problems from validation/API errors where the client can know the difference
- [ ] Recovery action lets the user retry without losing the selected photo
- [ ] Manual validation includes `curl -sS "https://valuesnapapp.onrender.com/health"` and one app-driven failure/recovery scenario
- [ ] Free-tier Render cold starts are not mislabeled as permanent failure before retry policy has a chance to run
- [ ] No secrets or backend internals are exposed in UI copy

**Files to touch:**

- `apps/mobile/lib/api.ts`
- Existing error-state components
- Appraisal submission screen/components
- Tests for client-facing error mapping

---

### Story 6-7: Implement Retry Mechanism

**Origin:** Epic 6 resilience requirement + 5.5-7 network polish
**Category:** Network resilience
**Estimate:** 3-5 hours

**Problem:**
Transient Wi-Fi drops, Render cold starts, and temporary 502/503/504 responses should not immediately fail the appraisal flow when a retry would likely recover.

**What's Needed:**

Build on the existing `fetchWithRetry` helper in `apps/mobile/lib/api.ts`, which already retries transient fetch failures and HTTP 502/503/504 responses from Story 5.5-7. Do not create a second retry helper. This story should refine coverage, UI retry feedback, timeout behavior, and integration with Story 6-6's error mapping.

**Prerequisite:** Story **6-13** must be `done` before this story is accepted: the client must send an idempotency key on `POST /api/appraise`, and the backend must dedupe so bounded retries cannot create duplicate valuation rows.

Validate against the live Render endpoint and preserve the existing `AppraiseError` surface.

**Acceptance Criteria:**

- [ ] Retry validation uses `https://valuesnapapp.onrender.com` as the real endpoint reference
- [ ] Existing `fetchWithRetry` is reused or refined; no duplicate retry helper is introduced
- [ ] Retry behavior preserves Story 6-6's user-facing error mapping
- [ ] Fetch/network errors retry with bounded exponential backoff
- [ ] HTTP 502, 503, and 504 responses retry
- [ ] HTTP 400/401/403 validation/auth errors do not retry
- [ ] HTTP 429 follows Story 6-8 behavior instead of generic retry behavior
- [ ] UI communicates retry progress without blocking cancellation forever
- [ ] Unit tests cover success after retry, terminal network failure, retryable status, non-retryable status, and timeout

**Files to touch:**

- `apps/mobile/lib/api.ts`
- Existing `fetchWithRetry` tests or new focused retry tests under `apps/mobile/__tests__/`
- Tests under `apps/mobile/__tests__/`

---

### Story 6-8: Handle Rate Limit Exceeded

**Origin:** Epic 6 resilience requirement + real API constraints
**Category:** API limits / UX
**Estimate:** 2-4 hours

**Problem:**
ValueSnap depends on paid or quota-limited services. A rate-limit response should not look like a broken app or encourage repeated retries that worsen the limit.

**What's Needed:**

Detect client-visible rate-limit responses and present honest recovery guidance. Validate behavior against mocked 429 responses and keep `https://valuesnapapp.onrender.com` as the real endpoint reference for environment checks.

**Acceptance Criteria:**

- [ ] HTTP 429 maps to a rate-limit-specific user message
- [ ] Message avoids implying the user's item/photo is invalid
- [ ] Retry action is disabled or delayed when a `Retry-After` header is available
- [ ] Generic retry policy from Story 6-7 does not blindly retry 429 responses
- [ ] Story notes cite `https://valuesnapapp.onrender.com` as the real API environment used for validation
- [ ] Tests cover 429 with and without `Retry-After`

**Files to touch:**

- `apps/mobile/lib/api.ts`
- Error-state components
- Tests under `apps/mobile/__tests__/`

---

### Story 6-9: Implement Mobile UX Patterns

**Origin:** Epic 6 UX consistency requirement
**Category:** Mobile UX
**Estimate:** 3-5 hours

**Problem:**
As desktop/PWA work expands, mobile interaction patterns must remain explicit so responsive changes do not degrade the primary phone experience.

**What's Needed:**

Audit and lock mobile-first patterns: bottom tabs, touch targets, single-column flows, camera/library actions, and error recovery.

**Acceptance Criteria:**

- [ ] Mobile keeps bottom tab navigation for Camera, History, and Settings
- [ ] Primary touch targets meet the current project target of at least 48px where tappable controls are newly touched
- [ ] Appraisal flow remains single-column on `width < BREAKPOINTS.desktop`
- [ ] Camera and library photo paths remain reachable on mobile
- [ ] No desktop rail appears below `BREAKPOINTS.desktop`
- [ ] Existing mobile tests or manual screenshots prove no regression in the primary capture flow

**Files to touch:**

- Mobile screen components affected by Epic 6 changes
- Existing camera/history/settings tests where regressions are likely
- Story verification screenshots or notes

---

### Story 6-10: Implement Desktop UX Patterns

**Origin:** Epic 6 desktop requirement + Epic 5.5 Story 5.5-5 planning lock
**Category:** Desktop UX / workstation
**Estimate:** 5-8 hours

**Problem:**
Desktop cannot be a stretched phone layout. The appraisal result screen needs a workstation layout that makes the photo and valuation report visible side by side while keeping navigation restrained.

**What's Needed:**

Implement the desktop appraisal workstation around the existing rail. The rail owns navigation; the center pane owns the item image; the right pane owns valuation/report data. Use CSS flex/grid or equivalent React Native web layout primitives — no hard-coded pane pixel widths.

The tab layout already sets `headerShown: false` in `apps/mobile/app/(tabs)/_layout.tsx`. Treat the no-header requirement as a verification gate: confirm `/appraisal` does not override that behavior at desktop widths, rather than spending time re-implementing header suppression.

**Acceptance Criteria:**

- [ ] On `/appraisal` at `width >= BREAKPOINTS.desktop`, layout renders three panes: rail, image pane, data pane
- [ ] Rail is max 10% of viewport width and capped at 144px at `BREAKPOINTS.largeDesktop`
- [ ] Image pane and data pane split the remaining content width 50/50 after rail width is applied
- [ ] Split is implemented with CSS flex/grid or equivalent percentage/flex values, not hard-coded pane pixel widths
- [ ] Verify no top header bar renders on `/appraisal` at desktop breakpoint; `headerShown: false` already exists in `_layout.tsx` and must not be overridden by the appraisal route
- [ ] Existing local headers on non-appraisal screens may remain if their UX requires them
- [ ] `expo export --platform web` exits with code 0
- [ ] Exported `index.html` includes a preload for the primary typeface in the document head
- [ ] Lighthouse on the exported web appraisal screen reports CLS <= 0.1 on first load; record the result in story completion notes
- [ ] Mobile appraisal layout remains single-column below `BREAKPOINTS.desktop`

**Files to touch:**

- Appraisal result route/components
- `apps/mobile/app/(tabs)/_layout.tsx` if rail integration needs refinement
- `apps/mobile/components/organisms/swiss-sidebar.tsx`
- Export verification notes in the story file

---

### Story 6-11: Desktop Sidebar Collapse

**Origin:** Epic 3 retrospective; desktop rail has no collapse/expand toggle under the 10/45/45 workstation model
**Category:** Desktop UX enhancement
**Estimate:** 3-5 hours

**Problem:**
Story 3-6 shipped a fixed 240px sidebar and explicitly deferred collapse/expand behavior. Under the Epic 6 workstation model, the rail must be restrained enough that content owns the width.

**What's Needed:**

Add collapse/expand behavior only after Story 6-1 and Story 6-10 lock the rail constraints. This story inherits the rail cap and 10/45/45 workstation rules; it does not redefine them.

**Acceptance Criteria:**

- [ ] Collapse behavior reuses `SwissSidebar`; no second rail component is created
- [ ] Expanded rail obeys Story 6-1/6-10 width constraints
- [ ] Collapsed rail remains usable and accessible with clear labels or accessible names
- [ ] User can expand/collapse without route changes or data loss
- [ ] Mobile bottom tab navigation remains unaffected
- [ ] Tests or manual verification cover expanded and collapsed desktop states

**Files to touch:**

- `apps/mobile/components/organisms/swiss-sidebar.tsx`
- `apps/mobile/app/(tabs)/_layout.tsx`
- Sidebar/navigation tests

---

### Story 6-12: Offline Migration Retry Queue

**Origin:** Epic 4 retrospective; failed guest migration is not retried when back online
**Category:** Offline / data resilience
**Estimate:** 5-8 hours

**Problem:**
Guest-to-auth migration can fail while offline or during a transient backend issue. Without a retry queue, the user may believe history migrated when it did not.

**What's Needed:**

Queue failed migration work locally and retry when network health returns. This plan only locks the Render endpoint reference; queue behavior belongs to this future story.

**Idempotency:** For any retried or replayed migration API calls, follow the same idempotency pattern as Story **6-13** (per-endpoint keys + server dedupe) wherever the backend exposes mutating operations — do not assume "retry = safe" without a contract.

**Acceptance Criteria:**

- [ ] Failed guest migration writes a local retry record without exposing secrets
- [ ] Retry queue validates network health against `https://valuesnapapp.onrender.com/health`
- [ ] Queue retries only when app/network state indicates it is reasonable to retry
- [ ] User-facing messaging distinguishes pending migration from completed migration
- [ ] Duplicate migration records are not created by repeated retry attempts
- [ ] Tests cover offline failure, queued retry, successful flush, and duplicate prevention

**Files to touch:**

- Guest/auth migration utilities
- Local persistence layer
- Network health helper
- Tests for migration retry behavior

---

### Story 6-13: Appraise Idempotency Key

**Origin:** Epic 5.5 Story 5.5-7 (`fetchWithRetry` on `POST /api/appraise`) + Epic 5.5 retrospective action item  
**Category:** API contract / data integrity  
**Estimate:** 4-8 hours

**Problem:**  
Client-side retries (and future offline/replay flows) can submit the same logical appraisal more than once. If the server already persisted a valuation but the response never reached the client, an innocent retry can create **duplicate valuation rows** for one user action.

**What's Needed:**

1. **Contract:** Prefer an HTTP **`Idempotency-Key`** header (opaque string, e.g. UUID v4) on `POST /api/appraise`. A request body field is an acceptable alternative only if a client stack cannot set headers reliably — document the chosen shape in `docs/deployment/README.md` or API notes.
2. **Server:** Persist keys with enough context to dedupe safely (e.g. scoped by authenticated user id or guest session identifier + key). On duplicate key with the same semantic payload, return the **existing** valuation response (same `valuation_id` / resource identity) with HTTP 200 — do not insert a second row.
3. **Client:** Generate one idempotency key per user-initiated appraisal submission; reuse the same key across `fetchWithRetry` attempts for that submission; generate a new key for a new user tap.
4. **TTL / cleanup:** Define retention for idempotency records (time- or volume-bounded) so the store cannot grow without bound; document the policy in the story completion notes.

**Acceptance Criteria:**

- [ ] `POST /api/appraise` accepts `Idempotency-Key` (header) or the agreed body field; missing key behavior is defined (reject vs optional for backward compatibility — pick one and document)
- [ ] Duplicate requests with the same key and equivalent payload do not create duplicate persisted valuations
- [ ] Response on replay is stable (same primary identifiers the client already uses)
- [ ] Mobile `appraise()` (or equivalent) sends the key and reuses it across retries from `fetchWithRetry`
- [ ] Automated tests cover: first request succeeds, duplicate returns same outcome, conflicting payload with same key is rejected or handled per documented rule
- [ ] Story file includes a `## Code Review` section before `done`

**Files to touch:**

- `backend/` appraise route handler and persistence layer
- `backend/models.py` or migration if a new store/table is required
- `apps/mobile/lib/api.ts` (and types) — attach key to appraise calls
- `apps/mobile/__tests__/api.test.ts` or backend tests as appropriate

---

### Story 6-14: AI Listing Quality Overhaul

**Origin:** Story 5.5-10 evaluation result (mini: 0/5, 4o: 0/5) + Epic 5.5 retrospective risk callout  
**Category:** AI quality / listing reliability  
**Estimate:** 5-10 hours

**Problem:**  
The current identification stack can produce confident but wrong outputs (including category-level hallucinations). This is worse than low-confidence unknowns because it can push users toward incorrect listing drafts.

**What's Needed:**

1. **Visual grounding first:** Update identification prompting so the model must describe what is literally visible (shape, materials, colors, logos/text, form factor, connectors) before naming brand/model.
2. **Safer output behavior:** Constrain confidence and fallback behavior when grounding evidence is weak. Prevent "HIGH confidence" on unsupported guesses.
3. **Search-keyword quality:** Ensure fallback search keywords remain specific and useful for sold-comp retrieval even when brand/model cannot be confirmed.
4. **Measured re-check:** Re-run a defined photo set evaluation and record pass/fail criteria so quality claims are evidence-based, not anecdotal.
5. **No blind model-cost escalation:** Model upgrade remains conditional on measured improvement, not assumption.

**Acceptance Criteria:**

- [ ] Prompt/spec requires describe-first visual grounding before product naming
- [ ] Confidence output is bounded by grounding evidence; weak evidence cannot emit high-confidence brand/model claims
- [ ] Fallback path provides concrete visual-descriptor keywords (not generic placeholders)
- [ ] Evaluation run is documented with numeric summary and decision outcome
- [ ] If model tier change is proposed, story notes include measured delta and cost rationale; otherwise remain on current tier with explicit justification
- [ ] Story file includes a `## Code Review` section before `done`

**Files to touch:**

- `backend/services/ai.py`
- `backend/models.py` and/or validators if confidence constraints require schema enforcement
- `backend/tests/` AI prompt/validation tests
- Story artifact in `docs/sprint-artifacts/` for evaluation summary and decision notes

---

## Epic 6 Exit Criteria

Epic 6 is not complete until:

- [ ] Story **6-13** (Appraise idempotency key) is `done` before Epic 6 close; if deferred, deferral rationale and explicit duplicate-write risk acceptance must be recorded in epic closeout notes with product sign-off
- [ ] Story **6-14** (AI listing quality overhaul) is `done` before Epic 6 close; if deferred, deferral rationale and explicit listing-quality risk acceptance must be recorded in epic closeout notes with product sign-off
- [ ] Mobile tab navigation and desktop rail navigation both work without route duplication
- [ ] Desktop appraisal screen follows the workstation split and passes static export
- [ ] PWA manifest includes all required Swiss manifest fields and icon sizes
- [ ] Offline/service-worker behavior is documented and verified after export
- [ ] Network error, retry, and rate-limit stories validate against the Render backend reference
- [ ] Mobile capture/appraisal flow remains unchanged below `BREAKPOINTS.desktop`
- [ ] Every completed story includes a `## Code Review` section before moving to `done`

---

## Effort Summary

| Story | Category | Estimate |
|-------|----------|----------|
| 6-1 Implement Tab Navigation | Responsive navigation | 2-4 hrs |
| 6-2 Implement Responsive Grid System | Responsive layout | 3-5 hrs |
| 6-3 Configure PWA Manifest | PWA foundation | 1-2 hrs |
| 6-4 Implement Service Worker for Offline | Offline / PWA | 4-6 hrs |
| 6-5 Build Marketing Landing Page | Marketing / web | 4-8 hrs |
| 6-6 Handle Network Errors | Network resilience | 2-4 hrs |
| 6-7 Implement Retry Mechanism | Network resilience | 3-5 hrs |
| 6-8 Handle Rate Limit Exceeded | API limits / UX | 2-4 hrs |
| 6-9 Implement Mobile UX Patterns | Mobile UX | 3-5 hrs |
| 6-10 Implement Desktop UX Patterns | Desktop workstation | 5-8 hrs |
| 6-11 Desktop Sidebar Collapse | Desktop UX enhancement | 3-5 hrs |
| 6-12 Offline Migration Retry Queue | Offline / data resilience | 5-8 hrs |
| 6-13 Appraise Idempotency Key | API contract / data integrity | 4-8 hrs |
| 6-14 AI Listing Quality Overhaul | AI quality / listing reliability | 5-10 hrs |
| **Total** | | **46-82 hrs** |
