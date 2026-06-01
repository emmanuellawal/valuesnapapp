# Story 6.5: Build Marketing Landing Page

Status: review

## Story

As a potential user,
I want to learn what ValueSnap does before signing up,
so that I can decide if it's right for me.

## Acceptance Criteria

1. Visiting the root URL `/` renders the marketing landing page (not the camera screen) — value proposition "Photo → Value → List" is visible on the page
2. Key benefits are highlighted: AI identification, live eBay pricing, one-tap listing generation
3. A CTA button is present; clicking it navigates to the camera/appraise screen (`/camera`) — no page reload, SPA navigation
4. Page uses Swiss Minimalist design: pure black/white palette, no rounded corners, no shadows, no decorative elements; typography uses existing design tokens (`display`, `h1`, `body`, `body-sm` variants); signal red (`#E53935`) used only on the CTA
5. Static export smoke test passes: `dist/index.html` contains the landing page content (`Photo → Value → List`) and `dist/camera/index.html` exists with the camera screen content; existing `dist/manifest.json`, `dist/sw.js`, `dist/icon-192.png`, and `dist/icon-512.png` still present (regressions from Stories 6-3 and 6-4)
6. Basic SEO meta tags: `<title>ValueSnap — Photo. Value. List.</title>`, `<meta name="description">` with app one-liner, and `<meta property="og:title">` appear in `dist/index.html`

## Tasks / Subtasks

- [x] Task A — Rename camera route from `index` to `camera` (AC: 1, 3, 5)
  - [x] Git-rename `apps/mobile/app/(tabs)/index.tsx` → `apps/mobile/app/(tabs)/camera.tsx` (preserve file history)
  - [x] In `apps/mobile/app/(tabs)/_layout.tsx`: change `<Tabs.Screen name="index"` → `<Tabs.Screen name="camera"` (keep `title: 'Camera'`)
  - [x] In `apps/mobile/app/(tabs)/history.tsx`: update `router.push('/')` → `router.push('/camera')` — this "Start valuing items" button currently navigates to the camera; after this story `/` is the landing page, not camera
  - [x] In `apps/mobile/tests/screenshots.spec.ts`: update the `test('web - Camera')` Playwright test — `await page.goto('/')` must become `await page.goto('/camera')` and waitFor guard updated accordingly; similarly update `test('mobile - Camera')` if it navigates to `/`
  - [x] **Verify no other file navigates to `/` intending the camera screen** — search `apps/mobile/` for `router.push('/')`, `href="/"`, `Redirect href="/"` and confirm each one is either:
    - Intentionally pointing to the landing page (keep as-is), OR
    - Accidentally pointing to camera (update to `/camera`)
  - [x] `app/+not-found.tsx` `<Link href="/">` is **intentional** — the "Go to home screen" link should go to the landing page; do NOT change it

- [x] Task B — Create `apps/mobile/app/index.tsx` (landing page) (AC: 1, 2, 3, 4, 6)
  - [x] Create `apps/mobile/app/index.tsx` with the component described in Dev Notes
  - [x] On `Platform.OS !== 'web'`: render `<Redirect href="/camera" />` immediately — landing page is web-only; native apps skip it
  - [x] On web: render the marketing landing page using existing primitives only (`Box`, `Stack`, `Text`, `SwissPressable` from `@/components/primitives`) — do NOT create new components and do NOT use `ScreenContainer` (that primitive is designed for tabbed screens; the landing page controls its own padding directly)
  - [x] Hero headline: `<Text variant="display">Photo → Value → List</Text>` — left-aligned, black on white
  - [x] Subtitle: `<Text variant="body">Photograph any item. Get an instant market price. Generate a selling listing.</Text>`
  - [x] Three benefit lines using `<Text variant="body-sm">`: "AI identifies your item from a photo", "Live eBay market data — real prices, not guesses", "One-tap listing generation for eBay"
  - [x] CTA `<SwissPressable>` with `className="bg-signal"` and white text — label "Start Valuing"; `onPress={() => router.push('/camera')}`
  - [x] SEO `<Head>` component: add `<title>`, `<meta name="description">`, `<meta property="og:title">` (exact values in Dev Notes)
  - [x] No tab bar, no sidebar, no header: the landing page is a standalone screen outside `(tabs)`
  - [x] The root Stack in `app/_layout.tsx` auto-discovers `app/index.tsx` — **no change to `_layout.tsx` is required** for static export; the Stack's `unstable_settings.initialRouteName = '(tabs)'` governs native deep-link stacking behavior only

