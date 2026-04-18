# Epic 5.5: Pre-Epic 6 Readiness

**Date:** April 18, 2026
**Epic Duration:** Estimated 2–3 days
**Stories:** 5
**Dependencies:** Epic 5 ✅ Complete

---

## Executive Summary

Epic 5 closed with four unresolved readiness blockers and two mandatory process debt gates. Epic 6 (Platform & PWA) requires real backend access, a working gallery picker, wired preferences, and verified process hygiene before any feature sprint begins. Shipping Epic 6 stories on top of known gaps would repeat the pattern identified across three consecutive retrospectives.

**This sprint exists to clear every gate before Epic 6 story 6-1 is moved to `in-progress`.**

The work falls into three types:

1. **Process debt gates** — lint, checklist, and code-review coverage that are mandatory per the Epic 5 retrospective decision
2. **Feature gaps** — two user-facing surfaces that look complete but are not (settings, gallery picker)
3. **Infrastructure prerequisite** — persistent backend for real-device validation
4. **Planning lock** — Epic 6 workstation acceptance criteria formalised before implementation starts

All five stories are scoped small (30 min – half day each). No new features beyond closing the named gaps.

---

## Readiness Gate Inventory

| # | Gate | Source | Blocker Type | Story |
|---|------|--------|-------------|-------|
| 1 | Mobile lint script missing | Epic 5 retro · AI1 | Critical / Process | 5.5-1 |
| 2 | Frontend pre-review checklist not extended with Epic 5 patterns | Epic 5 retro · AI1 | Critical / Process | 5.5-1 |
| 3 | Code review coverage mandate not enforced | Epic 5 retro · AI1 | Critical / Process | 5.5-1 |
| 4 | Backend not reachable from device testing without tunnel | Epic 5 retro · AI2 | Critical / Infrastructure | 5.5-2 |
| 5 | Camera roll picker absent from main mobile happy path | Epic 5 retro · AI3 | High / Feature gap | 5.5-4 |
| 6 | Theme / Notifications / Currency settings are stubs | Epic 5 retro · AI3 | High / Feature gap | 5.5-3 |
| 7 | Settings safe-area offset and mobile scrollbar visible | Epic 5 retro · AI4 | Medium / Polish | 5.5-3 |
| 8 | Epic 6 workstation ACs not locked in story format | Epic 5 retro · AI5 | High / Planning | 5.5-5 |

---

## Story Dependency Graph

```
5.5-1  Enforce debt gates           ─────────────────────────────────── no dependencies
5.5-2  Deploy backend to Render     ─────────────────────────────────── no dependencies
5.5-3  Wire + polish settings       ─── depends on 5.5-1 (runs under checklist)
5.5-4  Restore gallery picker       ─── depends on 5.5-1 (runs under checklist)
5.5-5  Lock Epic 6 ACs              ─── depends on 5.5-2 (Render URL needed for AC reference)

Recommended execution order:
  Phase 1 (day 1):  5.5-1 + 5.5-2 in parallel
  Phase 2 (day 2):  5.5-3 + 5.5-4 in parallel (after 5.5-1)
  Phase 3 (day 3):  5.5-5 (after 5.5-2 gives a confirmed Render URL)
```

---

## Story Details

---

### Story 5.5-1: Enforce Debt Gates

**Origin:** Epic 5 retrospective — Action Item 6 (Critical), debt policy decision
**Category:** Process / Guard rails
**Estimate:** 30–45 min

**Problem:**
Three process failures recurred across Epic 5 despite an existing pre-review checklist (Story 4.5-3):
- No `lint` script in `apps/mobile/package.json` — "mobile lint" cannot be run as a single command
- The checklist created in Story 4.5-3 was not extended with Epic 5 failure patterns (whitespace guards, assertion depth, helper deduplication)
- Stories 5-6 and 5-10 closed without a code review section

All three gaps produced visible debt in Epic 5 that the team committed to closing before Epic 6.

**What's Needed:**

**Task A — Add the mobile lint script:**

