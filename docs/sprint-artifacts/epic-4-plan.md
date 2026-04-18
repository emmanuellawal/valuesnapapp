# Epic 4: User Authentication — Execution Plan

**Date:** March 26, 2026  
**Epic Duration:** Estimated 2–3 weeks  
**Stories:** 14 total  
**Dependencies:** Epic 3 (History & Persistence) ✅ Complete

---

## Executive Summary

Epic 4 transforms ValueSnap from an **anonymous tool** into a **personalized platform**. Every user gets an identity — whether as a guest with local storage or an authenticated user with cloud-synced data.

**Epic 3 left us here:**
```
Photo → Valuation → Saved to DB (user_id = NULL) → History Tab (local 5-item cap)
```

**Epic 4 delivers:**
```
Photo → Valuation → Saved to DB (user_id = auth.users.id) → UNLIMITED History
                                                                    ↓
                                        Guest Mode: 5 items, upgrade prompt
                                        Auth Mode: Unlimited, cross-device sync
                                                                    ↓
                                        Settings: Account info, sign out, delete account
                                                                    ↓
                                        Guest → Auth: Migrate local data to account
```

---

## Current State Analysis

### ✅ Already Built (Story 4.1 — in review)
- `@supabase/supabase-js ^2.100.1` installed in `apps/mobile/`
- `apps/mobile/lib/supabase.ts` — singleton client with AsyncStorage, `detectSessionInUrl: false`
- `User` and `Session` types re-exported from Supabase JS
- `.env.example` updated with anon key vs service_role key docs

### ✅ Already Built (Epics 0–3)
- **Backend:** `valuations` table with `user_id UUID NULL FK auth.users(id)` — ready for authenticated writes
- **Backend:** `guest_session_id` column for guest-to-account migration path
- **Frontend:** `types/user.ts` — `User`, `GuestUser`, `AuthState` union, type guards (`isUser()`, `isGuestUser()`)
- **Frontend:** `useLocalHistory` hook — guest storage with 5-item cap, `guestSessionId` for claim path
- **Frontend:** Tab layout with Camera/History/Settings (responsive: bottom bar ↔ sidebar at 1024px)
- **Frontend:** Settings tab placeholder screen exists
- **Frontend:** `expo-web-browser` ~15.0.10 and `expo-linking` ~8.0.11 (needed for OAuth redirect)
- **Frontend:** `lib/env.ts` with `validateEnv()` — validates Supabase vars at startup

### ✅ Built (Epic 4 — in review)
- Auth screens: Registration, Sign-In, Google OAuth (Stories 4.2–4.4)
- Sign-out flow (Story 4.5)
- AuthContext + session persistence (Story 4.6)
- Guest mode gating + upgrade prompts (Story 4.7)
- Settings screen with real account info (Story 4.8)
- Account deletion confirmation + execution (Stories 4.9–4.10)
- Guest data → account migration (Story 4.11)

### 🔄 Added Post-Epic Hardening Story
- Story 4.12 isolates the temporary browser E2E seam behind a single harness module and adds a production-bundle guard so the migration test workaround does not become permanent production architecture.
- Story 4.13 moves the migration Playwright path onto the real sign-in screen and removes the temporary browser auth bootstrap override from production auth state wiring.
- Story 4.14 removes the remaining browser mock-mode override and standardizes Supabase auth stubbing behind a reusable Playwright helper so the dedicated web config is the single source of mock-mode behavior.

---

## Story Dependency Graph