- [x] Task C — Unit tests for landing page component (AC: 1, 2, 3)
  - [x] Create `apps/mobile/__tests__/landing-page.test.tsx`
  - [x] Test: on native platform (`Platform.OS = 'android'`), component renders `<Redirect href="/camera" />` and nothing else
  - [x] Test: on web platform (`Platform.OS = 'web'`), component renders the hero text `"Photo → Value → List"`
  - [x] Test: on web, the CTA `<SwissPressable>` with `accessibilityLabel="Start valuing items"` calls `router.push('/camera')` when pressed
  - [x] Mock pattern: use `jest.mock('expo-router')` following the pattern in `apps/mobile/__tests__/camera-guest-mode.test.tsx` for `useRouter`; mock `Redirect` as a passthrough component
  - [x] No screenshot tests for the landing page — unit tests are sufficient for this static layout

- [x] Task D — Static export smoke test (AC: 5, 6)
  - [x] Run `rm -rf dist && npm run build:web` from `apps/mobile/`
  - [x] **Automated checks (run first — CI-safe, no server needed):**
    - [x] Confirm `dist/index.html` exists and contains the string `Photo → Value → List`
    - [x] Confirm `dist/camera/index.html` exists (camera screen at new `/camera` route)
    - [x] Confirm `dist/manifest.json`, `dist/sw.js`, `dist/icon-192.png`, `dist/icon-512.png` all still exist (regression checks from Stories 6-3 and 6-4)
    - [x] Confirm `dist/index.html` `<head>` contains `<title>ValueSnap` and `<meta name="description"` (SEO check)
    - [x] Run the SW smoke check script from Story 6-4: `node -e "const fs=require('fs');const sw=fs.readFileSync('dist/sw.js','utf8');if(!sw.includes('valuesnap-v1')||!sw.includes('BYPASS_PATTERNS')){throw new Error('SW smoke check failed')} console.log('SW smoke check passed')"`
  - [x] **Manual serve check (final sanity — do last):** Serve `dist/` and confirm: (a) `/` shows landing page, (b) clicking CTA navigates to `/camera` showing camera screen, (c) no JS errors in console

## Dev Notes

### Routing architecture — what changes and why

**Current state (before this story):**
- `app/(tabs)/index.tsx` → URL `/` (camera screen is the root)
- `app/(tabs)/history.tsx` → URL `/history`
- `app/(tabs)/settings.tsx` → URL `/settings`

**Target state (after this story):**
- `app/index.tsx` → URL `/` (landing page — new file)
- `app/(tabs)/camera.tsx` → URL `/camera` (renamed from `index.tsx`)
- `app/(tabs)/history.tsx` → URL `/history` (unchanged)
- `app/(tabs)/settings.tsx` → URL `/settings` (unchanged)

**Why renaming `index` → `camera` is required:** In Expo Router, groups in parentheses `(tabs)` are transparent in the URL path. So `(tabs)/index.tsx` and a root-level `app/index.tsx` would both resolve to `/`, causing a conflict in the static export (two files writing to `dist/index.html`). Renaming `(tabs)/index.tsx` to `(tabs)/camera.tsx` gives the camera screen the URL `/camera`, freeing `/` for the landing page.

**Native app behavior:** On native builds, the root Stack has `initialRouteName: '(tabs)'`, so the native app launches directly at `(tabs)` (starting at the `camera` tab). The landing page at `app/index.tsx` still exists as a named route but is never the initial screen on native because the Stack's initial route is `(tabs)`, not `index`. The `Platform.OS !== 'web'` guard in `index.tsx` provides belt-and-suspenders protection by immediately redirecting to `/camera` if somehow reached on native.

