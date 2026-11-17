# Story 6.5: Build Marketing Landing Page

Status: done

## Story

As a potential user,
I want to learn what ValueSnap does before signing up,
so that I can decide if it's right for me.

## Acceptance Criteria

1. Visiting the root URL `/` renders the marketing landing page (not the camera screen) — value proposition "Photo → Value → List" is visible on the page
2. Key benefits are highlighted: AI identification, live eBay pricing, one-tap listing generation
3. A CTA button is present; clicking it navigates to the camera/appraise screen (`/camera`) — no page reload, SPA navigation
4. Page uses Swiss Minimalist design: pure black/white palette, no rounded corners, no shadows, no decorative elements; typography uses existing design tokens (`display`, `h1`, `body`, `body-sm` variants); signal red (`#E53935`) used only on the CTA
5. Static export smoke test passes: `dist/index.html` contains the landing page content (`Photo → Value → List`) and `dist/camera.html` exists with the camera screen content (`What are you`); existing `dist/manifest.json`, `dist/sw.js`, `dist/icon-192.png`, and `dist/icon-512.png` still present (regressions from Stories 6-3 and 6-4)
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
    - [x] Confirm `dist/camera.html` exists with camera screen content (Expo SDK 54 static export emits flat HTML route files rather than subdirectory `index.html` files; locked in `scripts/test-sw-runtime.mjs`)
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

In Expo Router's static export with `web.output: "static"` (Expo SDK 54):
1. `app/index.tsx` → `dist/index.html` (the new landing page at `/`)
2. `app/(tabs)/camera.tsx` → `dist/camera.html` and `dist/(tabs)/camera.html` (camera at `/camera`)
3. `app/(tabs)/history.tsx` → `dist/history.html` and `dist/(tabs)/history.html` (history at `/history`)
4. `app/(tabs)/settings.tsx` → `dist/settings.html` and `dist/(tabs)/settings.html` (settings at `/settings`)

`(tabs)` is a transparent group (parentheses = no URL contribution). The static export creates flat `.html` files per route (`dist/index.html` at root).

**Service Worker offline fallback note:** `apps/mobile/public/sw.js` precaches `/` on install and falls back unvisited offline navigations to `cache.match('/')`. Because `/` is now the marketing landing page rather than Camera, offline navigation to a route not yet visited online serves the landing page shell until the user presses `"Start Valuing"` for SPA client-side routing to `/camera`.

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

- `npm test -- --runTestsByPath __tests__/landing-page.test.tsx __tests__/camera-guest-mode.test.tsx __tests__/camera-offline-appraise-error.story-6-4.test.tsx __tests__/tab-layout.test.tsx __tests__/tab-navigation-surfaces.test.tsx` (pass)
- `npm run typecheck && npm run lint && npm run test:ci` (pass: 0 type errors, 0 lint warnings, 52/52 Jest suites / 539 tests, plus `scripts/test-sw-runtime.mjs` static export assertions on `dist/index.html`, `dist/camera.html`, SEO tags, PWA manifest/icons/SW, and Playwright offline SW checks)

### Completion Notes List

- Implemented route rename from `app/(tabs)/index.tsx` to `app/(tabs)/camera.tsx` and updated tab registration to `name="camera"`. Note on git history: commit `e956da3` deleted `index.tsx` while `camera.tsx` landed in `0acda15` rather than an atomic `git mv`; documented here for audit accuracy without rewriting `main` history.
- Updated camera-targeting navigation in `app/(tabs)/history.tsx` from `/` to `/camera`.
- Code-review remediation: updated all 13 missed `router.replace('/')` call sites across `app/auth/sign-in.tsx`, `app/auth/register.tsx`, `app/auth/update-password.tsx`, and `app/account/delete-confirm.tsx` (plus their 6 unit test suites) to `router.replace('/camera')` so authenticated/returning web users enter the Camera workspace rather than the marketing landing page. `app/+not-found.tsx` home link remains intentionally `/`.
- Updated all six affected screenshot tests in `tests/screenshots.spec.ts` to navigate directly to `/camera`, `/history`, and `/settings` as appropriate.
- Added landing page route `app/index.tsx` with web-only render, native redirect to `/camera`, semantic `accessibilityRole="header"` (`aria-level={1}`) hero heading, dark-mode-safe `bg-paper` styling, estimate-honest eBay market copy per `epic-6-plan.md` AC3, CTA behavior, and SEO head tags via `expo-router/head`.
- Expanded unit test coverage in `__tests__/landing-page.test.tsx` for native redirect, web hero heading semantics, dark-mode token usage, all three key benefits (AC2), CTA navigation (AC3), and SEO/Open Graph metadata (AC6), and wired static export assertions (`dist/index.html` + `dist/camera.html` + SEO tags) into `scripts/test-sw-runtime.mjs`.

