# Story 6.10: Implement Desktop UX Patterns

Status: done

## Story

As a desktop user,
I want keyboard navigation and efficient workflows,
so that I can be more productive with mouse and keyboard.

## Acceptance Criteria

1. On `/appraisal` at `width >= BREAKPOINTS.desktop`, the screen renders three regions — navigation rail, a fixed (non-scrolling) image pane, and a scrollable data pane — for **both** the just-appraised flow (no `id` query param) and the saved-valuation detail flow (`id` query param present). [Source: docs/epics.md#L1638-1648, docs/DESIGN-PHILOSOPHY.md#L318-323]
2. The rail is capped at 10% of viewport width and 144px at `BREAKPOINTS.largeDesktop`, floored at 80px — reuse the existing `computeRailWidth()` from `apps/mobile/constants/breakpoints.ts`. No new breakpoint literals.
3. The image pane and data pane split the remaining width 50/50 via flexbox (`flex: 1` on both) — not hard-coded pixel widths. A 1px `border-divider` separates rail|image and image|data. [Source: docs/sprint-artifacts/epic-6-plan.md#Story 6-10]
4. `/appraisal` never renders a top header bar, at any breakpoint. This requires a **code fix**, not just verification — see "Verified: the header-flash bug is real" in Dev Notes.
5. `npx expo export --platform web` exits 0 and the exported `dist/appraisal.html` contains no header title text or back-chevron link that isn't rendered by the screen's own JSX.
6. Exported `dist/appraisal.html` `<head>` includes a `<link rel="preload" ... as="font">` for every font loaded via `useFonts()`. **Verification only — no code change required.** Expo's static web export already emits this automatically (see Dev Notes for the exact evidence).
7. Lighthouse CLS score for `/appraisal` (desktop form factor) is ≤ 0.1, measured on the exported build. A pre-change baseline is recorded in Dev Notes; re-measure after implementation and record the result in the Dev Agent Record.
8. Mobile/tablet (`width < BREAKPOINTS.desktop`) `/appraisal` layout is visually and behaviorally unchanged — still single-column via `ScreenContainer`, using the current back button, `ValuationCard`, `ConfidenceWarning`, `SellReadinessReport`, and Summary block exactly as they render today.
9. Interactive elements built on `SwissPressable` show a visible hover state (opacity 0.85, no color/shadow change) on pointer-capable devices (web); native rendering is unaffected (no hover concept exists there). [Source: docs/DESIGN-PHILOSOPHY.md#L338-340]
10. The remaining `docs/epics.md` Story 6.10 requirements — Tab-key focus order, Enter/Space activation, unblocked right-click context menus, Escape-to-close, and focus-trap-in-modals — are **verified as already satisfied by existing behavior**, not newly implemented. See "Verification-only sub-ACs" in Dev Notes for the exact evidence per item.
11. `docs/epics.md`'s "file upload zone is the primary capture method" (desktop) requirement is **verified as already satisfied** — `apps/mobile/app/(tabs)/camera.tsx` already renders `<FileUpload>` (not `<CameraCapture>`) whenever `Platform.OS === 'web'`, which covers all desktop browsers. No code change. The *desktop capture workstation layout* (upload zone + preview as a dedicated three-pane surface) remains explicitly out of scope — see below.

**Out of scope:**
- The `_demo=loading` branch of `/appraisal` (screenshot-test harness only, not a real user-facing route) keeps its current single-column rendering at all widths.
- Sidebar collapse/expand — Story 6-11.
- Adding icons to `SwissSidebar` — the shipped component is deliberately text-only per Story 3-6/6-1; `docs/DESIGN-PHILOSOPHY.md#L314` describing icons is a pre-existing doc/code divergence this story does not resolve.
- Grid column counts — Story 6-2 (already done). [Source: docs/epics.md#L1650]
- **A desktop capture workstation layout (upload zone + preview as its own three-pane surface) is deferred, not built here.** Story 6.9's out-of-scope line named this as 6.10's job; per party-mode review (2026-09-04) the team decided AC #11's verification (FileUpload is already the desktop capture method) satisfies the letter of the epics.md requirement without expanding this story's estimate. A follow-up story should be filed if a dedicated desktop capture layout is wanted — it is not this story.

## Tasks / Subtasks

- [x] Task 1 — Fix the `/appraisal` header-flash bug (AC: #4, #5)
  - [x] 1.1 In `apps/mobile/app/_layout.tsx`, add a fifth entry to the root `<Stack>` (after `account`, inside the existing block at lines 145-159): `<Stack.Screen name="appraisal" options={{ headerShown: false }} />`. Do **not** add `gestureEnabled` here — swipe-back on `/appraisal` is spec-required and already works (native-stack default).
  - [x] 1.2 Leave the existing runtime `<Stack.Screen options={{ title: ..., headerShown: false }} />` calls inside `apps/mobile/app/appraisal.tsx` (there are three: `'Valuation'`/`'Not Found'` in the detail branch, `'Loading'` in the demo branch, `'Appraisal'` in the main branch) — they still control the web document title and remain harmless now that `headerShown: false` is also set statically.
  - [x] 1.3 Update `apps/mobile/__tests__/root-layout-gesture.story-6-9.test.tsx`:
    - The test `'registers exactly the four expected top-level screens'` (lines 148-153) must become **five**: `expect(screens.map((s) => s.props.name).sort()).toEqual(['(tabs)', 'account', 'appraisal', 'auth', 'modal'])`.
    - The test `'does not set gestureEnabled on the modal, auth, or account screens'` (lines 129-138) should add `'appraisal'` to its `for (const name of [...])` loop.
    - Rename the describe block or add a comment noting these assertions now also cover Story 6.10's fix — do not create a duplicate test file for one registration line.

- [x] Task 2 — Extract a reusable `SwissSidebarNav` from `SwissSidebar` (AC: #1, #2)
  - [x] 2.1 In `apps/mobile/components/organisms/swiss-sidebar.tsx`, extract the presentational rendering (the `<View accessibilityRole="tablist">` + `.map()` over items) into a new exported component that does **not** depend on `BottomTabBarProps`:
    ```ts
    export interface SwissSidebarItem {
      key: string;
      label: string;
      isActive: boolean;
      onPress: () => void;
      onLongPress?: () => void;
    }

    export function SwissSidebarNav({ items, railWidth }: { items: SwissSidebarItem[]; railWidth: number }) {
      // same JSX currently inside SwissSidebar's <View>/.map(), driven by `items` instead of `state.routes`
    }
    ```
  - [x] 2.2 Rewrite `SwissSidebar` (the existing export, still used by `apps/mobile/app/(tabs)/_layout.tsx` as the `tabBar` render-prop) to map `state.routes`/`descriptors`/`navigation` into `SwissSidebarItem[]` and render `<SwissSidebarNav items={items} railWidth={railWidth} />`. Preserve `onLongPress` (currently emits `tabLongPress` — do not drop it in the refactor).
  - [x] 2.3 Export `SwissSidebarNav` and `SwissSidebarItem` from `apps/mobile/components/organisms/index.ts` alongside the existing `SwissSidebar` export (line 23).
  - [x] 2.4 `apps/mobile/__tests__/tab-layout.test.tsx` mocks the whole `@/components/organisms/swiss-sidebar` module (`jest.mock(...)` at lines 84-92) and only asserts on `SwissSidebar`'s call signature — this refactor does not change `SwissSidebar`'s external props (`BottomTabBarProps & { railWidth }`), so that test file needs **no changes**. Confirmed after the refactor: `tab-layout.test.tsx` passes unchanged (18/18 across it, `tab-navigation-surfaces.test.tsx`, and the new `swiss-sidebar-nav.story-6-10.test.tsx`).
  - **Code-review correction (2026-09-05):** the raw `Pressable` exception failed the source Story 6.10 requirement because the primary desktop rail had no hover feedback. `SwissPressable` now preserves caller-provided accessibility state without injecting `disabled: false`, supports role overrides, and provides browser-verified hover/active CSS states. The rail now uses `SwissPressable`, preserves `tabBarAccessibilityLabel`, and exposes navigation semantics when rendered outside the Tabs navigator.

- [x] Task 3 — Create the `AppraisalWorkstation` organism (AC: #1, #2, #3)
  - [x] 3.1 New file `apps/mobile/components/organisms/appraisal-workstation.tsx`. **Decision (party-mode 2026-09-04): the image pane renders the existing `ValuationCard` whole — not a naked `<Image>`.** This keeps Museum Mat framing (1px `border-divider`, 4px padding, `bg-paper` — already implemented inside `ValuationCard`, `components/molecules/valuation-card.tsx:97-101`) and keeps item identity next to the photo, and it means Task 4 (exporting `ValuationCard`'s internal formatting helpers) is **not needed** — do not do it.
    ```tsx
    export interface AppraisalWorkstationProps {
      railWidth: number;
      navItems: SwissSidebarItem[];
      imagePane: React.ReactNode; // caller-provided ValuationCard (or equivalent), fully owned by the caller
      children: React.ReactNode; // remaining data-pane content (ConfidenceWarning, SellReadinessReport, Summary, Delete/etc.), fully owned by the caller
    }

    export function AppraisalWorkstation({ railWidth, navItems, imagePane, children }: AppraisalWorkstationProps) {
      return (
        <View style={{ flex: 1, flexDirection: 'row' }} testID="appraisal-workstation">
          <SwissSidebarNav items={navItems} railWidth={railWidth} semantics="navigation" />
          <Box className="flex-1 items-center justify-center bg-paper" testID="appraisal-image-pane">
            <Box className="w-full p-8">{imagePane}</Box>
          </Box>
          <Box className="w-px bg-divider" testID="appraisal-pane-divider" />
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 32 }} testID="appraisal-data-pane">
            {children}
          </ScrollView>
        </View>
      );
    }
    ```
  - [x] 3.2 Image pane uses `Box` (not `ScrollView`) — it must stay fixed per `docs/DESIGN-PHILOSOPHY.md#L320` ("Center pane: Museum Mat photo display (**fixed**)"). Only the data pane scrolls (`#L321`: "Right pane: **Scrollable** appraisal data report"). `ValuationCard` itself does not scroll internally, so passing it as `imagePane` satisfies this without extra work.
  - [x] 3.3 Export `AppraisalWorkstation` from `apps/mobile/components/organisms/index.ts`.
  - [x] 3.4 ~~Deliberate deviation~~ **Superseded.** The original draft of this task proposed a naked `<Image>` in the center pane with title/price text moved to the data pane via exported helpers. Party-mode review (2026-09-04) rejected this: it drops Museum Mat framing, forces two visual languages for the same item (card-styled elsewhere, raw image here), and adds an unforced `ValuationCard` fork. Keep `ValuationCard` whole in the image pane instead.

- [x] Task 5 — Wire the desktop branch into `apps/mobile/app/appraisal.tsx` (AC: #1, #3, #8)
  - [x] 5.1 Add `const { width } = useWindowDimensions();` and `const isDesktop = Platform.OS === 'web' && width >= BREAKPOINTS.desktop;` plus `const railWidth = computeRailWidth(width);`, importing `BREAKPOINTS`/`computeRailWidth` from `@/constants/breakpoints` and `Platform` from `react-native`. **Decision (party-mode 2026-09-04): gate is `Platform.OS === 'web' &&` width, not width alone** — `apps/mobile/app/(tabs)/_layout.tsx:22-24`'s existing pattern is width-only, but that screen keeps a real Tabs navigator underneath at every width; `/appraisal`'s workstation instead swaps in `router.replace`-based rail nav, which would misfire on a native iPad Pro in landscape (≥1024px, touch-only, no such thing as "desktop browser" per epics.md FR46). Do not copy the tab-layout pattern verbatim here.
  - [x] 5.2 Build `navItems: SwissSidebarItem[]` once near the top of the component:
    ```ts
    const navItems: SwissSidebarItem[] = [
      { key: 'camera', label: 'Camera', isActive: false, onPress: () => router.replace('/camera') },
      { key: 'history', label: 'History', isActive: false, onPress: () => router.replace('/history') },
      { key: 'settings', label: 'Settings', isActive: false, onPress: () => router.replace('/settings') },
    ];
    ```
    `isActive: false` for all three is intentional: `/appraisal` is a pushed screen outside the `(tabs)` group, so no tab is "current" while viewing it. Use `router.replace` (not `push`) so navigating away from the rail does not leave `/appraisal` in the back stack.
  - [x] 5.3 **Detail-view branch** (`params.id` present, success case, currently lines 222-337): when `isDesktop`, render `<AppraisalWorkstation railWidth={railWidth} navItems={navItems} imagePane={<ValuationCard itemDetails={itemDetails} marketData={marketData} imageUri={imageUri} />}>` with the remaining content (title/timestamp header, `ConfidenceWarning`, `SellReadinessReport`, Summary block, Delete button — **everything except** the `ValuationCard`, which now lives in `imagePane`) as `children`. **`ValuationCard` is kept whole and unmodified** (party-mode 2026-09-04 decision — see Task 3.1). The "← Back" button stays in the data-pane header per the existing detail-flow pattern (Sally: "clear destination label" — keep "← History" wording as-is). When `!isDesktop`, render exactly as today (unchanged, including `ValuationCard` in its current position).
  - [x] 5.4 **Main branch** (no `params.id`, currently lines 418-489): same treatment — `isDesktop` renders `<AppraisalWorkstation>` with `imagePane={<ValuationCard itemDetails={REPORT_ITEM} marketData={REPORT_MARKET} imageUri={params.imageUri} />}` and `children` = the remaining title/`ConfidenceWarning`/`SellReadinessReport`/Summary content; `!isDesktop` is unchanged.
  - [x] 5.5 Leave the **loading** (`params.id` + `isLoadingDetail`), **not-found** (`detailValuation === null`), and **demo-loading** (`params._demo === 'loading'`) branches untouched at all widths — they are short-lived or test-only states where a workstation layout adds no value.
  - [x] 5.6 Preserve every existing `testID` (`detail-valuation`, `appraisal-valuation`, `sell-readiness-report`) — they are consumed by `apps/mobile/__tests__/appraisal-guest-gate.test.tsx` and other existing tests.

- [x] Task 6 — Add a hover state to `SwissPressable` (AC: #9)
  - [x] 6.1 In `apps/mobile/components/primitives/swiss-pressable.tsx`, `PressableStateCallbackType` (from `react-native`) only declares `pressed: boolean` — it does **not** type `hovered`, even though react-native-web's `Pressable` (`node_modules/react-native-web/dist/exports/Pressable/index.js:81-85`) always passes `{ pressed, focused, hovered }` to the style callback on web. Accessing `state.hovered` directly will fail `tsc --noEmit` (this repo's `typecheck` script uses `tsconfig.typecheck.json`). Cast explicitly:
    ```ts
    const hovered = Boolean((state as PressableStateCallbackType & { hovered?: boolean }).hovered);
    ```
  - [x] 6.2 Add `const OPACITY_HOVERED = 0.85;` next to the existing `OPACITY_PRESSED`/`OPACITY_DISABLED` constants (lines 30-31). Apply it in the style callback's opacity branch, after the `disabled`/`pressed` checks and before the default `1`: `else if (hovered) { opacity = OPACITY_HOVERED; }`. Code review found NativeWind's wrapped web surface did not propagate `hovered` into that callback in the exported app, so the production surface also uses `hover:opacity-[0.85] active:!opacity-60 disabled:!opacity-40`; Playwright verified hover `0.85` and pressed precedence `0.6`. Native ignores these web variants.
  - [x] 6.3 Do not add hover handling to the `scale` transform — `docs/DESIGN-PHILOSOPHY.md#L339-340` specifies "subtle opacity change... no color shifts, no shadows" for hover; the existing `scale(0.98)` press feedback stays exclusive to `pressed`.

- [x] Task 7 — Verification tasks — record evidence, do not skip (AC: #6, #7, #10, #11)
  - [x] 7.0 **Desktop capture method (AC #11):** Confirm `apps/mobile/app/(tabs)/camera.tsx` renders `<FileUpload>` (not `<CameraCapture>`) whenever `Platform.OS === 'web'` (see the `captureSurface` ternary, `camera.tsx` around line 373). Record the confirming line reference in the Dev Agent Record. No code change.
  - [x] 7.1 **Font preload (AC #6):** Run `cd apps/mobile && rm -rf dist && npx expo export --platform web`, then inspect `dist/appraisal.html`'s `<head>`. Confirm it already contains `<link rel="preload" href="/assets/assets/fonts/SpaceMono-Regular.<hash>.ttf" as="font" crossorigin="" />` and the equivalent for `FontAwesome`. Record the exact matched lines in the Dev Agent Record. Do **not** add a manual `<link rel="preload">` to `apps/mobile/app/+html.tsx` — it would duplicate what Expo's static export already emits per loaded font and risks a stale/mismatched hash after the next font change.
  - [x] 7.2 **CLS (AC #7):** After Task 1-6 are implemented and `expo export --platform web` has produced a fresh `dist/`, serve it locally (`npx serve -l 4173 dist`) and run Lighthouse against the desktop-width `/appraisal` route:
    ```bash
    CHROME_PATH=/usr/bin/google-chrome npx lighthouse http://localhost:4173/appraisal \
      --only-categories=performance --preset=desktop \
      --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage" \
      --output=json --output-path=/tmp/lh-appraisal-after.json --quiet
    ```
    Read `audits['cumulative-layout-shift'].numericValue` from the JSON output; it must be `<= 0.1`. Record the number in the Dev Agent Record.
  - [x] 7.3 **Keyboard/context-menu verification (AC #10):** confirm and record, do not re-implement:
    - Tab focus order: `SwissPressable` already renders as a real web `<button>` via react-native-web (confirmed in exported HTML: `<button ... role="button" tabindex="0">`), so native Tab-key focus order works without code changes.
    - Enter/Space activation: standard HTML `<button>` elements activate on Enter and Space by default — no code needed.
    - Right-click context menus: `grep -rn "onContextMenu" apps/mobile` returns no results outside `node_modules` — nothing in this codebase calls `event.preventDefault()` in a context-menu handler, so context menus are never blocked.
    - Escape-to-close / focus-trap-in-modals: `/appraisal` presents no modal or dismissible overlay of its own. The only such surface in the app is `ValuationResultOverlay` on the camera screen, whose focus trap and Escape handling were already implemented in Story 6.9 (`apps/mobile/components/molecules/valuation-result-overlay.tsx`). Nothing to change here.

- [x] Task 8 — Tests (AC: #1, #2, #3, #4, #8, #9)
  - [x] 8.1 New file `apps/mobile/__tests__/appraisal-desktop-workstation.story-6-10.test.tsx`: mock `expo-router` (`useRouter`, `useLocalSearchParams`, `Stack.Screen`) and `@/lib/localHistory`/`@/contexts/AuthContext` the same way `apps/mobile/__tests__/appraisal-guest-gate.test.tsx` does. Mock `useWindowDimensions` to `{ width: 1440, height: 900 }` and mock `Platform.OS` as `'web'` (default in this Jest project — confirm, don't assume). Render `AppraisalReportScreen` for both the main (no `id`) and detail (`id` present) flows and assert: `getByTestId('appraisal-workstation')` exists, `getByTestId('appraisal-image-pane')` and `getByTestId('appraisal-data-pane')` both exist, `getByTestId('detail-valuation')`/`getByTestId('appraisal-valuation')` (the `ValuationCard`'s existing testID) renders **inside** the image pane, and `queryByTestId('screen-container')` is `null` (workstation replaces `ScreenContainer` at desktop width). Also assert the rendered `SwissSidebarNav` items list contains exactly `Camera`, `History`, `Settings` labels.
  - [x] 8.2 Add a mobile-width case to the same file (or a second `it`): mock `useWindowDimensions` to `{ width: 375, height: 800 }` and assert `queryByTestId('appraisal-workstation')` is `null` and `getByTestId('screen-container')` exists — guards AC #8 against a future regression that applies the workstation layout too broadly. Add a **third** case at `{ width: 1200, height: 900 }` with `Platform.OS` mocked to `'ios'` (simulating an iPad Pro landscape) and assert `queryByTestId('appraisal-workstation')` is `null` — guards the web-only gate decided in Task 5.1 against regressing to width-only.
  - [x] 8.3 New file `apps/mobile/__tests__/swiss-sidebar-nav.story-6-10.test.tsx`: render `SwissSidebarNav` directly with a fixture `items` array; assert labels render, `isActive: true` produces `font-semibold` + `text-ink` styling and `accessibilityState={{ selected: true }}`, and `onPress` fires the provided callback. Separately, render `SwissSidebar` (the `BottomTabBarProps` wrapper) with a mock `state`/`descriptors`/`navigation` fixture (reuse the fixture shape from `apps/mobile/__tests__/tab-layout.test.tsx:50-69`) and assert it still emits `tabPress`/`tabLongPress` navigation events — this guards the Task 2 refactor against silently breaking the existing Tabs integration.
  - [x] 8.4 New file `apps/mobile/__tests__/swiss-pressable-hover.story-6-10.test.tsx`: render a `SwissPressable`, assert the exported-browser hover class is present, invoke its `style` prop function with `{ pressed: false, hovered: true } as any`, and assert the returned style array includes `{ opacity: 0.85 }`. Also assert `{ pressed: true, hovered: true }` yields `{ opacity: 0.6 }` (pressed takes precedence over hovered) and `{ pressed: false, hovered: false }` yields `{ opacity: 1 }`.
  - [x] 8.5 Extend `apps/mobile/__tests__/root-layout-gesture.story-6-9.test.tsx` per Task 1.3 (five screens, `appraisal` added to the no-gestureEnabled loop).
  - [x] 8.6 Run the full suite and confirm no regressions: `npm run test:ci`, `npm run typecheck`, `npm run lint` (all from `apps/mobile/`).

## Dev Notes

### Verified: the header-flash bug is real (do not treat this as "verification only")

`docs/sprint-artifacts/epic-6-plan.md#Story 6-10` states: *"The tab layout already sets `headerShown: false`... treat the no-header requirement as a verification gate."* That claim is **only true for screens inside `(tabs)`** — it is **false for `/appraisal`**, which is a separate top-level Stack screen. Verified by actually running the export:

```bash
cd apps/mobile && rm -rf dist && npx expo export --platform web
grep -o 'role="heading"[^<]*<[^>]*>appraisal' dist/appraisal.html
# → role="heading" ...>appraisal</h1>   (a native-stack default header WAS rendering)
```

Root cause: `apps/mobile/app/_layout.tsx`'s `<Stack>` registers `(tabs)`, `modal`, `auth`, `account` with static `options`, but **not** `appraisal`. The component's own `<Stack.Screen options={{ headerShown: false }} />` (set at render time, inside `AppraisalReportScreen`) is not applied early enough to prevent the default header appearing in the static-exported HTML — this is the literal first paint a crawler or a slow-JS client would see, and it is a real, measurable layout shift (a 64px header appearing then disappearing).

Fix verified experimentally: adding `<Stack.Screen name="appraisal" options={{ headerShown: false }} />` to the root `<Stack>` (Task 1.1) removes the header from the exported HTML entirely — confirmed by re-running the same export and grep with zero matches.

### Verified: font preload already works with zero code changes (AC #6 is verification-only)

Expo's static web export auto-generates a `<link rel="preload" as="font">` for every font loaded via `expo-font`'s `useFonts()` — this is **not** something `apps/mobile/app/+html.tsx` needs to add manually. Confirmed in the actual exported output:

```
<style id="expo-generated-fonts">@font-face{font-family:"SpaceMono";src:url("/assets/assets/fonts/SpaceMono-Regular.49a79d66bdea2debf1832bf4d7aca127.ttf");font-display:auto}
@font-face{font-family:"FontAwesome";src:url("/assets/node_modules/.../FontAwesome.b06871f281fee6b241d60582ae9369b9.ttf");font-display:auto}</style>
<link rel="preload" href="/assets/assets/fonts/SpaceMono-Regular.49a79d66bdea2debf1832bf4d7aca127.ttf" as="font" crossorigin="" />
<link rel="preload" href="/assets/node_modules/.../FontAwesome.b06871f281fee6b241d60582ae9369b9.ttf" as="font" crossorigin="" />
```

Note the app's actual body text renders in system/`Helvetica Neue`-family fonts, **not** a loaded web font: `apps/mobile/global.css:39` declares `font-family: 'Inter', ...` but no `@font-face` or `<link>` anywhere loads Inter — it silently falls back to `Helvetica Neue`/system fonts. This predates Epic 6 and is **not** this story's problem to fix (no AC calls for it). The only fonts that actually block/affect paint are the ones loaded via `useFonts()` in `apps/mobile/app/_layout.tsx:70-73` (`SpaceMono`, `FontAwesome`), and those are already preloaded automatically. AC #6 requires recording this evidence in the Dev Agent Record, not writing code.

### Verified: no rail exists on `/appraisal` today (the biggest gap this story fixes)

`/appraisal` is a sibling of `(tabs)` in the root Stack, **not nested inside it** — so it does not automatically inherit `SwissSidebar`. Confirmed by inspecting the exported `dist/appraisal.html`: the only `role="tablist"` element present is wrapped in `aria-hidden="true"` with `display:none` — it belongs to the hidden, still-mounted `(tabs)/camera` screen sitting underneath the pushed `/appraisal` screen, not to `/appraisal` itself. This is why Task 2/3 build a standalone rail (`SwissSidebarNav` used directly, not through the Tabs navigator) rather than treating "the rail" as something already present that just needs restyling.

### CLS baseline (pre-implementation)

Measured on the **current** (unfixed) `/appraisal` export, desktop preset, before any Story 6.10 changes:

```
CLS numericValue: 0.047   (displayValue "0.047", score 0.99)
Performance category score: 0.88
```

This is already under the 0.1 gate — likely because the header-flash resolves before Lighthouse's shift-tracking window closes. **Do not assume this holds after adding the three-pane workstation layout** — new panes, a newly-loaded image, and the sidebar mounting are all potential new sources of layout shift. Re-run the exact command in Task 7.2 after implementation and record the new number; if it regresses above 0.1, investigate before marking this story done.

### `computeRailWidth` reference (no changes needed to this function)

```1:13:apps/mobile/constants/breakpoints.ts
export const BREAKPOINTS = {
  tablet: 600,
  desktop: 1024,
  largeDesktop: 1440,
} as const;

export function computeRailWidth(viewportWidth: number): number {
  return Math.max(80, Math.min(Math.floor(viewportWidth * 0.1), 144));
}
```

`computeRailWidth(1024) === 102`, `computeRailWidth(1440) === 144`, `computeRailWidth(800) === 80` — already covered by `apps/mobile/__tests__/tab-layout.test.tsx:167-183`. Reuse as-is.

### Party-mode review decisions (2026-09-04, before dev-story) — supersede the original Task 3.4/4/5.1 draft

A full-team `*party-mode` review of this story (before implementation started) found the original draft's Task 3/4/5 combination would ship a UX regression: a naked, unframed `<Image>` in the center pane (losing Museum Mat framing), a duplicate/forked rendering of `ValuationCard`'s title+price text in the data pane, and a workstation layout gated on viewport width alone (misapplying to native tablets, which have no "desktop browser" per epics.md FR46). Three decisions were made and are now baked into the tasks above — do not revert to the original text:

1. **Center pane keeps `ValuationCard` whole** (not split, not replaced with a bare image). `AppraisalWorkstation` takes an `imagePane: React.ReactNode` prop instead of `imageUri`/`imageAccessibilityLabel`. Task 4 (exporting `ValuationCard`'s internal formatting helpers) is deleted — it existed only to support the rejected naked-image design.
2. **AC #11 added**: "file upload zone is the primary capture method" (epics.md) is verification-only — `FileUpload` already renders on `Platform.OS === 'web'` in `camera.tsx`. A dedicated desktop capture *workstation layout* remains out of scope for this story (unchanged from the original draft's intent, now made explicit instead of silently dropped).
3. **`isDesktop` gate is `Platform.OS === 'web' && width >= BREAKPOINTS.desktop`**, not width alone — protects against the workstation (with its `router.replace`-based rail nav) applying to a touch-only native tablet.

### Doc conflict — epics.md vs. epic-6-plan.md acceptance criteria

`docs/epics.md#L1632-1650` (the original PRD-level story) lists keyboard shortcuts, focus-trap-in-modals, hover states, and unblocked context menus as ACs. `docs/sprint-artifacts/epic-6-plan.md#Story 6-10` (the later, code-reviewed, "locked ACs" planning document from Story 5.5-5) lists a different, narrower, fully-measurable set (pane split, CLS, export, font preload) and does not repeat the epics.md items. This story treats **both as valid** rather than assuming epic-6-plan.md silently descoped them: epic-6-plan.md's items become this story's primary, gating ACs (#1-#8); the epics.md items are individually verified against the actual codebase (AC #9-#10) rather than dropped. Two of them (hover states) turned out to be genuine gaps requiring real code (Task 6); the rest were already satisfied by existing platform/browser behavior (Task 7.3).

### Project Structure Notes

- New file: `apps/mobile/components/organisms/appraisal-workstation.tsx` — organism tier, consistent with `docs/architecture.md` placing full-screen/multi-region layout components alongside `camera-capture/`, `file-upload/`.
- `SwissSidebarNav` lives in the existing `swiss-sidebar.tsx` file (not a new file) — it is a decomposition of one component into two exports from the same module, not a new abstraction layer.
- No new hooks, no new breakpoint constants, no new Tailwind tokens — this story only consumes `BREAKPOINTS`/`computeRailWidth` (6-1) and could have consumed `useGridColumns`/`ScreenContainer wide` (6-2) but does not need them: the workstation is a bespoke 3-region flex layout, not a card grid.

### References

- [Source: docs/epics.md#L1632-1650] — Story 6.10 original acceptance criteria
- [Source: docs/sprint-artifacts/epic-6-plan.md#Story 6-10] — locked, measurable ACs (pane split %, CLS, export, font preload)
- [Source: docs/sprint-artifacts/5.5-5-lock-epic-6-workstation-acs.md] — origin of the 10/45/45 model and the ACs epic-6-plan.md locked
- [Source: docs/DESIGN-PHILOSOPHY.md#L303-347] — Two-Context Design, Desktop Workstation Appraisal View, Hover States (opacity 0.85), Museum Mat framing
- [Source: docs/ux-design-specification.md#L2196-2205, #L2318-2325] — workstation ASCII layout, 10/45/45 ratio, sidebar restraint
- [Source: apps/mobile/app/appraisal.tsx] — current single-column implementation (detail branch, main branch, demo-loading branch)
- [Source: apps/mobile/app/_layout.tsx] — root Stack missing the `appraisal` screen registration
- [Source: apps/mobile/app/(tabs)/_layout.tsx] — `isDesktop`/`railWidth` computation pattern to mirror
- [Source: apps/mobile/components/organisms/swiss-sidebar.tsx] — component being decomposed
- [Source: apps/mobile/components/molecules/valuation-card.tsx] — kept whole and unmodified; reused as `AppraisalWorkstation`'s `imagePane` (party-mode 2026-09-04 decision)
- [Source: apps/mobile/components/primitives/swiss-pressable.tsx] — hover state addition target
- [Source: apps/mobile/__tests__/tab-layout.test.tsx] — `computeRailWidth` test coverage and `SwissSidebar` mock fixture shape to reuse
- [Source: apps/mobile/__tests__/root-layout-gesture.story-6-9.test.tsx] — test requiring the five-screen update
- [Source: docs/sprint-artifacts/6-9-implement-mobile-ux-patterns.md] — previous story; mobile capture/overlay patterns this story must not touch
- [Source: docs/sprint-artifacts/6-2-implement-responsive-grid-system.md] — `BREAKPOINTS`/`ScreenContainer wide` precedent (considered, not used — see Project Structure Notes)
- [Source: docs/sprint-artifacts/6-3-configure-pwa-manifest.md#Scope boundary] — explicitly deferred "expo export performance gates... font preload" to this story

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (Cursor) — story creation and research
Claude Sonnet 5 (Cursor) — dev-story implementation (2026-09-04)
GPT-5.6 Sol (Cursor) — adversarial code review and fixes (2026-09-05)

### Debug Log References

- `cd apps/mobile && rm -rf dist && npx expo export --platform web` — baseline export, confirmed header-flash bug via `grep -o 'role="heading"[^<]*<[^>]*>appraisal' dist/appraisal.html`
- Experimentally added `<Stack.Screen name="appraisal" options={{ headerShown: false }} />` to `_layout.tsx`, re-exported, confirmed header and back-chevron link disappeared from `dist/appraisal.html`, then reverted the change (implementation belongs to `dev-story`, not `create-story`)
- `CHROME_PATH=/usr/bin/google-chrome npx lighthouse http://localhost:4173/appraisal --only-categories=performance --preset=desktop --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage" --output=json` — CLS baseline 0.047 (pre-change), performance 0.88
- `grep -o 'Camera tab\|History tab\|Settings tab\|tablist' dist/appraisal.html` — confirmed the only tab bar in the DOM belongs to the hidden underlying `(tabs)/camera` screen, not `/appraisal` itself
- `grep -rn "onContextMenu" apps/mobile` (excluding node_modules) — zero matches; confirmed context menus are unblocked app-wide today

**dev-story session (2026-09-04):**

- Task 1: `npx jest __tests__/root-layout-gesture.story-6-9.test.tsx` — 3 red failures confirmed before the `_layout.tsx` fix, 5/5 green after.
- Task 7.0: `apps/mobile/app/(tabs)/camera.tsx:380-386` — confirmed `captureSurface = Platform.OS === 'web' ? <FileUpload ...> : <CameraCapture ...>`. No code change (AC #11).
- Task 7.1: `cd apps/mobile && rm -rf dist && npx expo export --platform web` (exit 0) → `grep -o 'role="heading"[^<]*<[^>]*>[Aa]ppraisal' dist/appraisal.html` = **zero matches** (header-flash fix confirmed in the real export, AC #4/#5) → `grep -o '<link rel="preload"[^>]*as="font"[^>]*>' dist/appraisal.html` = both `SpaceMono-Regular` and `FontAwesome` preload links present (AC #6, unchanged from create-story evidence).
- Task 7.2: `npx serve -l 4173 dist` + `CHROME_PATH=/usr/bin/google-chrome npx lighthouse http://localhost:4173/appraisal --only-categories=performance --preset=desktop --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage" --output=json --output-path=/tmp/lh-appraisal-after.json` → **CLS = 0** (numericValue), performance score **1.0**. Improved from the 0.047 pre-change baseline; the new three-pane workstation introduced no additional shift (AC #7).
- Task 7.3: `grep -o '<button[^>]*role="button"[^>]*tabindex="0"[^>]*>' dist/appraisal.html` — confirmed real `<button role="button" tabindex="0">` elements (Tab focus + Enter/Space work natively). `grep -rn "onContextMenu" --exclude-dir=node_modules --exclude-dir=dist .` — zero matches app-wide (AC #10, re-confirmed against the post-implementation build).
- `npm run test:ci` — 407/407 tests passing, 48/48 suites, plus `test:sw-runtime` export check passed.
- `npm run typecheck` (`tsc --noEmit -p tsconfig.typecheck.json`) — clean, zero errors.
- `npm run lint` (`expo lint --max-warnings 0`) — clean, zero warnings.

**code-review session (2026-09-05):**

- Fresh browser geometry probe found AC #3 was not actually met: at 1280px the flex panes measured 608.5px / 543.5px because `p-8` added a 65px flex base to the image pane. Padding moved to an inner wrapper and the divider became its own 1px element; post-fix measurement is 575.5px / 575.5px.
- Playwright against the exported build proved the synthetic `hovered` unit test was a false positive: both the rail and `SwissPressable` remained opacity 1. Added production web state classes and moved the rail to `SwissPressable`; post-fix measurements are hover 0.85 and pressed+hover 0.6.
- Standalone `/appraisal` rail changed from an invalid all-unselected ARIA tablist to a labeled navigation landmark. The real Tabs adapter retains tab semantics.
- Desktop `ValuationCard` wrappers now use the pane width and the existing compact variant. At 1024×300 the card fits from y=18.4 to y=281.6 instead of clipping from y=-22.6 to y=322.6.
- Removed three generated Lighthouse Chrome-profile directories from `apps/mobile/` (two found by review, one created during the post-fix re-measurement).
- Post-fix checks: `npm run test:ci` = 411/411 tests, `npm run typecheck` clean, `npm run lint` clean, fresh web export successful, Lighthouse desktop CLS = 0 and performance = 0.97.

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created based on: `docs/epics.md`, `docs/sprint-artifacts/epic-6-plan.md`, `docs/sprint-artifacts/5.5-5-lock-epic-6-workstation-acs.md`, `docs/DESIGN-PHILOSOPHY.md`, `docs/ux-design-specification.md`, the current `apps/mobile/app/appraisal.tsx` / `_layout.tsx` / `swiss-sidebar.tsx` / `swiss-pressable.tsx` implementations, and two real `expo export --platform web` runs (one of which included a live experimental fix-and-revert to verify the header-flash root cause before writing it into the story).
- Two planning-document assumptions were corrected with real evidence: (1) `epic-6-plan.md`'s claim that `/appraisal` header suppression is "verification only" is false — it is a real bug requiring a one-line fix; (2) the assumption that a rail exists to "restyle" for the workstation is false — no rail renders on `/appraisal` at all today.
- Font preload (AC #6) required zero implementation guidance beyond "verify and record" — Expo's static export already handles it.
- **Before implementation started**, a full-team `*party-mode` review found the original Task 3/4/5 draft would ship a UX regression (naked unframed image, forked `ValuationCard` text, viewport-only desktop gate). Three decisions were locked into the story before any code was written — see "Party-mode review decisions" in Dev Notes and the 2026-09-04 Change Log entry.
- Task 2/code review: `SwissSidebarNav` now uses `SwissPressable`. The primitive no longer injects `disabled: false` into caller accessibility state, so active-tab assertions remain exact; role overrides let standalone appraisal navigation avoid invalid tab-widget semantics. Descriptor-provided `tabBarAccessibilityLabel` values are preserved.
- Task 5: default Jest platform for this repo's `jest-expo` preset is `ios`, not `web` (`haste.defaultPlatform: "ios"`, confirmed via `npx jest --showConfig`) — the story's Task 8.1 draft assumed `web` was the default without verification. The new test file (`appraisal-desktop-workstation.story-6-10.test.tsx`) sets `Platform.OS` explicitly per case rather than relying on any default, and includes a case proving the gate is native-platform-safe (`Platform.OS = 'ios'` at desktop width renders `ScreenContainer`, not `AppraisalWorkstation`).
- Task 5: `testID="appraisal-valuation"`/`testID="detail-valuation"` moved from wrapping `{ValuationCard, ConfidenceWarning, SellReadinessReport}` together (mobile) to wrapping only `<ValuationCard>` inside `imagePane` (desktop) — required because `ConfidenceWarning`/`SellReadinessReport` now render in the data pane, a different subtree. Verified against the real consumer: `apps/mobile/tests/screenshots.spec.ts` runs its "Web (desktop viewport)" suite at 1280×720 (`>= BREAKPOINTS.desktop`) and calls `page.getByTestId('appraisal-valuation').scrollIntoViewIfNeeded()` — this still resolves correctly since the testID travels with `ValuationCard` regardless of which pane it's in.
- Desktop and mobile render paths in `apps/mobile/app/appraisal.tsx` share extracted JSX fragments (`backButton`/`summaryAndDelete` in the detail branch, `mainBackButton`/`mainSummary` in the main branch) rather than being fully duplicated, but are otherwise separate `if (isDesktop) { ... } return (...)` blocks — chosen over a single heavily-conditional render tree to guarantee the existing mobile path (`!isDesktop`) is provably byte-for-byte unchanged in structure, per Task 5.3/5.4's "render exactly as today (unchanged)" requirement.

### File List

**Modified:**
- `apps/mobile/app/_layout.tsx` — registered `appraisal` as a static top-level `Stack.Screen` with `headerShown: false` (Task 1)
- `apps/mobile/app/appraisal.tsx` — added `isDesktop`/`railWidth`/`navItems`; both the detail-view and main branches now render `<AppraisalWorkstation>` when `isDesktop`, `<ScreenContainer>` otherwise (Task 5)
- `apps/mobile/components/organisms/swiss-sidebar.tsx` — extracted `SwissSidebarNav` (presentational) from `SwissSidebar` (Tabs adapter) (Task 2)
- `apps/mobile/components/organisms/index.ts` — exported `SwissSidebarNav`, `SwissSidebarItem`, `SwissSidebarNavSemantics`, `AppraisalWorkstation`, `AppraisalWorkstationProps` (Tasks 2.3, 3.3; code-review fix)
- `apps/mobile/components/primitives/swiss-pressable.tsx` — added browser-verified hover/active state, role overrides, and correct accessibility-state merging (Task 6; code-review fixes)
- `apps/mobile/__tests__/root-layout-gesture.story-6-9.test.tsx` — extended to five screens, added `appraisal` header-suppression assertion (Task 1.3)
- `apps/mobile/__tests__/tab-navigation-surfaces.test.tsx` — updated real-surface assertions for `SwissPressable`-backed sidebar controls (code-review fix)

**New:**
- `apps/mobile/components/organisms/appraisal-workstation.tsx` — `AppraisalWorkstation` organism (Task 3)
- `apps/mobile/__tests__/appraisal-workstation.story-6-10.test.tsx` — unit tests for `AppraisalWorkstation` (Task 3)
- `apps/mobile/__tests__/swiss-sidebar-nav.story-6-10.test.tsx` — unit tests for `SwissSidebarNav` + `SwissSidebar` regression (Task 2, 8.3)
- `apps/mobile/__tests__/swiss-pressable-hover.story-6-10.test.tsx` — unit tests for `SwissPressable` hover state (Task 6, 8.4)
- `apps/mobile/__tests__/appraisal-desktop-workstation.story-6-10.test.tsx` — integration tests wiring the workstation into `/appraisal` at desktop/mobile/native widths (Task 5, 8.1, 8.2)

**Story/tracking docs:**
- `docs/sprint-artifacts/6-10-implement-desktop-ux-patterns.md` — patched post-party-mode (2026-09-04) before implementation, then updated task-by-task during dev-story
- `docs/sprint-artifacts/sprint-status.yaml` — `6-10-implement-desktop-ux-patterns`: `ready-for-dev` → `in-progress` → `review` → `done`

## Senior Developer Review (AI)

**Reviewer:** Elawa (AI-assisted by GPT-5.6 Sol)  
**Date:** 2026-09-05  
**Outcome:** Approved after fixes

Eight findings were reproduced and fixed:

- **HIGH:** Flex padding made the claimed 50/50 panes unequal. Fixed with an inner padding wrapper and a standalone 1px divider; browser geometry is now equal.
- **HIGH:** `SwissPressable`'s synthetic hover test did not match the exported browser. Added browser-effective NativeWind state variants and verified hover/press values with Playwright.
- **HIGH:** The new rail had no hover feedback by deliberate exception. It now uses `SwissPressable`.
- **MEDIUM:** The standalone route rail exposed invalid all-unselected tab semantics. It now uses a labeled navigation landmark with button controls; the actual Tabs adapter retains tab semantics.
- **MEDIUM:** The desktop valuation card stayed ~212px wide and clipped in short windows. It now fills the padded pane width and uses the existing compact variant on desktop.
- **MEDIUM:** `tabBarAccessibilityLabel` was lost during extraction. It is now carried through `SwissSidebarItem` and regression-tested.
- **MEDIUM:** Generated Lighthouse browser-profile directories were untracked and undocumented. They were removed.
- **LOW:** The detail route used generic “← Back” copy despite its fixed destination. It now says “← History” with an explicit accessibility label.

Final independent gates: 411/411 tests pass, typecheck clean, lint clean, fresh Expo web export passes, real browser pane geometry and interaction states pass, Lighthouse CLS 0.

## Change Log

- 2026-08-24 — Story created via `*create-story` (SM/create-story workflow). Status → ready-for-dev.
- 2026-09-04 — Story patched after full-team `*party-mode` review, before `*dev-story` implementation began. Three decisions locked in: (1) `AppraisalWorkstation` image pane keeps `ValuationCard` whole (Task 3.1/3.4 rewritten, Task 4 deleted), (2) AC #11 added to explicitly verify "file upload zone is primary capture method" instead of silently dropping it, (3) `isDesktop` gate changed to `Platform.OS === 'web' && width >= BREAKPOINTS.desktop` (Task 5.1). Tasks 5.3/5.4/7/8 updated to match.
- 2026-09-04 — `*dev-story` implementation complete. All 8 tasks done via red-green-refactor: header-flash fix, `SwissSidebarNav` extraction, `AppraisalWorkstation` organism, desktop wiring in `appraisal.tsx`, `SwissPressable` hover state, all AC #6/#7/#10/#11 verifications re-run against the post-implementation build (CLS improved 0.047 → 0). Full regression: 407/407 tests, clean typecheck, clean lint. Status → review.
- 2026-09-05 — `*code-review` found 8 issues (3 High, 4 Medium, 1 Low); all fixed. Browser verification now proves equal 50/50 panes, working 0.85 hover/0.6 press feedback, valid standalone navigation semantics, and short-viewport containment. Full regression: 411/411 tests, clean typecheck/lint, fresh export, CLS 0. Status → done.