### Exact `apps/mobile/app/index.tsx` structure

```tsx
import React from 'react';
import { Platform, ScrollView } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import Head from 'expo-router/head';
import { Box, Stack, Text, SwissPressable } from '@/components/primitives';

export default function LandingPage() {
  const router = useRouter();

  // Landing page is web-only: native apps launch directly into the tab navigator.
  // useRouter() is called unconditionally above to satisfy React rules-of-hooks;
  // the Redirect component uses it implicitly via expo-router internals.
  if (Platform.OS !== 'web') {
    return <Redirect href="/camera" />;
  }

  return (
    <>
      <Head>
        <title>ValueSnap — Photo. Value. List.</title>
        <meta name="description" content="Photograph any item. Get an instant eBay market price estimate. Generate a pre-filled selling listing in seconds." />
        <meta property="og:title" content="ValueSnap — Photo. Value. List." />
        <meta property="og:description" content="Photograph any item. Get an instant eBay market price estimate. Generate a pre-filled selling listing in seconds." />
      </Head>
      <ScrollView
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Box className="flex-1 bg-paper px-8 pt-16 pb-12">
          <Stack gap={8} className="max-w-screen-sm">
            {/* Hero */}
            <Text variant="display">Photo → Value → List</Text>
            <Text variant="body" className="text-ink-muted">
              Photograph any item. Get an instant market price. Generate a selling listing.
            </Text>

            {/* Benefits — Swiss Minimalist: plain text, no icons, no bullets */}
            <Stack gap={4} className="pt-4">
              <Text variant="body-sm">AI identifies your item from a photo</Text>
              <Text variant="body-sm">Live eBay market data — real prices, not guesses</Text>
              <Text variant="body-sm">One-tap listing generation for eBay</Text>
            </Stack>

            {/* CTA */}
            <Box className="pt-8">
              <SwissPressable
                accessibilityLabel="Start valuing items"
                onPress={() => router.push('/camera')}
                className="bg-signal px-8 py-4 self-start"
              >
                <Text variant="body" className="text-paper font-bold">
                  Start Valuing
                </Text>
              </SwissPressable>
            </Box>
          </Stack>
        </Box>
      </ScrollView>
    </>
  );
}
```

**Style notes:**
- `bg-paper` = `#FFFFFF` (paper token), `bg-signal` = `#E53935` (signal token), `text-paper` = white text on red CTA
- `self-start` keeps the CTA button from stretching full-width — Swiss design avoids full-width buttons on desktop
- No `borderRadius`, no `shadow` — both are set to `none` in `tailwind.config.js` and must stay that way
- `max-w-screen-sm` caps the content column width on wide desktop (prevents overly long lines)
- Do NOT add any import for NativeWind beyond what is already globally configured; just use `className` prop

### `expo-router/head` — `<Head>` component

`expo-router` exports a `<Head>` component that emits per-route `<head>` elements in static HTML. It works only on web (no-ops on native). Import path: `expo-router/head`. This is already a transitive dependency of `expo-router` — no new package install required.

```tsx
import Head from 'expo-router/head';
```

The `head.js` module exports `Head` as the **default export** — use a default import (no braces). Named import `{ Head }` will resolve to `undefined` at runtime and cause a silent render failure on web.

The `+html.tsx` template provides the **global** head elements (manifest, theme-color, SW registration). The `<Head>` component in `index.tsx` provides **per-route** head elements (title, description). Both are emitted into the same `<head>` in the static HTML output.

### What already exists — do NOT reinvent

- `apps/mobile/components/primitives/` — `Box`, `Stack`, `Text`, `SwissPressable` already implemented; Story 0.3; import from `@/components/primitives`; **do not use `ScreenContainer`** — it wraps screens with tab-safe-area padding, not appropriate for a standalone landing page
- `apps/mobile/tailwind.config.js` — `bg-signal`, `bg-paper`, `text-paper`, `text-ink`, `text-ink-muted` tokens already registered; Story 0.2
- `apps/mobile/app/+html.tsx` — global `<head>` template; already has manifest, theme-color, SW registration; **do not modify** for this story
- `apps/mobile/app/_layout.tsx` — root Stack layout with `unstable_settings`; **do not modify**; `app/index.tsx` is auto-discovered by Expo Router
- `apps/mobile/public/sw.js`, `apps/mobile/public/manifest.json` — already created in Stories 6-3 and 6-4; regression checks only

