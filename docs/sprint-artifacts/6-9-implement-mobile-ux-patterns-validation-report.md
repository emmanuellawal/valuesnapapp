---
story_key: "6-9-implement-mobile-ux-patterns"
validation_date: "2026-08-17"
validator_model: "Claude Opus 5 — dual independent subagent validation + manual reconciliation"
original_score: 7
final_score: 10
improvements_found: 23
improvements_applied: 23
status: "improved"
---

# Validation Report: 6-9-implement-mobile-ux-patterns

**Story:** Story 6.9: Implement Mobile UX Patterns
**Validated:** 2026-08-17
**Validator:** Claude Opus 5 — dual independent subagent validation + manual reconciliation

---

## Executive Summary

**Quality Score:** 7/10 → 10/10 (+3)

**Improvements Found:** 23 raw findings (22 distinct after de-duplicating the TypeScript gap, which both validators raised independently)

- 🔴 Critical: 9
- 🟡 Medium: 8
- 🟢 Low: 6

**Improvements Applied:** 23 (100% acceptance rate — 20 accepted as proposed, 3 modified)

**Verdict:** Story materially improved through validation. The original draft was *implementable without clarifying questions* — which was precisely the danger. It would have shipped four confidently-wrong outcomes rather than stalling on ambiguity.

### Methodology note

Validation was performed by **two independent subagents** rather than by self-review, because the validating agent was also the story's author. Self-validation here would have been a conflict of interest: the same reasoning that produced the gaps would have been used to look for them.

- **Validator A** — source-document alignment (`epics.md`, `ux-design-specification.md`, `prd.md`, `architecture.md`, `SWISS-MINIMALIST.md`, prior Epic 6 stories). Returned 12 findings.
- **Validator B** — codebase claim verification (every factual assertion in the story checked against actual source, including `node_modules`, a Babel transform of `app/_layout.tsx`, and a full test-suite run). Returned 11 findings.

Every Critical finding was then **manually re-verified against the source files** before being applied. Three validator-proposed fixes were corrected in the process (see User Decisions → Modified).

---

## Validator Scorecard

🎯 **Validator Scorecard**

Found 23 improvements:

- 🔴 **Critical (9):** Missing UX-spec overlay contract (scrim / tap-dismiss / swipe-dismiss / no-scroll); blanket swipe-disable contradicting the UX spec in three places; full-bleed incorrectly applied to desktop/web; missing motion tokens (150ms linear) and reduced-motion path; accessibility entirely absent from a story that introduces a modal presenting the product's primary output; `RefreshControl` is a silent no-op on the PWA target; Task 6 could not satisfy its own AC due to nested navigators; Task 7.4's test could not execute at all; Tasks 3 and 4 demanded mutually exclusive render structures.
- 🟡 **Medium (8):** False `router.back()` premise; Task 7 mislabelled "(AC: all)" with AC #2 untested; vacuous negative test assertion repeating Story 6-1's HIGH review finding; missing `Change Log`; `GuestBanner` and "Recent valuations" blocks unaccounted for; outdated Reanimated-on-web justification; NativeWind positioning claim contradicted by production code; no TypeScript guidance and an `Animated.Value` re-instantiation trap.
- 🟢 **Low (6):** Unresolved Swiss-vs-scrim opacity conflict; unacknowledged TanStack Query divergence; stale source docs propagated silently; wrong line count (354 vs 433); overlay placed inline instead of in `components/molecules/`; tab-bar inset instruction with no mechanism and no need.

**Original creator missed these because:**

- It treated `epics.md` as the sole requirements authority and read roughly **seven lines of a 2,543-line UX specification**. Three of six ACs have detailed, contradicting specifications elsewhere in that document (`#L2246-2252`, `#L2207-2211`, `#L2359`) that the story never saw.
- It verified claims against **code it had read** but not against **code it had assumed** — `react-native-web`'s `RefreshControl` internals, nested-navigator `screenOptions` cascade semantics, and Jest's transform key coverage for `.css` were all asserted rather than checked.
- It surveyed `camera.tsx` **before** the "Recent valuations" block existed (hence the 79-line discrepancy), and never re-read the file end-to-end.
- It applied the project's own doc-conflict-resolution convention (established in Story 6-2) to the camera-viewfinder question — where it worked very well — and then **failed to apply that same convention** to the three other conflicts in the story.
- It cited only one of four relevant prior stories, missing Story 6-1's HIGH finding on vacuous assertions and Story 6-2's authority-hierarchy precedent.
- It reasoned about **what to type** with high precision and about **whether the result would work on the target platform** with none.

**Quality Score:** 7/10 → 10/10 (+3 improvement)

---

## Quality Score Breakdown

