---
story_key: "6-11-desktop-sidebar-collapse"
validation_date: "2026-09-12"
validator_model: "Claude Opus 5 (dual independent subagent review)"
original_score: 6
final_score: 9
improvements_found: 22
improvements_applied: 22
status: "improved"
---

# Validation Report: 6-11-desktop-sidebar-collapse

**Story:** Desktop Sidebar Collapse
**Validated:** 2026-09-12
**Validator:** Claude Opus 5 — two independent subagent reviewers, each with zero knowledge of story creation, plus author-side empirical re-verification of every load-bearing claim

---

## Executive Summary

**Quality Score:** 6/10 → 9/10 (+3)

**Improvements Found:** 22 total
- 🔴 Critical: 6
- 🟡 Medium: 10
- 🟢 Low: 6

**Improvements Applied:** 22 (100% acceptance rate — 21 accepted as proposed, 1 modified by user decision)

**Verdict:** The original draft would have shipped a defective feature while passing every gate it defined for itself. Its collapsed rail rendered three invisible click targets with no active-state indicator; its ARIA structure was invalid; its touch target was ~16px wide behind a factually false justification; and its own verification command could not pass. All 22 findings are resolved. The story's central design question — what the collapsed rail actually shows — was escalated to the user, who chose to resolve the long-standing icons doc conflict rather than work around it.

---

## Validator Scorecard

🎯 **Validator Scorecard**