```
4.1: Configure Supabase Auth ✅ (review)
  │
  ├─► 4.2: User Registration (Email/Password)
  │     └─► 4.3: User Sign-In
  │           └─► 4.4: Google OAuth Sign-In
  │
  ├─► 4.6: Session Persistence + AuthContext ←── CRITICAL: many stories depend on this
  │     │
  │     ├─► 4.5: Sign Out
  │     ├─► 4.7: Guest Mode (gating + upgrade prompts)
  │     │         └─► 4.11: Migrate Guest Data to Account
  │     │               └─► 4.12: Consolidate Browser E2E Test Harness
  │     │                     └─► 4.13: Reduce Playwright Auth Bootstrap Globals
  │     │                           └─► 4.14: Remove Browser Mock-Mode Override From E2E Harness
  │     └─► 4.8: Settings Screen
  │           ├─► 4.9: Account Deletion Confirmation
  │           └─► 4.10: Execute Account Deletion
  │
  └─── (All 13 remaining stories depend on 4.1)
```

---

## Implementation Order (Recommended)

### Phase A: Auth Foundation (Stories 4.6, 4.2, 4.3)
**Estimated: 3–4 days**

Build the AuthContext first — it's the backbone everything else plugs into.

| Order | Story | Effort | Stack | Why This Order |
|-------|-------|--------|-------|----------------|
| 1 | **4.6** Session Persistence + AuthContext | 4–6h | Frontend | Every other story reads `AuthContext`. Build it first. |
| 2 | **4.2** User Registration | 3–4h | Frontend | First real auth screen. Tests the full Supabase signup flow. |
| 3 | **4.3** User Sign-In | 2–3h | Frontend | Mirrors 4.2 — same form, different Supabase call. |

**Phase A Deliverable:** Users can register, sign in, and stay signed in across app restarts.

### Phase B: OAuth + Sign Out (Stories 4.4, 4.5)
**Estimated: 1–2 days**

| Order | Story | Effort | Stack | Notes |
|-------|-------|--------|-------|-------|
| 4 | **4.4** Google OAuth | 3–4h | Frontend | `expo-web-browser` + `Linking.createURL('/')`. Requires Dashboard config (AC4 from 4.1). |
| 5 | **4.5** Sign Out | 1–2h | Frontend | Simple: `supabase.auth.signOut()`, clear state, redirect to Camera. |

**Phase B Deliverable:** All auth methods (email + Google) work. Users can sign out.

### Phase C: Guest Mode + Migration (Stories 4.7, 4.11)
**Estimated: 2–3 days**

| Order | Story | Effort | Stack | Notes |
|-------|-------|--------|-------|-------|
| 6 | **4.7** Guest Mode | 3–4h | Frontend + Backend | Gating logic, 5-item cap enforcement, upgrade banner after 3 valuations. |
| 7 | **4.11** Guest Data Migration | 4–5h | Full Stack | `UPDATE valuations SET user_id = ? WHERE guest_session_id = ?` claim path. |

**Phase C Deliverable:** Guest users have clear limits and a smooth upgrade path.

### Phase D: Settings + Account Deletion (Stories 4.8, 4.9, 4.10)
**Estimated: 2–3 days**

| Order | Story | Effort | Stack | Notes |
|-------|-------|--------|-------|-------|
| 8 | **4.8** Settings Screen | 3–4h | Frontend | Account info, sign-out button, delete link, help, app version. |
| 9 | **4.9** Deletion Confirmation | 2–3h | Frontend | Modal with "DELETE" text input confirmation. |
| 10 | **4.10** Execute Deletion | 3–4h | Full Stack | DB cascade, Supabase Auth user delete, clear local, redirect. |

**Phase D Deliverable:** Full account lifecycle: create → use → manage → delete.

### Phase E: Post-Epic Harness Hardening (Story 4.12)
**Estimated: 1 day**

| Order | Story | Effort | Stack | Notes |
|-------|-------|--------|-------|-------|
| 11 | **4.12** Consolidate Browser E2E Test Harness | 3–5h | Frontend + CI | Centralizes localhost-only browser overrides and adds a production-bundle guard. |

**Phase E Deliverable:** Playwright migration coverage remains deterministic without leaving browser-global test seams scattered through production feature code.

### Phase F: Migration Auth Flow Hardening (Story 4.13)
**Estimated: 1 day**

