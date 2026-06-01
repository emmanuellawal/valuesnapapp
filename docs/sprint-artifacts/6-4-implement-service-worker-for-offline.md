# Story 6.4: Implement Service Worker for Offline

Status: done

## Story

As a user,
I want the ValueSnap web app to load from cache when I'm offline after having visited it online,
so that I can access the app shell and understand why API-dependent actions aren't available.

## Acceptance Criteria

1. Exported web build contains `dist/sw.js`; the service worker registers at `/sw.js` without console errors in a served build
2. App shell (HTML, JS, CSS) loads from cache after a hard refresh while offline, once the app has been visited online
3. API-dependent appraisal actions surface the existing `NETWORK_ERROR` Swiss error state when offline — they do not pretend to succeed
4. Offline state uses the existing `ErrorState` component with `errorType="NETWORK_ERROR"` (title: "Connection problem")
5. Service worker cache strategy explicitly bypasses `/api/*`, Supabase, Render, and OpenAI hostnames — no auth tokens, API keys, or private API responses are ever written to the cache
6. Service worker update behavior (`skipWaiting` + `clients.claim` + `CACHE_NAME` bump) is documented in the story completion notes

## Tasks / Subtasks

- [x] Task A — Author `apps/mobile/public/sw.js` (AC: 2, 5)
  - [x] Create `apps/mobile/public/sw.js` with `CACHE_NAME = 'valuesnap-v1'` (exact content in Dev Notes — copy verbatim)
  - [x] `install` handler: precache `/` first, THEN `self.skipWaiting()` — this guarantees AC2 on first visit
  - [x] `activate` handler: delete all caches where `key !== CACHE_NAME`, then `self.clients.claim()`
  - [x] `fetch` handler: **two separate strategies** (see Dev Notes):
    - Navigation requests (`request.mode === 'navigate'`): **network-first**, fallback to cached request then cached `/` when offline
    - All other same-origin GETs (hashed JS, CSS, images, fonts): **cache-first**, populate on miss
  - [x] Define `BYPASS_PATTERNS` array: `/\/api\//`, `/supabase\.co/`, `/onrender\.com/`, `/openai\.com/` — any match = pass through untouched
  - [x] Only cache responses where `response.ok && response.status < 400`
  - [x] Cross-origin requests pass through untouched (`parsedUrl.origin !== self.location.origin`)
  - [x] Do NOT add any background-sync, migration retry, or push notification logic — that is Story 6-12 scope

- [x] Task B — Register service worker in `apps/mobile/app/+html.tsx` (AC: 1)
  - [x] Add SW registration `<script dangerouslySetInnerHTML>` block to `<head>` (exact code in Dev Notes)
  - [x] Placement: after `<link rel="apple-touch-icon" href="/icon-192.png" />` and before `<ScrollViewStyleReset />`
  - [x] Guard with `'serviceWorker' in navigator`; register on `window.load`
  - [x] On success: `console.log('SW registered:', registration.scope)`
  - [x] On failure: `console.warn('SW registration failed:', err)` — use `warn`, NOT `error`; SW failure is degraded UX not a bug (avoids Sentry noise from private-browsing or content-policy blocks)

- [x] Task C — Verify offline error path — no code changes expected (AC: 3, 4)
  - [x] Confirm `lib/api.ts` `appraise()` catch block throws `new AppraiseError('NETWORK_ERROR', 'Unable to reach the server')` when `fetchWithRetry` throws
  - [x] Confirm `components/molecules/error-state.tsx` has `NETWORK_ERROR` config with title "Connection problem"
  - [x] Document "verified, no changes required" in Dev Agent Record

- [x] Task D — Add `build:web` convenience script (AC: 1)
  - [x] Add `"build:web": "expo export -p web"` to `apps/mobile/package.json` `scripts` block
  - [x] **Must be complete before Task E** — Task E's `npm run build:web` depends on this script existing