Found 22 improvements:
- 🔴 **Critical (6):** collapsed rail renders nothing and loses the only active-state indicator; collapse toggle placed inside `role="tablist"` (invalid ARIA); toggle touch target ~16×44px with a false supporting Dev Note; prescribed `npx tsc --noEmit` gate unsatisfiable (20 pre-existing errors); desktop-detection gate misquoted so AC5 was false on native tablets and had no covering test; AC7's "byte-for-byte identical" self-contradictory.
- 🟡 **Medium (10):** missing `useState` import (wouldn't compile); collapsed items 40px vs the 44px convention; no keyboard/focus AC; no 300ms width transition despite a documented rule; `←`/`→` collides with the app's universal "go back" semantics while AC4 demands non-navigating; unmount/resize reset behaviour unspecified; missing mandatory `## Code Review` and `## Change Log`; no verification that the content pane actually widens; false claim that the story "doesn't make the icon divergence worse"; two items were non-testable as ACs.
- 🟢 **Low (6):** `#L318` should be `#L314` (twice); inlined code block labelled "exact" wasn't; overstated `→` precedent; commands omitted working directory and the regression list omitted `tab-layout.test.tsx`; `ux-design-specification.md` never cited despite owning three broken rules; the no-persistence rationale ignored a synchronous alternative.

**Original creator missed these because:**
- It reasoned about the *mechanism* of collapse (state, width, prop plumbing) and never rendered the collapsed state in its head. Removing the label looked like a one-line change; it was actually the deletion of both the destination affordance and the sole active-state signal.
- It treated the epic AC's phrase "clear labels **or** accessible names" as licence to drop visible content, without weighing it against the same sentence's "remains **usable**".
- It asserted accessibility conclusions (44×44, ARIA preserved) instead of computing them. `self-start` shrink-wrapping and `tablist`'s required-owned-children rule both invalidate conclusions that *sounded* right.
- It reused command lines and gate wording from prior stories without running them. `npx tsc --noEmit` was never executed; the project's real gate is `npm run typecheck` against `tsconfig.typecheck.json`.
- It paraphrased the desktop gate from memory of `appraisal.tsx` and assumed `(tabs)/_layout.tsx` matched. It doesn't.
- It never opened `ux-design-specification.md`, which owns the 44×44 rule, the back-arrow convention, and an icon-only rail diagram that directly answers the story's central design question.

**Quality Score:** 6/10 → 9/10 (+3 improvement)

---

## Quality Score Breakdown

| Dimension | Before | After | Change |
|-----------|--------|-------|--------|
| **Completeness** | 1/2 | 1/2 | 0 |
| **Clarity** | 1/2 | 2/2 | +1 |
| **Actionability** | 1/2 | 2/2 | +1 |
| **Accuracy** | 1/2 | 2/2 | +1 |
| **Context Depth** | 2/2 | 2/2 | 0 |
| **TOTAL** | **6/10** | **9/10** | **+3** |

**Completeness deliberately remains 1/2.** AC7 (300ms width transition) has no verified mechanism in this codebase — zero components currently use NativeWind `transition-*` classes, so whether it animates in the exported build is genuinely unknown. The story handles this with an explicit fallback and a mandatory browser check rather than a silent assumption, which is the correct handling, but it is not a resolved gap. The same caveat applies to `cssInterop`-driven icon colour: the export is verified present, the runtime behaviour is not.

**Key improvements:** icon-based collapsed rail resolving the doc conflict; ARIA sibling restructure; corrected touch-target arithmetic (56 → 60px); real verification gate; corrected gate quotation; keyboard/focus AC; transition AC; content-pane measurement AC; mandatory Code Review + Change Log sections.

---

## Detailed Findings

### 🔴 Critical

**Finding 1: CRITICAL — Collapsed rail renders nothing and loses the only active-state indicator**
Location: AC3, Task 2, Dev Notes "no icon or letter-abbreviation system". The item `<Text>` is the `SwissPressable`'s only child, and `font-semibold` on it is the *sole* active signal (`swiss-sidebar.tsx:78-83`). Omitting the label while forbidding icons *and* abbreviations produces a 56px white column of three invisible click targets with no indication of the current route. The prescribed test ("no `Text` node with an item's label exists") would have certified this as correct. **Status: modified** — user chose to resolve the icons doc conflict rather than adopt the recommended first-letter abbreviation. Story now specifies a Feather icon rail with active/inactive icon colour, and `icon` is a required field so a blank item is a compile error.

**Finding 2: CRITICAL — Collapse toggle placed inside `role="tablist"` violates ARIA required-owned-elements**
Location: Task 2, AC6. `tab` is the required owned element of `role="tablist"` (https://www.w3.org/TR/wai-aria-1.2/#tablist); a `role="button"` child fails axe-core's `aria-required-children`. This re-breaks the class of defect Story 6.10's code review fixed (`6-10-implement-desktop-ux-patterns.md:317`, finding #4), while the draft's AC6 simultaneously claimed the ARIA split was "preserved unchanged". **Status: accepted** — new AC5 requires the toggle be a *sibling* of the role container; Task 3 prescribes the outer-wrapper/inner-role-container structure and a test asserts the toggle is not a tablist descendant.

**Finding 3: CRITICAL — Toggle touch target ~16×44px, and the Dev Note justifying it was false**
Location: Task 2 layout bullet, Dev Notes "Touch target sizing". `self-start` → `alignSelf: 'flex-start'` shrink-wraps horizontally, so the rail's 56px never sized the button; the prescribed className had no horizontal padding at all, leaving the advance width of a 16px glyph. Fails WCAG 2.2 SC 2.5.8 (24×24 AA) and the project's 44×44 convention. Every comparable `self-start` pressable in the codebase pairs it with `pr-4` (`appraisal.tsx:201,217,272,457,531`; `listing-form.tsx:367`). **Status: accepted** — className now `self-start px-3 py-3 min-w-[44px] min-h-[44px] items-center justify-center mb-4`; the false Dev Note is replaced with the actual arithmetic; a test asserts `min-w-[44px]`.

**Finding 4: CRITICAL — `npx tsc --noEmit` gate is unsatisfiable**
Location: AC7, Task 5. Verified by execution: bare `npx tsc --noEmit` emits **20 errors**, six inside `swiss-sidebar-nav.story-6-10.test.tsx` and `tab-navigation-surfaces.test.tsx` — the exact files the draft's AC7 forbade editing. The project's real gate is `npm run typecheck` (`tsc --noEmit -p tsconfig.typecheck.json`), and `tsconfig.typecheck.json` exists to exclude test files. **Status: accepted** — AC11 now specifies the project scripts, states the 20-error baseline, and explicitly forbids the bare command.

**Finding 5: CRITICAL — Desktop gate misquoted; AC5 was false and untested**
Location: AC5, AC8. The draft asserted both `appraisal.tsx` and `(tabs)/_layout.tsx` gate on `Platform.OS === 'web' && width >= BREAKPOINTS.desktop`. Only `appraisal.tsx:124` does; `(tabs)/_layout.tsx:23` is `width >= BREAKPOINTS.desktop` alone. The Tabs rail — and therefore the toggle — renders on native iPad Pro landscape, making "no collapse control appears on mobile/tablet" false. Neither the tagged tasks nor any test touched `swiss-tab-bar.tsx`, mobile width, or native platform. **Status: accepted** — AC8 now quotes both gates verbatim, states the native-tablet consequence as pre-existing and out of scope, and ties it to why 44×44 sizing is mandatory rather than optional.

**Finding 6: CRITICAL — AC7's "byte-for-byte identical" was self-contradictory**
Location: AC7 vs Task 2 / AC3. The toggle renders in the expanded tree too, so the expanded output cannot be identical. Once Finding 2's restructure moves width onto an outer wrapper, the existing `tablist`-width assertions (`swiss-sidebar-nav.story-6-10.test.tsx:129-136`, `tab-navigation-surfaces.test.tsx:117-126`) genuinely do need editing. **Status: accepted** — AC11 replaces the absolute claim with two explicitly permitted, individually disclosed edit categories, and the Feather mock requirement (Finding 7's sibling issue) is documented with its import-chain evidence.

### 🟡 Medium

**Finding 7: MEDIUM — `useState` used without an import.** `swiss-sidebar.tsx:1` is `import React from 'react';`; bare `useState` is `TS2304`. **Accepted** — Task 3 now prescribes the exact import line change, citing `swiss-pressable.tsx:1` as the convention.

**Finding 8: MEDIUM — Collapsed items computed to 40px, below the project's 44px convention.** 56 − 2×8 (`px-2`) = 40. **Accepted** — `COLLAPSED_RAIL_WIDTH` set to **60** (60 − 16 = 44), with the arithmetic stated in AC3 and commented at the constant so it can't be "tidied" back to 56.

**Finding 9: MEDIUM — No keyboard/focus requirement for the rail's first focusable element.** Placing the toggle first silently changes Tab order on every desktop screen; `aria-expanded` alone leaves a screen-reader user told "collapsed" with no stated focus outcome. **Accepted** — new AC6 covers Tab order, Enter/Space, focus outline, and focus retention; Task 6(f) verifies in-browser.

**Finding 10: MEDIUM — No width transition despite a documented rule.** `DESIGN-PHILOSOPHY.md:355-357` mandates 300ms width transitions. **Accepted** — new AC7, with an honest note that this is the codebase's first NativeWind `transition-*` usage and an explicit "record the failure, don't ship a silent snap" fallback.

**Finding 11: MEDIUM — `←`/`→` collides with the app's universal "go back" meaning.** Every existing `←` in the app is back-navigation (`appraisal.tsx`, `listing/[id].tsx`, and `ux-design-specification.md:2207-2211`), which contradicts AC4's non-navigating requirement — and the draft cited that reuse as the *reason* the glyph was safe. **Accepted** — replaced with Feather `chevron-left`/`chevron-right`, now consistent with the icon decision.

**Finding 12: MEDIUM — Unmount/resize reset behaviour unspecified.** Crossing 1024px on resize (`(tabs)/_layout.tsx:33`) or navigating out of `/appraisal` (`appraisal.tsx:127-130`, `router.replace`) unmounts the rail and resets `isCollapsed`. **Accepted** — documented in Out of Scope with the mechanism, plus Task 6(g) resize verification.

**Finding 13: MEDIUM — Missing mandatory `## Code Review` section and `## Change Log`.** `frontend-review-checklist.md:30` and `epic-6-plan.md:591` make the review section a hard gate; every comparable story carries a Change Log created at draft time. **Accepted** — both added, plus AC12.

**Finding 14: MEDIUM — No verification that the content pane actually widens.** The draft's smoke check confirmed the rail narrowed but never that the panes reflowed — the actual user benefit. **Accepted** — new AC10 with quantified expectations (+42px @1024, +84px @1440) and Task 6(e) requiring four measured numbers.

**Finding 15: MEDIUM — "Doesn't make the icon divergence worse" was false.** A rail with neither text nor icons is strictly worse than a text-only rail, and `epics.md:1501`'s unimplemented icon AC went unmentioned. **Accepted** — replaced with a `Doc conflict — icons in the navigation rail` section that tabulates all five conflicting sources and resolves it.

**Finding 16: MEDIUM — Two non-testable items were labelled ACs.** AC2's "prop value never changes" is unfalsifiable (props are immutable); AC8 was a bulleted non-goals list with no Given/When/Then and no covering task. **Accepted** — AC2's clause restated as a real constraint (signature stays required/non-optional); the non-goals moved to a separate `## Out of Scope` section outside the AC block.

### 🟢 Low

**Finding 17: LOW — `docs/DESIGN-PHILOSOPHY.md#L318` cited twice for a line at 314.** L318 is the unrelated "Desktop Workstation Appraisal View" heading; Story 6.10 cites `#L314` correctly. **Accepted** — both fixed, References corrected to `#L312-323`.

**Finding 18: LOW — Inlined code block labelled "exact current state" wasn't.** Whitespace differed, imports and type declarations omitted, fence language `typescript` rather than `tsx`. **Accepted** — relabelled "abridged" with the canonical source and line range, fence corrected, and the `useState` import note attached.

**Finding 19: LOW — Overstated `→` precedent.** `←` appears in five places (not three) and in `app/`, not near `components/organisms/`; `→` as a UI glyph appears once (`app/index.tsx:36`). **Accepted** — moot after Finding 11 replaced the glyphs with icons; the embellished claim is gone.

**Finding 20: LOW — Commands omitted working directory; regression list omitted `tab-layout.test.tsx`.** No `package.json` exists at repo root. `tab-layout.test.tsx:105` imports `@/constants/breakpoints` (the module Task 1 edits) and asserts `computeRailWidth` at `:168-182`, though it mocks `swiss-sidebar` wholesale at `:84-92` so it is safe. **Accepted** — "all commands run from `apps/mobile/`" plus project scripts; regression list extended to five files with the safety note.

**Finding 21: LOW — `ux-design-specification.md` never cited.** It owns the 44×44 rule (`#L1194-1197`), the back-arrow convention (`#L2207-2211`), and an **icon-only rail diagram** (`#L2192-2199`) that directly answers the story's central design question. Three findings trace to rules in a document the draft never opened. **Accepted** — added to References and used as primary evidence in the doc-conflict resolution.

**Finding 22: LOW — No-persistence rationale set up a false dichotomy.** Both stated reasons were true, but a module-level variable or context would sync the two mounts synchronously with none of the named drawbacks. **Accepted** — the alternative is now named and rejected on scope grounds rather than left unconsidered.

---

## User Decisions

**Total Findings:** 22
**Accepted:** 21
**Rejected:** 0
**Modified:** 1
**Acceptance Rate:** 100%

**Modified:**
- 🔴 Finding 1 (collapsed rail renders nothing) — validator recommended a first-letter abbreviation preserving the `font-semibold` active indicator as the minimal change. User instead chose to **add the icon system** that `DESIGN-PHILOSOPHY.md:314`, `ux-design-specification.md:2192-2199`, and `epics.md:1501` all specify, resolving the doc/code divergence at its root rather than working around it a third time. Consequence: estimate revised 3–5h → 6–9h; `appraisal.tsx` moves from "not touched" to "touched" (three `icon` fields); Story 3.6's text-only party-mode decision is superseded for the desktop rail only.

---

## Validator Notes

### Analysis Methodology

Two independent subagent reviewers ran in parallel with disjoint mandates and no knowledge of the story's authoring rationale:
- **Validator A — implementability and codebase truth:** verified every factual claim about existing code, every citation, whether each prescribed mechanism actually works in this stack, regression risk to existing tests, and AC↔Task mapping. Scored 6/10.
- **Validator B — requirements fidelity, design, accessibility, scope:** verified the story against the epic plan, retrospective, prior stories, design philosophy, UX spec, and epics; checked ARIA and WCAG against the published standards; judged each out-of-scope call. Scored 7/10.

Both independently identified the same three highest-severity defects, which raises confidence that they are real rather than reviewer artifacts.

**Author-side re-verification before applying:** every load-bearing claim was independently re-checked rather than taken on trust — `npx tsc --noEmit` was executed (20 errors confirmed, validator said 21); `npm run typecheck` and `tsconfig.typecheck.json` confirmed; the `(tabs)/_layout.tsx:23` gate re-read; `DESIGN-PHILOSOPHY.md` line numbers re-read; the mandatory `## Code Review` gate confirmed in `frontend-review-checklist.md:30` (both validators cited `:123`, which is actually inside `5.5-1-enforce-debt-gates.md` quoting the checklist — corrected before applying). Before prescribing the icon replacement, `@expo/vector-icons@^15.0.3` was confirmed present with Feather available, all six glyph names (`camera`, `list`, `settings`, `chevron-left`, `chevron-right`, `circle`) verified against the shipped glyphmap, `cssInterop` confirmed exported by `nativewind@^4.2.3`, and the Feather import chain traced to prove the test-mock requirement (`create-icon-set.js:2` needs `processColor`/`NativeModules`; `icon-button.js:2` needs `TouchableHighlight` — none present in the rail tests' `react-native` mock).

**Core Validation Question:** "Can the DEV agent implement this story without asking any clarification questions?"
**Answer before validation:** NO — it would stop at an unsatisfiable typecheck gate, a missing `useState` import, and an unanswered question about what a collapsed item looks like.
**Answer after validation:** YES for the implementation itself. Two mechanisms (NativeWind `transition-*`, `cssInterop` icon colour) are first-use-in-codebase and carry documented fallbacks with mandatory browser verification rather than assumed success.

### Patterns Observed

- **Asserting accessibility instead of computing it.** Three of six criticals were accessibility conclusions that sounded correct and were arithmetically or normatively false. This is the third consecutive story in this epic to produce that class of finding (6.9's falsely-complete focus trap, 6.10's invalid tab semantics, now this).
- **Inherited command lines are unverified command lines.** `npx tsc --noEmit` was carried over from story-writing habit; the project has had a dedicated `typecheck` script and exclusion config the whole time.
- **The UX spec keeps going unread.** Story 6.9's validation report recommended making `ux-design-specification.md` a mandatory full read for UI stories. It was not read for this story either, and it contained the answer to the story's hardest question.
- **Reasoning about mechanism, not rendered output.** The draft was meticulous about state, props, and tests, and never asked "what does a user see?" Every critical except the typecheck gate flows from that.

### Recommendations

1. **Enforce the UX spec read for UI stories.** This is now the second consecutive validation to find that omission causal. Consider a create-story precondition requiring at least one `ux-design-specification.md` citation for any story with visual ACs.
2. **Require every verification command in a story to have been executed once before the story is marked ready-for-dev.** Finding 4 was free to catch and would have blocked a dev agent immediately.
3. **Require accessibility claims to show their arithmetic.** "Meets 44×44" is not reviewable; "60 − 2×8 = 44" is.
4. **Describe the rendered output of every new UI state in prose before prescribing the code.** A single sentence describing the collapsed rail as a user sees it would have exposed Finding 1 at draft time.
5. **Keep using dual independent validators with codebase access.** The 6/10 → 9/10 delta came entirely from adversarial review; author self-validation had already been performed at draft time and found only one issue (cramped padding), missing all six criticals.
6. **Re-validate after large post-creation edits.** This revision rewrote most of the story and added an icon system; new instruction is new surface area for the same failure modes.

---

## Competitive Stats

**Validator Performance:**
- Findings identified: 22 (6 Critical, 10 Medium, 6 Low)
- Quality improvement: +3 points
- User acceptance rate: 100% (21 accepted, 1 modified toward a more thorough resolution)
- Independent convergence: both validators flagged the same top three defects without coordination
- Author self-validation at draft time found 1 issue; independent validation found 22

**Validator Success:** Found 22 improvements the original creator missed, including three that would each individually have shipped a defective or non-building feature, and one — a collapsed rail of invisible click targets that the story's own prescribed test would have certified as correct — that reproduced the exact "green tests, broken app" failure mode the story itself warned about two sections earlier.

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-09-12 | Validation completed via dual independent subagent review — 22 findings (6 Critical, 10 Medium, 6 Low), all 22 applied (1 modified by user decision to resolve the icons doc conflict) | Claude Opus 5 |

---

_This validation report was generated by the validate-create-story workflow._
