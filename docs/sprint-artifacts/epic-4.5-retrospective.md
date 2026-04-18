# Epic 4.5: Retrospective Debt Resolution — Retrospective

**Date:** April 3, 2026
**Epic Duration:** April 3, 2026 (~1 day)
**Team:** Elawa (Developer)
**Status:** ✅ COMPLETE

---

## Epic Overview

**Goal:** Systematically close every actionable item raised across the Epics 2–4 retrospectives before feature work resumes. No new features — only guard rails, backlog hygiene, and one deferred spike.

**What was delivered:**

```
Epic 2 retro debt: Transformer contract test (Story 4.5-1) ✅
Epic 3 retro debt: Breakpoint constants centralised (Story 4.5-2) ✅
Epic 3/4 retro debt: Frontend pre-review checklist (Story 4.5-3) ✅
Epic 4 retro debt: CI guard for EXPO_PUBLIC service keys (Story 4.5-4) ✅
Epic 2 retro debt: eBay sold-listings API spike (Story 4.5-5) ✅
Epics 2–4 retro debt: 4 named-but-unscheduled backlog stories formalised (Story 4.5-6) ✅
```

**Stories Completed:** 6/6 (100%)

| Story | Title | Category | Outcome |
|-------|-------|----------|---------|
| ✅ 4.5-1 | Transformer Contract Test | Guard rail (test) | 14 tests — covers full response shape + all sub-transformers |
| ✅ 4.5-2 | Centralise Breakpoint Constants | Guard rail (constants) | Zero literal breakpoints remain in component files |
| ✅ 4.5-3 | Frontend Pre-Review Checklist | Process (12 traced items) | Discoverable from copilot-instructions.md |
| ✅ 4.5-4 | CI Lint: EXPO_PUBLIC Service Key | Guard rail (CI) | Fails on service-role name in EXPO_PUBLIC; catches `export` syntax too |
| ✅ 4.5-5 | eBay Sold-Listings API Spike | Investigation | Decision: accept active-listing proxy; defer to post-console access |
| ✅ 4.5-6 | Formalise Deferred Backlog Stories | Backlog hygiene | 4 entries added: 5-11, 6-11, 6-12, 7-13 |

---

## What Went Well ✅

### 1. **The Debt Actually Got Closed**

The most important fact about Epic 4.5 is that it *didn't create its own retrospective items in the categories it was designed to address*. No new transformer key mismatches exist. No new literal breakpoints were introduced. The CI guard is in place. The backlog entries exist. That is the primary success criterion, and it was met.

The Epic 2 retro recommended a transformer contract test. It was re-raised in the Epic 3 retro after the exact bug it would have prevented *actually happened*. Two retros, no action. Epic 4.5 implemented it. If a backend developer renames `identity` → `item_identity` tomorrow, the test suite now fails immediately. The bug class is closed.

**Key Learning:** A retrospective item that fires once without being actioned will fire again. The only way to break the cycle is an explicit debt-clearing commitment before the next feature epic. Epic 4.5 formalised this as a pattern.

---

### 2. **All 6 Stories Were Fully Independent — Parallel Execution Worked**

The plan correctly identified zero cross-story dependencies, allowing all 6 to be implemented in a single pass. The actual execution aligned with the plan: no story blocked on another, no merge conflicts, no ordering decisions needed at runtime.

**Evidence:** All 6 stories landed in a single implementation session, total elapsed time ~1 day vs the 1–2 day estimate.

**Key Learning:** When a sprint's stories are truly independent, declaring them explicitly as "execute in any order or in parallel" at plan time eliminates sprint-planning overhead. The story graph in the 4.5 plan paid for itself immediately.

---

### 3. **Code Review Found Real Issues That Dev Missed**

The full code review (`*code-review for all chapters of epic 4.5`) surfaced 6 issues (1 critical, 3 medium, 2 low) that cleared the implementation bar but had genuine gaps:

| Finding | Severity | What Was Missing |
|---------|----------|-----------------|
| Dev Agent Record empty on all 6 stories | Critical | File lists, completion notes, agent model — zero audit trail |
| `_layout.tsx` JSDoc still contained literal `1024` | Medium | AC2: "none of those literals appear" was not fully satisfied |
| Checklist item lacking epic/story trace | Medium | AC2: "every item includes a past finding reference" not met |
| eBay spike missing rate-limit fields per option | Medium | AC2 spike template required explicit rate-limit info |
| CI script missed `export EXPO_PUBLIC_*` syntax | Low | Valid edge case in env-file syntax |
| No isolated full-shape test for `transformItemDetails` | Low | AC6 coverage gap in sub-transformer |

