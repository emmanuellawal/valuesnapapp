# Story 6.3: Configure PWA Manifest

Status: done

## Story

As a user,
I want to install ValueSnap to my home screen,
so that I can access it like a native app.

## Acceptance Criteria

1. `apps/mobile/app.json` — `expo.name` changed from `"mobile"` to `"ValueSnap"`
2. `expo.web.themeColor` set to `"#0A0A0A"` in app.json; exported manifest includes `"theme_color": "#0A0A0A"`
3. `expo.web.backgroundColor` set to `"#FAFAF8"` in app.json; exported manifest includes `"background_color": "#FAFAF8"`
4. Manifest includes `"display": "standalone"`
5. Manifest includes `"name": "ValueSnap"`
6. Manifest includes `"short_name": "ValueSnap"`
7. New PNG icon assets at 192×192 and 512×512 exist under `apps/mobile/assets/images/` (icon-192.png, icon-512.png)
8. Manifest references the 192×192 and 512×512 PNG icon assets
9. `npx expo export --platform web` exits with code 0 and the exported output includes `manifest.json`
10. No placeholder icon asset ships as the final install icon

## Tasks / Subtasks

- [x] Task A — Create `apps/mobile/public/` directory and `manifest.json` (AC: 2–8)
  - [x] Create `apps/mobile/public/manifest.json` with exact shape shown in Dev Notes below
  - [x] Fields: `name`, `short_name`, `description`, `display`, `start_url`, `scope`, `theme_color`, `background_color`, `icons`
  - [x] Icons array references `/icon-192.png` and `/icon-512.png` (served from `public/`)

- [x] Task B — Generate 192×192 and 512×512 icon PNG assets (AC: 7, 8, 10)
  - [x] Create `apps/mobile/public/` directory: `mkdir -p apps/mobile/public`
  - [x] Use dependency-free ImageMagick generator (`magick`/`convert`) to avoid npm image-library security drift
  - [x] Create `apps/mobile/scripts/gen-pwa-icons.js` (script in Dev Notes)
  - [x] Add `"gen:icons": "node scripts/gen-pwa-icons.js"` to `apps/mobile/package.json` `scripts` block
  - [x] Run `npm run gen:icons` — produces icons at 192×192 and 512×512 in both `public/` and `assets/images/`
  - [x] Verify generated icons open as valid PNGs (not blank or corrupt)
  - [x] Create a throwaway smoke file in `apps/mobile/public/`: `pwa-smoke.txt` (e.g., content: `pwa smoke`) so we can confirm `public/` is propagated into `dist/` during the export step

- [x] Task C — Update `apps/mobile/app.json` (AC: 1, 2, 3)
  - [x] Change `expo.name` from `"mobile"` to `"ValueSnap"`
  - [x] Add `expo.web.themeColor: "#0A0A0A"` to the `"web"` block
  - [x] Add `expo.web.backgroundColor: "#FAFAF8"` to the `"web"` block
  - [x] Leave `expo.web.bundler`, `expo.web.output`, `expo.web.favicon`, `expo.slug`, `expo.scheme` unchanged — slug/scheme changes affect Expo OTA identity and are out of scope

- [x] Task D — Update `apps/mobile/app/+html.tsx` to link manifest and add PWA meta tags (AC: 2, 4, 9)
  - [x] Add `<link rel="manifest" href="/manifest.json" />` inside `<head>`
  - [x] Add `<meta name="theme-color" content="#0A0A0A" />` (mobile browser status bar)
  - [x] Add `<meta name="apple-mobile-web-app-capable" content="yes" />` (iOS add-to-homescreen)
  - [x] Add `<meta name="apple-mobile-web-app-status-bar-style" content="black" />` (iOS status bar)
  - [x] Add `<meta name="apple-mobile-web-app-title" content="ValueSnap" />` (iOS display name)
  - [x] Add `<link rel="apple-touch-icon" href="/icon-192.png" />` (iOS homescreen icon fallback)
  - [x] Do NOT add a service worker registration — that belongs to Story 6-4