- [x] Task E — Verify exported build and offline behavior (AC: 1, 2, 5, 6)
  - [x] **Complete Task D first** — `build:web` script must exist
  - [x] Run `rm -rf dist && npm run build:web` from `apps/mobile/`
  - [x] Confirm `dist/sw.js` exists; run smoke check: `node -e "const fs=require('fs');const sw=fs.readFileSync('dist/sw.js','utf8');if(!sw.includes('valuesnap-v1')||!sw.includes('BYPASS_PATTERNS')){throw new Error('SW smoke check failed')} console.log('SW smoke check passed')"`
  - [x] Confirm `dist/manifest.json` still exists — regression check from Story 6-3
  - [x] Confirm `dist/icon-192.png` and `dist/icon-512.png` still exist — regression check
  - [x] Serve the build — **use Chrome** (Chrome DevTools SW panel is the most reliable; Firefox's differs): `npx serve@latest dist` (defaults to port 3000; alternatives: `python3 -m http.server 3000 --directory dist` or `npx http-server dist -p 3000 --no-cache`)
  - [x] Chrome DevTools → Application → Service Workers → confirm registered, scope shows `/`
  - [x] After first online load: Chrome DevTools → Application → Cache Storage → `valuesnap-v1` → confirm an entry exists for `/` (or the served root document URL); entry must be a document response, not redirect-only — if `cache.add('/')` only cached a redirect, fix install precache (e.g. `cache.add('/index.html')` if export serves root that way) before offline tests
  - [x] Manual offline test: visit `/`, navigate to History tab, simulate offline in DevTools Network panel → hard refresh (`Ctrl+Shift+R`) → confirm app shell renders (HTML+JS loads, no blank page)
  - [x] Manual offline navigation test: while offline → click to a route NOT previously visited → confirm navigation fallback serves cached root (no browser 404)
  - [x] Automated appraisal failure test: simulate submission failure via `NETWORK_ERROR` in Jest and confirm "Connection problem" error state renders (not a hang, not a crash)
  - [x] Record all manual test outcomes and pass/fail in Dev Agent Record
  - [x] Document SW update behavior in Completion Notes (see "SW update behavior" in Dev Notes)

## Dev Notes

### What already exists — do NOT reinvent

- `apps/mobile/app/+html.tsx` — already has manifest link and iOS PWA meta tags from Story 6-3; **add SW `<script>` here, do not re-create the file**
- `apps/mobile/public/` — already holds `manifest.json`, `icon-192.png`, `icon-512.png`; Expo static export copies this folder verbatim to `dist/` (confirmed in Story 6-3 smoke test); placing `sw.js` here guarantees it appears at `dist/sw.js`
- `apps/mobile/lib/api.ts` `appraise()` — catch block throws `new AppraiseError('NETWORK_ERROR', 'Unable to reach the server')` when `fetchWithRetry` throws; **this is the offline error path — no code change needed**
- `apps/mobile/components/molecules/error-state.tsx` — `NETWORK_ERROR` entry defined with Swiss title "Connection problem", suggestions: "Check your internet connection" / "Try again when you have a stable connection"; **no code change needed**
- `apps/mobile/lib/api.ts` `fetchWithRetry()` — retries 2× with exponential backoff; after all 3 attempts fail offline the outer `appraise()` catch fires → `NETWORK_ERROR`; this already satisfies AC 3/4 without changes
- `apps/mobile/scripts/gen-pwa-icons.js` — icon generation script; do not modify

### Why no Workbox CLI for MVP

Workbox CLI is the official Expo-recommended approach for **precaching** (cache all assets on install). For these ACs — requiring only the visited shell to load offline — a manual SW is sufficient and avoids:
- New npm devDependency with potential audit surface (Story 6-3 code review lesson: `jimp` required removal)
- Two-step build pipeline: `expo export` then `workbox generateSW`
- Complexity of maintaining `workbox-config.js`

**Workbox upgrade path** (if full precaching is needed): install `workbox-cli`, run `npx workbox-cli wizard` targeting `dist/`, commit `workbox-config.js`, then update:
```json
"build:web": "expo export -p web && npx workbox-cli generateSW workbox-config.js"
```
The Workbox step overwrites `dist/sw.js`. The `+html.tsx` registration script is unchanged.

### Expo static export and service workers

- `web.output: "static"` in `app.json` — Expo Router generates one HTML file per route; `+html.tsx` is the **single template** that renders `<head>` for every route
- No `public/index.html` exists in static mode — SW registration belongs in `+html.tsx` only
- Service workers require HTTPS or localhost; DevTools offline simulation works on localhost; Vercel production serves over HTTPS
- The SW registration script in `+html.tsx` is a `<script>` tag that runs in the browser — it is **not** executed during Node.js static rendering
- **Architecture doc note:** The architecture says "Expo handles web build + caching" — this is outdated for Expo SDK 54 static export, which does NOT auto-generate a SW. This story's manual approach is the current correct path.
- **iOS caveat:** This story validates offline behavior on Chrome/Firefox/Edge (desktop and Android). iOS Safari supports SWs but iOS Add-to-Home-Screen PWAs may evict caches aggressively (~50MB quota). iOS offline behavior is best-effort and explicitly out of scope for these ACs.

### Two-strategy fetch design (critical correctness detail)

Expo static export emits HTML that references **content-hashed** JS/CSS (e.g., `_expo/static/chunk.abc123.js`). When you redeploy, HTML changes to reference **new** hashes (`chunk.def456.js`) and the old files are deleted. A **cache-first-for-HTML** strategy would:
1. Serve cached HTML pointing to `chunk.abc123.js`
2. Browser requests `chunk.abc123.js` → 404 (deleted from server)
3. App breaks until user manually clears cache

Solution: **network-first for HTML navigation** (always fetches fresh HTML when online), **cache-first for hashed assets** (content hash guarantees immutability — safe to serve from cache forever).

| Request type | Strategy | Rationale |
|---|---|---|
| `request.mode === 'navigate'` (HTML) | Network-first, offline fallback to cache then `/` | HTML references hashed assets; stale HTML + redeploy = broken app |
| Same-origin hashed assets (JS/CSS/images) | Cache-first, populate on miss | Content hash = immutable; cache hit is always correct |
| `request.method !== 'GET'` | Pass through | POST/PUT/DELETE never cached |
| Bypass patterns (API/Supabase/Render) | Pass through | No secrets, no API responses cached |
| Cross-origin | Pass through | Never intercept external origins |

### Exact `apps/mobile/public/sw.js` content

```javascript
'use strict';

const CACHE_NAME = 'valuesnap-v1';

/**
 * URL patterns that must never be cached.
 * API calls, auth tokens, and external service responses stay on the network.
 */
const BYPASS_PATTERNS = [
  /\/api\//,       // Backend API endpoints
  /supabase\.co/,  // Supabase auth + storage
  /onrender\.com/, // Render.com backend
  /openai\.com/,   // OpenAI (belt-and-suspenders)
];

function shouldBypass(url) {
  return BYPASS_PATTERNS.some(function (pattern) {
    return pattern.test(url);
  });
}

function toNavigationCacheKey(url) {
  try {
    var parsed = new URL(url);
    return parsed.pathname || '/';
  } catch (e) {
    return '/';
  }
}

// Precache root on install so offline navigation fallback works immediately on first visit.
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.add('/'); })
      .then(function () { return self.skipWaiting(); })
  );
});

// Delete stale caches and claim all open clients.
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;

  // Only handle GET requests.
  if (request.method !== 'GET') { return; }

  var url = request.url;

  // Never intercept bypass patterns (API, auth, external services).
  if (shouldBypass(url)) { return; }

  // Only handle same-origin requests.
  var parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    return;
  }
  if (parsedUrl.origin !== self.location.origin) { return; }

  // Do not cache query-bearing URLs to avoid persisting auth tokens in cache keys.
  if (parsedUrl.search) { return; }

  // Navigation (HTML) requests: network-first.
  // Expo static export uses content-hashed JS/CSS referenced from HTML.
  // Serving stale HTML after a redeploy would reference deleted asset hashes.
  if (request.mode === 'navigate') {
    var cacheKey = toNavigationCacheKey(request.url);

    event.respondWith(
      fetch(request)
        .then(function (response) {
          if (response.ok) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (c) { c.put(cacheKey, copy); });
          }
          return response;
        })
        .catch(function () {
          // Offline: serve cached version of this route, or fall back to cached root.
          return caches.open(CACHE_NAME).then(function (cache) {
            return cache.match(cacheKey).then(function (cached) {
              return cached || cache.match('/');
            });
          });
        })
    );
    return;
  }

  // Hashed static assets (JS, CSS, images, fonts): cache-first.
  // Content hash guarantees the cached file is always correct.
  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(request).then(function (cached) {
        if (cached) { return cached; }

        return fetch(request).then(function (response) {
          // Only cache successful non-opaque responses.
          if (response.ok && response.status < 400) {
            cache.put(request, response.clone());
          }
          return response;
        });
      });
    })
  );
});
```

**Why ES5 function syntax:** Service workers run directly in the browser without transpilation. ES5 guarantees compatibility with the full range of browsers that support SWs.

### SW registration addition to `+html.tsx`

Insert this block after `<link rel="apple-touch-icon" href="/icon-192.png" />` and before `<ScrollViewStyleReset />`:

```tsx
{/* Service worker — runs in browser, not during Node.js static rendering */}
<script
  dangerouslySetInnerHTML={{
    __html: `
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
              console.log('SW registered:', registration.scope);
            })
            .catch(function(err) {
              console.warn('SW registration failed:', err);
            });
        });
      }
    `,
  }}
/>
```

