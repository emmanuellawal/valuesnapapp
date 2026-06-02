# Story 6.8: Handle Rate Limit Exceeded

Status: ready-for-dev

## Story

As a user submitting items for appraisal,
I want a clear, human-readable message when I've hit the request rate limit,
so that I understand why appraisal isn't working and know how long to wait before trying again.

## Acceptance Criteria

1. When the backend returns HTTP 429, the app displays "You've reached your limit" as the primary message — not a generic error and not a technical status code.
2. The time until the limit resets is shown to the user (e.g., "Try again in 45 minutes"), derived from the `Retry-After` header in the 429 response.
3. Guest users additionally see a prompt to create an account for a higher limit (e.g., "Create a free account for more appraisals").
4. No technical error codes (HTTP status, error type strings) are visible in the UI.
5. The retry button is hidden when the error type is `RATE_LIMIT` — there is nothing useful to retry immediately.
6. The backend `/api/appraise` endpoint enforces a per-principal rate limit and returns HTTP 429 with a `Retry-After: <seconds>` header when exceeded.

## Tasks / Subtasks

- [ ] Task 1: Enforce rate limit on backend appraise endpoint (AC: #6)
  - [ ] 1.1 Add two rate limit constants in `backend/main.py` per PRD NFR-S8: `APPRAISE_RATE_LIMIT_GUEST = RateLimitRule.parse("10/hour")` and `APPRAISE_RATE_LIMIT_AUTH = RateLimitRule.parse("100/hour")`
  - [ ] 1.2 In `appraise_item()`, after `_resolve_appraise_principal()`, select the correct rule: `rule = APPRAISE_RATE_LIMIT_AUTH if principal_type == "user" else APPRAISE_RATE_LIMIT_GUEST`; then call `enforce_user_rate_limit(principal_id, "appraise", rule)` before the idempotency check
  - [ ] 1.3 Add `expose_headers=["Retry-After"]` to the `CORSMiddleware` configuration in `backend/main.py` — without this, cross-origin web clients receive `null` from `response.headers.get('Retry-After')` even when the header is present

- [ ] Task 2: Propagate `Retry-After` from 429 response in api client (AC: #2)
  - [ ] 2.1 Add `retryAfterSeconds?: number` as an optional third parameter to `AppraiseError` constructor in `apps/mobile/lib/api.ts`
  - [ ] 2.2 When `response.status === 429`, read the `Retry-After` response header and parse it as an integer; if absent or non-numeric, default to `60`; pass as: `new AppraiseError('RATE_LIMIT', 'Too many requests', retryAfterSeconds)`

- [ ] Task 3: Update `ErrorState` RATE_LIMIT copy to meet AC (AC: #1, #4)
  - [ ] 3.1 In `apps/mobile/components/molecules/error-state.tsx`, change `RATE_LIMIT.title` from `'Too many requests'` to `'You've reached your limit'`
  - [ ] 3.2 Update default `RATE_LIMIT.suggestions` to `['Please wait before trying again']` (used as fallback when no `Retry-After` is available)

- [ ] Task 4: Extend camera error state and wire dynamic suggestions (AC: #1, #2, #3, #5)
  - [ ] 4.1 Extend the `error` state type in `apps/mobile/app/(tabs)/camera.tsx` to `{ type: ErrorType; message?: string; retryAfterSeconds?: number } | null`
  - [ ] 4.2 In `handlePhotoCapture` error handling, when `err instanceof AppraiseError` and `err.errorType === 'RATE_LIMIT'`, store `err.retryAfterSeconds` on the error state
  - [ ] 4.3 When `error.type === 'RATE_LIMIT'`, pass `suggestions={[\`Try again in ${Math.ceil(error.retryAfterSeconds / 60)} minutes\`]}` to `ErrorState` (no guest text here — see 4.5)
  - [ ] 4.4 When `error.type === 'RATE_LIMIT'`, do not pass `onRetry` (hides retry button per AC #5). Pass `onDismiss={() => setError(null)}` instead — a new optional prop on `ErrorState` that renders a secondary `"OK, got it"` text button; without it the user is soft-bricked on the error screen with no way back to the camera
  - [ ] 4.5 For guest users (`isGuest === true`) with `RATE_LIMIT` error, pass `fallbackLink={{ text: 'Create a free account', href: '/auth/register' }}` to `ErrorState` — renders as a tappable link to sign-up (per AC #3); omit for authenticated users

- [ ] Task 5: Unit tests (AC: all)
  - [ ] 5.1 In `apps/mobile/__tests__/api.test.ts`, add test: HTTP 429 with `Retry-After: 2700` header → thrown `AppraiseError` has `errorType === 'RATE_LIMIT'` and `retryAfterSeconds === 2700`
  - [ ] 5.2 In `apps/mobile/__tests__/api.test.ts`, add test: HTTP 429 without `Retry-After` header → `retryAfterSeconds === 60` (default)
  - [ ] 5.3 Create `apps/mobile/__tests__/camera-rate-limit.story-6-8.test.tsx` with the following tests:
    - `'shows rate limit error with retry time for authenticated user'` — mock isGuest=false, RATE_LIMIT error with `retryAfterSeconds: 2700`; verify "You've reached your limit" and "Try again in 45 minutes" rendered; verify no retry button; verify no "Create a free account" link
    - `'shows upgrade CTA for guest users'` — mock isGuest=true, RATE_LIMIT error with `retryAfterSeconds: 1800`; verify "Create a free account" link is rendered; verify "Try again in 30 minutes" shown
    - `'shows fallback time when Retry-After uses default'` — mock RATE_LIMIT error with `retryAfterSeconds: 60` (default); verify "Try again in 1 minute" renders
    - `'dismiss button clears error state'` — mock RATE_LIMIT error; verify dismiss button present; tap it; verify error state is cleared and camera/upload UI returns

### Summary

Story 6.8 closes the UX gap where a rate-limited user sees an unhelpful generic error. The 429 path already exists in `api.ts` but discards the `Retry-After` header and shows copy that doesn't meet the AC. This story wires the header value through the error object, updates copy, and renders dynamic suggestions driven by the `retryAfterSeconds` field and the guest/auth state already available in `camera.tsx`.

The backend currently has **no rate limit** on `/api/appraise` — the enforcements for delete-account, migrate-guest, and get-valuations are present but appraise was not wired. Task 1 adds it.

### Architecture Notes

- **Rate limit enforcement** lives in `backend/rate_limit.py` via `enforce_user_rate_limit()`. It already returns `Retry-After: <seconds>` as an HTTP header. No changes to `rate_limit.py` itself — only `main.py` needs rule constants and a conditional call.
- **Tiered rate limits (PRD NFR-S8)**: Guests: 10/hour; authenticated: 100/hour. Two constants (`APPRAISE_RATE_LIMIT_GUEST`, `APPRAISE_RATE_LIMIT_AUTH`); select based on `principal_type` from `_resolve_appraise_principal()`.
- **CORS `expose_headers`**: Cross-origin responses do not expose non-simple headers by default. Without `expose_headers=["Retry-After"]` in `CORSMiddleware`, web/PWA clients (`Platform.OS === 'web'`) receive `null` from `response.headers.get('Retry-After')`, silently breaking the dynamic wait-time display for all web users.
- **Principal scoping**: The appraise endpoint uses `principal_id` from `_resolve_appraise_principal()` (authenticated user ID or guest session ID). Rate limiting by principal (not IP) is the correct scope and already how other endpoints work.
- **`AppraiseError`** is defined in `apps/mobile/lib/api.ts`. Adding `retryAfterSeconds?: number` as an optional third constructor parameter is backward-compatible. If `Retry-After` header is absent or non-numeric, default to `60` in `appraise()` so the field is always populated.
- **`ErrorState`** already accepts `suggestions?: string[]` and `fallbackLink?` override props. Camera.tsx passes computed suggestions for RATE_LIMIT; all other error types use `ERROR_CONFIG` defaults.
- **Retry suppression + dismissal**: `ErrorState` hides retry when `onRetry` is omitted. For RATE_LIMIT, omit `onRetry` and pass `onDismiss` — a new `ErrorState` prop that renders a secondary `"OK, got it"` text button calling `setError(null)`. Without this, the user is soft-bricked: no retry, no dismiss, camera screen is frozen until they navigate away and back.
- **Guest upgrade CTA**: Use `fallbackLink` (already exists on `ErrorState`) with `href: '/auth/register'` to give the guest an active tappable link to sign-up, not a passive text suggestion. Route confirmed: `/auth/register` (see `apps/mobile/app/(tabs)/settings.tsx#L186`).
- **`RATE_LIMIT` is not retried by `fetchWithRetry`**: `RETRYABLE_STATUS = {502, 503, 504}` — 429 intentionally excluded. No change needed.

### Files to Touch

| File | Change |
|------|--------|
| `backend/main.py` | Add `APPRAISE_RATE_LIMIT` constant; call `enforce_user_rate_limit` in `appraise_item()` |
| `apps/mobile/lib/api.ts` | Add `retryAfterSeconds` to `AppraiseError`; parse `Retry-After` header on 429 |
| `apps/mobile/components/molecules/error-state.tsx` | Update `RATE_LIMIT.title` and default suggestions copy; add `onDismiss?: () => void` prop |
| `apps/mobile/app/(tabs)/camera.tsx` | Extend error state type; store `retryAfterSeconds`; compute dynamic suggestions; suppress retry button |
| `apps/mobile/__tests__/api.test.ts` | Add 2 tests: 429 with/without `Retry-After` header |
| `apps/mobile/__tests__/camera-rate-limit.story-6-8.test.tsx` | New file: 3 camera rate limit UX tests |

### Mock Pattern for AppraiseError

Update `apps/mobile/__mocks__/api.ts` to accept the optional third arg. In camera tests, always pass an explicit `retryAfterSeconds` (e.g. `2700`, `1800`, `60`) rather than relying on the default, so assertions remain deterministic:
```typescript
AppraiseError: class AppraiseError extends Error {
  errorType: string;
  retryAfterSeconds?: number;
  constructor(errorType: string, message: string, retryAfterSeconds?: number) {
    super(message);
    this.errorType = errorType;
    this.retryAfterSeconds = retryAfterSeconds;
    this.name = 'AppraiseError';
  }
}
```

### Test Pattern for Camera Rate Limit

Camera tests follow the pattern in `camera-offline-appraise-error.story-6-4.test.tsx`:
- `jest.mock('@/lib/api', ...)` with controllable `mockAppraise`
- `jest.mock('@/contexts/auth-context', ...)` for `isGuest` control
- `act(async () => { ... })` for all state updates
- Verify rendered text with `renderer.root.findAll(...)` or `toJSON()` string matching
- Use `mockPhotoModule` fixture pattern from prior tests

### Retry-After to Minutes Conversion

`retryAfterSeconds` is always defined (defaults to 60 in `api.ts` when header absent). Guest upgrade is via `fallbackLink`, not `suggestions`.

```typescript
// retryAfterSeconds is always ≥1 (api.ts defaults to 60)
const retryMinutes = Math.ceil(error.retryAfterSeconds / 60);
const suggestions = [
  `Try again in ${retryMinutes} minute${retryMinutes === 1 ? '' : 's'}`,
];

// Guest upgrade CTA — passed as fallbackLink, not inline text
const rateLimitFallback = isGuest
  ? { text: 'Create a free account', href: '/auth/register' }
  : undefined;
```

### Project Structure Notes

- Rate limit rule constants follow the `ALL_CAPS_SNAKE_CASE` convention established by `DELETE_ACCOUNT_RATE_LIMIT`, `MIGRATE_GUEST_RATE_LIMIT`, `GET_VALUATIONS_RATE_LIMIT`
- New test file follows the `<screen>-<description>.story-<epic>-<num>.test.tsx` naming convention used in `camera-offline-appraise-error.story-6-4.test.tsx`
- ErrorState prop interface already has `suggestions?: string[]` override — no interface changes needed

### References

- [Source: docs/epics.md] — Epic 6, Story 6.8 — FR55 rate limit handling ACs
- [Source: backend/rate_limit.py#L72-L85] — `enforce_user_rate_limit()` raises HTTPException 429 with `Retry-After` header
- [Source: backend/main.py#L21-L23] — Rate limit rule constant pattern
- [Source: backend/main.py#L129-L145] — `appraise_item()` principal resolution (where to insert rate limit check)
- [Source: apps/mobile/lib/api.ts#L164-L167] — Current 429 handler (no header read)
- [Source: apps/mobile/components/molecules/error-state.tsx#L43-L48] — Current RATE_LIMIT static config
- [Source: apps/mobile/components/molecules/error-state.tsx#L62-L78] — `ErrorStateProps` interface (suggests override already exists)
- [Source: apps/mobile/__tests__/api.test.ts#L125-L133] — Existing RATE_LIMIT test to extend

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
