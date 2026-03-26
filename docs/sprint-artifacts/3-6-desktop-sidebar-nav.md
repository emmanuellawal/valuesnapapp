# Story 3.6: Desktop Sidebar Navigation

**Status:** done

---

## Story

**As a** desktop user,  
**I want** a left-side navigation column instead of a bottom tab bar,  
**So that** the layout makes proper use of the wider canvas and feels like a considered desktop experience — not a stretched phone.

---

## Business Context

### Why This Story Matters

Stories 3.3–3.5 deliver the core History persistence experience on mobile and tablet.
Story 3.6 is the desktop layer on top of that foundation.

At viewport widths > 1024px the current bottom `SwissTabBar` lives in the wrong place.
Bottom navigation is a mobile pattern because thumbs reach the bottom of a handheld
screen. On a desktop monitor, a persistent left-side column is the correct spatial
choice — it anchors navigation to where the eye expects it and frees the main content
area for the grid of cards.

This is **not a cosmetic change** to the tab bar. It is a **conditional layout switch**:
bottom bar on small screens, sidebar on large screens. The same three tabs (Camera,
History, Settings) exist in both layouts. No new routes. No new screens.

**What "desktop" means for this project:**
- `useWindowDimensions()` from `react-native`
- `width >= 1024` → sidebar layout
- `width < 1024` → bottom tab bar (existing `SwissTabBar`, untouched)

The 1024px threshold aligns with the UX spec breakpoint table (`lg: 1024px`) and
the commonly tested desktop resolution range in our Playwright suite.

### Design Direction (Team-Agreed, March 2026 Party Mode Session)

The sidebar must feel like a **museum catalog wing list** — not a chat application,
not a social feed, not an admin panel.

Concretely:
- **No icons** in the sidebar. Text labels only.
- **No background color** on the sidebar itself. The sidebar is white (paper) like
  the rest of the screen.
- **One vertical rule.** A single 1px `divider`-color line separates the sidebar
  from the content area. That line does all the structural work whitespace cannot.
- **Active indicator** is a typographic signal only: the active item is rendered at
  bold weight (or the next weight step up in the type scale). No underlines, no
  highlight boxes, no coloured dots.
- **Text-only, flush-left.** Navigation labels align to the left edge of the sidebar
  column. Ragged right. Never centered.
- Width: fixed at **240px**. Not collapsible in this story. Collapse/expand is a
  future enhancement.

This is explicitly different from ChatGPT (dark background, icon + label, hover
states, conversation list). Different from linear app nav (icon-dominant). It should
read like the left column of a well-designed printed catalog.

### Value Delivery

- Desktop users get a layout that respects the canvas size
- No regression on mobile/tablet — the bottom tab bar code path is unchanged
- Unlocks a proper multi-panel desktop experience for Epic 4+ features
- Zero new npm dependencies (all implemented with `useWindowDimensions()` and
  plain React Native `View` + `Text` primitives)

---

## Acceptance Criteria

### AC1: Sidebar Renders on Desktop Widths

**Given** the app is viewed at `width >= 1024px`  
**When** any tab screen is active  
**Then** a left-side navigation column is visible  
**And** the column is 240px wide with a single 1px right border using the `divider` color  
**And** the column background is `paper` (white) — no fill color  
**And** the three navigation items (Camera, History, Settings) are rendered as text labels  
**And** the active item is visually distinguished by font weight alone (bold or `font-semibold` in the type scale)  
**And** the bottom `SwissTabBar` is **not rendered** at desktop widths

---

### AC2: Bottom Tab Bar Unchanged on Small Screens

**Given** the app is viewed at `width < 1024px`  
**When** any tab screen is active  
**Then** the existing `SwissTabBar` renders at the bottom exactly as before  
**And** the sidebar is not rendered  
**And** no visual difference from the pre-3.6 behavior is detectable on mobile or tablet

---

### AC3: Navigation Works Correctly in Both Layouts

**Given** the user is on any screen in either layout  
**When** they tap/click a navigation item (sidebar or tab bar)  
**Then** they are routed to the correct tab screen  
**And** the active indicator updates to reflect the newly active route  
**And** no route is duplicated or skipped

---

### AC4: Swiss Minimalist Aesthetic Maintained

**Given** the sidebar is rendered at desktop widths  
**When** it is inspected visually  
**Then** there are no icons, decorative borders, rounded corners, gradients, or shadows  
**And** there is no hover background highlight (a color-weight change on the label text is acceptable)  
**And** the sidebar typography uses the same type scale as the rest of the app  
**And** the vertical divider line is the sole structural separator — no second border, no padding-based fake borders

