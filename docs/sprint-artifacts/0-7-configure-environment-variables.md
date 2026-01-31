# Story 0.7: Configure Environment Variables

**Status:** complete

**Depends on:** Story 0.1 (Expo project initialized)

---

## Story

**As a** developer,  
**I want** environment configuration properly set up,  
**So that** secrets are managed securely and environments are isolated.

---

## Acceptance Criteria

1. **AC1:** `.env.example` documents all required variables with placeholder values
2. **AC2:** `.env` is gitignored (verify in `.gitignore`)
3. **AC3:** `EXPO_PUBLIC_USE_MOCK` variable toggles mock mode (default: true for development)
4. **AC4:** `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are configured
5. **AC5:** Backend API URL is configured via `EXPO_PUBLIC_API_URL`
6. **AC6:** `lib/env.ts` provides typed environment access with validation
7. **AC7:** Missing required variables throw clear error on app start (when `useMock=false`)
8. **AC8:** Production builds reject `useMock=true` with clear error

---

## Context

### Current State

The project has a partial `.env` file with Supabase and API URL placeholders:

```
# apps/mobile/.env (current)
EXPO_PUBLIC_SUPABASE_URL=your-supabase-project-url-here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
EXPO_PUBLIC_API_URL=https://your-backend.railway.app
```

**What's missing:**
- No `.env.example` for documentation
- No `USE_MOCK` toggle for frontend
- No typed environment access in TypeScript
- No validation for required variables

### Backend Configuration Reference

The backend already has proper configuration via `backend/config.py`:

```python
class Settings(BaseSettings):
    use_mock: bool = False              # Toggle mock services
    # ... other settings
    class Config:
        env_file = ".env"
```

The frontend needs to mirror this pattern with Expo's public env vars.

### Architecture Requirements

From ARCH-6:
> `USE_MOCK=true` environment variable for testing mode

From ARCH-7:
> Quality gate: Mock mode must work immediately after extraction

### Expo Environment Variable Pattern

Expo requires `EXPO_PUBLIC_` prefix for client-exposed variables:
- Access via `process.env.EXPO_PUBLIC_*`
- Must be prefixed to be bundled into the client
- Non-prefixed vars are server-only (not applicable for Expo)

---

## Technical Design

### File Structure

```
apps/mobile/
├── .env                 # Local secrets (gitignored)
├── .env.example         # Documented template (committed)
└── lib/
    └── env.ts           # Typed environment access
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EXPO_PUBLIC_USE_MOCK` | No | `true` | Enable mock services for development |
| `EXPO_PUBLIC_SUPABASE_URL` | Yes* | - | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes* | - | Supabase anonymous key |
| `EXPO_PUBLIC_API_URL` | Yes* | - | Backend API base URL |

*Required when `EXPO_PUBLIC_USE_MOCK=false`

### lib/env.ts Design

```typescript
/**
 * Typed environment configuration with validation.
 * Throws on startup if required vars are missing.
 */
export interface Env {
  useMock: boolean;              // Defaults to true
  supabaseUrl: string | undefined;  // Required when !useMock
  supabaseAnonKey: string | undefined;
  apiUrl: string | undefined;
}

