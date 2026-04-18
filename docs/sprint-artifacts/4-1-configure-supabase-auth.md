# Story 4.1: Configure Supabase Auth

**Status:** done

---

## Story

**As a** developer,
**I want** Supabase Auth configured for the app,
**So that** users can create accounts and sign in securely.

---

## Business Context

### Why This Story Matters

Epics 1–3 delivered the full AI valuation pipeline and history persistence, but every user is anonymous. The `valuations` table already has `user_id UUID NULL` (a foreign key to `auth.users(id)`), planted deliberately in Story 3.1 as the bridge point. Epic 4 activates that bridge — starting with this infrastructure story, which wires up the Supabase Auth client on the frontend and configures the dashboard before any screens are built.

**Current State:**
- ✅ Backend has a working Supabase client (`get_supabase()` in `backend/cache.py`) using the **service role key** — backend-only, never exposed to the client
- ✅ `backend/config.py` has `supabase_url` and `supabase_service_key`
- ✅ `apps/mobile/lib/env.ts` already reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` with full type safety and start-up validation via `validateEnv()`
- ✅ `apps/mobile/.env.example` already has placeholder entries for `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `apps/mobile/.env` already exists locally in the workspace
- ✅ `@react-native-async-storage/async-storage` v2.2.0 is already installed (required for session persistence in React Native, since there are no browser cookies)
- ✅ `expo-web-browser` ~15.0.10 and `expo-linking` ~8.0.11 are already installed (required for the Google OAuth browser redirect flow)
- ✅ `apps/mobile/app.json` already defines the Expo scheme as `mobile`
- ✅ `valuations` table has `user_id UUID NULL FK auth.users(id) ON DELETE SET NULL` — ready to accept authenticated users without a migration
- ❌ `@supabase/supabase-js` is **not** installed in `apps/mobile/`
- ❌ `apps/mobile/lib/supabase.ts` does **not** exist — no Supabase client on the frontend
- ❌ The current local value in `apps/mobile/.env` for `EXPO_PUBLIC_SUPABASE_ANON_KEY` appears to be a **service-role token**, not an anon token — this is a security issue that must be corrected before implementation
- ❓ Supabase Dashboard provider, JWT, and redirect configuration cannot be verified from the repository and must be validated manually during implementation

**What This Story Delivers:**
- `@supabase/supabase-js` installed in the mobile workspace
- `apps/mobile/lib/supabase.ts` — a singleton frontend Supabase client using the **anon key** (not the service key), with AsyncStorage session persistence, and exported `User` and `Session` types
- Local frontend env audited so the mobile app uses a true anon key, not a privileged backend credential
- Supabase Dashboard fully configured: Email/Password auth, Google OAuth, JWT expiry set to 7 days, redirect URLs for Expo registered
- `.env.example` verified complete; `.env` documented with real values guide

### Value Delivery

- **Foundation unlock:** Stories 4.2 through 4.11 all import `supabase` from `lib/supabase.ts`. Without this file, zero auth stories can proceed.
- **Zero migration risk:** The `valuations` table is already auth-ready; no schema changes are needed in this story.
- **Dependency clarity:** This story makes explicit that the frontend anon key and backend service key are completely separate credentials with different privilege scopes.

### Epic Context

This is Story 1 of 11 in Epic 4 (User Authentication). It is a developer infrastructure story — no UI screens, no user-facing changes.

**Story Dependency Graph:**
```
4.1 Configure Supabase Auth (this story)
   ├─► 4.2 User Registration
   │      └─► 4.3 User Sign In
   ├─► 4.4 Google OAuth Sign In
   ├─► 4.5 Sign Out
   ├─► 4.6 Session Persistence
   ├─► 4.7 Guest Mode (upgrades guest → auth)
   │      └─► 4.11 Migrate Guest Data
   ├─► 4.8 Settings Screen
   │      ├─► 4.9 Account Deletion Confirmation
   │      └─► 4.10 Execute Account Deletion
   └─► (All Epic 4 stories depend on this one)
```