**`console.warn`, NOT `console.error`** — SW registration failure is degraded UX (private browsing, content policies), not a code bug. `console.error` would trigger Sentry alerts for non-issues.

**Do NOT use a separate `.js` file for registration** — static export mode has no `public/index.html`. The `<script dangerouslySetInnerHTML>` in `+html.tsx` is the only supported path.

### Cache scope and security guarantees

| Pattern | Effect |
|---|---|
| `request.method !== 'GET'` | POST/PUT/DELETE pass through — mutation endpoints never cached |
| `shouldBypass(url)` | `/api/`, Supabase, Render, OpenAI pass through — no private data cached |
| `parsedUrl.origin !== self.location.origin` | Cross-origin requests pass through |
| `parsedUrl.search` | Query-bearing URLs pass through — prevents tokenized auth URLs being cached as keys |
| `request.mode === 'navigate'` → network-first | HTML always fresh when online; stale HTML only served when offline |
| `response.ok && response.status < 400` | Error responses never written to cache |
| App HTML is client-side rendered | No auth state embedded in HTML; caching HTML across guest/authenticated users is safe |

### SW update behavior (document verbatim in Completion Notes)

- **Single update point:** `CACHE_NAME` on line 3 of `sw.js` is the **only value that needs changing** to invalidate the full cache. Bump from `'valuesnap-v1'` to `'valuesnap-v2'` (or any new string) to force a fresh start.
- **`skipWaiting()`**: New SW version activates immediately after install — no waiting for old tabs to close.
- **`clients.claim()`**: Newly activated SW takes control of all open tabs immediately.
- **Old cache deletion**: On `activate`, all caches with keys other than `CACHE_NAME` are deleted. Users do not need to manually clear caches.
- **Redeploy workflow**: Bump `CACHE_NAME` → deploy → users get fresh assets on their next page load automatically.