In `apps/mobile/package.json`, add to the `scripts` block:
```json
"lint": "npx eslint . --ext .ts,.tsx --max-warnings 0"
```
Verify it runs cleanly from the root of `apps/mobile/`. Record the baseline warning count if `--max-warnings 0` causes failures; address or baseline-suppress each one before closing this story.

**Task B — Extend the frontend pre-review checklist:**

Open `docs/frontend-review-checklist.md`. Add a new section (or extend the existing failure-patterns section) with the following checks, sourced from Epic 5:

- [ ] **Whitespace guards:** Does every translatable string with dynamic content include trimming or guard against accidental leading/trailing whitespace?
- [ ] **Assertion depth:** Are test assertions specific enough to fail if the target value changes? (No bare `.toBeTruthy()` where `.toBe('exact value')` is possible.)
- [ ] **Helper deduplication:** Are `getTextContent`, `findByText`, or similar test helpers defined once and imported, not re-implemented inline?
- [ ] **Code review section present:** Does the story file include a `## Code Review` section before being moved to `done`?

**Task C — Add code review mandate to the SM workflow or checklist:**

The story `done` criteria must include: a `## Code Review` section exists in the story file. Add this as an explicit checklist gate in `docs/frontend-review-checklist.md` or in the story close-out section of the SM's story-creation template. The SM agent must not close a story that lacks this section.

**Acceptance Criteria:**
- [ ] `npm run lint` executes without error from `apps/mobile/`
- [ ] The lint script is defined in `apps/mobile/package.json` under `"scripts"`
- [ ] `docs/frontend-review-checklist.md` includes all four new Epic 5 pattern checks
- [ ] A "code review section required before done" gate is present in the checklist or SM workflow
- [ ] Any baseline lint warnings are documented or suppressed with inline comments (no silent ignores at file level)

**Files to touch:**
- `apps/mobile/package.json` — add lint script
- `docs/frontend-review-checklist.md` — extend with Epic 5 patterns + code review gate

---

### Story 5.5-2: Deploy Backend to Render

**Origin:** Epic 5 retrospective — Action Item 1 (Critical)
**Category:** Infrastructure prerequisite
**Estimate:** 1–2 hours

**Problem:**
All real-device testing requires either:
- a local server (laptop must stay on and tunnelled), or
- the `localtunnel` URL which expires on disconnect

The Epic 5 retro confirmed: submission failures, mock-mode drift, and the ~22s startup observation were all made harder to diagnose by the absence of a persistent backend. Epic 6 includes PWA and network-resilience stories (6-4, 6-6, 6-7, 6-8) that cannot be meaningfully tested without a stable API endpoint.

**What's Needed:**

Deploy the existing `backend/` FastAPI service to Render free tier. The backend is already production-ready: `USE_MOCK=false` tested locally, health endpoint at `/health`, real eBay and OpenAI credentials stored in env.

**Task A — Create Render web service:**
1. Go to render.com → New → Web Service
2. Connect the `valuesnapapp` GitHub repo
3. Root directory: `backend/`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Instance type: Free (or Starter if free tier sleeps too aggressively for device testing)

**Task B — Configure environment variables in Render:**
Copy from local `.env` (do not commit values to the repo):
- `OPENAI_API_KEY`
- `EBAY_APP_ID`
- `EBAY_CERT_ID`
- `EBAY_CLIENT_SECRET`
- `EBAY_USE_SANDBOX=false`
- `USE_MOCK=false`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `CORS_ORIGINS` — include `https://*.expo.dev` and any Vercel preview URLs

**Task C — Validate health endpoint:**
```bash
curl https://<your-service>.onrender.com/health
# Expected: {"status": "ok", ...}
```

**Task D — Update frontend configuration:**
Add the Render URL as `EXPO_PUBLIC_API_URL` in:
- `apps/mobile/.env.local` (local override for device testing, not committed)
- A new `apps/mobile/.env.render` file documenting the production URL pattern (committed, no secrets)

**Task E — Run a real-mode submission from a device:**
Submit one photo via Expo Go or the tunnel URL pointed at Render, confirm the appraisal completes end-to-end with `USE_MOCK=false`.