---

### AC5: No TypeScript Errors, No Regressions

**Given** the changes are complete  
**When** the TypeScript compiler and test suite run  
**Then** `tsc` reports zero errors  
**And** `npx jest` reports all tests passing  
**And** no existing Playwright screenshot tests for mobile layouts have changed

---

## Tasks / Subtasks

- [x] Create `apps/mobile/components/organisms/swiss-sidebar.tsx` (AC1, AC3, AC4)
  - [x] Accept `state` and `navigation` (same props as `SwissTabBar`) or a simplified equivalent
  - [x] Render three `SwissPressable` items: Camera, History, Settings with text labels
  - [x] Active detection: compare current route to tab name, apply `font-semibold` weight to active label
  - [x] Layout: `View` 240px wide, `borderRightWidth: 1`, `borderRightColor` = divider token, full height
  - [x] No icons. No background fill. No hover state fill.
- [x] Export `SwissSidebar` from `apps/mobile/components/organisms/index.ts` (AC1)
  - [x] Add `export { SwissSidebar } from './swiss-sidebar';` to the organisms barrel
- [x] Update `apps/mobile/app/(tabs)/_layout.tsx` to conditionally render sidebar vs tab bar (AC1, AC2)
  - [x] Import `useWindowDimensions` from `react-native`
  - [x] Set `screenOptions.tabBarPosition` to `'left'` at `width >= 1024` and `'bottom'` below that breakpoint
  - [x] `width >= 1024` → pass `tabBar={(props) => <SwissSidebar {...props} />}`
  - [x] `width < 1024` → pass `tabBar={(props) => <SwissTabBar {...props} />}` (existing behavior, unchanged)
  - [x] The `<Tabs.Screen>` entries remain identical; only `screenOptions` and `tabBar` become responsive
  - [x] No new route files created
- [x] Verify main content area fills remaining width in sidebar layout (AC1)
  - [x] On desktop, content area should take `flex: 1` next to the 240px sidebar
  - [x] Verify no horizontal overflow or clipping on a 1200px–1440px viewport
- [x] TypeScript + test validation (AC5)
  - [x] Run `tsc --noEmit` and resolve any type errors
  - [x] Run `npx jest` — all tests pass
  - [x] Smoke-test in Expo web at 1280px and 375px widths

---

## Dev Notes

### Component Architecture

The sidebar is a sibling to `SwissTabBar`. Both receive Expo Router tab props and
translate them into navigation controls. The layout toggle lives in `_layout.tsx`:

```typescript
// apps/mobile/app/(tabs)/_layout.tsx
import { useWindowDimensions } from 'react-native';
import { SwissTabBar } from '@/components/organisms/swiss-tab-bar';
import { SwissSidebar } from '@/components/organisms/swiss-sidebar';

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: isDesktop ? 'left' : 'bottom',
      }}
      tabBar={(props) => isDesktop
        ? <SwissSidebar {...props} />
        : <SwissTabBar {...props} />
      }
    >
      {/* Screens unchanged */}
    </Tabs>
  );
}
```

### Sidebar Visual Spec

```
┌──────────────────────────────────────────────────────────────────┐
│  [240px sidebar]  │  [flex:1 content area]                       │
│                   │                                               │
│  VALUESNAP        │  Your collection                              │
│                   │  $1,249                                       │
│  — Camera         │  3 items valued                               │
│  History          │                                               │
│    Settings       │  All items                                    │
│                   │  Recent valuations                            │
│                   │  ┌────────┐  ┌────────┐                      │
│                   │  │ Card 1 │  │ Card 2 │                      │
│                   │  └────────┘  └────────┘                      │
└──────────────────────────────────────────────────────────────────┘
```

- The active tab label ("— Camera" or bold weight) is the only visual distinction
- No accent color, no background pill, no icon
- Optional: a wordmark "VALUESNAP" (or just nothing) at top of the sidebar column as a top anchor — keep it typographic, same font family

### SwissSidebar Props

Mirror the `BottomTabBarProps` shape that `SwissTabBar` already consumes. This avoids
creating a custom interface and keeps both components interchangeable in `_layout.tsx`.

```typescript
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export function SwissSidebar({ state, descriptors, navigation }: BottomTabBarProps) {
  // ...
}
```

### Content Area Width