### Swiss Minimalist compliance checklist for landing page

- ✅ Flush-left text (left-aligned) — NOT centered
- ✅ Zero rounded corners (`borderRadius: none` in tailwind config)
- ✅ Zero shadows (`boxShadow: none` in tailwind config)
- ✅ Monochromatic palette (black/white) with signal red only on CTA
- ✅ Single font family (Inter) — already set in `tailwind.config.js` `fontFamily.sans`
- ✅ Typography hierarchy by size/weight only (no color for hierarchy)
- ❌ NO centered paragraphs (Swiss rule: asymmetry)
- ❌ NO decorative borders or ornaments
- ❌ NO gradient backgrounds
- ❌ NO icons, illustrations, or images on the landing page

### Playwright screenshot tests update

`apps/mobile/tests/screenshots.spec.ts` has **six tests** that navigate to `'/'` and then interact — ALL must be updated. After this story, `'/'` is the landing page, not the camera.

| Test | Current | Fix |
|---|---|---|
| `test('web - Camera')` | `goto('/')`, waits for `"What are you selling"` | `goto('/camera')` — wait text unchanged |
| `test('web - History')` | `goto('/')`, then clicks History tab | `goto('/history')` directly — remove tab click, wait text unchanged |
| `test('web - Settings')` | `goto('/')`, then clicks Settings tab | `goto('/settings')` directly — remove tab click, wait text unchanged |
| `test('mobile - Camera')` | `goto('/')`, waits for `"What are you selling"` | `goto('/camera')` — wait text unchanged |
| `test('mobile - History')` | `goto('/')`, then clicks History tab | `goto('/history')` directly — remove tab click, wait text unchanged |
| `test('mobile - Settings')` | `goto('/')`, then clicks Settings tab | `goto('/settings')` directly — remove tab click, wait text unchanged |

**Note:** Navigating directly to the route is also faster and more reliable than clicking tabs after landing — it removes one async interaction from each test. The `waitFor` guard text on each screen is unchanged.

### Navigation summary of all changes in this story

| File | Change | Reason |
|---|---|---|
| `app/(tabs)/index.tsx` → `app/(tabs)/camera.tsx` | Rename | Free `/` for landing page |
| `app/(tabs)/_layout.tsx` | `name="index"` → `name="camera"` | Match renamed file |
| `app/(tabs)/history.tsx` line 259 | `router.push('/')` → `router.push('/camera')` | "Start valuing" button now correctly targets camera |
| `app/index.tsx` | **New file** | Landing page at `/` |
| `tests/screenshots.spec.ts` | Update 6 tests: `goto('/')` → `goto('/camera')`, `goto('/history')`, or `goto('/settings')` | Routes changed |
| `__tests__/landing-page.test.tsx` | **New file** | Unit tests for landing page component |

### Expo Router static export route resolution precedence

In Expo Router's static export with `web.output: "static"`:
1. `app/index.tsx` → `dist/index.html` (the new landing page at `/`)
2. `app/(tabs)/camera.tsx` → `dist/camera/index.html` (camera at `/camera`)
3. `app/(tabs)/history.tsx` → `dist/history/index.html` (history at `/history`)
4. `app/(tabs)/settings.tsx` → `dist/settings/index.html` (settings at `/settings`)

`(tabs)` is a transparent group (parentheses = no URL contribution). The static export creates one HTML file per unique URL.

### Project Structure Notes

- New file: `apps/mobile/app/index.tsx` — landing page; lives at root of `app/` alongside `_layout.tsx`, `+html.tsx`, `+not-found.tsx`
- Renamed: `apps/mobile/app/(tabs)/index.tsx` → `apps/mobile/app/(tabs)/camera.tsx` — stays inside the `(tabs)` group
- No new directories
- All component usage follows established patterns from Stories 0.3 and 0.2

