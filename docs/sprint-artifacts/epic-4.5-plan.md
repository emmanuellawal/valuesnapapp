# Epic 4.5: Retrospective Debt Resolution

**Date:** April 3, 2026
**Epic Duration:** Estimated 1–2 days
**Stories:** 6
**Dependencies:** Epic 4 ✅ Complete

---

## Executive Summary

Epics 2–4 each produced retrospectives with concrete improvement recommendations. Because all three retros were written after the fact (April 2, 2026), their recommendations never influenced the execution of subsequent epics. This created a buildup of actionable items that were repeatedly identified, sometimes re-triggered the exact bugs they would have prevented, and accumulated across three epics without resolution.

**Epic 4.5 exists to close every one of them in a single, focused sprint — before Epic 5 begins.**

The items fall into two categories:

1. **Guard rails** — tests, lints, and constants that prevent known classes of bugs from recurring
2. **Backlog hygiene** — named-but-unscheduled stories that need to either be formalised or explicitly cancelled

All stories are small (30 min – 2 hours each). No new features. No refactoring beyond the minimum to close the gap.

---

## Debt Inventory

| # | Item | First Raised | Repeated In | Status Today |
|---|------|-------------|-------------|--------------|
| 1 | `transformValuationResponse` contract test | Epic 2 retro | Epic 3 retro (after the exact bug hit) | **No test exists** |
| 2 | Breakpoint `1024` magic number centralisation | Epic 3 retro | Epic 4 retro | **Literal in 3 files** |
| 3 | Frontend pre-review checklist | Epic 3 retro | Same finding classes recurred in Epic 4 | **No checklist exists** |
| 4 | `EXPO_PUBLIC_*` service-key CI lint | Epic 4 retro | — | **No CI check exists** |
| 5 | eBay sold-listings API spike | Epic 2 retro | — | **Never investigated** |
| 6 | Named-but-unscheduled backlog stories | Epic 2–4 retros | — | **4 items: no entries in sprint-status.yaml** |

---

## Story Dependency Graph

```
All stories are independent — execute in any order or in parallel.

  4.5-1: Transformer contract test
  4.5-2: Centralise breakpoints
  4.5-3: Pre-review checklist
  4.5-4: EXPO_PUBLIC service-key CI lint
  4.5-5: eBay sold-listings API spike
  4.5-6: Formalise deferred backlog stories
```

---

## Story Details

### Story 4.5-1: Add Contract Test for `transformValuationResponse`

**Origin:** Epic 2 retrospective → re-raised Epic 3 retrospective
**Category:** Guard rail (test)

**Problem:** `transformValuationResponse` maps the backend `/api/appraise` response to frontend types. The backend returns `{ identity, valuation, confidence, valuation_id }`. The transformer was originally written with wrong keys (`item_identity`, `market_data`). That bug was only found in Epic 3 Story 3.2 because mock mode was used throughout Epic 2. No test exercises the transformer against the real response shape.

**What's Needed:**
1. Create `apps/mobile/__tests__/transformers.test.ts`
2. Fixture a response that exactly matches the shape returned by `backend/main.py` lines 192–197:
   ```json
   {
     "identity": { /* RawItemIdentity shape */ },
     "valuation": { /* RawMarketData shape */ },
     "confidence": { /* RawConfidenceData shape */ },
     "valuation_id": "uuid-string"
   }
   ```
3. Assert the transformer output maps every field correctly
4. Test edge cases: `valuation_id: null`, `price_range: null`, missing optional fields

**Acceptance Criteria:**
- [ ] Test file exists with ≥4 test cases
- [ ] Fixture uses real key names from backend (`identity`, `valuation`, `confidence`, `valuation_id`)
- [ ] Test fails if key names are changed (proves it would have caught the Epic 3 bug)
- [ ] All sub-transformers tested (`transformItemDetails`, `transformMarketData`, `transformConfidenceData`, `transformIdentifiers`)
- [ ] `parseVisualCondition` fuzzy matching tested (at least 3 edge cases)

**Estimated Effort:** 1–2 hours

---

### Story 4.5-2: Centralise Breakpoint Constants

**Origin:** Epic 3 retrospective → re-raised Epic 4 retrospective
**Category:** Guard rail (constants)