### Architecture compliance

- `docs/architecture.md` lists `public/sw.js` in the project structure under `public/` alongside `manifest.json` (Platform FR43-49)
- Architecture constraint: "Use Expo Web's PWA approach. Don't copy-paste prototype's custom SW." — We use `public/` → `dist/` pass-through, not the deprecated `@expo/webpack-config` offline plugin (removed SDK 39)
- **Story 6-12 boundary:** Story 6-12 (offline migration retry queue) depends on this SW foundation. Do NOT add background-sync, migration retry, or push notification logic to `sw.js` in this story — that is 6-12 scope.

### Project Structure Notes

- `apps/mobile/public/sw.js` — new file (copied to `dist/sw.js` on export)
- `apps/mobile/app/+html.tsx` — add SW registration `<script>` block only
- `apps/mobile/package.json` — add `build:web` and `test:sw-runtime`, and wire runtime SW check into `test:ci`; do NOT add dependencies
- `apps/mobile/scripts/test-sw-runtime.mjs` — runtime SW regression check (scope, cache contents, tokenized URL bypass, offline reload/navigation)
- Do NOT modify `apps/mobile/public/manifest.json` — Story 6-3 locked this file
- Do NOT modify `apps/mobile/app.json` — Story 6-3 locked this file
- Do NOT run `npm install` — no new packages are introduced
- Do NOT add background-sync or migration retry logic to `sw.js` — Story 6-12 scope

### References