**Acceptance Criteria:**
- [ ] `GET https://<render-url>/health` returns `{"status": "ok"}` consistently
- [ ] A real appraisal submission from a mobile device returns a result (not a network error or mock response)
- [ ] Render URL is documented in `docs/deployment/README.md`
- [ ] No API keys or secrets are committed to the repository
- [ ] CORS is configured to allow Expo dev URLs and any Vercel preview domains

**Files to touch:**
- `docs/deployment/README.md` — record Render URL and deployment procedure
- `apps/mobile/.env.render` — document URL pattern (no secrets)

---

### Story 5.5-3: Wire and Polish Settings Screen

**Origin:** Epic 5 retrospective — Action Items 3 (High) and 4 (Medium)
**Category:** Feature gap + Polish
**Estimate:** 2–3 hours

**Problem:**
The Settings screen (`apps/mobile/app/(tabs)/settings.tsx`) renders three interactive-looking preference rows that do nothing:
- **Theme** — shows "System", non-interactive (no `onPress`, no storage write)
- **Notifications** — shows "Off", non-interactive
- **Currency** — shows "USD", non-interactive

Additionally the screen has two layout defects observed on real devices:
- Safe-area / header offset: content starts under the status bar on some devices
- Mobile scrollbar: a visible browser-style scrollbar appears on web/mobile-web

These surfaces appear complete to a casual observer but break trust on closer inspection. They should be wired before Epic 6 introduces new interaction patterns on the same screen.

**What's Needed:**

**Task A — Persist and display Theme preference:**
1. Install `@react-native-async-storage/async-storage` if not already present
2. Create `apps/mobile/lib/preferences.ts` — a thin module exposing:
   ```ts
   type ThemePreference = 'system' | 'light' | 'dark';
   type NotificationsPreference = 'on' | 'off';
   type CurrencyPreference = 'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD';
   
   export async function getPreference<T>(key: string, defaultValue: T): Promise<T>
   export async function setPreference<T>(key: string, value: T): Promise<void>
   ```
3. Wire the Theme row to cycle between `system → light → dark → system` on press, persist via `preferences.ts`, and reload on screen focus.

**Task B — Wire Notifications preference:**
Cycle between `on` and `off` on press. Persist via `preferences.ts`. No real push-notification registration required at this stage — the row must be interactive and show the persisted value on return visits.

**Task C — Wire Currency preference:**
Open a bottom sheet or inline picker with: USD, GBP, EUR, CAD, AUD. Persist the selection. Display the stored value in the row's `value` prop. Pair with any existing currency usage in valuation display if straightforward; otherwise just store the value for later use in Epic 6/7.

**Task D — Fix safe-area / header offset:**
Inspect the `ScreenContainer` component and the settings route stack header configuration. Ensure the settings screen content does not start under the native status bar on iOS/Android. The fix should not break other screens — verify history and camera tabs visually.

**Task E — Suppress web scrollbar:**
Add `className="overflow-hidden"` or equivalent NativeWind class to the `ScreenContainer` or the outer ScrollView in the settings screen to suppress the visible browser scrollbar on web. Verify scrolling still works on mobile.

**Acceptance Criteria:**
- [ ] Tapping Theme cycles through `System → Light → Dark → System`; value persists across app restarts
- [ ] Tapping Notifications toggles `Off ↔ On`; value persists
- [ ] Tapping Currency opens a picker; the selected currency persists and is displayed in the row
- [ ] Settings content is not obscured by the status bar on iOS or Android
- [ ] No visible scrollbar on web/mobile-web within the settings screen
- [ ] Existing tests still pass; new unit tests cover the `preferences.ts` module (read/write/default)
- [ ] Story file includes a `## Code Review` section before being marked done

**Files to touch:**
- `apps/mobile/app/(tabs)/settings.tsx`
- `apps/mobile/lib/preferences.ts` — new file
- `apps/mobile/components/primitives/ScreenContainer.tsx` (or similar) — safe-area fix
- `apps/mobile/__tests__/preferences.test.ts` — new file