React Navigation bottom tabs already support `tabBarPosition: 'left'`, which causes
the navigator layout to place the custom tab bar beside the content instead of below it.
That is the preferred implementation path for this story.

With `tabBarPosition='left'` and a custom sidebar that is 240px wide, the content area
should take the remaining space automatically. Verify this at 1280px before adding any
manual wrapper layout. Do not introduce an extra `flex-row` wrapper unless the navigator
layout proves insufficient in practice.

### Swiss Minimalist Sidebar Checklist

Before marking done, verify against the team-agreed design direction:

- [ ] **No icons** anywhere in the sidebar
- [ ] **No background fill** on the sidebar or on any navigation item
- [ ] **Single 1px divider** on the right edge of the sidebar — nothing else
- [ ] **Active state = font weight only** — no underline, no color shift, no box
- [ ] **Text flush-left** — no centering
- [ ] Matches the `paper` background and `ink` text colors from the design tokens

### What This Story Does NOT Include

- Sidebar collapse/expand toggle (future story)
- History item list in the sidebar (future enhancement)
- Sidebar on tablet (640–1023px) — bottom tab bar stays there
- Any change to mobile layouts — `SwissTabBar` code is not modified

### Breakpoint Alignment with 3.3

Story 3.3 uses `width < 600` vs `width >= 600` for the history grid column count.
Story 3.6 uses `width < 1024` vs `width >= 1024` for the nav layout switch.
These are independent breakpoints for independent concerns — no conflict.

At 600–1023px (tablet), the layout is: bottom tab bar + 2-column history grid.
At 1024px+, the layout is: sidebar nav + 2-column history grid (3-4 columns deferred to 3.5 discussion).

### Project Structure Notes

| Area | Path |
|------|------|
| New sidebar component | `apps/mobile/components/organisms/swiss-sidebar.tsx` |
| Tab layout (update here) | `apps/mobile/app/(tabs)/_layout.tsx` |
| Existing tab bar (do not modify) | `apps/mobile/components/organisms/swiss-tab-bar.tsx` |
| UX spec breakpoint table | `docs/ux-design-specification.md` (line ~1153) |

### References

- `SwissTabBar` implementation: `apps/mobile/components/organisms/swiss-tab-bar.tsx`
- Tab layout: `apps/mobile/app/(tabs)/_layout.tsx`
- Team design direction decision: March 2026 Party Mode planning session
- UX spec desktop breakpoint: `docs/ux-design-specification.md` (Desktop = 1024px+)
- `useWindowDimensions` React Native docs (zero-dep, deterministic, all platforms)

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (dev-story workflow — 2026-03-22)

### Completion Notes List

- No new unit tests required (AC5): no pure logic extracted; all AC5 verification via `tsc --noEmit` + `npx jest` (30/30 pass) + manual smoke test.
- Party-mode actionable notes applied: (1) active state = `font-semibold` weight only, no dash prefix; (2) no `useSafeAreaInsets` in sidebar — desktop-only component.
- `tabBarPosition: isDesktop ? 'left' : 'bottom'` passed through `screenOptions` causes React Navigation to use `flexDirection: 'row'` for the root container on desktop, placing the sidebar beside the content area automatically. No manual flex wrapper needed.
- `SwissSidebar` uses `style={{ width: 240, flex: 1 }}` + `className="bg-paper border-r border-divider py-8 px-6"`. NativeWind `border-r` sets `borderRightWidth: 1`; `border-divider` sets the color token.
- `_layout.tsx` uses a single `useWindowDimensions()` call and `isDesktop` constant to drive both `screenOptions.tabBarPosition` and the `tabBar` render prop — clean, no duplication.
- `SwissTabBar` code not modified (AC2 verified by inspection).
- 0 TypeScript errors (`@react-navigation/bottom-tabs` 7.9.0 — `tabBarPosition` is a typed `BottomTabNavigationOptions` field).

### File List

| File | Change |
|------|--------|
| `apps/mobile/components/organisms/swiss-sidebar.tsx` | New: `SwissSidebar` left-side nav panel |
| `apps/mobile/components/organisms/index.ts` | Added `SwissSidebar` barrel export |
| `apps/mobile/app/(tabs)/_layout.tsx` | Added `useWindowDimensions` breakpoint switch + `tabBarPosition` |

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-03-22 | 0.1 | Story created (SM + validation workflow) | claude-sonnet-4-6 |
| 2026-03-22 | 1.0 | Implementation complete (dev-story workflow) | claude-sonnet-4-6 |