| Order | Story | Effort | Stack | Notes |
|-------|-------|--------|-------|-------|
| 12 | **4.13** Reduce Playwright Auth Bootstrap Globals | 2–4h | Frontend + Playwright | Replaces browser auth seeding with a real sign-in flow while keeping the migration spec deterministic. |

**Phase F Deliverable:** Migration coverage signs in through the app's auth UI instead of injecting authenticated state through browser globals or localStorage.

### Phase G: Mock Override Retirement (Story 4.14)
**Estimated: 1 day**

| Order | Story | Effort | Stack | Notes |
|-------|-------|--------|-------|-------|
| 13 | **4.14** Remove Browser Mock-Mode Override From E2E Harness | 2–4h | Frontend + Playwright | Removes the last browser mock-mode override and centralizes Supabase auth stubbing in reusable Playwright helpers. |

**Phase G Deliverable:** The dedicated Playwright web config remains the primary mock-mode control, auth stubbing is reusable across future E2E specs, and a helper-owned runtime safeguard keeps browser auth tests deterministic without leaking a general-purpose override seam into production bundles.

---

## Story Details

### Story 4.1: Configure Supabase Auth ✅
**Status: review** — `@supabase/supabase-js` installed, `lib/supabase.ts` created.  
Dashboard tasks (JWT expiry, providers, redirect URLs) in progress.

---

### Story 4.2: Implement User Registration
**FR35 — Account creation**