export const env: Env;
export function validateEnv(): void;
```

**Validation Rules:**
1. `useMock` defaults to `true` if not set (safe for dev)
2. When `useMock=false`, Supabase and API URL become required
3. Production builds (`!__DEV__`) with `useMock=true` throw error
4. Validation runs at app startup via layout import
5. Errors are clear and actionable

---

## Tasks / Subtasks

- [x] **Task 1: Create .env.example template** (AC: 1)
  - [x] 1.1: Create `apps/mobile/.env.example` with all documented variables
  - [x] 1.2: Add comments explaining each variable
  - [x] 1.3: Include placeholder values that show expected format
  - [x] 1.4: Add section headers for organization

- [x] **Task 2: Verify .gitignore configuration** (AC: 2)
  - [x] 2.1: Verify `.env` is in `.gitignore`
  - [x] 2.2: Verify `.env.local` is in `.gitignore` (if using)
  - [x] 2.3: Ensure `.env.example` is NOT ignored (should be committed)

- [x] **Task 3: Add USE_MOCK variable** (AC: 3)
  - [x] 3.1: Add `EXPO_PUBLIC_USE_MOCK=true` to `.env`
  - [x] 3.2: Add to `.env.example` with documentation
  - [x] 3.3: Document that `true` = mock mode (no API calls)

- [x] **Task 4: Create lib/env.ts typed access** (AC: 6)
  - [x] 4.1: Create `apps/mobile/lib/` directory
  - [x] 4.2: Create `lib/env.ts` with typed exports
  - [x] 4.3: Parse boolean from string for `useMock`
  - [x] 4.4: Export `env` object with all typed values
  - [x] 4.5: Add JSDoc documentation

- [x] **Task 5: Implement validation function** (AC: 7)
  - [x] 5.1: Create `validateEnv()` function
  - [x] 5.2: Check required vars when `useMock=false`
  - [x] 5.3: Throw descriptive error with missing variable names
  - [x] 5.4: Log warning if using mock mode in production build

- [x] **Task 6: Integrate validation at app startup** (AC: 7)
  - [x] 6.1: Import and call `validateEnv()` in `app/_layout.tsx`
  - [x] 6.2: Ensure validation runs before any API calls
  - [x] 6.3: Test missing variable error message

- [x] **Task 7: Verify tsconfig paths** (AC: 6)
  - [x] 7.1: Verify existing `@/*` path alias covers `@/lib/env` (no changes needed)
  - [x] 7.2: Test import works: `import { env } from '@/lib/env'`

- [x] **Task 8: Validate TypeScript compilation** (AC: 6, 7)
  - [x] 8.1: Run `npx tsc --noEmit`
  - [x] 8.2: Fix any type errors
  - [x] 8.3: Verify `env` exports are correctly typed

---

## Testing Notes

### Manual Verification

1. **Mock mode default:**
   - Remove `EXPO_PUBLIC_USE_MOCK` from `.env`
   - App should start with `useMock=true` (default)
   - No Supabase/API errors

2. **Missing required vars:**
   - Set `EXPO_PUBLIC_USE_MOCK=false`
   - Remove `EXPO_PUBLIC_SUPABASE_URL`
   - App should throw clear error on startup

3. **Production validation:**
   - Set all required vars
   - Set `EXPO_PUBLIC_USE_MOCK=false`
   - App should start without errors

### Type Safety Check

```typescript
import { env } from '@/lib/env';

// Should compile:
if (env.useMock) {
  console.log('Using mock services');
}

// Should compile (undefined when not set):
const apiUrl: string | undefined = env.apiUrl;

// TypeScript should catch this:
if (!env.useMock && env.apiUrl) {
  fetch(env.apiUrl + '/api/valuation'); // Safe: apiUrl narrowed to string
}
```

---

## Dependencies

### Upstream

- Story 0.1: Expo project structure exists

### Downstream

- Story 0.8: Error boundary may use env for debug mode
- Story 2.1: API endpoint will use `env.apiUrl`
- Story 4.1: Supabase config will use `env.supabaseUrl`

---

## Definition of Done

- [x] `.env.example` exists with all documented variables
- [x] `.env` is gitignored
- [x] `lib/env.ts` exports typed `env` object
- [x] `validateEnv()` throws on missing required vars (when not in mock mode)
- [x] Validation is called at app startup
- [x] TypeScript compilation passes
- [x] App starts successfully in mock mode (default)

---

## Implementation Notes

### Boolean Parsing

Expo env vars are always strings. Parse carefully with case-insensitive handling:

```typescript
/**
 * Parse boolean from environment variable string.
 * Handles: 'true', 'false', '1', '0', 'yes', 'no' (case-insensitive)
 */
function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') return defaultValue;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}

// Usage:
const useMock = parseBool(process.env.EXPO_PUBLIC_USE_MOCK, true);
// undefined → true (safe default)
// 'true', 'TRUE', '1', 'yes' → true
// 'false', 'FALSE', '0', 'no' → false
```

> ⚠️ **IMPORTANT:** After changing `.env`, restart Metro bundler: `npx expo start --clear`

### Error Messages

Make errors actionable:

```typescript
// Good
throw new Error(
  `Missing required environment variable: EXPO_PUBLIC_SUPABASE_URL\n` +
  `Set EXPO_PUBLIC_USE_MOCK=true to use mock services instead.`
);

// Bad
throw new Error('Config error');
```

### Development vs Production

**Critical safety checks:**

```typescript
// Prevent shipping mock mode to production
if (env.useMock && !__DEV__) {
  throw new Error(
    'Production builds must not use mock mode.\n' +
    'Set EXPO_PUBLIC_USE_MOCK=false and configure real API credentials.'
  );
}

// Warn when using real APIs in dev (costs money, slower)
if (!env.useMock && __DEV__) {
  console.warn('⚠️ Running with real APIs in development mode');
}
```

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- TypeScript compilation: `npx tsc --noEmit` passed with 0 errors

### Completion Notes List

1. Created `.env.example` with 4 sections: header, mock mode, Supabase, API
2. Verified `.gitignore` already has `.env` and `.env*.local` ignored
3. Added `EXPO_PUBLIC_USE_MOCK=true` to existing `.env` file
4. Created `lib/env.ts` with:
   - `Env` interface with typed properties
   - `parseBool()` helper for case-insensitive boolean parsing
   - `env` object with typed values
   - `validateEnv()` with production safety check and required var validation
5. Integrated `validateEnv()` call at top of `app/_layout.tsx` (runs before any components)
6. Verified existing `@/*` path alias works for `@/lib/env` import

### File List

- apps/mobile/.env.example (created)
- apps/mobile/.env (updated with USE_MOCK section)
- apps/mobile/lib/env.ts (created)
- apps/mobile/app/_layout.tsx (updated with validateEnv import and call)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Story created with typed env access and validation | create-story workflow |
| 2025-12-23 | Fixed AC8, boolean parsing, type definitions, added production safety | party-mode critique |
| 2025-12-23 | Implementation complete - all 8 tasks done | Claude Opus 4.5 |