---

## Acceptance Criteria

### AC1: `@supabase/supabase-js` Installed

**Given** the `apps/mobile/` workspace  
**When** `@supabase/supabase-js` is installed  
**Then** it appears in `apps/mobile/package.json` under `dependencies`  
**And** the installed version is v2.x compatible with Expo SDK 54 via `npx expo install`  
**And** TypeScript types are included (they are bundled with v2, no separate `@types` package needed)

---

### AC2: `apps/mobile/lib/supabase.ts` Created

**Given** `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set in `.env`  
**When** `apps/mobile/lib/supabase.ts` is imported  
**Then** it exports a singleton `supabase` client created with `createClient()` from `@supabase/supabase-js`  
**And** the client is initialized with:
- `url`: `env.supabaseUrl` from `@/lib/env` (i.e., `process.env.EXPO_PUBLIC_SUPABASE_URL`)
- `key`: `env.supabaseAnonKey` from `@/lib/env` (i.e., `process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY`)
- `auth.storage`: `AsyncStorage` from `@react-native-async-storage/async-storage` (session persistence without browser cookies)
- `auth.autoRefreshToken`: `true` (automatically refreshes JWT before expiry)
- `auth.persistSession`: `true` (session survives app restarts)
- `auth.detectSessionInUrl`: `false` (must be false in React Native — no browser URL bar)

**And** the file re-exports `User` and `Session` types from `@supabase/supabase-js` for use in subsequent auth stories  
**And** the file uses the `env` object from `@/lib/env` (never accesses `process.env` directly — consistent with the rest of `lib/`)  
**And** TypeScript compiles cleanly with no type errors (`tsc --noEmit`)

---

### AC3: Email/Password Auth Enabled in Supabase Dashboard

**Given** the Supabase project Dashboard is open  
**When** Authentication → Providers → Email is configured  
**Then** the **Email** provider is enabled  
**And** the team explicitly chooses whether **Confirm email** is enabled or disabled for development and documents that choice in implementation notes  
**And** **Secure email change** is enabled (users must confirm email changes via both old and new addresses — security hardening)

---

### AC4: Google OAuth Provider Configured in Supabase Dashboard

**Given** the Supabase project Dashboard is open  
**When** Authentication → Providers → Google is configured  
**Then** the **Google** provider is enabled  
**And** the **Client ID** and **Client Secret** from Google Cloud Console are entered  
**And** the Supabase **OAuth Callback URL** (`https://[project-ref].supabase.co/auth/v1/callback`) is registered as an Authorized Redirect URI in the Google Cloud Console OAuth2 credentials

**The Google Cloud Console setup checklist (must be done by developer):**
- [ ] Create or select a project at https://console.cloud.google.com
- [ ] Enable Google Identity / OAuth consent configuration for the project
- [ ] Go to APIs & Services → Credentials → Create OAuth 2.0 Client ID
- [ ] Application type: **Web application**
- [ ] Authorized redirect URIs: add `https://[project-ref].supabase.co/auth/v1/callback`
- [ ] Copy Client ID (format: `*.apps.googleusercontent.com`) and Client Secret
- [ ] Paste both into Supabase Dashboard → Auth → Providers → Google

---

### AC5: JWT Expiry and Session Timeout Configured (NFR-S3, NFR-S9)

**Given** the Supabase project Dashboard is open  
**When** Authentication → Configuration → JWT Expiry is set  
**Then** JWT expiry is configured to **604800 seconds** (7 days, per NFR-S9)  
**And** Supabase's built-in refresh token rotation handles seamless session renewal within the 7-day window  

> **Note on NFR-S10 (max 3 concurrent sessions):** Supabase does not natively enforce per-user session count limits. This constraint is deferred to a future security hardening story and must not block this story's completion.

---

### AC6: Redirect URLs Configured in Supabase Dashboard