**What Exists:**
- `supabase` client in `lib/supabase.ts`
- `User` type in `types/user.ts` (app's own type — needs bridge from Supabase `User`)
- Settings tab exists (but no auth screens)

**What's Needed:**
1. Auth screen route: `app/auth/register.tsx`
2. Email input with format validation
3. Password input with min 8 char enforcement
4. Call `supabase.auth.signUp({ email, password })`
5. Handle errors: duplicate email, weak password, network
6. Redirect to Camera on success
7. Link to sign-in for existing users

**Key Decision:** Auth screens are not tabs — they're modal/stack routes outside the tab layout. Use `app/auth/` folder with Expo Router stack.

**Estimated:** 3–4 hours

---

### Story 4.3: Implement User Sign-In
**FR36 — Sign in**

**What's Needed:**
1. Auth screen route: `app/auth/sign-in.tsx`
2. Email + password form (mirrors 4.2 layout)
3. Call `supabase.auth.signInWithPassword({ email, password })`
4. Handle errors: wrong credentials, rate limit
5. "Forgot password?" link → `supabase.auth.resetPasswordForEmail()`
6. Redirect to Camera on success, load history
7. Link to register for new users

**Estimated:** 2–3 hours

---

### Story 4.4: Implement Google OAuth Sign-In
**FR36 — OAuth sign-in**

**What's Needed:**
1. "Sign in with Google" button on both auth screens
2. OAuth flow using `expo-web-browser`:
   ```typescript
   import * as WebBrowser from 'expo-web-browser';
   import * as Linking from 'expo-linking';

   const redirectTo = Linking.createURL('/');
   const { data } = await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: { redirectTo },
   });
   if (data.url) {
     await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
   }
   ```
3. Handle OAuth callback — `supabase.auth.onAuthStateChange` picks up the session
4. Works in Expo Go (redirect with `exp://`) and production (`mobile://`)

**Prerequisites:** Google OAuth must be configured in Supabase Dashboard (AC4 from Story 4.1).

**Estimated:** 3–4 hours

---

### Story 4.5: Implement Sign Out
**FR37 — Sign out**

**What's Needed:**
1. "Sign Out" button in Settings (wired in Story 4.8, but logic built here)
2. Call `supabase.auth.signOut()`
3. Clear AuthContext state → `null`
4. Redirect to Camera tab
5. App reverts to guest mode automatically (no signed-in state = guest)

**Estimated:** 1–2 hours

---

### Story 4.6: Implement Session Persistence + AuthContext
**FR38 — Session persistence | CRITICAL DEPENDENCY**

**This is the most important story in Epic 4.** Every other story reads auth state from this context.

**What's Needed:**
1. `app/contexts/AuthContext.tsx`:
   ```typescript
   // Provides: { session, user, isGuest, isLoading, signOut }
   // user: app's User type (bridged from Supabase User)
   // isGuest: true when session is null
   ```
2. Bridge Supabase `User` → app `User` (from `types/user.ts`):
   ```typescript
   function mapSupabaseUser(supabaseUser: SupabaseUser): AppUser {
     return {
       id: supabaseUser.id,
       email: supabaseUser.email!,
       createdAt: supabaseUser.created_at,
       tier: 'FREE', // Default tier, Phase 2 introduces PRO
       preferences: supabaseUser.user_metadata?.preferences ?? {},
     };
   }
   ```
3. Session restoration on app launch:
   ```typescript
   const { data } = await supabase.auth.getSession();
   // AsyncStorage persistence means this works across restarts
   ```
4. `supabase.auth.onAuthStateChange()` listener for real-time state updates
5. Wrap app root in `<AuthProvider>` (in `app/_layout.tsx`)
6. Custom hook: `useAuth()` for consuming components

**Auth state machine:**
```
App Launch → getSession()
  ├── Session found → SIGNED_IN (show Camera, load history)
  ├── No session → GUEST (show Camera, local 5-item history)
  └── Error → GUEST (graceful fallback)

onAuthStateChange:
  SIGNED_IN → update user, sync history
  SIGNED_OUT → clear user, revert to guest
  TOKEN_REFRESHED → update session silently
```

**NFR-S10 (max 3 concurrent sessions):** Supabase doesn't enforce this natively. Defer to security hardening. Document in story as acknowledged limitation.

**Estimated:** 4–6 hours

---

### Story 4.7: Implement Guest Mode
**FR39 — Guest usage | NFR-G1, NFR-G3**

**What Exists:**
- `useLocalHistory` hook with `saveLocal()`, `getLocal()`, 5-item cap, `guestSessionId`
- `GuestUser` type with `sessionId`, `valuationLimit`, `remainingValuations`

**What's Needed:**
1. Guest state initialization in AuthContext when no session
2. Enforce 5-item local history cap (already in `useLocalHistory`)
3. Upgrade banner after 3rd valuation: "Create a free account to save unlimited valuations"
4. Gate listing pre-fill behind auth (NFR-G3): "Sign in to use this feature"
5. Guest status indicator in History tab: "5 of 5 local valuations used" with sign-up CTA
6. **Question: Retroactivity** — if guest had 5 items pre-Epic 4, do they see all 5 or get capped? Answer: Show all existing, cap new saves. Existing data is grandfather.

**Estimated:** 3–4 hours

---

### Story 4.8: Build Settings Screen
**FR40, FR41 — Account info, help/support**

**What Exists:**
- Settings tab screen at `app/(tabs)/settings.tsx` (placeholder)
- Tab layout already wired

**What's Needed:**
1. **Authenticated view:**
   - Email address display
   - Sign-in method (Email or Google)
   - "Sign Out" button (calls Story 4.5 logic)
   - "Delete Account" destructive link (navigates to Story 4.9)
   - "Help & Support" link (external URL or in-app info)
   - App version at bottom
2. **Guest view:**
   - "Sign in or create an account" CTA
   - "Help & Support" link
   - App version at bottom
3. Swiss Minimalist styling: text-only, no card containers, divider lines between sections
4. **Accessibility fix (from Story 4.5 code review F2):** Refactor `SettingsRow` to conditionally set `accessibilityRole="button"` only for interactive rows. Non-interactive rows (Version, etc.) should not announce as buttons.

**Estimated:** 3–4 hours

---

### Story 4.9: Implement Account Deletion Confirmation
**FR42 — Account deletion (step 1: confirmation)**

**What's Needed:**
1. Modal/dialog triggered from Settings "Delete Account"
2. Clear consequences: "This will permanently delete all your valuations and account data"
3. Text input requiring user to type `DELETE` to enable the confirm button
4. Cancel button dismisses with no side effects
5. "Delete My Account" button in Signal color (destructive)
6. Button disabled until `DELETE` typed exactly

**Estimated:** 2–3 hours

---

### Story 4.10: Execute Account Deletion
**FR42 — Account deletion (step 2: execution) | NFR-S7 GDPR**

**What's Needed:**
1. Backend endpoint: `DELETE /api/account` (authenticated)
   - Delete all valuations where `user_id = auth.uid()`
   - Delete user from Supabase Auth via admin API (requires service_role key, backend-only)
2. Frontend: call endpoint, show loading, handle success/failure
3. On success:
   - Clear AuthContext
   - Clear AsyncStorage
   - Show brief confirmation toast
   - Redirect to Camera in guest mode
4. On failure: show error, do NOT partially delete
5. Must complete within 5 seconds

**Estimated:** 3–4 hours

---

### Story 4.11: Migrate Guest Data to Account
**The bridge from Epic 3's guest path to Epic 4's authenticated path**

**What Exists:**
- `guest_session_id` stored in AsyncStorage via `useLocalHistory`
- `valuations` table has `guest_session_id` column and `user_id NULL`
- Backend already writes guest valuations with `guest_session_id`

**What's Needed:**
1. Migration prompt on sign-up/sign-in when local valuations exist: "Migrate your N valuations?"
2. Backend endpoint: `POST /api/migrate-guest`
   - Input: `{ guest_session_id: string }`
   - Action: `UPDATE valuations SET user_id = auth.uid() WHERE guest_session_id = ? AND user_id IS NULL`
   - Returns: `{ migrated: number, failed: number }`
3. On success: clear local history, reload from server
4. Partial failure: keep failed items in local storage, notify user
5. Offline: queue migration for next online session (store intent in AsyncStorage)

**Estimated:** 4–5 hours

---

### Story 4.12: Consolidate Browser E2E Test Harness
**Post-epic cleanup to retire the leaky abstraction introduced during migration E2E stabilization**

**What Exists:**
- Browser-only E2E auth/session overrides are currently read directly in `contexts/AuthContext.tsx`, `lib/env.ts`, and `app/(tabs)/history.tsx`
- Playwright migration tests seed browser globals before app boot
- Auth readiness for Playwright sync is currently published from `AuthContext.tsx`
- No CI step currently asserts that test-only global markers are absent from production web bundles

**What's Needed:**
1. Single browser test harness module that owns all browser-global reads and writes
2. Remove direct `window.__VALUESNAP_*` access from `AuthContext`, `env`, and `history`
3. Move auth snapshot publication out of `AuthContext` into a dedicated root-level boundary
4. Add a production bundle guard that fails if test-only global markers appear in exported web JS
5. Wire the guard into GitHub Actions so the check runs in CI

**Estimated:** 3–5 hours

---

### Story 4.13: Reduce Playwright Auth Bootstrap Globals
**Follow-up cleanup to move the migration E2E onto the actual auth flow**

**What Exists:**
- Story 4.12 centralized the browser test harness and production-bundle guard
- The migration Playwright spec still seeds `__VALUESNAP_E2E_AUTH__` and `valuesnap:e2e-auth` before app boot
- `AuthContext.tsx` still accepts that browser auth override path

**What's Needed:**
1. Remove auth bootstrap seeding from `apps/mobile/tests/migration-flow.spec.ts`
2. Drive the migration spec through `/auth/sign-in` using the real form submission path
3. Intercept the Supabase password-auth request in Playwright so the spec stays deterministic without app-owned auth injection
4. Remove browser auth override support from `AuthContext.tsx` and `lib/testHarness.ts`
5. Extend the production bundle guard to fail if the retired auth bootstrap storage key reappears

**Estimated:** 2–4 hours

---

### Story 4.14: Remove Browser Mock-Mode Override From E2E Harness
**Final cleanup for the remaining browser-local auth environment seam**

**What Exists:**
- Story 4.13 removed browser-auth bootstrap from production auth state wiring
- The migration Playwright spec still forces `__VALUESNAP_E2E_USE_MOCK__ = false`
- `env.ts` and `lib/testHarness.ts` still carry that browser override path
- The Supabase password-auth fetch stub is currently embedded directly inside the migration spec

**What's Needed:**
1. Remove the remaining browser mock-mode override from `env.ts`, `lib/testHarness.ts`, and the migration Playwright spec
2. Prove the dedicated Playwright config is sufficient on its own by keeping the migration spec green without any mock-mode browser override
3. Extract the Supabase password-auth fetch interception into a reusable Playwright helper for future auth-focused E2E specs
4. Keep the auth readiness snapshot path intact for deterministic Playwright synchronization

**Estimated:** 2–4 hours

---

## Technical Decisions

### Auth Screen Routing

Auth screens live **outside** the tab layout as a stack:

```
app/
  _layout.tsx          ← Root layout (AuthProvider wraps here)
  (tabs)/
    _layout.tsx        ← Tab layout (Camera, History, Settings)
    index.tsx          ← Camera
    history.tsx        ← History
    settings.tsx       ← Settings
  auth/
    _layout.tsx        ← Auth stack layout (no tabs)
    sign-in.tsx        ← Sign-in screen
    register.tsx       ← Registration screen
  valuation/
    [id].tsx           ← Detail view (existing)
```

Navigation:
- Guest tapping "Sign In" → `router.push('/auth/sign-in')`
- After auth success → `router.replace('/(tabs)')`
- After sign out → already on tabs, just update context

### Auth State Flow

```
┌─────────────┐     ┌────────────────┐     ┌────────────────┐
│   APP LOAD  │────►│  getSession()  │────►│   Has Session? │
└─────────────┘     └────────────────┘     └───────┬────────┘
                                               yes │   │ no
                                                   ▼   ▼
                                            ┌──────────────┐
                                            │  AuthContext  │
                                            │  user | null  │
                                            └──────┬───────┘
                                                   │
                              ┌────────────────────┼────────────────────┐
                              ▼                    ▼                    ▼
                        ┌──────────┐        ┌──────────┐        ┌──────────┐
                        │  Camera  │        │ History  │        │ Settings │
                        │ (same)   │        │ remote   │        │ account  │
                        │          │        │  vs local│        │  vs CTA  │
                        └──────────┘        └──────────┘        └──────────┘
```

### Supabase User → App User Bridge

The Supabase `User` type has fields like `id`, `email`, `created_at`, `user_metadata`, `app_metadata`. The app's `User` type (from `types/user.ts`) has `id`, `email`, `createdAt`, `tier`, `preferences`.

**Bridge function** (created in Story 4.6):
```typescript
import type { User as SupabaseUser } from '@/lib/supabase';
import type { User as AppUser } from '@/types/user';

export function mapSupabaseUser(su: SupabaseUser): AppUser {
  return {
    id: su.id,
    email: su.email ?? '',
    createdAt: su.created_at,
    tier: (su.user_metadata?.tier as AppUser['tier']) ?? 'FREE',
    preferences: su.user_metadata?.preferences,
  };
}
```

### Guest → Auth Transition Points

| Trigger | Screen | Action |
|---------|--------|--------|
| 3rd guest valuation | Camera (post-result) | Banner: "Create account to save unlimited" |
| 5th guest valuation | Camera (post-result) | Modal: "Local limit reached. Sign up to continue saving" |
| Tap "List on eBay" as guest | Valuation detail | Block: "Sign in to list items" |
| Tap "Sign In" in Settings | Settings | Navigate to `/auth/sign-in` |
| Tap "Sign Up" in upgrade banner | Any | Navigate to `/auth/register` |

### Backend Endpoints (New in Epic 4)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `DELETE` | `/api/account` | Required | Delete user + all data |
| `POST` | `/api/migrate-guest` | Required | Claim guest valuations |

Both use JWT from `Authorization: Bearer <token>` header. Backend extracts `user_id` from the JWT — never trusts client-sent IDs.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Google OAuth redirect fails in Expo Go | Medium | Medium | Use `Linking.createURL('/')` for dynamic URI; test with tunnel mode |
| Session refresh race conditions | Low | High | `onAuthStateChange` is Supabase's built-in handler; don't roll our own |
| Guest migration duplicates data | Low | Medium | `WHERE user_id IS NULL` guard; idempotent update |
| Email confirmation blocks dev flow | Medium | Low | Disable "Confirm email" in dev; enable for production |
| Account deletion partial failure | Low | High | Wrap in transaction; delete valuations first, then auth user |
| NFR-S10 (3 concurrent sessions) | N/A | Low | Supabase doesn't support natively; deferred to security hardening |

---

## Environment & Prerequisites

### Supabase Dashboard (must be done by developer — Story 4.1 AC3–AC6)

| Task | Status |
|------|--------|
| JWT expiry → 604800s | ⏳ Manual |
| Email provider → enabled | ⏳ Manual |
| Google OAuth → Client ID + Secret | ⏳ Manual |
| Redirect URLs → `mobile://`, `http://localhost:8083`, Expo Go URI | ⏳ Manual |

### Frontend (ready)

```bash
cd apps/mobile
npm run start:tunnel  # or npm run web
# .env already configured with correct anon key
```

### Backend (ready)

```bash
cd backend
source ../.venv/bin/activate
uvicorn backend.main:app --reload --port 8000
```

---

## Velocity Estimate

Based on Epic 1 velocity (~3h/story) and Epic 3 (~3.5h/story average):

| Phase | Stories | Estimated Hours | Days (~4h/day) |
|-------|---------|----------------|----------------|
| A: Auth Foundation | 4.6, 4.2, 4.3 | 9–13h | 2–3 |
| B: OAuth + Sign Out | 4.4, 4.5 | 4–6h | 1–2 |
| C: Guest + Migration | 4.7, 4.11 | 7–9h | 2–3 |
| D: Settings + Deletion | 4.8, 4.9, 4.10 | 8–11h | 2–3 |
| E: Harness Hardening | 4.12 | 3–5h | 1 |
| F: Auth Flow Hardening | 4.13 | 2–4h | 1 |
| G: Mock Override Retirement | 4.14 | 2–4h | 1 |
| **Total** | **13 stories** | **35–52h** | **10–14 days** |

Story 4.1 is already in review — 13 remaining.

---

## Post-Epic 4 Backlog

Issues surfaced during the Epic 4 retrospective. Ordered by severity.

---

### Backlog Item B-4-01: Add Rate Limiting to Authenticated API Endpoints
**Severity:** HIGH | **Source:** Retrospective W1

**Problem:** `POST /api/migrate-guest`, `GET /api/valuations`, and `DELETE /api/account` have no rate limiting. A valid token can spam these endpoints.

**Scope:**
- Add `slowapi` (or lightweight custom middleware) to `backend/main.py`
- Limits per authenticated user: `DELETE /api/account` → 5/hour, `POST /api/migrate-guest` → 10/hour, `GET /api/valuations` → 120/min
- Return HTTP 429 with `Retry-After` header on breach
- Add backend tests for rate-limit rejection

**Files affected:** `backend/main.py`, `backend/requirements.txt`

---

### Backlog Item B-4-02: Implement Password Reset Flow
**Severity:** MEDIUM | **Source:** Retrospective W2

**Problem:** Users who forget their password have no self-service recovery path. Supabase provides `resetPasswordForEmail()` natively — this is a small implementation gap.

**Scope:**
- Add "Forgot password?" link to `apps/mobile/app/auth/sign-in.tsx`
- New screen `apps/mobile/app/auth/forgot-password.tsx` — email input + submit
- Call `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
- Success state: "Check your inbox for a reset link"
- Handle errors: unknown email (must not reveal existence — return generic message), rate limit
- Add deep link handler for the reset URL back into the app (`UPDATE_PASSWORD` Supabase event)

**Files affected:** `apps/mobile/app/auth/sign-in.tsx`, new `app/auth/forgot-password.tsx`, `app/_layout.tsx` (deep link)

---

### Backlog Item B-4-03: Add RLS UPDATE Policy for Guest Migration
**Severity:** MEDIUM | **Source:** Retrospective D2

**Problem:** `backend/migrations/002_create_valuations_table.sql` defines RLS SELECT, INSERT, and DELETE policies for the `authenticated` role but no UPDATE policy. The migration endpoint works today because the backend uses `service_role` (which bypasses RLS), but the gap removes the database-level defense-in-depth for future changes.

**Scope:**
- Add UPDATE policy to `002_create_valuations_table.sql`:
  ```sql
  DROP POLICY IF EXISTS "Users can claim guest records" ON public.valuations;
  CREATE POLICY "Users can claim guest records"
      ON public.valuations
      FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);
  ```
- Alternatively, a migration file `003_add_update_rls_policy.sql`
- Verify policy in Supabase Dashboard after applying

**Files affected:** `backend/migrations/002_create_valuations_table.sql` (or new `003_*.sql`)

---

### Backlog Item B-4-04: Write E2E Test for Guest-to-Account Migration Flow
**Severity:** MEDIUM | **Source:** Retrospective Q1

**Problem:** Every piece of the guest→migrate flow is unit-tested in isolation, but the full happy path (guest makes valuations → registers → sees banner → clicks Import → sees items in server history) has no integration or E2E test. The Playwright config exists but auth E2E tests are absent.

**Scope:**
- Add Playwright E2E test in `apps/mobile/tests/` (or `apps/mobile/playwright-tests/`)
- Test flow:
  1. App opens in guest mode
  2. Stub or create 1–2 guest valuations in AsyncStorage
  3. Register with test email/password (or use Supabase test user credentials from env)
  4. Navigate to History tab
  5. Assert migration banner is shown with correct count
  6. Click "Import to account"
  7. Assert banner disappears and server items are displayed
- Use Supabase test credentials from `.env.test`; tear down user after test

**Files affected:** `apps/mobile/tests/` (new E2E test file), `apps/mobile/playwright.config.ts`

---

## Epic 4 Exit Criteria

- [ ] Users can register with email/password
- [ ] Users can sign in with email or Google
- [ ] Sessions persist across app restarts (7-day expiry)
- [ ] Guest users have 5-item local history cap with upgrade prompts
- [ ] Guest valuations migrate to account on sign-up/sign-in
- [ ] Settings screen shows account info, sign out, delete account
- [ ] Account deletion is GDPR-compliant (data + auth record removed)
- [ ] All 11 stories reach `done` in `sprint-status.yaml`
- [ ] Zero regressions in Epic 1–3 functionality

---

## Recommended First Steps

### Day 1: AuthContext + Registration
1. Create `app/contexts/AuthContext.tsx` with `useAuth()` hook
2. Wire `AuthProvider` into root `_layout.tsx`
3. Build `app/auth/register.tsx` — test full signup flow
4. Verify session persists after closing/reopening app

### Day 2: Sign-In + OAuth
1. Build `app/auth/sign-in.tsx` — mirror registration form
2. Add Google OAuth button with `expo-web-browser` flow
3. Test both flows on Expo Go + web

### Day 3: Guest Mode + Sign Out
1. Wire guest mode gating into AuthContext (no session = guest)
2. Add upgrade banners at 3rd and 5th valuation
3. Implement sign-out (clear session, revert to guest)

### Day 4+: Settings, Deletion, Migration
1. Build Settings screen with auth-aware views
2. Account deletion modal + backend endpoint
3. Guest data migration endpoint + frontend prompt