### File List

- apps/mobile/app/(tabs)/camera.tsx (landed in `0acda15` following `index.tsx` removal in `e956da3`)
- apps/mobile/app/(tabs)/_layout.tsx
- apps/mobile/app/(tabs)/history.tsx
- apps/mobile/app/index.tsx
- apps/mobile/app/auth/sign-in.tsx
- apps/mobile/app/auth/register.tsx
- apps/mobile/app/auth/update-password.tsx
- apps/mobile/app/account/delete-confirm.tsx
- apps/mobile/scripts/test-sw-runtime.mjs
- apps/mobile/tests/screenshots.spec.ts
- apps/mobile/__tests__/landing-page.test.tsx
- apps/mobile/__tests__/auth-sign-in.test.tsx
- apps/mobile/__tests__/auth-register.test.tsx
- apps/mobile/__tests__/auth-google-oauth-sign-in.test.tsx
- apps/mobile/__tests__/auth-google-oauth-register.test.tsx
- apps/mobile/__tests__/auth-update-password.test.tsx
- apps/mobile/__tests__/delete-confirm.test.tsx
- apps/mobile/__tests__/camera-guest-mode.test.tsx
- apps/mobile/__tests__/camera-offline-appraise-error.story-6-4.test.tsx
- apps/mobile/__tests__/tab-layout.test.tsx
- apps/mobile/__tests__/tab-navigation-surfaces.test.tsx
- apps/mobile/lib/storage.ts
- apps/mobile/screenshots/mobile-camera.png
- apps/mobile/screenshots/mobile-settings.png
- apps/mobile/screenshots/web-appraisal-report.png
- apps/mobile/screenshots/web-confidence-high.png
- apps/mobile/screenshots/web-confidence-low.png
- apps/mobile/screenshots/web-confidence-medium.png
- apps/mobile/screenshots/web-settings.png
- apps/mobile/screenshots/web-velocity-absent.png
- apps/mobile/screenshots/web-velocity-present.png

## Code Review

### Reviewer

Gemini 4 Carbon (BMAD `code-review` workflow) — 2026-11-17

### Findings & Resolutions

- **HIGH-1 (Fixed):** Task A missed 13 `router.replace('/')` call sites across `sign-in.tsx`, `register.tsx`, `update-password.tsx`, and `delete-confirm.tsx`, sending web users to the marketing page after auth/deletion instead of `/camera`. Updated all 13 call sites and 6 auth/account unit test suites to target `/camera`.
- **HIGH-2 (Fixed):** AC5, Task D, and Debug Log References referenced nonexistent `dist/camera/index.html` (Expo SDK 54 static export emits `dist/camera.html`). Corrected story documentation and added real CI-enforced static export assertions on `dist/index.html`, `dist/camera.html`, and SEO `<head>` tags in `apps/mobile/scripts/test-sw-runtime.mjs`.
- **HIGH-3 (Fixed):** Added mandatory `## Code Review` and `## Change Log` sections and aligned `apps/mobile/app/index.tsx` benefit/subtitle copy with `docs/sprint-artifacts/epic-6-plan.md` Story 6-5 AC3 (*estimates based on active market data, not guaranteed sale prices*).
- **MEDIUM-1 (Documented):** Recorded the `e956da3` / `0acda15` commit split and reconciled the File List with actual git history.
- **MEDIUM-2 (Fixed):** Removed hardcoded `backgroundColor: '#FFFFFF'` on `ScrollView` in `app/index.tsx` in favor of `bg-paper` for dark-mode consistency, added `accessibilityRole="header"` + `aria-level={1}` on the hero headline, and refined mobile horizontal padding (`px-6 sm:px-8`).
- **MEDIUM-3 (Fixed):** Replaced bare `.toBeTruthy()` in `__tests__/landing-page.test.tsx` with specific assertions covering heading semantics, `bg-paper`, AC2 benefits, AC3 CTA routing, and AC6 `<Head>` SEO tags.
- **LOW-1 (Documented):** Documented the Service Worker offline fallback behavior now that `/` renders the landing page.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-31 | 1.0 | Initial implementation of `/` marketing landing page and `/camera` tab rename (`e956da3`). | GPT-5.3-Codex |
| 2026-11-17 | 1.1 | Adversarial code review remediation: fixed 13 auth/account `router.replace('/camera')` routes, aligned landing copy with Epic 6 Plan AC3, fixed dark-mode hex and semantic heading role, expanded unit + CI static export checks, and reconciled File List. Status moved to `done`. | Gemini 4 Carbon |