**Given** Authentication → URL Configuration in the Supabase Dashboard  
**When** Redirect URLs are configured  
**Then** the following URLs are added to the **Redirect URLs** allowlist:

| URL | Purpose |
|-----|---------|
| `mobile://` | Native app deep link using the scheme already defined in `app.json` |
| `http://localhost:8083` | Expo web development |
| `exp://<your-local-dev-host>:8083` | Expo Go development redirect generated by `Linking.createURL('/')` |

**And** the team uses `Linking.createURL('/')` during implementation to verify the exact Expo Go redirect URI rather than hardcoding `localhost`  
**And** the **Site URL** is set to the web app URL used for the current environment (local web dev: `http://localhost:8083`; production: deployed web URL)  
**And** for production deployment, any final native callback path is documented alongside the chosen deep-link strategy in Story 4.4

---

### AC7: Environment Variables Documented

**Given** `apps/mobile/.env.example` already contains `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`  
**When** the story is implemented  
**Then** both variables in `.env.example` have updated comments explaining where to find each value in the Supabase Dashboard  
**And** a developer who has never touched this project can read `.env.example` and know exactly where to get each value  
**And** the anon key vs service key distinction is explicitly documented in a comment (anon key = safe for client, service key = backend only, never expose)  
**And** the existing local `.env` value is manually verified to be an actual anon key before any auth testing begins

---

## Technical Notes

### Implementation Approach

#### Step 1: Install `@supabase/supabase-js`

```bash
cd apps/mobile
npx expo install @supabase/supabase-js
```

> Use `npx expo install` (not `npm install`) — this selects the version tested against your installed Expo SDK (54.x). Do **not** `npm install` Supabase manually.

Verify the installed version is v2.x:
```bash
cat apps/mobile/package.json | grep supabase
```

#### Step 2: Configure Supabase Dashboard

Before writing any code, complete the dashboard configuration:

1. **JWT Expiry:** Authentication → Configuration → JWT Expiry → set to `604800`
2. **Email Provider:** Authentication → Providers → Email → Enable, then record whether "Confirm email" is enabled or disabled for the current environment
3. **Google Provider:** Authentication → Providers → Google → Enable, paste Client ID + Secret
4. **Redirect URLs:** Authentication → URL Configuration → add the three URLs from AC6

#### Step 3: Add Real Credentials to `.env`

Audit the existing `apps/mobile/.env` file first. If `EXPO_PUBLIC_SUPABASE_ANON_KEY` contains anything other than the Supabase anon/public key, replace it before running the app. Then ensure it contains:
```
EXPO_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]   # Dashboard → Settings → API → anon (public) key
```

> **Critical distinction:** The anon key and the service key look similar but have completely different scopes:
> - **Anon key** (`EXPO_PUBLIC_SUPABASE_ANON_KEY`) — safe for the client; respects RLS policies; this story uses it.
> - **Service key** (`SUPABASE_SERVICE_KEY` in `backend/.env`) — bypasses RLS; server-side only; **never expose in frontend code or commit to git**.

> **Security gate:** If the current frontend env ever contained a service-role key, revoke or rotate that credential in the Supabase Dashboard before continuing. Treat this as a pre-implementation blocker, not an optional cleanup.

#### Step 4: Create `apps/mobile/lib/supabase.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';

// Supabase client singleton for the mobile app.
// Uses the ANON (public) key — never the service role key.
// AsyncStorage provides session persistence on React Native (no browser cookies).
export const supabase = createClient(
  env.supabaseUrl!,
  env.supabaseAnonKey!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Required for React Native — no browser URL bar
    },
  },
);