---

### Story 5.5-4: Restore Gallery Picker to Main Mobile Flow

**Origin:** Epic 5 retrospective — Action Item 2 (High)
**Category:** Feature gap (FR2)
**Estimate:** 1–2 hours

**Problem:**
FR2 from the original PRD: users must be able to provide a photo from their camera roll, not only from the live camera.

Currently in `CameraCapture.tsx`:
- `launchImageLibraryAsync` is called only inside `handleFileUpload`, which is only reachable from the `denied` state (when camera permission has been explicitly refused).
- Users with camera permission granted — the normal case — have no way to select from their library without first denying camera permission.

The path is implemented correctly; it is just unreachable unless the user has denied camera access.

**What's Needed:**

**Task A — Add a secondary "Choose from library" action in idle and ready states:**

In `CameraCapture.tsx`, add a link/button below the main capture button in both:
- the `idle` state render block (after "Tap to take a photo")
- the `ready` state render block (after the camera button)

The button label should follow the existing Swiss typography pattern: short, no icon, flush with the layout grid.

Suggested text: `Choose from library` with `variant="caption"` and `text-ink-muted` colour — secondary to the camera button visually but clearly tappable.

**Task B — Centralise the library-launch handler:**

The existing `handleFileUpload` already calls `launchImageLibraryAsync` and routes the result correctly. Re-use it — do not duplicate logic. The `denied` state should keep using the same handler. No new state variable is required; the existing `captured` state flow handles the result identically.

**Task C — Request media library permission if needed:**

`launchImageLibraryAsync` may require `expo-media-library` permission on Android. Check whether `ImagePicker.requestMediaLibraryPermissionsAsync()` is needed before calling `launchImageLibraryAsync`. Add permission check inside `handleFileUpload` if not already present.

**Task D — Web parity check:**

On web, `launchImageLibraryAsync` opens the browser file picker. Verify the file picker appears from the new buttons on web as well as on native.

**Acceptance Criteria:**
- [ ] On iOS/Android with camera permission granted, a secondary "Choose from library" option is visible and tappable in the camera capture area
- [ ] Selecting a photo from the library routes it through the same `onPhotoCapture` handler as the camera path
- [ ] The library button is accessible (`accessibilityLabel` set, touch target ≥ 48px)
- [ ] On web, the button opens the browser file picker
- [ ] No duplication of `launchImageLibraryAsync` logic — `handleFileUpload` is the single call site
- [ ] Existing camera capture tests still pass
- [ ] New test: selecting from library in `ready` state triggers `onPhotoCapture` with the selected photo
- [ ] Story file includes a `## Code Review` section before being marked done

**Files to touch:**
- `apps/mobile/components/organisms/camera-capture/CameraCapture.tsx`
- `apps/mobile/__tests__/camera-capture.test.tsx` (or equivalent) — add library-picker test cases

---

### Story 5.5-5: Lock Epic 6 Workstation Acceptance Criteria

**Origin:** Epic 5 retrospective — Action Item 5 (High)
**Category:** Planning lock
**Estimate:** 30–45 min (planning only, no code)

**Problem:**
Epic 6 Story 6-10 ("Implement Desktop UX Patterns") and Story 6-1 ("Implement Tab Navigation") reference the 10/45/45 workstation model adopted in the Epic 5 retrospective, but their acceptance criteria have not been written to that level of specificity. The professor's suggestions — static export audit, font preload / CLS verification, Swiss PWA manifest — were adopted or adapted in the retro but are not yet formalised in story AC.

Without locked ACs, the workstation model risks being interpreted loosely during implementation. The professor's feedback was triggered by vague desktop output in Epic 5; this story closes that gap before Epic 6 starts.

**What's Needed:**

**Task A — Write specific ACs for Story 6-1 (Tab Navigation):**

Open `docs/sprint-artifacts/sprint-status.yaml` and the epic plan (or create `6-1-implement-tab-navigation.md` when the SM runs story creation). The ACs must include:

- Mobile (`< 1024px`): bottom tab bar with Camera, History, Settings tabs; matches current Expo Router tab layout
- Desktop (`≥ 1024px`): left vertical nav rail rendered by `SwissSidebar` or equivalent; tab bar hidden
- Breakpoint gate: `BREAKPOINT_LG = 1024` (from `constants/breakpoints.ts`, Story 4.5-2) — no new magic numbers
- The rail must not be wider than ~10% of the viewport at 1440px (≈ 144px); the remaining space splits ~45/45 between image and data panes when on an appraisal screen

**Task B — Write specific ACs for Story 6-10 (Desktop UX Patterns):**

- At `lg` breakpoint on the appraisal result screen (`/appraisal`), the layout renders a 3-pane split: left rail ~10%, centre image pane ~45%, right data pane ~45%
- The split is implemented with CSS flex or grid, not hard-coded pixel widths
- No top navigation header renders at `lg` or above — the rail is the only nav surface
- Static export check: `expo export --platform web` completes without error
- Font preload: the primary typeface link has `rel="preload"` in the HTML `<head>` output (verify in exported `index.html`)
- CLS: layout shift score for the appraisal screen is ≤ 0.1 on first load (Lighthouse or manual check)

**Task C — Write specific ACs for Story 6-3 (PWA Manifest):**

The manifest must include the professor-suggested Swiss PWA fields:
- `"theme_color": "#0A0A0A"` (ink)
- `"background_color": "#FAFAF8"` (paper)
- `"display": "standalone"`
- `"name": "ValueSnap"`
- `"short_name": "ValueSnap"`
- Icons at 192×192 and 512×512

**Task D — Document the Render backend URL in the Epic 6 story templates:**

Once 5.5-2 is done, record the Render API URL in `docs/deployment/README.md` and reference it in the AC for Story 6-7 (Retry Mechanism) — the retry stories need a real endpoint to test against.

**Acceptance Criteria:**
- [ ] Story 6-1 has written ACs covering mobile tabs, desktop rail, breakpoint gate, and max rail width
- [ ] Story 6-10 has written ACs covering 10/45/45 split, no top header at `lg`, static export, font preload, and CLS target
- [ ] Story 6-3 has written ACs listing all five required PWA manifest fields
- [ ] Epic 6 story files (or the epic plan) reference the Render URL for network-dependent stories
- [ ] No new magic breakpoint numbers are introduced — all desktop gates reference `BREAKPOINT_LG`

**Files to touch:**
- `docs/sprint-artifacts/epic-6-plan.md` — create or update with the above ACs (SM runs this)
- `docs/deployment/README.md` — update with Render URL (after 5.5-2)

---

## Epic 5.5 Exit Criteria

Epic 6 (`epic-6: in-progress`) must not begin until all of the following are true:

| Gate | Verified by |
|------|-------------|
| `npm run lint` exits 0 in `apps/mobile/` | CI or manual run |
| Frontend pre-review checklist includes Epic 5 pattern checks | Checklist file review |
| Code review section required by checklist before story close | Checklist file review |
| `GET <render-url>/health` returns `{"status": "ok"}` | curl / browser |
| Real-mode appraisal completes from a physical device against Render | Manual smoke test |
| Theme, Notifications, Currency rows are interactive and persistent | Manual settings test |
| Settings safe-area and scrollbar defects resolved | Manual device check |
| "Choose from library" tappable in camera capture idle/ready states | Manual device test |
| Story 6-1, 6-3, 6-10 ACs written to workstation and PWA spec | Doc review |

---

## Effort Summary

| Story | Category | Estimate |
|-------|----------|----------|
| 5.5-1 Enforce debt gates | Process | 30–45 min |
| 5.5-2 Deploy backend to Render | Infrastructure | 1–2 hrs |
| 5.5-3 Wire + polish settings | Feature gap | 2–3 hrs |
| 5.5-4 Restore gallery picker | Feature gap | 1–2 hrs |
| 5.5-5 Lock Epic 6 workstation ACs | Planning | 30–45 min |
| **Total** | | **~5–9 hours** |