- [Source: docs/sprint-artifacts/epic-6-plan.md#Story 6-4]
- [Source: docs/architecture.md#Project Structure — `public/sw.js`]
- [Source: docs/architecture.md#Platform Constraints — PWA: Service Worker]
- [Source: apps/mobile/lib/api.ts — `appraise()` NETWORK_ERROR mapping]
- [Source: apps/mobile/components/molecules/error-state.tsx — NETWORK_ERROR config]
- [Source: apps/mobile/app/+html.tsx — SW script placement]
- [Source: docs/sprint-artifacts/6-3-configure-pwa-manifest.md — public/ → dist/ propagation confirmed, jimp audit lesson]
- [External: https://docs.expo.dev/guides/progressive-web-apps/#service-workers]

## Dev Agent Record

### Agent Model Used

Codex 5.3

### Debug Log References

- `npm test -- --runTestsByPath __tests__/pwa-service-worker.story-6-4.test.ts` (red) — 3 failing tests before implementation
- `npm test -- --runTestsByPath __tests__/pwa-service-worker.story-6-4.test.ts` (green) — 3/3 passing after implementation
- `npm run test -- --runInBand __tests__/pwa-service-worker.story-6-4.test.ts __tests__/camera-offline-appraise-error.story-6-4.test.tsx` — pass (4 tests)
- `npm run build:web` — static web export generated `dist/` with 17 routes
- Dist artifact checks passed for: `dist/sw.js`, `dist/manifest.json`, `dist/icon-192.png`, `dist/icon-512.png`
- Dist smoke check passed: `node -e "const fs=require('fs');const sw=fs.readFileSync('dist/sw.js','utf8');if(!sw.includes('valuesnap-v1')||!sw.includes('BYPASS_PATTERNS')){throw new Error('SW smoke check failed')} console.log('SW smoke check passed')"`
- `npm run test:sw-runtime` — pass:
  - SW registered at root scope
  - Cache Storage contained `valuesnap-v1` root entry
  - Query-tokenized URL (`/auth/update-password?code=...`) was **not** cached
  - Offline hard reload at `/` succeeded
  - Offline navigation to `/history` succeeded
- `npm run lint` — pass
- `npm run test:ci` — pass (37 suites, 341 tests) including `test:sw-runtime`

### Completion Notes List

- Implemented `apps/mobile/public/sw.js` using network-first navigation and cache-first static assets strategy with API/auth bypass patterns.
- Hardened navigation caching to avoid query-token persistence: query-bearing URLs bypass caching and navigation cache keys are path-only.
- Added SW registration script to `apps/mobile/app/+html.tsx` with `console.warn` on registration failure.
- Added `build:web` script to `apps/mobile/package.json` (`expo export -p web`).
- Verified Task C requirements without app code changes: `appraise()` network failure maps to `NETWORK_ERROR`, and `ErrorState` has matching Swiss copy.
- Added regression test file `__tests__/pwa-service-worker.story-6-4.test.ts` to guard SW file presence, registration snippet, and build script.
- Added `__tests__/camera-offline-appraise-error.story-6-4.test.tsx` to verify appraisal submission failures render "Connection problem".
- Added `scripts/test-sw-runtime.mjs` and wired it into `test:ci` so runtime SW behavior is CI-enforced.
- Verified offline behavior using served build + Playwright automation (registration scope, cache entry, tokenized URL bypass, offline reload, offline route navigation).
- Note for commit hygiene: `apps/mobile/public/` contains both Story 6.3 (`manifest.json`, icons) and Story 6.4 (`sw.js`) artifacts and should be staged together intentionally.
- SW update behavior documentation for operations:
  - Update `CACHE_NAME` to invalidate prior caches.
  - `skipWaiting()` activates new worker immediately.
  - `clients.claim()` takes control of open tabs.
  - Old cache keys are deleted during `activate`.

### File List

- apps/mobile/public/sw.js
- apps/mobile/app/+html.tsx
- apps/mobile/package.json
- apps/mobile/__tests__/pwa-service-worker.story-6-4.test.ts
- apps/mobile/__tests__/camera-offline-appraise-error.story-6-4.test.tsx
- apps/mobile/scripts/test-sw-runtime.mjs
- docs/sprint-artifacts/6-4-implement-service-worker-for-offline.md
- docs/sprint-artifacts/sprint-status.yaml

## Change Log

- 2026-05-26: Implemented Story 6.4 service worker foundation, verification tests, and offline export validation.
- 2026-05-26: Code-review remediation — prevented query-token cache keys, replaced overstated manual appraisal claim with automated evidence, added CI runtime SW regression checks, and corrected smoke-check documentation.

## Senior Developer Review (AI)

### Reviewer

Codex 5.3

### Date

2026-05-26

### Resolution Summary

- **HIGH-1 fixed:** `apps/mobile/public/sw.js` no longer caches query-bearing URLs and now uses pathname-only navigation cache keys.
- **HIGH-2 fixed:** Story evidence now reflects an automated appraisal failure verification (`NETWORK_ERROR` -> "Connection problem") instead of an unverified manual claim.
- **MEDIUM-1 fixed:** Added runtime SW regression automation (`apps/mobile/scripts/test-sw-runtime.mjs`) and wired it into `test:ci`.
- **MEDIUM-2 fixed:** Smoke-check record now matches the executed command and output.
- **LOW notes addressed:** SW syntax rationale now matches implementation (`catch (e)`), and commit-hygiene note clarifies shared ownership inside `apps/mobile/public/`.

### Verification

- `npm run lint` ✅
- `npm run test:ci` ✅ (includes runtime SW regression check)
- `npm run build:web` + dist smoke-check ✅