// Re-export auth types for use in Stories 4.2–4.11
export type { User, Session } from '@supabase/supabase-js';
```

> **Why `env.supabaseUrl!` (non-null assertion)?** The `validateEnv()` call in `app/_layout.tsx` throws at startup if these vars are missing when `useMock=false`. In mock mode, these values aren't used. The non-null assertion is safe because runtime validation happens before any auth code runs.

#### Step 5: Verify TypeScript Compilation

```bash
cd apps/mobile
npx tsc --noEmit
```

Zero errors expected. If TypeScript complains about the AsyncStorage type not matching Supabase's `SupportedStorage`, see the Troubleshooting section below.

#### Step 6: Smoke Test the Client Loads

Add a temporary log to the app root layout (remove it before committing) to confirm initialization:
```typescript
import { supabase } from '@/lib/supabase';
console.log('Supabase client ready:', supabase.auth !== undefined);
```

Expected console output: `Supabase client ready: true`

---

### Troubleshooting: AsyncStorage Type Mismatch

Supabase v2's `SupportedStorage` interface requires `removeItem` in addition to `getItem`/`setItem`. `@react-native-async-storage/async-storage` v2.2.0 satisfies this contract, but TypeScript may complain in some editor configurations.

**Fix:** Cast explicitly if needed:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js';

const authOptions: SupabaseClientOptions<'public'>['auth'] = {
  storage: AsyncStorage as any,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
};
```

This is an acceptable cast — `AsyncStorage` satisfies the contract at runtime; the type mismatch is a TypeScript structural nuance between v2.2.0 types and Supabase's generic storage interface.

---

### Troubleshooting: Google OAuth Redirect in Expo Go

During development with Expo Go, the deep link scheme is `exp://` rather than a custom scheme. The OAuth flow using `expo-web-browser` (already installed) will work as follows (used in Story 4.4, not this story):

```typescript
// Story 4.4 will implement this — noted here for context
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

const redirectTo = Linking.createURL('/');
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo },
});
if (data.url) {
  await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
}
```

This confirms that `expo-web-browser` and `expo-linking` (both already installed) are sufficient — no `expo-auth-session` package needed.

---

### Files to Create/Modify

| File | Action | Notes |
|------|--------|-------|
| `apps/mobile/package.json` | Modify (via `npx expo install`) | Adds `@supabase/supabase-js` to `dependencies` |
| `apps/mobile/lib/supabase.ts` | **Create** | Supabase client singleton + type exports |
| `apps/mobile/.env.example` | Modify (comments only) | Update comments on Supabase vars to be more descriptive |
| `apps/mobile/.env` | Modify locally (not committed) | Audit existing value, replace with true anon key, rotate leaked privileged key if necessary |

**Files explicitly NOT changed in this story:**
- `apps/mobile/lib/env.ts` — already reads the correct env vars; no changes needed
- `backend/cache.py` — backend client is unrelated to frontend auth client
- `backend/config.py` — backend config is unrelated
- Any screen files — no UI work in this story

---

### Environment Variables Required

| Variable | Location | Value Source | Scope |
|----------|----------|-------------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | `apps/mobile/.env` | Dashboard → Settings → API → Project URL | Frontend (client-safe) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `apps/mobile/.env` | Dashboard → Settings → API → anon (public) key | Frontend (client-safe) |
| `SUPABASE_SERVICE_KEY` | `backend/.env` | Dashboard → Settings → API → service_role key | **Backend only** — never expose to client |

> The backend service key is already configured from Epic 2/3. No frontend code should read it. If the frontend env was populated with a service-role key by mistake, rotate that backend credential before continuing.

---

### Security Considerations

**Anon key exposure:** The anon key (`EXPO_PUBLIC_*` prefix) is intentionally public-safe — it is embedded in the compiled app bundle. It does not grant elevated access; all database access through this key is governed by RLS policies configured in Stories 3.1 and 4.1. This is standard Supabase usage. Never mistake it for the service key.

**Service key protection:** The service key bypasses RLS entirely. It exists only in `backend/.env`, is never imported in any file under `apps/mobile/`, and must never be added to the frontend. Story 4.1 explicitly does not use or reference the service key on the client side.