All 6 were fixed in the review session. The adversarial review workflow earned its existence on this epic — four of the six issues would have been invisible in a casual "looks good" pass.

**Key Learning:** Schedule code review as a first-class follow-up step for every epic, including cleanup/debt epics. An adversarial reviewer with a different context than the implementer is the most effective quality gate available.

---

### 4. **Checklist Is Behaviorally Wired In**

Story 4.5-3 didn't just create a checklist document — it placed a reference in `.github/copilot-instructions.md` under Key Conventions, which loads into every BMAD session automatically. The checklist now runs at the same cognitive priority as "check sprint status" and "load architecture docs". It's not an opt-in; it's part of the activation path.

**Key Learning:** A process improvement that requires conscious opt-in will be skipped under time pressure. Process improvements that are embedded in the default workflow get used by default. The one-line copilot-instructions reference is worth more than 10 "remember to check the checklist" notes in story files.

---

### 5. **eBay Spike Delivered a Useful Non-Answer Cleanly**

Story 4.5-5 was the highest-uncertainty story: a 30-minute investigation into APIs that couldn't be accessed live. The risk was producing vague prose that neither confirmed nor denied anything.

Instead, the spike documented exactly what could be verified from the repo, what couldn't, why neither alternative could be safely committed to without live console access, and arrived at a clear decision: *accept the active-listing proxy* with documented rationale. The spike also caught and documented the pre-existing `search_sold_listings()` naming lie in `backend/services/ebay.py`.

**Key Learning:** A spike doesn't need a "yes, let's do it" outcome to be valuable. A well-reasoned "not yet, because X" is a genuine product decision that prevents premature refactoring. The test for spike quality is whether the "Decision" section is actionable — it was.

---

## What Didn't Go Well ⚠️

### 1. **The Dev Agent Record Convention Was Never Enforced**

All 6 stories were marked `done` with completely empty Dev Agent Records: no file list, no completion notes, no agent model reference. This is not a small documentation gap — it means there is no audit trail for what the agent actually changed or observed during implementation.

The dev-story workflow specifies that the Dev Agent Record must be populated before a story is closed. It was skipped on every single story.

**Root Cause:** The dev agent implemented and marked stories done in a single pass. Without a separate code review session (which was only added after as a code-review workflow invocation), the post-implementation record step had no external enforcement mechanism.

**Consequence:** The review workflow had to operate without the file list it expects. It relied entirely on git status output and direct file inspection to find changes, which is less reliable than a dev-curated list.

**Watch Item:** This pattern — mark done, skip documentation — is low-effort for the implementer but creates compounding quality debt if it becomes the norm. Every future story needs an explicit "populate Dev Agent Record" check before status is moved to `done`.

---

### 2. **Retro Recommendations Are Only as Valuable as the Tracking Behind Them**

The core insight that *created* Epic 4.5 was that three prior retros had generated recommendations that were never actioned, sometimes for months, sometimes until the exact bug they would have prevented actually happened.

Epic 4.5 fixed the debt. But the *structural condition that allowed debt to accumulate* — retro recommendations stored only as prose in files that aren't regularly reviewed — was not addressed by any of the 6 stories.

The four backlog entries added by Story 4.5-6 are now in `sprint-status.yaml`. But there are still open prose recommendations in the retros themselves that don't have formal story entries:

| Retro | Item (prose, no story entry) | Urgency |
|-------|------------------------------|---------|
| Epic 3 retro | Test `useOnlineStatus` with the custom hook rather than duplicating inline polling | Low |
| Epic 4 retro | E2E suite doesn't yet cover the full authenticated history load → sign out flow | Medium |
| Epic 4.5 retro (this doc) | `search_sold_listings()` in `ebay.py` is misleadingly named | Low |
| Epic 4.5 retro (this doc) | Dev Agent Record gap — no enforcement mechanism | Process |

**Watch Item:** The next time a retro is written, the first 10 minutes should be cross-checking whether any prose recommendations from the *prior* retro were either completed or explicitly deferred as a formal story. If neither, they should be added to `sprint-status.yaml` before the retro is published.