| Dimension | Before | After | Change |
|-----------|--------|-------|--------|
| **Completeness** | 1/2 | 2/2 | +1 |
| **Clarity** | 2/2 | 2/2 | — |
| **Actionability** | 2/2 | 2/2 | — |
| **Accuracy** | 1/2 | 2/2 | +1 |
| **Context Depth** | 1/2 | 2/2 | +1 |
| **TOTAL** | **7/10** | **10/10** | **+3** |

**Key Improvements:** full UX-spec overlay contract added (AC #4), breakpoint gating added (AC #3), platform limitation disclosed (AC #5), AC #6 narrowed with documented authority, AC #7 added for accessibility, Task 3/4 contradiction resolved, Task 7.4 made executable, motion tokens made explicit, four false factual claims corrected, `Change Log` added.

---

## Detailed Findings

### Finding 1: 🔴 CRITICAL — AC #4 discarded the entire Result Card Overlay contract

**Location:** AC #4, Task 4 (`docs/sprint-artifacts/6-9-implement-mobile-ux-patterns.md:16,40-46`)
**Proof:** `docs/ux-design-specification.md:2248-2252`

**Description:** The UX spec defines this exact component in four bullets: slides up from bottom, dark scrim behind (50% black), dismiss by tap-scrim or swipe-down, full content visible without scroll. The story implemented **only the first**. No scrim, no dismissal affordance beyond a "Value Another" button (which is a next-action, not a dismissal), no no-scroll constraint. Dismissal is reinforced twice more at `:1531` and `:1660`.

**Reasoning:** This is the headline feature of the story. Shipping it without a scrim means the result floats over a live-looking camera surface with no visual separation — guaranteed Epic 7 rework on a file that four other stories have already touched.

**Suggested Improvement:** Rewrite AC #4 with the full contract; add scrim (Task 4.5) and swipe-down dismissal via `PanResponder` (Task 4.6), plus a no-scroll constraint (Task 4.11) and matching test assertions.

**Status:** accepted

---

### Finding 2: 🔴 CRITICAL — AC #6's blanket swipe disable contradicts the UX spec in three places, and contradicts AC #4 of the same story

**Location:** AC #6, Task 6.3 (`:18,57`)
**Proof:** `docs/ux-design-specification.md:2207-2211`, `:2251`, `:2137`, `:1661`

**Description:** Task 6.3 reasoned explicitly that *"the AC is an unqualified, blanket requirement"* without ever checking the UX spec, which **requires** swipe gestures in three separate places: swipe-right-to-go-back (`:2209`), swipe-down-to-dismiss on this story's own result overlay (`:2251`), and swipe-to-dismiss on toasts (`:2137`). AC #6 as originally written forbade the very gesture AC #4's source spec mandates.

**Reasoning:** Story 6-2 established the project's authority hierarchy in writing — *"The story follows the UX spec table because it is the detailed design authority"* (`6-2-implement-responsive-grid-system.md:250`). The story picked the losing side of that hierarchy without noting a conflict existed.

**Additional fact established during reconciliation:** `(tabs)` is the **initial route** of the root `Stack` (`app/_layout.tsx:146`), so no back gesture can fire from the camera tab at all — the accidental-navigation risk the epic names **does not exist** at the route it was written to protect.

**Suggested Improvement:** Narrow AC #6 to the camera tab route; add a "Doc conflict — swipe gestures" Dev Notes block resolving it per the 6-2 precedent; explicitly preserve spec-required gestures.

**Status:** modified — see User Decisions

---

### Finding 3: 🔴 CRITICAL — Task 3.4 applied full-bleed to desktop, contradicting four source documents

**Location:** AC #3, Task 3.4 (`:15,37`)
**Proof:** `docs/ux-design-specification.md:66`, `:2315`, `:2359`; `docs/epics.md:1618`, `:1643`; `docs/prd.md:1106`

**Description:** Task 3.4 instructed *"apply the same full-bleed wrapper to both the native and web branches for consistency."* Every source says the opposite: the platform table at `:2359` reads Mobile = "Full-bleed viewfinder", Tablet = "Centered viewfinder", Desktop = "Upload zone + preview"; `:2315` requires the tablet viewfinder "constrained to center"; the entire epic AC block is gated "**Given** the user is on a mobile device (FR45)" (`epics.md:1618`); and desktop capture is Story 6.10's scope (`epics.md:1643`). `prd.md:1106` defines FR45 as "phones, **tablets**", so tablet is in scope for this story and must get the *centered* treatment.

**Reasoning:** `Platform.OS === 'web'` covers desktop browsers. Stripping the max-width from `FileUpload` yields an edge-to-edge upload zone on a 1920px monitor, directly contrary to spec and pre-empting Story 6.10.

**Suggested Improvement:** Gate full-bleed on `width < BREAKPOINTS.tablet` via `useWindowDimensions()`; keep `ScreenContainer` at tablet and above.

**Status:** modified — see User Decisions

---

### Finding 4: 🔴 CRITICAL — The slide animation violated Swiss motion tokens and ignored `prefers-reduced-motion`

**Location:** Tasks 4.2, 4.5; Dev Notes "Overlay animation library choice" (`:42,45,78`)
**Proof:** `docs/ux-design-specification.md:725-733`, `:826-843`, `:1204-1208`, `:2413-2417`, `:2527-2535`

**Description:** The story specified `Animated.timing` with **no `duration` and no `easing`**. React Native defaults to **500ms ease-in-out**. The design system mandates **150ms linear** (`:727-733`). Separately, `:839-841` lists "Slide/scale animations" under **Forbidden**, with `:2216` carving out the single exception ("Exception: Result card slides up in camera flow") — which the story never cited, leaving a reviewer no way to know the slide was sanctioned. Reduced motion is required twice (`:1204-1208`, `:2413-2417`) with a reference implementation at `:2527-2535`; the story's only animation had no reduced-motion path.

**Reasoning:** A 500ms eased slide is 3.3× the mandated duration with a forbidden easing curve — visibly off-brand, and a WCAG 2.1 AA obligation attached to the one animation this story introduces.

**Suggested Improvement:** Specify `duration: 150, easing: Easing.linear, useNativeDriver: true` explicitly; cite the `:2216` exception; add Task 4.9 for `AccessibilityInfo.isReduceMotionEnabled()` + `reduceMotionChanged` subscription with `duration: 0`; add matching tests.

**Status:** accepted

---

### Finding 5: 🔴 CRITICAL — Accessibility obligations belonging to this story were entirely absent

**Location:** Line 20 (the story's only accessibility content was a deferral)
**Proof:** `docs/ux-design-specification.md:1210-1214`, `:2268-2272`, `:2386`, `:2396-2406`

**Description:** The touch-target deferral to Story 7.2 is **correct** and was confirmed (`epics.md:1627`; Story 7.2 at `epics.md:1677-1690` owns it). But three other obligations attach to the modal overlay this story creates: `:1214` names "Live regions for dynamic content (**valuation results**)" verbatim; `:2268-2272` Modal Rules require "Always dismissible", "Focus trap for accessibility", "Return focus on close"; `:2386` requires Escape to close modals on web.

**Reasoning:** A screen-reader user would get a silent screen change after appraisal — the price is never announced. That is the core value of the product.

**Suggested Improvement:** Add AC #7; add Task 4.10 specifying `accessibilityLiveRegion="polite"`, `accessibilityViewIsModal`, `accessibilityRole="summary"`, `aria-live` on web, focus return via `AccessibilityInfo.setAccessibilityFocus()`, and Escape handling; add Task 7.2 assertions.

**Status:** modified — see User Decisions

---

### Finding 6: 🔴 CRITICAL — Pull-to-refresh is a silent no-op on web, and the story didn't say so

**Location:** Tasks 5.1–5.4 (`:48-52`)
**Proof:** `apps/mobile/node_modules/react-native-web/dist/exports/RefreshControl/index.js:15-28`; `react-native-web/dist/exports/ScrollView/index.js:600-603`

**Description:** `react-native-web`'s `RefreshControl` lists `onRefresh`, `refreshing`, `colors`, and `tintColor` in its `_excluded` array, destructures them off, and returns a bare `<View>`. `ScrollView` clones it as a wrapper, so it renders — with no gesture, no spinner, and `onRefresh` never invoked. This app ships as a static-exported PWA, so AC #5 was **unsatisfiable on the primary distribution target**.

**Reasoning:** This is the most dangerous finding in the set because it is the only one that **does not announce itself**. It renders, it type-checks, it passes any test-renderer assertion, and it does nothing. Every other problem here surfaces as a crash, a contradiction, or a wrong number. A developer would implement Task 5 exactly as written, verify it in the iOS simulator, and ship a dead feature to web marked done.

**Suggested Improvement:** Amend AC #5 to native-only; add Task 5.4 as an explicit platform-limitation warning with the `node_modules` citation and an instruction not to polyfill; note `tintColor`/`colors` are native-only in 5.5.

**Status:** accepted

---

### Finding 7: 🔴 CRITICAL — Task 6 could not satisfy AC #6, and its safety premise was false

**Location:** Tasks 6.1–6.3; Dev Notes "Files Already Correct" (`:55-57,84`)
**Proof:** `app/_layout.tsx:145`; `app/auth/_layout.tsx:15-22`; `app/account/_layout.tsx:5-12`; `app/+not-found.tsx:9`; `app/modal.tsx`

**Description:** Three compounding errors. **(a)** React Navigation `screenOptions` apply only to a navigator's own direct screens; `auth/` and `account/` are **separate nested Stack navigators**, so a root-level `screenOptions` never reaches them — the "app-wide" claim was structurally false. **(b)** The premise *"every screen already sets `headerShown: false`, no native header anywhere"* is contradicted by the code: `auth/_layout.tsx:20` and `account/_layout.tsx:10` explicitly configure **visible** headers with `headerBackTitle: 'Back'`; `+not-found.tsx:9` sets only `title`; `modal.tsx` sets nothing. **(c)** `gestureEnabled` on `@react-navigation/native-stack@7.14.11` is **iOS-only** — a no-op on Android and web.

**Reasoning:** The developer would have made the change, seen no test failure, and marked AC #6 satisfied while half the push/pop surface remained fully swipeable.

**Suggested Improvement:** Scope to the `(tabs)` `Stack.Screen`; document the iOS-only platform limitation; explicitly instruct not to touch the nested auth/account stacks or `modal.tsx`'s dismissal; correct the false Dev Notes premise.

**Status:** modified — see User Decisions

---

### Finding 8: 🔴 CRITICAL — Task 7.4's mock list was missing 7 mocks; the test could not run at all

**Location:** Task 7.4 (`:63`)
**Proof:** `app/_layout.tsx:2,4,9,10,12,29,72,56-59,86-88`; `global.css:1`; `jest-expo/jest-preset.js`

**Description:** Verified by transforming `app/_layout.tsx` through the project's own `babel.config.js`. The output contains a literal `require("../global.css")`. Jest's transform keys cover `\.[jt]sx?$` plus asset extensions — **`css` matches none** — and `moduleNameMapper` has no CSS entry. `global.css:1` is `@tailwind base;`, so the require throws a `SyntaxError` before a single assertion executes. Six further unmocked imports follow: `expo-linking` (whose `addEventListener` return must expose `.remove()`, called in cleanup at `:136`), `react-native-reanimated`, `@expo/vector-icons/FontAwesome`, `@react-navigation/native` (`DefaultTheme.colors` spread at module scope), and `@/components/useColorScheme`. Two required shapes were also unstated: the `expo-font` mock **must** return `[true, null]` (`:86-88` returns `null` otherwise), and the `expo-router` mock **must** export `ErrorBoundary` (re-exported at `:56-59`).

**Reasoning:** As written, the task fails on the first `require` with an error that points at Tailwind rather than at the test — a long and confusing debugging loop.

**Suggested Improvement:** Replace the mock list with the exhaustive verified list, including the `global.css` virtual mock, both required mock shapes, the `LogBox`/`Platform` caveat for wholesale `react-native` mocking, and a note that `@/lib/env` is optional (`validateEnv()` is a no-op under Jest).

**Status:** accepted

---

### Finding 9: 🔴 CRITICAL — Tasks 3 and 4 demanded mutually exclusive render structures

**Location:** Task 3.2 vs Task 4.1 (`:35` vs `:41`)

**Description:** Task 3.2 scoped the full-bleed wrapper to "the branch where there is no `error`, no `lastResult`, and the user hasn't captured a photo yet." Task 4.1 required the result to render "as an overlay positioned on top of the full-bleed camera surface." Both cannot hold: if the surface isn't rendered when `lastResult` is set, there is nothing to overlay. AC #4 and `ux-design-specification.md:2249` both say "over the viewfinder / camera surface."

**Reasoning:** A developer follows 3.2 literally, then reaches 4.1 and must rebuild the structure just completed — wasted work caused purely by the story contradicting itself.

**Suggested Improvement:** Rewrite 3.2's condition to render the full-bleed surface whenever there is no `error` and no `isProcessing`, **including while `lastResult` is set**, with the result rendering as an absolutely-positioned sibling above it.

**Status:** accepted

---

### Finding 10: 🟡 MEDIUM — Task 6.2 made a factually wrong claim about `router.back()`

**Location:** Task 6.2; References line 118 (`:56,118`)
**Proof:** `app/appraisal.tsx:112,128,185,305,360`; `app/listing/[id].tsx:146`; `app/account/delete-confirm.tsx:118`

**Description:** The story claimed every pushed screen provides a "← Back" control *"calling `router.back()`"* and cited `appraisal.tsx#L111,127,184,304`. **Three of those four call `router.replace('/history')`**, not `router.back()`; only `:305` uses `back()`. The cited line numbers were also each off by one.

**Reasoning:** The safety argument for AC #6 rested on this claim. The conclusion survives (an explicit back affordance does exist everywhere), but a developer verifying the premise finds it false and loses confidence in the remaining Dev Notes — and `replace` vs `back` is behaviorally meaningful when reasoning about the navigation stack.

**Suggested Improvement:** State the mixed reality precisely with corrected line numbers, in a dedicated "Correction to a claim carried in earlier drafts" Dev Notes block alongside the `headerShown` correction.

**Status:** accepted

---

### Finding 11: 🟡 MEDIUM — Task 7 claimed "(AC: all)" while AC #1 and AC #2 had no tests

**Location:** Lines 29-31, 59-64

**Description:** Task 2's header promised "verification + one lightweight assertion", but both subtasks were pure verification and one was a prohibition. No test touched AC #2. Task 1.3 explicitly forbade a test for AC #1. The "(AC: all)" label was inaccurate.

**Reasoning:** AC #2 ("tab bar never scrolls away") is the one AC with a plausible regression path — someone later nesting the tab bar inside a scroll container. The story identified exactly that risk and then declined to protect it.

**Suggested Improvement:** Relabel Task 7 to the ACs it actually covers; add Task 7.6 asserting `SwissTabBar` comes from the `tabBar` render-prop and is not a `ScrollView` descendant; make Task 2.4 point at it so the promise is kept.

**Status:** accepted

---

### Finding 12: 🟡 MEDIUM — Task 7.1's assertion repeated the exact failure mode flagged in Story 6-1's review

**Location:** Task 7.1 (`:60`)
**Proof:** `docs/sprint-artifacts/6-1-implement-tab-navigation.md:249-250`

**Description:** `expect(wrapper.props.className).not.toContain('max-w')` passes if the wrapper is missing, if `className` is undefined, or if the developer wrapped it in a different component entirely. Story 6-1's **HIGH** review finding was precisely this: *"The test would still pass if `SwissSidebar` reverted to `style={{ width: 240, flex: 1 }}`."*

**Reasoning:** The story cited 6-8's learning about weak assertions and then wrote a weak assertion, while never citing 6-1 — the more relevant precedent from the same epic.

**Suggested Improvement:** Convert to positive assertions on a stable `testID` (`camera-fullbleed-surface`), assert `flex-1`/`w-full` present and `screen-container` absent, add the tablet-width branch assertion, and add Story 6-1 to Previous Story Intelligence.

**Status:** accepted

---

### Finding 13: 🟡 MEDIUM — `GuestBanner` and "Recent valuations" were unaccounted for

**Location:** Tasks 3–4; `app/(tabs)/camera.tsx:409`, `:412-430`

**Description:** Beyond the capture surface and result block, `ScreenContainer` also wraps a `<GuestBanner>` and a full "Recent valuations" section rendering a second `ValuationCard` from `recentResultRef`. Neither task mentioned them.

**Reasoning:** Once the capture surface goes edge-to-edge these two blocks have no defined home, forcing the developer to invent placement — and `camera-guest-mode.test.tsx` exercises the guest-banner path.

**Suggested Improvement:** Add Task 3.6 with a recommended placement (both stay in `ScreenContainer` in the constrained branch; `GuestBanner` absolutely positioned and "Recent valuations" suppressed in the full-bleed branch) and a check that `camera-guest-mode.test.tsx` still passes.

**Status:** accepted

---

### Finding 14: 🟡 MEDIUM — The Reanimated-on-web justification was factually outdated

**Location:** Task 4.2; Dev Notes "Overlay animation library choice" (`:42,78`)

**Description:** `react-native-reanimated` resolves to **4.1.6**. Reanimated 4's layout-transitions documentation publishes an Android/iOS/**Web ✅** compatibility table for entering/exiting animations, and the 4.0.0 release notes explicitly call out improved web support; only `springify()` is web-unsupported. The story's claim of "inconsistent `react-native-web` support" was true of Reanimated 2/3 and is not true of the installed major version.

**Reasoning:** The *recommendation* is still right, but for a different reason. A developer who checks the docs finds the stated reason false and may reasonably override the decision. The real reason: this repo has **no Reanimated Jest setup** (no `setupFiles`; `jest-expo`'s preset ships no Reanimated mock), so introducing it into `camera.tsx` risks worklet/native-init failures across every existing `camera-*.test.tsx`.

**Suggested Improvement:** Rewrite the rationale around the missing Jest setup, and state the corrected web-support fact so the record is accurate.

**Status:** accepted

---

### Finding 15: 🟡 MEDIUM — Task 4.3's NativeWind rationale was contradicted by this codebase

**Location:** Task 4.3 (`:43`)
**Proof:** `apps/mobile/components/organisms/swiss-tab-bar.tsx:69`

**Description:** The story claimed NativeWind doesn't reliably support `position`/inset utilities across RN + RN-Web. `swiss-tab-bar.tsx:69` ships `className="absolute top-0 left-0 right-0"` in production under passing tests. These are standard Tailwind utilities, not arbitrary values.

**Reasoning:** A false constraint pushes the developer toward inline styles throughout the new component, diverging from the codebase's established styling convention for no reason.

**Suggested Improvement:** Use `className="absolute left-0 right-0 bottom-0"`, citing `swiss-tab-bar.tsx:69`; reserve inline `style` for the `Animated.Value` transform (genuinely not expressible as a class) and the scrim's `rgba()`.

**Status:** accepted

---

### Finding 16: 🟡 MEDIUM — No TypeScript guidance, and an `Animated.Value` re-instantiation trap

**Location:** Tasks 4.2, 4.5, 7.3 — raised independently by **both** validators

**Description:** No types were specified anywhere. `const v = new Animated.Value(0)` in a render body re-creates the value every render and resets the animation — a classic bug. Task 4.5 required animating toward `translateY: overlayHeight` without saying where `overlayHeight` comes from. Story 6-1 carried a dedicated TypeScript notes section; 6.9 had none.

**Reasoning:** The animation would appear to work in the simulator on first mount and then behave erratically on re-render — expensive to diagnose, trivial to prevent.

**Suggested Improvement:** Add Task 4.12 specifying `useRef(new Animated.Value(0)).current`, `onLayout` measurement with `LayoutChangeEvent` and `useState<number>(0)`, and the `screenContainer.props.refreshControl` read pattern for Task 7.3.

**Status:** accepted

---

### Finding 17: 🟢 LOW — Unresolved Swiss-vs-scrim opacity doc conflict

**Location:** Not addressed anywhere in the original story
**Proof:** `docs/SWISS-MINIMALIST.md:256` vs `docs/ux-design-specification.md:2250`

**Description:** `SWISS-MINIMALIST.md:256` states *"**Using Opacity:** Things should be clearly visible or not there. Avoid 50% opacity overlays."* The UX spec at `:2250` mandates a "Dark scrim behind (50% black)". Direct opposition — and once Finding 1 is applied, the developer hits it immediately.

**Reasoning:** Without a stated resolution the developer either splits the difference at some invented opacity or stalls. The project already has a convention for this (Story 6-2).

**Suggested Improvement:** Add a "Doc conflict — scrim opacity" Dev Notes block resolving to `rgba(0,0,0,0.5)` — the UX spec is component-specific where `SWISS-MINIMALIST.md` is a general rule — with an explicit "do not compromise at a different opacity."

**Status:** accepted

---

### Finding 18: 🟢 LOW — TanStack Query divergence unacknowledged

**Location:** Task 5 (`:48-53`)
**Proof:** `docs/architecture.md:449-473`

**Description:** `architecture.md:451-453` assigns server state to TanStack Query, whose idiomatic pull-to-refresh is `refetch()` + `isRefetching` rather than a hand-rolled `isRefreshing` boolean. The story's approach is correct (it follows existing `history.tsx` code) but said so nowhere, and `architecture.md` was **not cited once** in the entire References section.

**Suggested Improvement:** Add a "State management divergence" Dev Notes block recording the deliberate choice and marking a TanStack migration out of scope; add `architecture.md` citations to References.

**Status:** accepted

---

### Finding 19: 🟢 LOW — Stale source docs propagated without flagging

**Location:** References lines 113, 116
**Proof:** `docs/architecture.md:693`; `docs/verification/architectural-decision-expo-camera.md:326`

**Description:** Both source docs refer to `(tabs)/index.tsx` as the camera screen; the actual file is `(tabs)/camera.tsx` (which the story correctly targets). The story silently used the right path without noting two cited documents are stale.

**Suggested Improvement:** Add a one-line note to Project Structure Notes identifying both stale references and instructing use of the current path.

**Status:** accepted

---

### Finding 20: 🟢 LOW — `camera.tsx` line count was wrong (354 vs 433)

**Location:** Project Structure Notes (`:88`)

**Description:** `wc -l` returns **433**. The 79-line gap is approximately the size of the "Recent valuations" block from Finding 13, indicating the file was surveyed before those additions and never re-read.

**Suggested Improvement:** Correct to 433 lines.

**Status:** accepted

---

### Finding 21: 🟢 LOW — Overlay should be a `components/molecules/` file, not inline

**Location:** Task 4.1 (`:41`)
**Proof:** `docs/architecture.md:945`

**Description:** `architecture.md:945` lists `processing-overlay.tsx` under `components/molecules/`, establishing overlays as molecules in this project. Task 4 placed the animated overlay inline in `camera.tsx`, conflicting with that convention and making Task 7.2's assertion awkward (asserting on a raw inline `style` object instead of a named component's props).

**Suggested Improvement:** Extract to `components/molecules/valuation-result-overlay.tsx` with a typed props contract and `testID="valuation-result-overlay"`, exported from `components/molecules/index.ts`.

**Status:** accepted

---

### Finding 22: 🟢 LOW — Task 4.6's tab-bar-inset instruction had no mechanism and no need

**Location:** Task 4.6 (`:46`)
**Proof:** `app/(tabs)/_layout.tsx:32-34`; `components/organisms/swiss-tab-bar.tsx:22`

**Description:** The task said the overlay "must sit above `SwissTabBar`" and to "account for the tab bar's own safe-area bottom inset handling (`Math.max(insets.bottom, 8)`)" without giving any way to do it. The overlay is inside the screen, which the Tabs navigator renders as a **sibling** of the tab bar — so `bottom: 0` is already the tab bar's top edge and no inset math is needed.

**Reasoning:** As written it invites the developer to add phantom bottom padding, producing a visible gap.

**Suggested Improvement:** Replace with an explicit statement of the sibling relationship and a "do **not** add `insets.bottom` compensation" instruction.

**Status:** accepted

---

### Finding 23: 🟢 LOW — No `Change Log` section, unlike every other Epic 6 story

**Location:** Story originally ended at `### File List` (`:129`)
**Proof:** `6-1:280`, `6-2:341`, `6-4:373`, `6-8:198`

**Description:** All four peer stories carry a `Change Log`. Its absence means the developer won't populate it and the reviewer will flag it — 6-1's final review pass explicitly corrected artifact drift there.

**Suggested Improvement:** Append a `| Date | Version | Description | Author |` table matching the peer-story format.

**Status:** accepted

---

## User Decisions

**Total Findings:** 23
**Accepted:** 20
**Rejected:** 0
**Modified:** 3
**Acceptance Rate:** 100%

**Accepted Improvements:** Findings 1, 4, 6, 8, 9 (Critical); 10, 11, 12, 13, 14, 15, 16 (Medium); 17, 18, 19, 20, 21, 22, 23 (Low) — applied as proposed.

**Modified Improvements:**

- 🔴 **Finding 2 — AC #6 swipe gestures (AC #6, Task 6).** Both validators identified the problem but proposed **opposite fixes**: Validator A said narrow the AC to the camera route; Validator B said make the app-wide disable actually work by adding `gestureEnabled: false` to the root plus both nested stacks. This is a product decision, not a technical one, so it was escalated rather than decided by the author. **User selected: narrow.** Applied as a per-route option on the `(tabs)` `Stack.Screen`, with spec-required gestures explicitly preserved and the conflict resolved in Dev Notes per the Story 6-2 authority precedent. The rationale was additionally **strengthened during reconciliation** with a fact neither validator surfaced: `(tabs)` is the root Stack's initial route, so no back gesture can fire from the camera tab at all — making the epic's stated risk nonexistent at the route it was written to protect, and making the narrowing zero-cost rather than a trade-off.
- 🔴 **Finding 3 — full-bleed breakpoint gating (Task 3.4).** Accepted, but the proposed fix was **sharpened**. Validator A's wording leaned on not applying full-bleed "to the web `FileUpload` branch", which implies a `Platform.OS === 'web'` gate. That check is wrong: **mobile web browsers are also `'web'`**, so a platform gate would deny full-bleed to exactly the mobile PWA users AC #3 targets. Task 3.4 now gates on **width** via `BREAKPOINTS.tablet` + `useWindowDimensions()`, with an explicit warning that platform is not a proxy for form factor.
- 🔴 **Finding 5 — accessibility citation (AC #7, Task 4.10).** Accepted in substance, **citation corrected**. Validator A cited `docs/prd.md:1178` (NFR-A6) as requiring announcements. On manual verification that row is scoped to **error messaging**, not results — it does not support the claim. The requirement is genuinely established by `docs/ux-design-specification.md:1214`, which names "valuation results" verbatim, plus `:2405` mapping dynamic states to `aria-live="polite"`. The story cites the correct sources; the over-broad `prd.md` reference was dropped. Putting a wrong reference into a story is the exact failure class this validation exists to eliminate.

---

## Validator Notes

### Analysis Methodology

**Systematic Checklist Applied:**

- [x] All ACs are implementable (no vague requirements)
- [x] Tasks map correctly to ACs (every AC has corresponding tasks)
- [x] Dev notes are comprehensive (architecture, patterns, constraints)
- [x] Previous story learnings are referenced and applied
- [x] Architecture alignment verified (matches `architecture.md`)
- [x] Anti-patterns documented (what NOT to do)
- [x] Testing strategy is clear (how to verify)
- [x] File structure matches project conventions
- [x] TypeScript/types are properly specified
- [x] Accessibility requirements included

**Core Validation Question:** "Can the DEV agent implement this story without asking any clarification questions?"

**Answer before validation:** YES — **and that was the problem.** The original story was prescriptive enough that an agent would execute it start to finish without hesitating, then produce: an overlay with no scrim and no dismissal, an edge-to-edge upload zone on desktop monitors, a 500ms eased slide violating the 150ms-linear token, app-wide gesture disabling that both broke spec-required navigation *and* failed to reach half the navigators it claimed to cover, a completely dead pull-to-refresh on the PWA, a test that crashes on `require("../global.css")`, and zero screen-reader support for the app's primary output. Every one of those is *confidently* wrong rather than *ambiguously* wrong, so every one would have shipped.

**Answer after validation:** YES — with the platform limitations, doc conflicts, and factual corrections now stated explicitly rather than assumed.

### Patterns Observed

- **Precision without verification is the dominant failure mode.** The story scored 2/2 on Clarity and Actionability while scoring 1/2 on Accuracy. Confident, specific, wrong instructions are more dangerous than vague ones: vagueness triggers a question, false precision triggers execution. Nine of 23 findings were factual claims that were simply never checked (`RefreshControl` internals, `screenOptions` cascade semantics, Jest `.css` transform coverage, `headerShown` across screens, `router.back()` call sites, Reanimated web support, NativeWind positioning, line count, `gestureEnabled` platform scope).
- **Single-source requirements gathering.** The story mined `epics.md` thoroughly and the UX specification barely — ~7 lines of 2,543. Three of six ACs had contradicting detailed specs it never saw. The epic is an *index* of requirements; the UX spec is the *contract*.
- **The project's own conventions were available and under-applied.** Story 6-2 had already established a doc-conflict resolution pattern with a named authority hierarchy, and Story 6-1 had already been reviewed HIGH for vacuous assertions. The story reproduced both mistakes while citing neither. Prior-story intelligence was treated as a courtesy section rather than a checklist.
- **Author-as-validator is structurally unsound.** The same blind spots that produced the gaps would have been used to search for them. Independent adversarial validation with codebase access found 23 issues; self-review would plausibly have found the typos.

### Recommendations

1. **Add a standing "platform reality check" step to `create-story`** for any story touching a `react-native` core component that will run on web. `RefreshControl` is not unique — `react-native-web` stubs several APIs silently. Grep the actual `node_modules` implementation before writing an AC that depends on runtime behavior.
2. **Make `ux-design-specification.md` a mandatory full-read for UI stories.** The `create-story` workflow already declares `load_strategy: FULL_LOAD` for it; that was not honored in practice. Consider requiring a minimum count of distinct UX-spec citations for any story with visual ACs.
3. **Treat "the epic AC contradicts the UX spec" as an expected event, not an exception.** It occurred three times in one story. The 6-2 precedent should be promoted from tribal knowledge into the `create-story` instructions.
4. **Verify every line-number citation before writing it.** Four citations in this story were wrong (three `router.back()` sites, off-by-one line numbers, `camera.tsx` length, and an over-broad `prd.md` NFR reference). Cheap to check, corrosive to trust when wrong.
5. **Keep using independent validators for story quality.** The 3-point score delta came entirely from adversarial review with codebase access. Author self-validation would not have found Finding 6, which was the highest-risk item in the set.
6. **Re-run `validate-create-story` after any story is edited post-creation** — this revision added ~100 lines of new instruction, and new instruction is new surface area for the same failure mode.

---

## Competitive Stats

**Validator Performance:**

- Findings identified: 23 (9 Critical, 8 Medium, 6 Low)
- Quality improvement: +3 points (7/10 → 10/10)
- User acceptance rate: 100% (20 as-proposed, 3 modified)
- Validator-proposed fixes corrected during reconciliation: 3 (one contradicting product decision, one wrong platform gate, one unsupported citation)

**Validator Success:** Found 23 improvements the original creator missed, including four that would have shipped broken behavior to production and one — the `react-native-web` `RefreshControl` stub — that would have passed every test and code review while doing nothing at all on the app's primary distribution target.

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-08-17 | Validation completed via dual independent subagent review — 23 findings, all 23 applied (3 modified) | Claude Opus 5 |

---

_This validation report was generated by the validate-create-story workflow._