**Existing local env risk:** The current workspace indicates the frontend `.env` may already contain a service-role token under the anon-key variable. That is a credential exposure event. The safe response is: replace it with the true anon key, revoke or rotate the exposed service-role key in Supabase, and only then proceed with auth testing.

**Session persistence via AsyncStorage:** `AsyncStorage` on React Native stores session tokens in the app's sandboxed storage (Android: encrypted database; iOS: app container). This storage is not accessible by other apps and is wiped on app uninstall. It is appropriate for JWT token storage on mobile. It is not suitable for highly sensitive secrets (use `expo-secure-store` for that), but is acceptable for Supabase session tokens which have short TTLs and refresh automatically.

**JWT expiry (NFR-S9):** Setting expiry to 7 days means refresh tokens are valid for 7 days of inactivity. After 7 days without use, the user must re-authenticate. Refresh token rotation is enabled by default in Supabase — each refresh issues a new refresh token, invalidating the old one (prevents replay attacks).

**Google OAuth flow:** The OAuth flow opens a browser session (`expo-web-browser`) and never passes Google credentials through app code. Tokens are obtained from Supabase's callback URL and flow through the standard PKCE flow. Client secrets are never embedded in the mobile app — they exist only in the Supabase dashboard.

---

## Tasks / Subtasks

### Task 1: Install `@supabase/supabase-js` (AC: #1)
**Estimated:** 10 min

- [x] 1.1: Run `npx expo install @supabase/supabase-js` from `apps/mobile/`
- [x] 1.2: Verify version in `package.json` is a Supabase JS v2 release selected by `expo install`
- [x] 1.3: Confirm no peer dependency conflicts (Expo 54 SDK is confirmed compatible with Supabase JS v2)

**Files Modified:**
```
apps/mobile/package.json
```

---

### Task 2: Configure Supabase Dashboard (AC: #3, #4, #5, #6)
**Estimated:** 30 min

> **Do this before writing any code** — the `lib/supabase.ts` auth config depends on provider settings being correct.

- [x] 2.1: Set JWT Expiry to `604800` — Authentication → Configuration → JWT expiry
- [x] 2.2: Enable Email provider — Authentication → Providers → Email → Enable, and record whether "Confirm email" is enabled for the current environment
- [x] 2.3: Set up Google Cloud Console project and OAuth 2.0 credentials:
  - Go to https://console.cloud.google.com → APIs & Services → Credentials
  - Create OAuth 2.0 Client ID (type: Web application)
  - Authorized redirect URI: `https://[project-ref].supabase.co/auth/v1/callback`
  - Copy Client ID and Client Secret
- [x] 2.4: Enable Google provider in Supabase — Authentication → Providers → Google → paste Client ID + Secret
- [x] 2.5: Add redirect URLs — Authentication → URL Configuration:
  - Add `mobile://`
  - Add `http://localhost:8083`
  - Add the exact Expo Go URI produced by `Linking.createURL('/')` for the active dev environment
  - Set Site URL to `http://localhost:8083` for local web development
- [x] 2.6: Verify Google provider shows "Enabled" in the Supabase Dashboard providers list

**No files modified — all changes in Supabase Dashboard**

---

### Task 3: Configure Local Environment (AC: #7)
**Estimated:** 10 min

- [x] 3.1: Audit the existing `apps/mobile/.env` before using it; do not assume the current key values are safe or correct
- [x] 3.2: Fill in `EXPO_PUBLIC_SUPABASE_URL` with your project URL from Dashboard → Settings → API
- [x] 3.3: Fill in `EXPO_PUBLIC_SUPABASE_ANON_KEY` with the **anon (public)** key — not the service_role key
- [x] 3.4: If the previous frontend env contained a service-role key, rotate or revoke that credential in Supabase before proceeding
- [x] 3.5: Update comments in `.env.example` to clarify where each value comes from and the anon vs service key distinction (comments only, no value changes in `.env.example`)
- [x] 3.6: Confirm `.env` is listed in `apps/mobile/.gitignore` (it should already be) ✅ Confirmed