---

### 3. **The Checklist Was Strong but Arrived After the Problems**

Story 4.5-3 created a 12-item checklist, every item traceable to a past finding. The problem is that all 12 items trace to findings from Epics 2–4. The checklist was built *reactively*, from the past.

It will prevent the same classes of problems from recurring. What it won't do is anticipate the new classes of problems that are likely in Epic 5, which introduces: form validation, eBay listing API calls, image selection, pre-fill logic, clipboard integration, and manual field editing. None of those appear in the current checklist.

**Watch Item:** After each epic, review the checklist and ask: "What new risk classes does the next epic introduce that aren't on this list?" A checklist that doesn't evolve with the codebase eventually becomes a rote ritual rather than a genuine quality gate.

---

## Lingering Items Requiring Attention

These are items that are known, documented, but not yet in `sprint-status.yaml` as formal stories:

### Process Gaps (No Story Needed — Just Convention)

| Item | What to Do |
|------|-----------|
| Dev Agent Record must be populated before `done` | Add as a story-close gate in the dev workflow; treat an empty File List as a blocker |
| Post-retro story-check gate | Before publishing any retro, search it for prose recommendations not yet in `sprint-status.yaml` |
| Checklist evolution | After Epic 5, audit the checklist for new risk classes (forms, image handling, API pre-fill) |

### Code Debt (Should Be a Story)

| Item | Current Location | Recommended Home |
|------|-----------------|-----------------|
| `search_sold_listings()` function name is misleading; returns active listings not sold data | `backend/services/ebay.py` ~line 385 | Epic 6 maintenance batch or standalone tech-debt story |
| E2E suite doesn't cover the full auth → history load → sign out flow | `apps/mobile/tests/` | Epic 5 or Epic 6 test story |

### Deferred Decisions (Waiting on External Input)

| Item | What's Needed to Unblock |
|------|-------------------------|
| eBay Sold-Listings API — Finding API or Marketplace Insights? | Live eBay developer console access to verify entitlement and sandbox availability |
| OAuth cancel/dismiss/expired-token edge cases (Story 7-13) | Assigned to Epic 7; no action needed now |
| Desktop sidebar collapse/expand (Story 6-11) | Assigned to Epic 6; no action needed now |
| Image hosting / thumbnail uploads for listings (Story 5-11) | Assigned to Epic 5; needs scoping during Epic 5 planning |
| Offline migration retry queue (Story 6-12) | Assigned to Epic 6; no action needed now |

---

## Recommendations for Epic 5

1. **Run the frontend checklist before every story closure** — `docs/frontend-review-checklist.md`. Epic 5 introduces forms (5-1, 5-8), image handling (5-7), and clipboard (5-9). Most of these are covered by existing items, but an eye on new risk classes is warranted.

2. **Populate Dev Agent Record before moving a story to `done`** — File list + one-line completion note is the minimum. The review workflow depends on it. Empty records repeat the Epic 4.5 audit failure.

3. **Track `5-11-image-hosting-thumbnails` early** — Photo upload introduces the first external file-hosting concern in this codebase. Scoping it during Epic 5 planning avoids the pattern of treating it as a non-story detail that lands in a retro later.

4. **One code review per epic, adversarial mode** — Story 4.5 proved the value. Schedule it as a deliberate step after all stories are implemented, not as an optional add-on.

5. **Extend the frontend checklist after Epic 5** — Add at minimum: "Pre-filled fields are clearly distinguished from manually-edited fields in both UI and data model" and "Clipboard write is gated behind explicit user action, not automatic on render."

---

## Closing Assessment

Epic 4.5 achieved its primary goal: the six debt items from Epics 2–4 are closed with real artifacts rather than prose promises. The test exists, the constants are centralised, the checklist is wired in, the CI guard runs on every PR, the spike decision is documented, and the deferred stories are in the backlog.

The meta-lesson of Epic 4.5 applies recursively: retrospective debt compounds if untracked. The items flagged under "Lingering Items" above — particularly the Dev Agent Record convention and the post-retro story-check gate — are the class of process improvements most likely to silently erode if not formalised. They do not need stories. They need to be treated as standing conventions with the same weight as "run tsc before marking done."

Epic 5 can begin from a clean foundation.