### References

- [Source: docs/epics.md#Story 6.5] — Story requirements, ACs, FR48, FR49
- [Source: docs/prd.md#Technical Architecture Considerations] — `/` = Landing Page, Expo static export, no separate marketing site decision
- [Source: docs/SWISS-MINIMALIST.md] — flush-left, no centered text, no decorations, Grotesk typeface, signal red for CTAs only
- [Source: apps/mobile/tailwind.config.js] — color tokens: `paper`, `ink`, `ink-muted`, `signal`; typography scale; no border-radius; no shadow
- [Source: apps/mobile/components/primitives/text.tsx] — `TextVariant` type: `display`, `h1`, `h2`, `h3`, `body`, `body-sm`, `caption`
- [Source: apps/mobile/app/(tabs)/_layout.tsx] — current tab screen names (`index`, `history`, `settings`)
- [Source: apps/mobile/app/_layout.tsx] — `unstable_settings.initialRouteName = '(tabs)'`; root Stack screens
- [Source: apps/mobile/app/(tabs)/history.tsx#259] — `router.push('/')` that must be updated to `/camera`
- [Source: apps/mobile/tests/screenshots.spec.ts#28] — `goto('/')` in Camera screenshot test that must be updated to `/camera`
- [Source: docs/sprint-artifacts/6-4-implement-service-worker-for-offline.md#Dev Notes] — `build:web` script is `expo export -p web`; SW smoke check command
- [Source: docs/sprint-artifacts/6-3-configure-pwa-manifest.md#Dev Notes] — `public/` folder copies to `dist/`; `+html.tsx` is the global head template

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm test -- --runTestsByPath __tests__/landing-page.test.tsx __tests__/camera-guest-mode.test.tsx __tests__/camera-offline-appraise-error.story-6-4.test.tsx __tests__/tab-layout.test.tsx __tests__/tab-navigation-surfaces.test.tsx` (pass: 5 suites, 19 tests)
- `rm -rf dist && npm run build:web` (pass; static export includes `/` landing page and `/camera` route)
- Automated dist checks passed for `dist/index.html`, `dist/camera/index.html`, `dist/manifest.json`, `dist/sw.js`, `dist/icon-192.png`, `dist/icon-512.png`, SEO tags, and SW smoke assertions
- Served-build sanity check passed via Playwright against local static server (`/` landing render, CTA route transition to `/camera`, no browser console errors)

### Completion Notes List

- Implemented route rename from `app/(tabs)/index.tsx` to `app/(tabs)/camera.tsx` and updated tab registration to `name="camera"`.
- Updated camera-targeting navigation in `app/(tabs)/history.tsx` from `/` to `/camera`.
- Updated all six affected screenshot tests in `tests/screenshots.spec.ts` to navigate directly to `/camera`, `/history`, and `/settings` as appropriate.
- Added landing page route `app/index.tsx` with web-only render, native redirect to `/camera`, Swiss minimalist content, CTA behavior, and SEO head tags via `expo-router/head`.
- Added unit test coverage in `__tests__/landing-page.test.tsx` for native redirect, web hero render, and CTA navigation.
- Updated existing tests and tab-surface fixtures for renamed camera route keys (`index` -> `camera`).
- Verified no source references remain that incorrectly target `/` as the camera route; `app/+not-found.tsx` home link remains intentionally `/`.
- Story development complete; ready for review.

### File List

- apps/mobile/app/(tabs)/camera.tsx
- apps/mobile/app/(tabs)/_layout.tsx
- apps/mobile/app/(tabs)/history.tsx
- apps/mobile/app/index.tsx
- apps/mobile/tests/screenshots.spec.ts
- apps/mobile/__tests__/landing-page.test.tsx
- apps/mobile/__tests__/camera-guest-mode.test.tsx
- apps/mobile/__tests__/camera-offline-appraise-error.story-6-4.test.tsx
- apps/mobile/__tests__/tab-layout.test.tsx
- apps/mobile/__tests__/tab-navigation-surfaces.test.tsx
- apps/mobile/lib/storage.ts