**Files Modified:**
```
apps/mobile/.env             (local only, not committed)
apps/mobile/.env.example     (comments only)
```

---

### Task 4: Create `apps/mobile/lib/supabase.ts` (AC: #2)
**Estimated:** 20 min

- [x] 4.1: Create `apps/mobile/lib/supabase.ts` with the exact content from the Implementation Approach section above
- [x] 4.2: Confirm imports: `AsyncStorage` from `@react-native-async-storage/async-storage`, `createClient` from `@supabase/supabase-js`, `env` from `@/lib/env`
- [x] 4.3: Set `detectSessionInUrl: false` — this is the most common mistake when porting web Supabase examples to React Native
- [x] 4.4: Export `supabase` as a named export (not default — consistent with `env` and `api` in this lib directory)
- [x] 4.5: Re-export `User` and `Session` types from `@supabase/supabase-js`
- [x] 4.6: ⚠️ Do NOT create a new client per component — the singleton pattern is critical; re-initializing the client loses the session

**Files Created:**
```
apps/mobile/lib/supabase.ts
```

---

### Task 5: Verify TypeScript and Runtime (AC: #2)
**Estimated:** 10 min

- [x] 5.1: Run `npx tsc --noEmit` from `apps/mobile/` — must produce zero errors ✅ One pre-existing error in `__tests__/useOnlineStatus.test.ts` (TS7016, missing `@types/react-test-renderer`) from Epic 3 commit `adf1913` — not introduced by this story; zero errors in new code
- [ ] 5.2: Start the Expo dev server (`npm run start`) and confirm no import errors in the metro bundler
- [ ] 5.3: Add a temporary smoke-test log (see Step 6 in Implementation Approach), confirm `Supabase client ready: true` in the console
- [ ] 5.4: Remove the smoke-test log before committing
- [ ] 5.5: Set `EXPO_PUBLIC_USE_MOCK=false` temporarily, restart app, confirm `validateEnv()` does not throw (proves env vars are correctly set)

---

## Definition of Done

- [ ] `@supabase/supabase-js` v2.x appears in `apps/mobile/package.json` dependencies
- [ ] `apps/mobile/lib/supabase.ts` created with singleton client, AsyncStorage session persistence, `detectSessionInUrl: false`
- [ ] `User` and `Session` types re-exported from `apps/mobile/lib/supabase.ts`
- [ ] TypeScript compiles cleanly: `npx tsc --noEmit` exits with 0 errors
- [ ] Supabase Dashboard: Email provider enabled
- [ ] Supabase Dashboard: Google OAuth provider enabled with Client ID + Secret from Google Cloud Console
- [ ] Supabase Dashboard: JWT expiry set to 604800 seconds
- [ ] Supabase Dashboard: Redirect URLs registered for `mobile://`, `http://localhost:8083`, and the active Expo Go dev URI from `Linking.createURL('/')`
- [ ] `apps/mobile/.env` contains a real Supabase URL and a true anon/public key
- [ ] Any previously exposed service-role key used in frontend env has been rotated or revoked
- [ ] `apps/mobile/.env.example` comments updated to document the anon vs service key distinction
- [ ] No changes to `backend/` code (this is frontend-only)
- [ ] No new UI screens or components created (this is developer infrastructure only)
- [ ] Story 4.2 can now be started (it will `import { supabase } from '@/lib/supabase'`)

---

## Out of Scope

- Registration, sign-in, or sign-out screens (Stories 4.2–4.5)
- `AuthContext` / React context for session state (Story 4.6)
- Guest mode gating and 5-valuation limit enforcement (Story 4.7)
- Settings screen account info display (Story 4.8)
- Account deletion flow (Stories 4.9–4.10)
- Guest-to-account data migration (Story 4.11)
- Max concurrent session enforcement (deferred security hardening — Supabase does not natively support this)
- Email confirmation UX flow beyond provider configuration (the environment-specific confirmation setting is decided and documented in this story, but the user-facing flow is handled in later stories)
- Production Site URL update (deployment concern — documented but not done here)