**Problem:** The desktop breakpoint `1024` appears as a literal in three files:
- `apps/mobile/app/(tabs)/_layout.tsx` line 22: `width >= 1024`
- `apps/mobile/app/(tabs)/history.tsx` line 57: `width < 1024`
- `apps/mobile/components/organisms/swiss-sidebar.tsx` line 10 (JSDoc comment)

Additional breakpoints `600` and `1440` appear in `history.tsx` lines 55–59.

**What's Needed:**
1. Create `apps/mobile/constants/breakpoints.ts`:
   ```typescript
   export const BREAKPOINTS = {
     /** Tablet breakpoint (2-column grid) */
     tablet: 600,
     /** Desktop breakpoint (sidebar nav, 3-column grid) */
     desktop: 1024,
     /** Large desktop breakpoint (4-column grid) */
     largeDesktop: 1440,
   } as const;
   ```
2. Update `_layout.tsx` to import `BREAKPOINTS.desktop`
3. Update `history.tsx` to import all three breakpoints
4. Update `swiss-sidebar.tsx` JSDoc to reference the constant

**Acceptance Criteria:**
- [ ] No literal `1024`, `600`, or `1440` breakpoint values remain in component files
- [ ] `constants/breakpoints.ts` is the single source of truth
- [ ] `tsc --noEmit` passes with zero errors
- [ ] Existing screenshot and unit tests pass unchanged

**Estimated Effort:** 30 minutes

---

### Story 4.5-3: Create Frontend Pre-Review Checklist

**Origin:** Epic 3 retrospective
**Category:** Process guard rail

**Problem:** Epics 3 and 4 both had code review findings that a pre-submission checklist would have caught earlier:
- Double-fetch from `useEffect` + `useFocusEffect` coexistence (Story 3.3)
- Missing `accessibilityLabel` on interactive elements (Story 3.3)
- Incorrect `useCallback` dependency array (Story 3.3)
- OAuth cancel/dismiss test paths missing (Story 4.4 → 4.4-2)
- Non-interactive `SettingsRow` announcing as button (Story 4.5 → fixed in 4.8)

**What's Needed:**
1. Create `docs/frontend-review-checklist.md` with concise, checkable items organised by category:
   - **Hooks:** No duplicate `useEffect` + `useFocusEffect` for same data; `useCallback` deps complete; no conditional hook calls
   - **Accessibility:** All interactive elements have `accessibilityLabel`; non-interactive elements don't render as `Pressable`/`TouchableOpacity`
   - **API boundary:** If story touches a transformer, contract test exercises real backend response shape
   - **Test coverage:** Error paths (network, cancel, timeout) have at least one test each; mock mode path tested
   - **Constants:** No new magic numbers for breakpoints, durations, or limits — use existing constants

**Acceptance Criteria:**
- [ ] Checklist exists at `docs/frontend-review-checklist.md`
- [ ] Contains ≤15 items (concise enough to actually use)
- [ ] Each item traceable to a specific past finding
- [ ] Referenced from `.github/copilot-instructions.md` or project conventions so it's discoverable

**Estimated Effort:** 30 minutes

---

### Story 4.5-4: Add CI Lint for `EXPO_PUBLIC_*` Service Key Exposure

**Origin:** Epic 4 retrospective
**Category:** Guard rail (CI / security)

**Problem:** Story 4.1 discovered the frontend `.env` contained the backend service-role key under an `EXPO_PUBLIC_*` variable. Any `EXPO_PUBLIC_*` variable is bundled into the client-side JavaScript and visible to all users. If a production web export had shipped with this value, the service-role key (full database admin access) would have been publicly exposed.

**What's Needed:**
1. Create `apps/mobile/scripts/assert-no-service-key-exposure.sh`:
   ```bash
   #!/bin/bash
   # Fail if any EXPO_PUBLIC variable contains "service" or "SERVICE" in its name
   # This prevents accidentally bundling backend-only credentials
   if grep -rEi 'EXPO_PUBLIC.*(SERVICE|service_role)' apps/mobile/.env apps/mobile/.env.* 2>/dev/null; then
     echo "ERROR: Service-role key found in EXPO_PUBLIC variable"
     exit 1
   fi
   ```
2. Add to existing GitHub Actions workflow (or create `.github/workflows/env-safety.yml` if no CI exists)
3. Also check production web exports for service key strings (extend the existing harness guard from Story 4.12)

**Acceptance Criteria:**
- [ ] Script exists and exits non-zero when a service key is in an `EXPO_PUBLIC_*` variable
- [ ] Script passes on the current `.env` / `.env.example`
- [ ] CI workflow runs the check (or is documented as a manual pre-deploy step if no CI yet)

