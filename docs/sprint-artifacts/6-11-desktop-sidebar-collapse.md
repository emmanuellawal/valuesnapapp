# Story 6.11: Desktop Sidebar Collapse

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a desktop user (Sarah, estate seller doing a batch workflow),
I want to collapse and expand the left navigation rail,
so that I can reclaim horizontal width for the workstation content when I don't need the nav labels visible.

## Business Context

Story 3.6 shipped the desktop sidebar as a fixed 240px rail and explicitly deferred collapse/expand ("future story"). Story 6.10 replaced the fixed width with `computeRailWidth()` (an 80–144px responsive cap, ~10% of viewport) under the 10/45/45 workstation model, but still shipped with **no** collapse/expand control. The Epic 3 retrospective flagged this directly: *"The content area is ~784px wide, which is functional but slightly cramped. Users who prefer more content space have no way to collapse the nav."* [Source: docs/sprint-artifacts/epic-3-retrospective.md#L199]

This story closes that gap. It is explicitly scoped as **inheriting**, not redefining, the rail: [Source: docs/sprint-artifacts/epic-6-plan.md#L447-473]

> "Add collapse/expand behavior only after Story 6-1 and Story 6-10 lock the rail constraints. This story inherits the rail cap and 10/45/45 workstation rules; it does not redefine them."

**Measured benefit (state these numbers in Completion Notes, do not hand-wave them):** collapsing from `computeRailWidth()` to `COLLAPSED_RAIL_WIDTH = 60` returns **+42px of content width at 1024px** (102 → 60) and **+84px at 1440px** (144 → 60). Note the retrospective's original complaint was about a 240px rail that no longer exists; today's rail is already 102px at 1024px, so this story is a refinement, not a rescue. Task 6 requires measuring the actual content-pane width before and after, because "the rail got narrower" and "the content pane got wider" are different claims and only the second one is the user benefit.

**Revised estimate: 6–9 hours** (the epic plan's 3–5 hour estimate predates the icon-system decision below, which is the bulk of the added work).

### Doc conflict — icons in the navigation rail (RESOLVED BY THIS STORY)

This is the sharpest documentation conflict in Epic 6, and this story resolves it rather than deferring it again:

| Source | Says |
|---|---|
| `docs/DESIGN-PHILOSOPHY.md#L312-314` | Global Sidebar has "Geometric icons for navigation (Lucide-style, functional only)" — adopted 2026-03-18, refined 2026-04-18 |
| `docs/ux-design-specification.md#L2192-2199` | The Desktop Navigation (Workstation Rail) diagram depicts an **icon-only** rail: `[📷] [📋] [⚙️]` |
| `docs/epics.md#L1501` | Story 6.1 AC: "And tab icons are consistent line-weight style" — never implemented |
| `docs/sprint-artifacts/3-6-desktop-sidebar-nav.md#L46` | "**No icons** in the sidebar. Text labels only." — a March 2026 party-mode decision |
| `docs/sprint-artifacts/6-10-implement-desktop-ux-patterns.md#L28` | Named the divergence and explicitly declined to resolve it |

**Decision:** three project-level documents (design philosophy, UX spec, epics) specify icons; one story-level party-mode note from March 2026 says text-only. The project-level documents win, and the collapsed state makes icons non-optional — without them, a collapsed rail has no visible content at all (see AC3). **This story adds icons to the desktop rail.** Two consequences to state plainly:

- Story 3.6's text-only decision is superseded **for the desktop rail only**.
- The mobile bottom bar (`SwissTabBar`) stays text-only and is out of scope here (AC8). `docs/epics.md#L1501` is therefore only *partially* resolved by this story; the mobile half remains open and belongs to Epic 7 (`7-5-implement-semantic-html-structure` or a new story), not here.

## Acceptance Criteria

### AC1: Collapse Reuses the Existing Rail — No Second Component

**Given** the codebase already has one rail implementation (`SwissSidebarNav` in `apps/mobile/components/organisms/swiss-sidebar.tsx`, consumed by both the `SwissSidebar` Tabs adapter and `AppraisalWorkstation`)
**When** collapse/expand behavior is implemented
**Then** it is added inside `SwissSidebarNav` itself
**And** no new rail/sidebar component file is created
**And** both existing consumers inherit collapse automatically — the only consumer edits permitted are supplying the new required `icon` field on `SwissSidebarItem` (see AC3), not reimplementing collapse

[Source: docs/sprint-artifacts/epic-6-plan.md#L462 — "Collapse behavior reuses SwissSidebar; no second rail component is created"]

### AC2: Expanded Rail Width Is Unchanged

**Given** the rail is expanded (the default state)
**When** the rail renders at any viewport width
**Then** its width is exactly what `computeRailWidth(viewportWidth)` already returns today (clamped 80–144px), and neither that formula nor its call sites change
**And** `SwissSidebarNav`'s prop signature keeps `railWidth: number` required and non-optional

[Source: docs/sprint-artifacts/epic-6-plan.md#L463 — "Expanded rail obeys Story 6-1/6-10 width constraints"]

### AC3: Collapsed Rail Is Icon-Only, Still Usable, Still Shows Active State

**Given** the user collapses the rail
**When** it renders collapsed
**Then** the rail width becomes `COLLAPSED_RAIL_WIDTH = 60`
**And** each nav item renders its Feather icon (visible), with the text label omitted
**And** the **currently-active destination is visually distinguishable from the inactive ones without a screen reader**, using **two independent cues** (party-mode 2026-09-18: colour-only is not enough — luminance fails greyscale and quick scanning):
  1. **Icon colour:** active `text-ink`, inactive `text-ink-muted` (both collapsed and expanded)
  2. **2px left rule:** every item `SwissPressable` includes `border-l-2`. Active: `border-ink`. Inactive: `border-transparent` (so the 2px slot is reserved and the icon does not jump horizontally when selection changes). This is a structural cue, not a highlight pill, and it is the collapsed-state equivalent of `font-semibold` on the expanded label
**And** icon `size` stays `20` in both states — do not use a 20-vs-22 size delta as the second cue; it is too small to read
**And** the expanded label still uses `font-semibold` when active (unchanged from today). The left rule is **additive** in both collapsed and expanded states so the active item does not lose its structural cue when labels are visible
**And** each nav item's tappable region is at least 44×44px: `COLLAPSED_RAIL_WIDTH` (60) − 2 × 8px (`px-2`) = **44px wide**, and `min-h-[44px]` gives 44px tall
**And** each nav item keeps its full `accessibilityLabel`, `accessibilityRole`, and `accessibilityState` exactly as in the expanded state — screen reader announcement does not change between states
**And** no nav item can render with no visible content: `icon` is a **required** field on `SwissSidebarItem`, so omitting it is a compile error rather than a blank rail

**Explicitly forbidden:** a collapsed rail whose items render nothing. Removing the label without adding the icon would delete both the destination affordance and the only active-state indicator (`font-semibold` on the label is currently the *sole* active signal — `swiss-sidebar.tsx:78-83`), producing a 60px white column of invisible click targets.

[Source: docs/sprint-artifacts/epic-6-plan.md#L464 — "Collapsed rail remains usable and accessible with clear labels or accessible names"; docs/ux-design-specification.md#L1195 — 44×44 minimum touch target; docs/epics.md#L1499 — "active tab is visually indicated"]

### AC4: Toggling Is Non-Navigating and Non-Destructive

**Given** the user presses the collapse/expand toggle
**When** the press is handled
**Then** no navigation occurs (no `router` call, no `navigation.navigate`/`navigation.emit` call) — only local rail-display state changes
**And** no application data (valuation history, form state, auth session) is read, mutated, or cleared as a side effect
**And** the currently-active route/tab does not change
**And** the toggle's glyph is a `chevron-left`/`chevron-right` Feather icon — **not** the `←`/`→` characters, which mean "go back" everywhere else in this app (`appraisal.tsx:203,219,274,459,534`, `listing/[id].tsx:151`, and `docs/ux-design-specification.md#L2207-2211`) and would misread as navigation on a control that must not navigate

[Source: docs/sprint-artifacts/epic-6-plan.md#L465 — "User can expand/collapse without route changes or data loss"]

### AC5: The Toggle Does Not Break the Rail's ARIA Structure

**Given** the rail container carries `role="tablist"` in `semantics="tabs"` mode
**When** the collapse toggle is added
**Then** the toggle is a **sibling of**, not a child of, the `tablist` element
**And** the `tablist` element's only children remain the `role="tab"` items
**And** in `semantics="navigation"` mode the equivalent holds: the toggle sits outside the `role="navigation"` landmark's item list
**And** the toggle's own `accessibilityRole` is `"button"` with `accessibilityState={{ expanded: !isCollapsed }}`

**Why this is an AC and not a detail:** WAI-ARIA defines `tab` as the *required owned element* of `role="tablist"` (https://www.w3.org/TR/wai-aria-1.2/#tablist). A `role="button"` child makes the tablist invalid and fails axe-core's `aria-required-children` rule (https://dequeuniversity.com/rules/axe/4.10/aria-required-children). Story 6.10's code review already fixed one round of invalid tab semantics on this exact component (`6-10-implement-desktop-ux-patterns.md#L317`, finding #4) — do not reintroduce it.

### AC6: Keyboard and Focus Behavior Is Defined

**Given** the toggle is the first focusable element in the rail
**When** a keyboard user Tabs into the rail
**Then** focus lands on the toggle before the nav items (an intentional, documented Tab-order change on every desktop screen)
**And** the toggle activates on both Enter and Space
**And** it shows the `SwissPressable` focus outline (`swiss-pressable.tsx:34-44`)
**And** focus remains on the toggle after activation (toggling must not drop focus to `document.body`)

[Source: docs/epics.md#L1663 — "keyboard shortcuts work: Tab (focus), Enter (select), Escape (cancel/close)"; Story 6.10 verified this for the controls that existed then, which did not include this one]

### AC7: Width Change Is Animated at 300ms

**Given** the user toggles collapse or expand
**When** the rail width changes
**Then** the change is animated over 300ms rather than snapping instantly

[Source: docs/DESIGN-PHILOSOPHY.md#L355-357 — "300ms opacity or width transitions for state changes. No decorative animations — only functional feedback"]

**Class string (locked, party-mode 2026-09-18):** `transition-[width] duration-300` — **not** `transition-all`. `transition-all` animates every property (padding `px-6` ↔ `px-2` included), which is decorative noise; only width is the state change this AC covers. [Source: Winston, party-mode]

**Note for the implementer:** no component in this codebase currently uses NativeWind `transition-*` classes (verified: zero matches for `transition-` under `apps/mobile`), so this is the first one. If `transition-[width] duration-300` on the outer rail container does not visibly animate in the real browser export during Task 6, **omit the class entirely** — do not leave a dead `transition-*` string "for later." Dead classes become load-bearing myths. Record the omission in Completion Notes. Reduced-motion handling (`prefers-reduced-motion`) is owned by Story 7-10 and is out of scope here.

### AC8: Mobile Bottom Tab Bar Is Unaffected

**Given** `SwissTabBar` (the bottom bar, rendered when `width < BREAKPOINTS.desktop`)
**When** this story's changes are implemented
**Then** `apps/mobile/components/organisms/swiss-tab-bar.tsx` is not modified and gains no icons and no collapse control
**And** no collapse control renders where `SwissTabBar` renders

**Accurate statement of the gates (do not paraphrase these — the previous draft of this story got it wrong):**
- `apps/mobile/app/appraisal.tsx:124` gates on `Platform.OS === 'web' && width >= BREAKPOINTS.desktop`.
- `apps/mobile/app/(tabs)/_layout.tsx:23` gates on `width >= BREAKPOINTS.desktop` **only — there is no `Platform.OS` check**.

Consequence: the Tabs rail, and therefore this story's toggle, **does** render on a native tablet at ≥1024px (iPad Pro landscape). That is pre-existing behavior from Story 3.6/6.1 and this story does not change it. It is why AC3's 44×44 target sizing is a hard requirement rather than a desktop-mouse nicety.

[Source: docs/sprint-artifacts/epic-6-plan.md#L466 — "Mobile bottom tab navigation remains unaffected"]

### AC9: Both Rail Consumers Verified Independently

**Given** `SwissSidebarNav` is used with `semantics="tabs"` (via `SwissSidebar` in `(tabs)/_layout.tsx`) and with `semantics="navigation"` (via `AppraisalWorkstation` on `/appraisal`)
**When** each is tested
**Then** automated tests demonstrate the toggle, the collapsed width, the icon rendering, the active-state distinction, and the retained accessibility contract in **both** semantics modes
**And** the `tablist` vs `navigation` role split from Story 6.10 still holds in both collapsed and expanded states

[Source: docs/sprint-artifacts/epic-6-plan.md#L467 — "Tests or manual verification cover expanded and collapsed desktop states"]

### AC10: The Content Pane Measurably Widens

**Given** the rail is collapsed on `/appraisal` at a desktop viewport
**When** the content panes are measured in the browser
**Then** the image and data panes are each measurably wider than before collapsing
**And** their combined width increases by approximately the rail's width delta (+42px at 1024px, +84px at 1440px)
**And** because the panes are equal `flex: 1` siblings, each pane receives approximately half of that delta (+21px at 1024px, +42px at 1440px)
**And** the measured before/after numbers are recorded in Completion Notes

**Why this AC exists:** the user benefit is "content gets wider," not "rail gets narrower." A layout bug could shrink the rail without reflowing the panes and every other AC would still pass. (The mechanism should work without consumer edits — `AppraisalWorkstation` uses `flex: 1` panes at `appraisal-workstation.tsx:43,50`, and `@react-navigation/bottom-tabs`' `BottomTabView` renders a left-positioned tab bar as an ordinary flex-row sibling — but verify it, don't assume it.)

### AC11: Verification Gates Pass

**Given** the changes are complete
**When** the project's gates run **from `apps/mobile/`**
**Then** `npm run typecheck` (`tsc --noEmit -p tsconfig.typecheck.json`) reports zero errors
**And** `npm run lint` (`expo lint --max-warnings 0`) reports zero warnings
**And** `npm test` passes with no regressions, and the before/after suite counts are recorded

**Do NOT run bare `npx tsc --noEmit`.** `tsconfig.json` includes `__tests__/**`, which has **20 pre-existing errors** (verified 2026-09-12), six of them inside `swiss-sidebar-nav.story-6-10.test.tsx` and `tab-navigation-surfaces.test.tsx`. `tsconfig.typecheck.json` exists precisely to exclude test files from the gate. Chasing those 20 errors is out of scope and would require editing files this story should barely touch.

**Permitted edits to existing Story 6.10 test files, and only these:**
1. Adding `jest.mock('@expo/vector-icons/Feather', () => 'Feather');` to any existing test file that renders the rail. **This is required, not optional** — `@expo/vector-icons/build/vendor/react-native-vector-icons/lib/create-icon-set.js:2` imports `processColor` and `NativeModules` from `react-native`, and `icon-button.js:2` imports `TouchableHighlight`; none of those exist in the minimal `react-native` mock that `swiss-sidebar-nav.story-6-10.test.tsx:10-46` and `tab-navigation-surfaces.test.tsx:5-41` install, so importing Feather into `swiss-sidebar.tsx` will break them without the mock.
2. Retargeting the `style.width` assertion in `swiss-sidebar-nav.story-6-10.test.tsx:129-136` and `tab-navigation-surfaces.test.tsx:117-126` if AC5's restructuring moves the width off the `tablist` element onto an outer wrapper.

Every such edit must be listed individually in Completion Notes with its reason. Any *other* change to those files is a red flag that the implementation drifted.

### AC12: Code Review Section Present

**Given** the story is complete
**When** it is moved toward `done`
**Then** the story file contains a populated `## Code Review` section

[Source: docs/frontend-review-checklist.md#L30 — "Code review section present … (mandatory gate)"; docs/sprint-artifacts/epic-6-plan.md#L591]

## Out of Scope

Not acceptance criteria — these are explicit non-goals, recorded so a reviewer does not treat them as gaps.

- **Cross-mount persistence of the collapsed state.** Collapse is local `useState` inside each `SwissSidebarNav` mount. The Tabs rail and the `/appraisal` rail are separate React trees (`app/_layout.tsx:170` renders `appraisal` as a sibling `Stack.Screen` to `(tabs)` at `:155`), so collapsing one does not affect the other. See Dev Notes for why, and for the synchronous alternative that was considered and rejected.
- **Collapse state surviving unmount.** State resets to expanded whenever `SwissSidebarNav` unmounts. That includes crossing `BREAKPOINTS.desktop` on browser resize (`(tabs)/_layout.tsx:33` swaps in `SwissTabBar` below 1024px) and every rail navigation out of `/appraisal` (`appraisal.tsx:127-130` uses `router.replace`). Accepted for this story; Task 6 verifies it does so without error rather than pretending it doesn't happen.
- **Icons on the mobile bottom tab bar.** Desktop rail only (AC8). `docs/epics.md#L1501` stays partially open.
- **Reduced-motion support** for the new transition — Story 7-10.
- **Global touch-target enforcement** — Story 7-2 (`docs/epics.md#L1646`). This story meets 44×44 for the controls it adds; it does not audit others.
- **No changes to** `computeRailWidth()`, `BREAKPOINTS.desktop`, or either desktop-detection gate.

## Tasks / Subtasks

- [x] **Task 1: Add the collapsed-width constant** (AC2, AC3)
  - [x] In `apps/mobile/constants/breakpoints.ts`, add `export const COLLAPSED_RAIL_WIDTH = 60;` beside `computeRailWidth()` (the file that already centralizes rail-width logic per Story 6.1: *"the rail width formula … belongs beside `BREAKPOINTS` where Epic 6 stories (6-2, 6-10, 6-11) can reuse it"* — `6-1-implement-tab-navigation.md:150`)
  - [x] Comment the arithmetic: `60 − 2 × 8px (px-2) = 44px item width`, so the constant cannot be "tidied" to 56 later without breaking AC3
  - [x] Note: `apps/mobile/__tests__/tab-layout.test.tsx` also imports this module (`:105`) and asserts `computeRailWidth` values (`:168-182`). It mocks `swiss-sidebar` wholesale (`:84-92`), so an additive export cannot affect it — re-run it anyway (Task 5)

- [x] **Task 2: Add the icon field and icon rendering** (AC3, AC8)
  - [x] Add `Feather` to `swiss-sidebar.tsx`: `import Feather from '@expo/vector-icons/Feather';`. **No new dependency** — `@expo/vector-icons@^15.0.3` is already in `package.json`, and Feather is the icon set Lucide was forked from, which satisfies `DESIGN-PHILOSOPHY.md#L314`'s "Lucide-style" line-weight requirement without adding a package
  - [x] Add a required field to the `SwissSidebarItem` interface: `icon: React.ComponentProps<typeof Feather>['name'];` (required, per AC3, so a blank collapsed item is a compile error)
  - [x] Make the icon color follow the design tokens rather than a hardcoded hex, so dark mode keeps working (`global.css:20-27` flips `--ink`/`--ink-muted`). Register Feather with NativeWind **once at module scope** in `swiss-sidebar.tsx`:
    ```tsx
    import { cssInterop } from 'nativewind';

    cssInterop(Feather, {
      className: { target: 'style', nativeStyleToProp: { color: true } },
    });
    ```
    `cssInterop` is exported by `nativewind@^4.2.3` (verified in `node_modules/nativewind/dist/index.d.ts:2`). This is the **first** use of `cssInterop` in this codebase — if it does not drive the icon color in the Task 6 browser check, fall back to an explicit `color` prop using `#000000` (active) / `#999999` (inactive) and record the dark-mode limitation in Completion Notes rather than shipping invisible icons. **Result:** confirmed working in the real browser export (Task 6) — see Completion Notes. It is unobservable under Jest (also recorded there); that is a test-harness limitation, not a browser defect.
  - [x] Render the icon inside each item's `SwissPressable`, before the label: `<Feather name={item.icon} size={20} className={item.isActive ? 'text-ink' : 'text-ink-muted'} />`. `size={20}` is fixed — not a second active cue
  - [x] Render the label only when expanded: `{!isCollapsed && <Text variant="body" className={item.isActive ? 'text-ink font-semibold' : 'text-ink-muted'}>{item.label}</Text>}`. The label keeps its existing active/inactive classes — do not change them
  - [x] Active-state left rule on the **item** `SwissPressable` (both collapsed and expanded): `` className={`py-3 min-h-[44px] justify-center border-l-2 ${item.isActive ? 'border-ink' : 'border-transparent'} ${isCollapsed ? 'items-center' : ''}`} ``. Do not use `border-signal`. Do not omit `border-l-2` on inactive items — `border-transparent` holds the 2px so the icon does not shift
  - [x] When expanded, lay out icon + label horizontally with a gap; when collapsed, center the icon. Keep `min-h-[44px]`
  - [x] Do **not** touch `swiss-tab-bar.tsx` (AC8)

- [x] **Task 3: Add collapse state, the toggle, and the ARIA restructure to `SwissSidebarNav`** (AC1, AC3, AC4, AC5, AC6, AC7)
  - [x] Change `swiss-sidebar.tsx:1` from `import React from 'react';` to `import React, { useState } from 'react';` — the file currently has no `useState` import, so using it bare is a `TS2304` compile error
  - [x] Add `const [isCollapsed, setIsCollapsed] = useState(false);` as the first statement in `SwissSidebarNav` (default expanded, so the default state matches today's behavior)
  - [x] **Restructure for AC5:** the width, padding, background, border, and transition move to a new **outer** `View`; the role-bearing container becomes an inner `View` that owns only `items.map(...)`; the toggle is a child of the outer wrapper, i.e. a sibling of the role container. **Implementation deviation (see Completion Notes for full rationale):** applied uniformly to both `semantics="tabs"` and `semantics="navigation"` — not just `tabs` — because Task 5's own structural test requires the toggle to sit outside the role node in both modes. This moved `style.width` off the `role="navigation"` node in one additional existing test file not named by AC11 (`appraisal-workstation.story-6-10.test.tsx`); that retarget is recorded as an extension of AC11 permitted-edit category 2, for the same reason and in the same minimal style as the two AC11-named retargets:
    ```tsx
    <View
      className={`bg-paper border-r border-divider py-8 transition-[width] duration-300 ${isCollapsed ? 'px-2' : 'px-6'}`}
      style={{ width: isCollapsed ? COLLAPSED_RAIL_WIDTH : railWidth, alignSelf: 'stretch' }}
    >
      <SwissPressable
        accessibilityRole="button"
        accessibilityLabel={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        accessibilityState={{ expanded: !isCollapsed }}
        onPress={() => setIsCollapsed((prev) => !prev)}
        className="self-start px-3 py-3 min-w-[44px] min-h-[44px] items-center justify-center mb-4"
      >
        <Feather
          name={isCollapsed ? 'chevron-right' : 'chevron-left'}
          size={20}
          className="text-ink-muted"
        />
      </SwissPressable>
      <View
        role={usesTabSemantics ? 'tablist' : 'navigation'}
        accessibilityRole={usesTabSemantics ? 'tablist' : undefined}
        accessibilityLabel={usesTabSemantics ? 'Primary tabs' : 'Primary navigation'}
      >
        {items.map((item) => (/* unchanged item props + Task 2 icon/label */))}
      </View>
    </View>
    ```
  - [x] The toggle className is prescribed exactly: `min-w-[44px]` is **load-bearing**. `self-start` maps to `alignSelf: 'flex-start'`, which shrink-wraps horizontally, so without `min-w-[44px]` + `px-3` the target collapses to the ~16px glyph width regardless of how wide the rail is. Every comparable `self-start` pressable in this codebase pairs it with horizontal padding (`appraisal.tsx:201,217,272,457,531`; `listing-form.tsx:367`)
  - [x] `accessibilityState={{ expanded: !isCollapsed }}` type-checks with no cast — `AccessibilityState.expanded?: boolean` is real (`node_modules/react-native/Libraries/Components/View/ViewAccessibility.d.ts:163`)
  - [x] Keep `accessibilityRole="button"` explicit on the toggle even though `SwissPressable` defaults to it, so intent is legible in review. Do not add `role="button"` as well
  - [x] Verify the `role`/`accessibilityRole` split on the inner container is preserved verbatim: RN's `AccessibilityRole` union excludes `'navigation'` while the newer `Role` union includes it, which is why the current code sets both props separately. Story 6.10 hit a real `tsc` failure here — do not "simplify" it
  - [x] Do **not** add collapse logic to `SwissSidebar` (the Tabs adapter) or `AppraisalWorkstation`. If you find yourself doing so, the logic leaked out of `SwissSidebarNav` and AC1 is at risk

- [x] **Task 4: Supply icons at both call sites** (AC1, AC3, AC9)
  - [x] In `swiss-sidebar.tsx`'s `SwissSidebar` Tabs adapter, map route name → icon with a module-scope constant: `const RAIL_ICONS: Record<string, React.ComponentProps<typeof Feather>['name']> = { camera: 'camera', history: 'list', settings: 'settings' };` and use `RAIL_ICONS[route.name] ?? 'circle'`. Route names come from `(tabs)/_layout.tsx:37,43,49`. All four glyph names are verified present in Feather's glyphmap; `'list'` matches the clipboard glyph in the UX spec rail diagram (`ux-design-specification.md#L2194-2197`)
  - [x] In `apps/mobile/app/appraisal.tsx:127-130`, add the matching `icon` to each of the three `navItems` entries (`camera`, `list`, `settings`). This is the one consumer edit this story requires — a direct consequence of `icon` being required, and the trade for a compile-time guarantee against blank collapsed items
  - [x] Mark Camera active in the `/appraisal` rail because appraisal is part of the Camera workflow; History and Settings remain inactive. This review correction ensures navigation semantics has the active destination AC3/AC9 require
  - [x] No change to `appraisal-workstation.tsx` or `(tabs)/_layout.tsx`

- [x] **Task 5: Tests** (AC3, AC4, AC5, AC6, AC9, AC11)
  - [x] Create `apps/mobile/__tests__/swiss-sidebar-collapse.story-6-11.test.tsx`. Reuse the `react-native`/`react-native-safe-area-context` mock block and the `findHostPressableByLabel` / `renderNode` / `flattenStyle` helpers from `swiss-sidebar-nav.story-6-10.test.tsx:10-80` — do not reinvent them. Add `jest.mock('@expo/vector-icons/Feather', () => 'Feather');` (see AC11 for why this is mandatory)
  - [x] Toggle defaults to `accessibilityLabel: 'Collapse navigation'` with `accessibilityState: { expanded: true }`
  - [x] Pressing the toggle flips it to `'Expand navigation'` / `{ expanded: false }`, and the outer container's `style.width` becomes `COLLAPSED_RAIL_WIDTH` (import the constant; do not hardcode `60`)
  - [x] Collapsed container `className` contains `px-2` and not `px-6`; expanded contains `px-6`. Both states contain `transition-[width]` and `duration-300` (AC7) — not `transition-all`
  - [x] Toggle exposes `min-w-[44px]` and `min-h-[44px]` in its `className` (AC3/AC6 target size — this is the assertion that would have caught the ~16px-wide target)
  - [x] **AC5 structure test:** the node carrying `accessibilityRole: 'tablist'` has no descendant `Pressable` whose `accessibilityLabel` is `'Collapse navigation'`/`'Expand navigation'`; the toggle is found outside it. Assert this in `semantics="tabs"` mode and the `role="navigation"` equivalent
  - [x] Collapsed items still expose their full `accessibilityLabel` (e.g. `'History tab'`) and their `onPress` still fires the item callback
  - [x] Collapsed state renders no `Text` node equal to an item's label, **and** renders a `Feather` node per item (both halves — the first assertion alone would certify a blank rail)
  - [x] Active vs inactive: the host item `Pressable` `className` contains `border-ink` (active) vs `border-transparent` (inactive), in **both** collapsed and expanded states (AC3 cue #2). **Deviation:** the icon-`className` half of this bullet (`text-ink` vs `text-ink-muted`, cue #1) is asserted via a code comment explaining why, not a passing expectation — verified empirically that `cssInterop`-resolved `className` is stripped to `undefined` on the Feather node with no observable `style` under Jest (no Metro/Tailwind CSS engine present in the test harness), for both active and inactive icons alike. See Completion Notes.
  - [x] Pressing the toggle does not call any item's `onPress` mock, and in the `SwissSidebar` adapter does not call `navigation.emit`/`navigation.navigate` (AC4)
  - [x] Toggle host `Pressable` exposes `onFocus`/`onBlur` handlers (AC6 focus-ring wiring)
  - [x] Repeat the toggle/collapse/icon assertions with `semantics="navigation"` (AC9)
  - [x] Expanded items use `justify-start` plus `overflow-hidden`, while collapsed items use `justify-center`, so labels are clipped to the animating rail instead of bleeding into workstation content
  - [x] Add a focused Playwright regression covering the production `/appraisal` active cue, collapsed-item navigation, final 60px width, and expansion containment classes
  - [x] Re-run all five existing tests that touch this surface — `swiss-sidebar-nav.story-6-10.test.tsx`, `tab-navigation-surfaces.test.tsx`, `appraisal-workstation.story-6-10.test.tsx`, `appraisal-desktop-workstation.story-6-10.test.tsx`, `tab-layout.test.tsx` — and list every edit made to them, with reasons, in Completion Notes. **Deviation:** three files needed edits, not the two AC11 names by filename — see Completion Notes for the full list and rationale (the Feather-mock category was always open-ended per AC11's own text: "to any existing test file that renders the rail"; the width-retarget category needed one unnamed extension for the reason given in Task 3).

- [x] **Task 6: Verification gate** (AC7, AC10, AC11)
  - [x] All commands run from `apps/mobile/`: `npm run typecheck`, `npm run lint`, `npm test` (record before/after counts) — see Completion Notes for exact counts
  - [x] Real-browser check via `npm run build:web` (`expo export -p web`) served locally, at 1024px and 1440px. **Not optional** — Story 6.10's code review found 3 High-severity bugs that a fully green unit suite missed, because `react-test-renderer` prop assertions do not prove NativeWind classes, real click handlers, or transitions work in the exported build. Confirmed and recorded (all in Completion Notes, with screenshots):
    - (a) rail visibly narrows, and the width change **animates** over ~300ms rather than snapping (AC7) — measured via 8 samples over 400ms (102→89→73→65→61→60→60→60px); kept the class
    - (b) the chevron flips direction — confirmed visually (screenshots)
    - (c) icons are visible in the collapsed state; the active route's icon is visibly darker **and** shows a 2px ink left rule; inactive items show no visible left rule (AC3) — confirmed visually (screenshots)
    - (d) clicking a collapsed item still navigates — confirmed by the committed `sidebar-collapse.story-6-11.spec.ts` Playwright regression, which collapses `/appraisal`, clicks Settings, and asserts the `/settings` URL
    - (e) measured the `/appraisal` image- and data-pane widths before/after collapsing at 1024px and 1440px — see Completion Notes for the precise numbers and their alignment with corrected AC10
    - (f) Tab into the rail: focus lands on the toggle first (confirmed programmatically), Enter and Space both activate it and retain focus on the toggle afterward (confirmed programmatically)
    - (g) resized 1024→800→1024 while collapsed — rail returned to expanded (`'Collapse navigation'` label), no new console error attributable to this
    - (h) no *new* console errors or warnings — one pre-existing React hydration warning (#418) reproduces on unrelated routes (`/`, `/auth/sign-in`, `/demo-loading`) that never render the rail; documented as out-of-scope, not introduced by this story
  - [x] Delete any build/test artifacts before finishing — removed `_tmp-browser-check*.js` scratch scripts and the `dist/` export directory (already gitignored) after verification.

## Dev Notes

### Current `SwissSidebarNav` (abridged — canonical source is `apps/mobile/components/organisms/swiss-sidebar.tsx:45-88`; whitespace differs)

```tsx
export function SwissSidebarNav({ items, railWidth, semantics = 'tabs' }: {
  items: SwissSidebarItem[]; railWidth: number; semantics?: SwissSidebarNavSemantics;
}) {
  const usesTabSemantics = semantics === 'tabs';

  return (
    <View
      role={usesTabSemantics ? 'tablist' : 'navigation'}
      accessibilityRole={usesTabSemantics ? 'tablist' : undefined}
      accessibilityLabel={usesTabSemantics ? 'Primary tabs' : 'Primary navigation'}
      className="bg-paper border-r border-divider py-8 px-6"
      style={{ width: railWidth, alignSelf: 'stretch' }}
    >
      {items.map((item) => (
        <SwissPressable
          key={item.key}
          accessibilityRole={usesTabSemantics ? 'tab' : 'button'}
          accessibilityState={usesTabSemantics ? (item.isActive ? { selected: true } : {}) : undefined}
          accessibilityLabel={item.accessibilityLabel ?? (usesTabSemantics ? `${item.label} tab` : item.label)}
          onPress={item.onPress}
          onLongPress={item.onLongPress}
          className="py-3 min-h-[44px] justify-center"
        >
          <Text variant="body" className={item.isActive ? 'text-ink font-semibold' : 'text-ink-muted'}>
            {item.label}
          </Text>
        </SwissPressable>
      ))}
    </View>
  );
}
```

Note the item `<Text>` is the **only** child and `font-semibold` on it is the **only** active-state signal. That is the whole reason AC3 requires icons **and** a second structural cue: delete the label without a replacement and the rail loses both destination identity and active state at once.

### Active-state left rule vs the "single divider" rule

Story 3.6 forbids a *second rail divider* (`3-6-desktop-sidebar-nav.md:243` — "Single 1px divider on the right edge of the sidebar — nothing else"). The 2px `border-l-2` on the **item** is an active-state indicator, not a second rail chrome line. It must not be drawn as a full-height column rule, must use `ink` not `signal`, and inactive items must keep `border-l-2 border-transparent` so selection changes do not shift the icon.

The 2px lives *inside* the item `Pressable`. The collapsed tap target stays 44px wide (the pressable's outer box). Do not bump `COLLAPSED_RAIL_WIDTH` to "make room" for the border.

Also note `swiss-sidebar.tsx:1` is `import React from 'react';` — no `useState`. `swiss-pressable.tsx:1` shows the convention to adopt: `import React, { useState, useCallback } from 'react';`.

### Why local `useState`, not persisted state

The upstream AC says "expand/collapse without route changes or data loss" (`epic-6-plan.md:465`), which is about the toggle action being non-destructive — not a persistence requirement. Persisting via `AsyncStorage` (the `preferences.ts` `getTheme`/`saveTheme` pattern) would need an async `useEffect` that resolves *after* the synchronous `act(() => create(...))` calls the existing rail tests use, risking `act()` warnings and flakiness in files this story should barely touch (`settings.test.tsx:122` shows the `await act(async () => ...)` pattern that would then be required). It would also produce a visible flash-of-expanded on each mount.

**Acknowledged alternative:** a module-level variable or a small React context would sync the two rail mounts *synchronously*, with no `AsyncStorage`, no flash, and no async test risk. It is rejected not because it doesn't work but because cross-mount sync is not a stated AC and it introduces shared mutable state for no requirement. If a future story wants it, that is the cheaper path than persistence.

### Touch target arithmetic (do the math, don't assert the conclusion)

- **Toggle:** `self-start` shrink-wraps on the cross axis, so the rail's width does **not** size this button. `px-3` (12px each side) + a 20px icon ≈ 44px, and `min-w-[44px]` floors it. Without those, the target is the glyph's advance width (~16px at `variant="body"`'s 16px font size), which fails WCAG 2.2 SC 2.5.8 (24×24 AA) outright, let alone the project's 44×44 convention.
- **Nav items:** they do not use `self-start`, so they stretch to the container's content box: `COLLAPSED_RAIL_WIDTH` (60) − `px-2` (8 + 8) = **44px**. This is why the constant is 60 and not 56.
- Convention source: `docs/ux-design-specification.md#L1194-1197` and `docs/epics.md#L135` (NFR-A2).

### Why the Feather mock is mandatory in tests

`@expo/vector-icons/Feather` → `build/Feather.js` → `build/createIconSet.js` → `build/vendor/react-native-vector-icons/lib/create-icon-set.js:2`, which imports `Platform, PixelRatio, processColor, Text, NativeModules` from `react-native`; `icon-button.js:2` additionally imports `StyleSheet, Text, TouchableHighlight, View`. The rail test files replace the entire `react-native` module with a 12-key object that has no `processColor`, `NativeModules`, or `TouchableHighlight`. So the import chain breaks under those mocks. Mocking the icon module as a host string (`() => 'Feather'`) sidesteps the chain entirely and lets tests assert on `name`/`className` props. Precedent for mocking this package in tests: `__tests__/root-layout-gesture.story-6-9.test.tsx:27-30`.

### Behavior on unmount (state this, don't let a reviewer discover it)

`(tabs)/_layout.tsx:33` renders `SwissSidebar` only when `isDesktop`, so resizing 1200px → 900px → 1200px unmounts and remounts the rail and resets `isCollapsed` to `false`. `appraisal.tsx:127-130`'s rail items call `router.replace`, so every rail click on `/appraisal` unmounts that rail. Both are accepted (see Out of Scope) and Task 6(g) verifies the reset is clean rather than an error.

### Project Structure Notes

| File | Change |
|------|--------|
| `apps/mobile/constants/breakpoints.ts` | Add `COLLAPSED_RAIL_WIDTH = 60`; no change to `computeRailWidth()` |
| `apps/mobile/components/organisms/swiss-sidebar.tsx` | `useState` import, `cssInterop(Feather, …)`, required `icon` on `SwissSidebarItem`, `RAIL_ICONS` map, outer wrapper + toggle + inner role container, conditional label/padding/width, `transition-[width]`, item `border-l-2` active cue |
| `apps/mobile/app/appraisal.tsx` | **Touched** — add `icon` to the three `navItems` (lines 127-130) only |
| `apps/mobile/__tests__/swiss-sidebar-collapse.story-6-11.test.tsx` | New |
| Existing Story 6.10 test files | Only the two edit categories AC11 permits (Feather mock; width-assertion retarget), each disclosed |
| `apps/mobile/components/organisms/swiss-tab-bar.tsx` | **Not touched** (AC8) |
| `apps/mobile/components/organisms/appraisal-workstation.tsx` | **Not touched** |
| `apps/mobile/app/(tabs)/_layout.tsx` | **Not touched** — it only computes and passes `railWidth` (`:23-24,33`), and `BottomTabView` renders a left tab bar as a normal flex-row sibling, so content reflows without a consumer edit. This is a justified deviation from `epic-6-plan.md#L469-473`'s files-to-touch list |

No new npm dependencies (`@expo/vector-icons` and `nativewind` are both already present).

### Testing Standards Summary

- Jest + `react-test-renderer` under the `jest-expo` preset (`apps/mobile/package.json`). Run with `npm test` from `apps/mobile/`.
- Copy the minimal `react-native` mock block from `swiss-sidebar-nav.story-6-10.test.tsx:10-46` verbatim; add the Feather mock.
- Use `findAllByProps({ accessibilityLabel }).find((node) => node.type === 'Pressable')` when asserting on a `SwissPressable`-backed node's real props — `SwissPressable` is a `forwardRef` composite, so a plain `findByProps` matches both the composite and the host `Pressable` and throws on multiple matches.
- New test files are excluded from the typecheck gate by `tsconfig.typecheck.json`, so `node.type === 'Pressable'` comparisons that produce `TS2367` under bare `tsc` are acceptable and consistent with existing files.
- Naming convention: `<subject>.story-<epic>-<num>.test.tsx`.

### Previous Story Intelligence

- **Story 6.10's core lesson: a fully green unit suite does not prove browser behavior.** Two hover implementations (`onHoverIn/Out`, then pointer events) passed their unit tests and did nothing in the exported build; only NativeWind CSS-class utilities worked, verified via Playwright. This story adds a plain `onPress` plus a **CSS transition** and **cssInterop-driven icon color** — both of which are exactly the CSS-dependent category that lied last time. That is why Task 6 is specific and mandatory.
- **Story 6.10 finding #4 was invalid ARIA tab semantics on this exact component** (`6-10-implement-desktop-ux-patterns.md:317`). AC5 exists so this story does not reintroduce it from the other direction.
- **Story 6.9's review escalated a falsely-claimed accessibility property to CRITICAL** (`6-9-implement-mobile-ux-patterns.md:281`). Hence AC3/AC6 require asserted, measured target sizes and focus behavior rather than prose claims.
- Composite-vs-host `findByProps` ambiguity and the `role` vs `accessibilityRole` TypeScript split are both real and covered above.
- Read `6-10-implement-desktop-ux-patterns.md`'s "Senior Developer Review (AI)" section before implementing — it documents the current shape of every file this story touches.

### Git Intelligence

The create-story/dev-story record said this workspace was not a Git repository. Code review confirmed that statement was stale: the workspace is a Git repository with a large accumulated uncommitted change set spanning multiple stories. Per-story attribution from the aggregate diff is therefore unreliable, but direct diffs remain useful for checking whether this story's File List discloses its edits.

### References

- [Source: docs/sprint-artifacts/epic-6-plan.md#L447-473] — origin, problem statement, and the six upstream ACs this story expands
- [Source: docs/sprint-artifacts/epic-3-retrospective.md#L195-203] — origin retrospective finding
- [Source: docs/sprint-artifacts/3-6-desktop-sidebar-nav.md#L46,L241-248] — the text-only party-mode decision this story supersedes for the desktop rail, and the "single 1px divider, nothing else" rule
- [Source: docs/sprint-artifacts/6-1-implement-tab-navigation.md#L150] — why rail-width constants live in `constants/breakpoints.ts`
- [Source: docs/sprint-artifacts/6-10-implement-desktop-ux-patterns.md#L28,L315-317] — the icon divergence this story resolves, and the code-review findings it must not reintroduce
- [Source: docs/DESIGN-PHILOSOPHY.md#L312-323] — "Geometric icons for navigation (Lucide-style, functional only)" (L314) and the 10/45/45 workstation model (L318-323)
- [Source: docs/DESIGN-PHILOSOPHY.md#L355-357] — 300ms width transitions
- [Source: docs/ux-design-specification.md#L1194-1197] — 44×44 minimum touch target
- [Source: docs/ux-design-specification.md#L2192-2217] — icon-only Desktop Workstation Rail diagram, and the `←` back-navigation convention this story must not collide with
- [Source: docs/epics.md#L135,L1499-1501,L1646,L1663] — NFR-A2, Story 6.1 active-indicator and icon ACs, Story 7.2 touch-target ownership, desktop keyboard ACs
- [Source: docs/frontend-review-checklist.md#L30] — mandatory `## Code Review` gate
- [Source: apps/mobile/components/organisms/swiss-sidebar.tsx:45-88] — current rail implementation
- [Source: apps/mobile/node_modules/react-native/Libraries/Components/View/ViewAccessibility.d.ts:163] — verified `AccessibilityState.expanded?: boolean`
- [Source: apps/mobile/node_modules/nativewind/dist/index.d.ts:2] — verified `cssInterop` export
- [Source: https://www.w3.org/TR/wai-aria-1.2/#tablist] — `tab` is the required owned element of `tablist`
- [Source: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum] — SC 2.5.8 target size

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (Cursor Agent, `*dev-story` workflow)

### Debug Log References

- `cd apps/mobile && npm test` — 49 suites / 438 tests pass (before this story: 49 suites / 411 tests; +27 new)
- `cd apps/mobile && npm run typecheck` — 0 errors (`tsc --noEmit -p tsconfig.typecheck.json`)
- `cd apps/mobile && npm run lint` — 0 warnings (`expo lint --max-warnings 0`)
- `cd apps/mobile && npm run build:web && npx serve dist -p 4173` + ad-hoc Playwright scripts (`chromium.launch()`, deleted after use) — real-browser verification at 1024px/1440px on `/history` (Tabs semantics) and `/appraisal` (navigation semantics)
- Pre-implementation empirical probes (deleted after use): confirmed `require('nativewind')` throws under bare Node (`Cannot use import statement outside a module`) but imports fine under Jest (transformed); confirmed `cssInterop(Feather, {...})` does not throw when `Feather` is the AC11-mandated string mock, using proper `import` (not `require().default`) interop.

### Completion Notes List

**Scope delivered:** All 6 tasks / 12 ACs implemented as specified, with three documented deviations from the story's illustrative code samples and permitted-edit file list (below). No new npm dependency added (`@expo/vector-icons`, `nativewind` both pre-existing).

**Deviation 1 — cssInterop icon-colour cue (AC3 cue #1) is unobservable under Jest, confirmed working in the real browser (exactly the fallback path Task 2 anticipated, one layer earlier than expected):**
Empirically verified (temporary probe test, deleted): `cssInterop(Feather, { className: { target: 'style', ... } })` registered on the AC11-mandated string-mocked `Feather` does not throw, but the rendered Feather node's `className` prop is stripped to `undefined` with **no resulting `style`** under `react-test-renderer` + the project's existing bare `react-native` mock — for active and inactive icons alike, so no differentiation is observable at that layer. Root cause: `react-native-css-interop`'s *native* runtime (resolved by Jest regardless of the test's own `Platform.OS: 'web'` mock, since module resolution is a Jest/package-resolution concern, not a runtime `Platform` check) resolves `className` against a stylesheet populated by Metro's real CSS/Tailwind bundling step, which does not exist in the Jest harness. **This is a test-harness limitation, not an implementation defect** — confirmed by building the real web export (`npm run build:web`) and visually inspecting: the active item's icon is unambiguously darker than inactive items' icons at both 1024px and 1440px (see screenshots referenced below). The new test file documents this finding in a code comment and asserts AC3 cue #2 (the `border-l-2` structural rule) instead, which is fully observable and — per the party-mode 2026-09-18 decision already recorded in this story — is the cue that must not depend on a rendering engine to be correct.

**Deviation 2 — AC5's ARIA restructuring is applied uniformly to both `semantics` modes, not just `tabs`, which required a third test-file edit beyond AC11's two named files:**
`role="tablist"` has `tab` as its ARIA-required owned element, so the toggle cannot be a direct child of the `tablist`-role container — this required splitting the rail into an outer (unrolied, width/padding/background/border/transition-bearing) wrapper and an inner (role-bearing, items-only) wrapper, exactly as Task 3's code sample shows. That sample does not scope the split to `tabs` semantics only, and Task 5's own test spec ("assert this in `semantics=\"tabs\"` mode and the `role=\"navigation\"` equivalent") requires the same "toggle sits outside the role node" structural guarantee for `navigation` semantics too — which is only achievable by applying the same split uniformly. Doing so moved `style.width` off the `role="navigation"` node in `appraisal-workstation.story-6-10.test.tsx` (not one of AC11's two named files), which asserted width there. Retargeted that one assertion to the new outer wrapper's `testID="swiss-sidebar-rail"` — the same fix, for the same reason, as the two AC11-named retargets in `swiss-sidebar-nav.story-6-10.test.tsx` and `tab-navigation-surfaces.test.tsx`. I judged this as the correct minimal-diff implementation of AC5 + Task 5 rather than a scope violation, since (a) AC11's Feather-mock category is explicitly open-ended ("to any existing test file that renders the rail"), which the same file already needed for an unrelated reason below, and (b) the alternative (asymmetric restructuring, width-bearing role node only for `navigation` mode) satisfies AC5's prose but fails Task 5's own literal test requirement — I chose to follow the more specific, testable instruction. All three retargets are one-line `testID` swaps with no behavioral change to the assertion's intent.

**Deviation 3 — a third existing test file needed the mandatory Feather mock, beyond the two AC11 names (pre-authorized by AC11's own open-ended wording, verified empirically, not assumed):**
Ran the 5 existing "touches this surface" test files after Tasks 2–3 landed. `appraisal-workstation.story-6-10.test.tsx` failed with `TypeError: Cannot read properties of undefined (reading 'EXDevLauncher')` — it renders `AppraisalWorkstation` → `SwissSidebarNav`, which now imports Feather at module scope, and this file's `react-native` mock (like the two AC11-named files') has no `NativeModules`/`processColor`/`TouchableHighlight`, so the real `Feather → createIconSet → expo-font → expo-asset → expo-constants` import chain broke exactly as AC11 predicts for "any existing test file that renders the rail." Added the same one-line mock. `appraisal-desktop-workstation.story-6-10.test.tsx` did **not** need this (it `jest.spyOn`s the *real* `react-native` module rather than replacing it with a factory, so the real Feather chain resolves fine there — confirmed by running it unmodified).

**AC10 verification — corrected during code review to match the measured two-pane layout:**
Measured via the real browser export (Playwright, `/appraisal` at 1024px and 1440px, before/after clicking the collapse toggle):
- 1024px: image pane 460.5px → 481.5px (**+21px**), data pane 460.5px → 481.5px (**+21px**), sum **+42px**
- 1440px: image pane 647.5px → 689.5px (**+42px**), data pane 647.5px → 689.5px (**+42px**), sum **+84px**

The original AC incorrectly required each pane to receive the entire rail delta, which is impossible for two equal `flex: 1` siblings. Code review corrected AC10: the combined pane width receives the full delta, and each pane receives half. The implementation and these measurements now satisfy the normative wording.

**Code-review corrections (2026-10-19):**
- Marked Camera active in the production `/appraisal` navigation rail. The appraisal report belongs to the Camera workflow; previously all three destinations were inactive despite AC3/AC9.
- Prevented transient expansion overflow by clipping each item's contents and using `justify-start` while expanded. Icons remain inside the rail while labels reveal within the animating width.
- Added `tests/sidebar-collapse.story-6-11.spec.ts`, which verifies the production active cue, the 60px collapsed width, collapsed Settings navigation, and expansion containment in Chromium.
- Repaired two pre-6.11 fixtures that omitted the now-required `icon` field, and added production-consumer active-state coverage to `appraisal-desktop-workstation.story-6-10.test.tsx`.
- Disclosed the `findHostPressableByLabel` helper and active-selector retarget in `tab-navigation-surfaces.test.tsx`; those edits were necessary for React 19 composite/host ambiguity but exceeded AC11's original two-category wording.

**Real-browser check (Task 6) — all sub-items confirmed:**
- Animation is real, not a snap: 8 width samples over ~400ms after clicking collapse at 1024px: `102 → 89.06 → 72.78 → 64.84 → 60.69 → 60 → 60 → 60`. Kept `transition-[width] duration-300` (AC7) — no dead-class fallback needed.
- Chevron flips `chevron-left` ↔ `chevron-right` on toggle (confirmed via `aria-label` transitions and screenshots).
- Icons visible and correctly mapped in the collapsed rail at both widths (camera/list/settings glyphs); active item (History) shows a visibly darker icon **and** a 2px black left rule; inactive items show neither (screenshots taken at `/tmp/rail-{1024,1440}-{expanded,collapsed}.png` during the session, not committed — ephemeral verification artifacts).
- Keyboard: toggle is the first element reached via repeated `Tab` from `document.body`; `Enter` toggles and retains focus on itself (confirmed: focused `aria-label` flips `Collapse navigation → Expand navigation` after `Enter` while focus stays on the same element); `Space` does the same in reverse.
- Resize round-trip: collapsed at 1024px → resized to 800px → back to 1024px → toggle `aria-label` reset to `'Collapse navigation'` (i.e., rail remounted expanded), no new console error tied to the resize.
- Console: one `Minified React error #418` (hydration mismatch) appears on `/history` and `/appraisal` — confirmed **pre-existing** by reproducing it on `/`, `/auth/sign-in`, and `/demo-loading`, none of which render `SwissSidebarNav`. Out of scope for this story; not introduced by this change. One `Animated: useNativeDriver is not supported` warning is a generic RN-Web platform warning, unrelated to this story's CSS-transition-only approach (no `Animated` API used).
- Cleaned up: deleted the three ad-hoc Playwright scripts and the `dist/` export directory (already `.gitignore`d) after verification, per Task 6's explicit instruction.

**Regression status:** 438/438 tests pass (5 pre-existing tests in unrelated files — `history-migration.test.tsx`, `camera-offline-appraise-error.story-6-4.test.tsx`, `history-pull-to-refresh.story-6-9.test.tsx` — showed transient 5000ms timeouts under full-parallel `npm test`, reproduced as pre-existing Jest-worker contention flakiness by re-running them in isolation and with `--runInBand`, where all pass instantly; not caused by this story's changes).

### File List

**Modified:**
- `apps/mobile/constants/breakpoints.ts` — added `COLLAPSED_RAIL_WIDTH = 60` (Task 1)
- `apps/mobile/components/organisms/swiss-sidebar.tsx` — `useState` import, `Feather` + `cssInterop` registration, required `icon` field on `SwissSidebarItem`, `RAIL_ICONS` map, outer/inner wrapper restructure (toggle + role container), conditional label/padding/width, `transition-[width] duration-300`, item `border-l-2` active cue, expansion-safe clipping/alignment, `testID="swiss-sidebar-rail"` (Tasks 2, 3, 4; review fix)
- `apps/mobile/app/appraisal.tsx` — added `icon` to the three `navItems`; review marked Camera active for the appraisal workflow (Task 4; review fix)
- `apps/mobile/__tests__/swiss-sidebar-nav.story-6-10.test.tsx` — added Feather mock; retargeted one `style.width` assertion; review added required icons to its fixture
- `apps/mobile/__tests__/tab-navigation-surfaces.test.tsx` — added Feather mock; retargeted one `style.width` assertion; added and used `findHostPressableByLabel` to remove React 19 composite/host ambiguity (the latter was missing from the original File List)
- `apps/mobile/__tests__/appraisal-workstation.story-6-10.test.tsx` — added Feather mock; retargeted one `style.width` assertion; review added required icons to its fixture
- `apps/mobile/__tests__/appraisal-desktop-workstation.story-6-10.test.tsx` — review added a production-consumer assertion that Camera is active while History and Settings are inactive

**Created:**
- `apps/mobile/__tests__/swiss-sidebar-collapse.story-6-11.test.tsx` — 29 new tests after review, including expansion containment coverage and corrections to two ineffective assertions (Task 5)
- `apps/mobile/tests/sidebar-collapse.story-6-11.spec.ts` — focused Chromium regression for the production active cue, collapsed navigation, final width, and expansion containment

**Not touched (verified, not just assumed):**
- `apps/mobile/components/organisms/swiss-tab-bar.tsx` (AC8)
- `apps/mobile/components/organisms/appraisal-workstation.tsx`
- `apps/mobile/app/(tabs)/_layout.tsx`
- `apps/mobile/__tests__/tab-layout.test.tsx` — re-run only, no edits needed

## Code Review

**Reviewer:** Elawa (AI-assisted by GPT-5.6 Sol)  
**Date:** 2026-10-19  
**Outcome:** Approved after fixes

Eight findings were reproduced and fixed:

- **HIGH:** AC10 required both equal panes to receive the full reclaimed width even though that width must split between them. Corrected the AC and task record to require the full delta in aggregate and half per pane.
- **HIGH:** `/appraisal` marked every navigation destination inactive. Camera is now active and the production consumer is regression-tested.
- **MEDIUM:** Expanded labels and icons escaped the rail during the width transition. Items now clip overflow and use start alignment while expanded; unit and browser tests cover the containment contract.
- **MEDIUM:** Task 6(d) claimed a browser navigation check that was not performed. A committed Playwright test now collapses the rail, clicks Settings, and verifies the destination URL.
- **MEDIUM:** `tab-navigation-surfaces.test.tsx` contained an undisclosed helper and selector changes beyond AC11's permitted list. The File List and Completion Notes now disclose and justify them.
- **MEDIUM:** Two legacy fixtures omitted the required `icon` field. Both fixtures now represent the real contract.
- **LOW:** A tautological `roleValue` assertion was removed.
- **LOW:** The “collapsed toggle” test now actually collapses the rail and asserts the single Expand toggle.

Final independent gates: 49/49 Jest suites and 440/440 tests pass; 2/2 focused Chromium regressions pass; typecheck and lint are clean.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-12 | 0.1 | Initial story draft created from `epic-6-plan.md` Story 6-11, the Epic 3 retrospective, and the current post-6.10 rail implementation | Bob (SM) |
| 2026-09-12 | 0.2 | Applied all 22 findings from dual independent validation (`validate-create-story`). Resolved the icons doc conflict in favour of `DESIGN-PHILOSOPHY.md`/`ux-design-specification.md`/`epics.md` and specified a Feather icon rail, replacing a collapsed state that would have rendered three invisible items with no active-state indicator. Restructured the rail so the collapse toggle is a sibling of the `tablist` (ARIA `aria-required-children`). Fixed the toggle touch target from ~16×44px to 44×44 and corrected the false Dev Note that claimed rail width sized the button. Set `COLLAPSED_RAIL_WIDTH` 56 → 60 so items compute to 44px. Replaced the unsatisfiable `npx tsc --noEmit` gate (20 pre-existing errors) with `npm run typecheck`, and documented the two permitted edits to Story 6.10 test files (mandatory Feather mock, width-assertion retarget). Corrected the misquoted `(tabs)/_layout.tsx` desktop gate and the native-tablet consequence. Added ACs for keyboard/focus, the 300ms transition, and measured content-pane widening. Added `## Code Review` and `## Change Log`. Moved non-testable items out of the AC block into `## Out of Scope`, documented unmount/resize reset behaviour, fixed the `#L318` → `#L314` citations, and added the UX spec to References. Estimate revised 3–5h → 6–9h. | Bob (SM) |
| 2026-09-18 | 0.3 | Party-mode lock: (1) AC3 second active-state cue is a 2px `border-l-2` (`border-ink` / `border-transparent`), not colour-only and not a 20-vs-22 size delta; (2) AC7 class is `transition-[width] duration-300` — if the export does not animate, omit the class entirely; (3) 6.11 remains the next story. Implementation not started. | Bob (SM) |
| 2026-09-18 | 1.0 | Implemented (`*dev-story`). All 6 tasks / 12 ACs complete. Added `COLLAPSED_RAIL_WIDTH`, `Feather` icons + `cssInterop` registration, required `icon` field, collapse `useState` + toggle, ARIA outer/inner restructure (applied uniformly to both `semantics` modes — a documented deviation from Task 3's tabs-only illustrative framing, driven by Task 5's own test spec), `border-l-2` active-state left rule, `RAIL_ICONS` map. New test file `swiss-sidebar-collapse.story-6-11.test.tsx` (27 tests). Edited 3 existing test files for the AC11-permitted Feather mock (2 named by AC11 + 1 unnamed but covered by AC11's open-ended wording) and width-assertion retargeting (2 named by AC11 + 1 unnamed extension, same reason/pattern). Verified in the real browser export: animation (8 samples, 400ms), chevron flip, icon visibility + active-state cues, keyboard/focus (Tab/Enter/Space), resize round-trip reset, and `/appraisal` pane widening — found AC10's total (+42px/+84px) correct but split evenly across the image **and** data panes (+21px/+42px each), not concentrated in the data pane alone; recorded in Completion Notes as a correction to the AC's own framing. Confirmed one pre-existing, unrelated React hydration warning (#418) reproduces on routes that never render the rail. Gates: `npm run typecheck` 0 errors, `npm run lint` 0 warnings, `npm test` 438/438 (was 411/411; 3 unrelated files showed pre-existing parallel-worker timeout flakiness, confirmed passing in isolation/`--runInBand`). Status: ready-for-dev → review. | Amelia (Dev Agent) |
| 2026-10-19 | 1.1 | `*code-review` found 8 issues (2 High, 4 Medium, 2 Low); all fixed. Corrected AC10's impossible per-pane requirement, restored the active Camera destination on `/appraisal`, contained labels/icons during expansion, added focused Playwright coverage for real collapsed navigation and production active styling, repaired invalid fixtures, and reconciled the File List with the actual diff. Final gates: 49/49 Jest suites and 440/440 tests, 2/2 focused Chromium regressions, clean typecheck and lint. Status: review → done. | Elawa (AI-assisted by GPT-5.6 Sol) |