- [x] Task E — Verify export output (AC: 9)
  - [x] Run `npx expo export --platform web` from `apps/mobile/`
  - [x] Confirm `dist/manifest.json` contains all required fields
  - [x] Confirm `dist/icon-192.png` and `dist/icon-512.png` exist
  - [x] Confirm `dist/pwa-smoke.txt` exists (verifies Expo static export is copying `apps/mobile/public/` correctly)
  - [x] Delete `apps/mobile/public/pwa-smoke.txt` after the check so it does not ship with the final export
  - [x] Record the export verification in the Dev Agent Record completion notes
  - [x] Manual icon safety check: open `apps/mobile/assets/images/icon-512.png` in [maskable.app](https://maskable.app/editor) and confirm the logo is not visibly clipped in the “maskable” safe area (prevents adaptive-icon crop surprises on Android) — **passed** (user verified 2026-05-26: two grey circles logo intact across mask shapes)

## Dev Notes

### What already exists — do NOT reinvent

- `apps/mobile/app/+html.tsx` — static-output HTML template; this is the **only** place to inject `<head>` tags for all routes under static Expo Router export
- `apps/mobile/assets/images/icon.png` — existing square PNG; use as the resize source for PWA icons
- `apps/mobile/assets/images/favicon.png`, `adaptive-icon.png`, `splash-icon.png` — these are already handled by their respective Expo config fields; do not modify them
- `apps/mobile/app.json` `"web"` block already has `"bundler": "metro"`, `"output": "static"`, `"favicon": "./assets/images/favicon.png"` — keep these

### Why Expo does NOT auto-generate manifest.json for static output

- `output: "static"` produces a file-per-route static site; Expo copies `apps/mobile/public/` verbatim into `dist/`
- No Expo mechanism auto-writes `manifest.json` — must be authored manually
- A custom `+html.tsx` bypasses Expo's default `<head>` injection, so the manifest `<link>` must be added by us

### Exact `apps/mobile/public/manifest.json` content

```json
{
  "id": "/",
  "name": "ValueSnap",
  "short_name": "ValueSnap",
  "description": "Instant item valuations and eBay listing drafts from a photo",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "scope": "/",
  "theme_color": "#0A0A0A",
  "background_color": "#FAFAF8",
  "prefer_related_applications": false,
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

`"prefer_related_applications": false` — prevents Android Chrome from offering a Play Store install instead of the PWA (ValueSnap has no native store presence).

`"id": "/"` — establishes stable PWA identity across app updates; browsers use this to match reinstalls to an existing installed entry. `"purpose": "any maskable"` on the 512×512 icon allows Android to apply adaptive icon shaping (safe area is the inner 80% of the icon).

### Icon generation — `apps/mobile/scripts/gen-pwa-icons.js`

**First, create the `public/` directory:**

```bash
mkdir -p apps/mobile/public
```

Create this one-off CommonJS script. It uses installed ImageMagick (`magick` preferred, `convert` fallback), avoiding npm image dependencies.

```js
// scripts/gen-pwa-icons.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const source = path.join(__dirname, '../assets/images/icon.png');
const publicDir = path.join(__dirname, '../public');
const assetsDir = path.join(__dirname, '../assets/images');
const public192 = path.join(publicDir, 'icon-192.png');
const public512 = path.join(publicDir, 'icon-512.png');
const asset192 = path.join(assetsDir, 'icon-192.png');
const asset512 = path.join(assetsDir, 'icon-512.png');

function convertImage(size, outPath) {
  const resizeArg = `${size}x${size}`;
  try {
    execFileSync('magick', [source, '-resize', resizeArg, outPath], { stdio: 'inherit' });
    return;
  } catch {
    execFileSync('convert', [source, '-resize', resizeArg, outPath], { stdio: 'inherit' });
  }
}

function run() {
  if (!fs.existsSync(source)) throw new Error(`Missing icon source: ${source}`);
  fs.mkdirSync(publicDir, { recursive: true });
  convertImage(192, public192);
  convertImage(512, public512);
  fs.copyFileSync(public192, asset192);
  fs.copyFileSync(public512, asset512);
  console.log(`Generated ${public192}`);
  console.log(`Generated ${public512}`);
  console.log(`Generated ${asset192}`);
  console.log(`Generated ${asset512}`);
}

try {
  run();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  console.error('Icon generation requires ImageMagick (`magick` or `convert`) to be installed.');
  process.exit(1);
}
```

**Run:**

```bash
cd apps/mobile
node scripts/gen-pwa-icons.js
```

**Add an npm script to `apps/mobile/package.json` `scripts` block** so regeneration is reproducible:

```json
"gen:icons": "node scripts/gen-pwa-icons.js"
```

**Source PNG note:** `assets/images/icon.png` is 1024×1024, 8-bit colormap (palette mode). Generated outputs are standard RGBA PNGs.

### Exact `app.json` `"web"` block after this story

```json
"web": {
  "bundler": "metro",
  "output": "static",
  "favicon": "./assets/images/favicon.png",
  "themeColor": "#0A0A0A",
  "backgroundColor": "#FAFAF8"
}
```

`expo.slug` is left unchanged as `"mobile"` — it affects Expo OTA project identity and is out of scope. Only `expo.name` changes.

### Full target `apps/mobile/app/+html.tsx` after this story

Insert PWA tags **immediately before** `<ScrollViewStyleReset />`. Do NOT place them after the `<style dangerouslySetInnerHTML>` block — that block must stay last in `<head>` to ensure background-color paint stability.

```tsx
import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* PWA manifest + theme */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0A0A0A" />

        {/* iOS PWA install support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="ValueSnap" />
        <link rel="apple-touch-icon" href="/icon-192.png" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #fff;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;
```

Diff summary: 6 new `<head>` lines + 1 comment line. The existing `responsiveBackground` const and `<body>` are unchanged.

### Color values — why #0A0A0A and #FAFAF8 (not pure black/white)

- `theme_color: "#0A0A0A"` — slightly warmer than pure `#000000`; avoids harsh pure-black status bar on Android PWA; aligns with Swiss Minimalist "near-neutral" identity
- `background_color: "#FAFAF8"` — slightly warmer than pure `#FFFFFF`; used by the browser as the splash screen background before the app loads; avoids pure-white flash
- These are PWA manifest values only — they are intentionally different from the CSS `--ink`/`--paper` token values (`rgb(0 0 0)` and `rgb(255 255 255)`) used in `global.css`
- Do NOT change `global.css` token values to match — the manifest colors are for install/splash UX only

### Scope boundary — what this story does NOT include

- **No service worker** — Story 6-4 owns offline/SW implementation
- **No iOS splash screen startup image** — `<link rel="apple-touch-startup-image">` requires multi-resolution asset work; defer to Epic 7 polish
- **No `expo export` performance gates** — Story 6-10 owns LCP/CLS metrics and font preload
- **No `start_url` deep-link customization** — `"/"` is correct for MVP
- **No favicon replacement** — Existing `assets/images/favicon.png` is 48×48 grayscale. This visually mismatches the new PWA install icon (color, larger). Known cosmetic inconsistency; replacement is out of scope here. A future story can regenerate favicon from the same source as the PWA icons
- **No dedicated 180×180 `apple-touch-icon`** — iOS prefers 180×180 but accepts and downscales 192×192. Acceptable compromise to avoid generating a fifth icon size in this story
- **No `apps/mobile/package.json` rename** — see impact analysis above

### expo.name rename — impact analysis

- `expo.name` is the display name for the Expo dashboard and the default app name on device launchers when building with EAS. Changing from `"mobile"` to `"ValueSnap"` is the correct identity fix.
- **iOS native:** Only affects EAS production builds (not web). Current dev builds use `"mobile"` as the app title — acceptable to change.
- **Android native:** Same — only affects EAS builds.
- **Web export:** `expo.name` does not directly affect the web bundle. The manifest's `name` field (in `public/manifest.json`) controls the installed PWA name.
- **Tests:** No test asserts the `expo.name` value. `npm run test:ci` will remain green.
- **Expo Go:** Dev server will show "ValueSnap" in the Expo Go app list instead of "mobile".
- **`expo.slug` and `expo.scheme`:** Leave both unchanged as `"mobile"`. Slug affects Expo OTA project identity; scheme affects deep-link URL prefix. Neither is in scope for Story 6-3 ACs. A dedicated housekeeping story can rename them if required.
- **`apps/mobile/package.json` `"name": "mobile"`:** Leave unchanged. This is the npm workspace package identifier, not user-facing. Renaming it would force lockfile regeneration and could break any internal monorepo path references. Out of scope.

### File paths summary

| File | Action |
|------|--------|
| `apps/mobile/app.json` | Edit — rename `expo.name`, add `web.themeColor`, `web.backgroundColor` |
| `apps/mobile/app/+html.tsx` | Edit — add manifest link and PWA meta tags |
| `apps/mobile/public/manifest.json` | Create — PWA manifest |
| `apps/mobile/public/icon-192.png` | Create — generated from `assets/images/icon.png` |
| `apps/mobile/public/icon-512.png` | Create — generated from `assets/images/icon.png` |
| `apps/mobile/assets/images/icon-192.png` | Create — copy from `public/icon-192.png` |
| `apps/mobile/assets/images/icon-512.png` | Create — copy from `public/icon-512.png` |
| `apps/mobile/scripts/gen-pwa-icons.js` | Create — one-off icon generation script |

### Verification procedure

```bash
cd apps/mobile

# 1. Generate icons (one-time)
npm run gen:icons

# 2. Static export
rm -rf dist
npx expo export --platform web

# 3. Inspect output
ls dist/
cat dist/manifest.json
ls dist/icon-192.png dist/icon-512.png

# Expected dist/manifest.json:
# {
#   "name": "ValueSnap",
#   "short_name": "ValueSnap",
#   "display": "standalone",
#   "theme_color": "#0A0A0A",
#   "background_color": "#FAFAF8",
#   "icons": [...]
# }
```

Optionally, serve the export locally with `npx serve dist/` and open in Chrome → DevTools → Application → Manifest to verify the install prompt appears.

**Optional install-readiness check (not an AC gate):**

```bash
npx lighthouse http://localhost:3000 --only-categories=pwa --quiet --chrome-flags="--headless"
```

Look for "Installable" and "PWA Optimized" sections. Service-worker-related warnings are expected (Story 6-4 covers that).

### No unit tests for this story

- There are no Jest-testable behaviors in this story — all deliverables are static files and config
- Verification is via `expo export` output inspection (Task E)
- Do NOT write a test that reads `public/manifest.json` or `app.json` — that is brittle config-snapshot testing with no value
- **Do** record the export verification output in completion notes

### Project structure alignment

- `apps/mobile/public/` — matches architecture.md `valuesnapapp/public/` directory (`manifest.json`, icons)
- `apps/mobile/scripts/` — utility scripts directory; follow kebab-case naming for script files
- `apps/mobile/app/+html.tsx` — Expo Router HTML template; already exists (confirmed in codebase)

### References

- [Source: docs/sprint-artifacts/epic-6-plan.md#Story 6-3] — authoritative ACs, color values, icon requirements
- [Source: docs/architecture.md#Project Structure & Boundaries] — `public/` directory defined for `manifest.json` and icons
- [Source: apps/mobile/app.json] — current state: `expo.name: "mobile"`, `web.output: "static"`
- [Source: apps/mobile/app/+html.tsx] — static HTML template, where manifest link must go
- [Source: apps/mobile/global.css] — Swiss ink/paper token values (do not change)
- [Expo Docs: Progressive Web Apps](https://docs.expo.dev/guides/progressive-web-apps/) — `public/manifest.json` pattern for static output
- [Source: docs/sprint-artifacts/6-2-implement-responsive-grid-system.md] — previous story; no relevant carryover for this manifest story

## Dev Agent Record

### Agent Model Used

Codex 5.3

### Debug Log References

- `npm run gen:icons` (pass; generated `public` + `assets/images` icon outputs)
- `file public/icon-192.png public/icon-512.png assets/images/icon-192.png assets/images/icon-512.png` (all valid PNGs with expected sizes)
- `npx expo export --platform web` (pass; exported to `apps/mobile/dist`)
- `ls dist/manifest.json dist/icon-192.png dist/icon-512.png dist/pwa-smoke.txt` (all expected artifacts present)
- `npm run lint && npm run test:ci` (pass; 35 suites / 337 tests passing)
- Manual maskable.app check (user, 2026-05-26): two grey circles logo — no clipping in maskable safe zone across shapes (pass)
- `npm uninstall jimp` (pass; removed direct vulnerable devDependency)
- `npm run gen:icons` (pass with dependency-free ImageMagick script)
- `rm -rf dist && npx expo export --platform web` (pass; clean export with no stale smoke file)
- `test -e dist/pwa-smoke.txt && echo remains || echo absent` (result: absent)

### Completion Notes List

- Implemented Story 6.3 Tasks A–E completely; all acceptance criteria satisfied.
- Added `apps/mobile/public/manifest.json` with ValueSnap identity, standalone display mode, theme/background colors, and 192/512 icons (maskable purpose on 512).
- Added `apps/mobile/scripts/gen-pwa-icons.js` and `gen:icons` npm script; generated new icon assets in both `public/` and `assets/images/`.
- Updated `apps/mobile/app.json` (`expo.name`, `web.themeColor`, `web.backgroundColor`) while keeping `slug`, `scheme`, and existing web bundler/output settings unchanged.
- Updated `apps/mobile/app/+html.tsx` with manifest link, theme-color meta tag, and iOS PWA meta/icon tags.
- Verified static export emits `dist/manifest.json`, `dist/icon-192.png`, `dist/icon-512.png`, and the smoke propagation artifact.
- Removed `apps/mobile/public/pwa-smoke.txt` after propagation validation as required.
- Full regression validation passed (`lint` + full `test:ci`).
- Manual maskable.app verification passed (user): install icon (two grey circles) remains within safe zone on adaptive mask shapes.
- Review auto-fix: replaced `jimp` dependency with ImageMagick-based generator script to remove `jimp` audit findings and reduce dependency risk.
- Review auto-fix: clean export process (`rm -rf dist`) now ensures no stale smoke artifacts in `dist`.
### File List

- apps/mobile/app.json
- apps/mobile/app/+html.tsx
- apps/mobile/package.json
- apps/mobile/package-lock.json
- apps/mobile/public/manifest.json
- apps/mobile/public/icon-192.png
- apps/mobile/public/icon-512.png
- apps/mobile/assets/images/icon-192.png
- apps/mobile/assets/images/icon-512.png
- apps/mobile/scripts/gen-pwa-icons.js
- docs/sprint-artifacts/6-3-configure-pwa-manifest.md
- docs/sprint-artifacts/sprint-status.yaml

## Change Log

- 2026-05-26: Implemented PWA manifest configuration, generated install icons, wired web/iOS manifest metadata, validated static export + regressions; pending final manual maskable icon visual confirmation.
- 2026-05-26: Manual maskable.app check passed; story moved to `review`.
- 2026-05-26: Code review auto-fixes applied (removed `jimp`, switched icon generation to ImageMagick script, enforced clean export); story moved to `done`.

## Senior Developer Review (AI)

**Reviewer:** Codex 5.3  
**Date:** 2026-05-26  
**Outcome:** Approved after fixes

### Findings & Resolutions

1. **MEDIUM — `jimp` dev dependency carried moderate audit findings**
   - **Resolution:** Removed `jimp` from `devDependencies` and lockfile; updated `gen-pwa-icons.js` to dependency-free ImageMagick-based generation (`magick` / `convert`).

2. **MEDIUM — stale `dist/pwa-smoke.txt` artifact could persist across exports**
   - **Resolution:** Rebuilt with clean output (`rm -rf dist && npx expo export --platform web`); verified `dist/pwa-smoke.txt` absent.

3. **MEDIUM — mixed working tree context risk**
   - **Resolution:** Review scope constrained to story File List + AC-target files; story record updated with explicit fix logs and changed files to preserve traceability.

4. **LOW — documentation drift (jimp-specific guidance)**
   - **Resolution:** Updated story technical notes and verification procedure to reflect the actual dependency-free icon generation approach.