**Estimated Effort:** 30 minutes

---

### Story 4.5-5: eBay Sold-Listings API Capability Spike

**Origin:** Epic 2 retrospective
**Category:** Technical investigation (time-boxed)

**Problem:** The current `search_sold_listings()` function in `backend/services/ebay.py` uses the eBay Browse API, which returns *active* listings, not *sold* items. The code already documents this limitation (line 389–391):
```
Note: Browse API returns current listings. For true sold data,
you'd need the Finding API with completedItems filter or
marketplace insights API (requires additional eBay approval).
```

This means valuations may skew toward asking price rather than what items actually sell for. The Epic 2 retro recommended a 30-minute spike to assess alternatives. It was never done.

**What's Needed:**
1. Time-box: **30 minutes maximum**
2. Investigate these two alternatives:
   - eBay Finding API `findCompletedItems` with `SoldItemsOnly=true` — does it exist in sandbox? Does it require different auth?
   - eBay Marketplace Insights API — does it require separate application approval?
3. Document findings in a short section appended to `docs/architecture.md` (or a new `docs/analysis/ebay-sold-data.md` if findings are substantial)
4. If an alternative is viable, create a backlog story for the switchover. If not, document the accepted limitation and close.

**Acceptance Criteria:**
- [ ] Both API alternatives investigated (or documented as inaccessible)
- [ ] Findings documented with links to eBay developer docs
- [ ] Decision recorded: switch API, request approval, or accept active-listing proxy
- [ ] If actionable: backlog story added to `sprint-status.yaml`
- [ ] Time-box respected (30 min)

**Estimated Effort:** 30 minutes

---

### Story 4.5-6: Formalise Deferred Backlog Stories

**Origin:** Epics 2–4 retrospectives
**Category:** Backlog hygiene

**Problem:** Four improvement items were given names in retrospectives or story notes but never added to `sprint-status.yaml`. Without backlog entries, they are comments, not commitments. They will be forgotten.

| Item | Named In | Current State |
|------|----------|---------------|
| Story 4.4.3: OAuth edge cases (F4/F5/F6) | Epic 4 Story 4.4-2 notes | Comment only |
| Image hosting / thumbnail upload | Epic 3 retro + multiple story notes | Vague "Epic 6" ref |
| Desktop sidebar collapse/expand for the workstation rail | Epic 3 retro | Not tracked |
| Offline migration retry queue | Epic 4 retro | Not tracked |

**What's Needed:**
1. For each item, make a decision: **schedule it** (add to `sprint-status.yaml` under the appropriate epic) or **cancel it** (document why it's not needed)
2. For items that are scheduled:
   - Add a one-line entry to `sprint-status.yaml` under the most appropriate epic
   - Use `backlog` status
   - Add a brief comment noting origin
3. For items that are cancelled:
   - Note the cancellation reason in the Epic 4.5 completion notes

**Recommended assignments:**

| Item | Assign To | Rationale |
|------|-----------|-----------|
| 4.4.3: OAuth F4/F5/F6 edge cases | Epic 7 (Polish) | Edge cases, not blocking; fits with hardening |
| Image hosting / thumbnails | Epic 5 | Listing creation needs photos; natural home |
| Desktop sidebar collapse | Epic 6 (Platform) | Desktop UX polish under the 10/45/45 workstation model |
| Offline migration retry queue | Epic 6 (Platform) | Network resilience story |

**Acceptance Criteria:**
- [ ] All 4 items either appear in `sprint-status.yaml` or have documented cancellation
- [ ] Each entry has a comment noting its retrospective origin
- [ ] No "future story" references remain without a matching backlog entry

**Estimated Effort:** 30 minutes

---

## Epic 4.5 Exit Criteria

- [ ] `transformValuationResponse` has a dedicated contract test that would fail on wrong key names
- [ ] No breakpoint magic numbers in component files — all reference `BREAKPOINTS` constant
- [ ] Pre-review checklist exists and is discoverable
- [ ] CI lint (or documented manual check) prevents service-key bundling in `EXPO_PUBLIC_*`
- [ ] eBay sold-listings spike documented with clear decision
- [ ] All named-but-unscheduled backlog items formalised or cancelled
- [ ] All 6 stories reach `done` in `sprint-status.yaml`
- [ ] Zero regressions — existing test suite passes