---

## Story Size Estimate

**Size: Small (S)**

This is a configuration and scaffolding story. The code to write is a single 20-line file (`lib/supabase.ts`). The bulk of the work is Supabase Dashboard configuration and Google Cloud Console setup — each a sequence of well-documented UI steps. TypeScript and Expo infrastructure are already in place; the environment variables are already declared in `env.ts` and `.env.example`. No architectural decisions remain open.

**Risk:** Medium. The code change is small, but there are two operational risks: Google Cloud Console OAuth setup and the apparent misuse of a service-role key in the frontend local env. Mitigation: rotate any exposed privileged key first, complete AC1–AC3 and AC5–AC7 with Email auth, and finish AC4 once Google credentials are available. Email auth is sufficient to unblock Stories 4.2–4.3.

---

## Dev Agent Record

### Files Changed

| File | Action | Notes |
|------|--------|-------|
| `apps/mobile/package.json` | Modified | Added `@supabase/supabase-js ^2.100.1` via `npx expo install` |
| `apps/mobile/lib/supabase.ts` | **Created** | Supabase client singleton with AsyncStorage, `detectSessionInUrl: false`, `User`/`Session` type re-exports |
| `apps/mobile/.env.example` | Modified | Updated Supabase section with detailed comments: where to find each value, anon key vs service_role key distinction, security warning |
| `docs/sprint-artifacts/4-1-configure-supabase-auth.md` | Modified | Status updates, validation findings applied, task tracking |
| `docs/sprint-artifacts/sprint-status.yaml` | Modified | `epic-4: in-progress`, story status transitions |

### Completion Notes

- **AC1 ✅** `@supabase/supabase-js ^2.100.1` installed via `npx expo install` — version is Expo SDK 54 compatible
- **AC2 ✅** `apps/mobile/lib/supabase.ts` created — singleton client, AsyncStorage session persistence, `detectSessionInUrl: false`, named export of `supabase`, re-exported `User` and `Session` types
- **AC3 ⏳** Email provider — requires Supabase Dashboard configuration by developer (manual task)
- **AC4 ⏳** Google OAuth — requires Google Cloud Console setup + Supabase Dashboard (manual task)
- **AC5 ⏳** JWT expiry 604800s — requires Supabase Dashboard configuration (manual task)
- **AC6 ⏳** Redirect URLs — requires Supabase Dashboard configuration (manual task)
- **AC7 ✅** `.env.example` updated with security guide; anon key vs service_role key distinction documented

### Debug Log

- **Pre-existing TypeScript error:** `__tests__/useOnlineStatus.test.ts:7` — TS7016, missing declaration for `react-test-renderer`. Confirmed pre-existing via `git log`: added in commit `adf1913` (Epic 3 Complete). Zero errors in any code produced by this story.
- **Security blocker detected:** `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `apps/mobile/.env` decoded as a JWT with `"role": "service_role"`. This is a privileged backend credential in the frontend env. Story validation (task 3.4) requires rotating the key before auth testing. Documented as a pre-implementation blocker. Cannot be resolved by agent — requires developer Supabase Dashboard access.
- **Supabase User ≠ app User:** `@supabase/supabase-js` `User` type is different from `types/user.ts` `User` interface. Noted in `lib/supabase.ts` comment. Bridge/reconciliation is deferred to Story 4.6 (AuthContext implementation).
- **NFR-S10 (max 3 concurrent sessions):** Supabase does not natively support per-user session count limits. Deferred to future security hardening story — explicitly excluded from Definition of Done.
- **App scheme:** Corrected from `valuesnapapp://` to `mobile://` during story validation. The `app.json` scheme is `"mobile"`, and `Linking.createURL('/')` should be used for dynamic Expo Go URIs rather than hardcoding localhost.
