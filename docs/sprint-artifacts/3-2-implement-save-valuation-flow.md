# Story 3.2: Implement Save Valuation Flow

**Status:** validated

---

## Story

**As a** user,
**I want** completed valuations to save automatically,
**So that** I can find them again in history without re-appraising the item.

---

## Business Context

### Why This Story Matters

Story 3.1 created the database schema and repository layer, but users still experience ValueSnap as a one-time interaction. They can appraise an item, see the result, and then lose it when they leave the screen. Story 3.2 closes that gap by wiring persistence into the live valuation flow.

This is the **first user-visible persistence story in Epic 3**. After this story, every successful valuation becomes a durable record with a backend identifier, which unlocks history, detail views, and offline caching in Stories 3.3 to 3.5.

**Current State:**
- ✅ `public.valuations` table exists with RLS policies from Story 3.1
- ✅ `ValuationRecord` and `ValuationRepository` exist in backend
- ✅ `/api/appraise` returns `identity`, `valuation`, and `confidence`
- ✅ Mobile camera flow already captures an image and displays an inline result state
- ✅ Mobile app already has a `Valuation` entity type for persisted results
- ❌ Backend does not save successful appraisals automatically
- ❌ API response does not include a `valuation_id`
- ❌ Frontend result state is still mock-driven and not persistence-aware
- ❌ Guest history storage pattern is not implemented yet

**What This Story Delivers:**
- Automatic save after a successful `/api/appraise`
- `valuation_id` returned to the client in the appraisal response
- Frontend valuation entity updated to carry persistence metadata
- Shared guest local-history storage hook for later Epic 3 stories
- Guest session ID generation and storage for future account claim flow

### Value Delivery

- **Real persistence:** users stop losing successful appraisals
- **History foundation:** each result now has a durable backend ID for retrieval
- **Guest continuity:** anonymous users keep a limited local history without auth
- **Epic leverage:** Stories 3.3, 3.4, and 3.5 can build on a single saved-result contract

### Epic Context

This is Story 2 of 5 in Epic 3 (History & Persistence). It spans backend and mobile frontend.

**Story Dependency Graph:**
```
3.1 DB Schema
   └─► 3.2 Save Valuation Flow (this story)
          └─► 3.3 History List View
                 └─► 3.4 Valuation Details
                        └─► 3.5 Offline Viewing
```

---

## Acceptance Criteria

### AC1: Backend Saves Successful Appraisals

**Given** the `/api/appraise` endpoint successfully identifies an item and calculates market data  
**When** the request completes without error  
**Then** the backend constructs a `ValuationRecord` from the `identity`, `valuation`, and `confidence` payloads  
**And** it saves the record via `ValuationRepository.save()`  
**And** it passes `user_id=None` for the current guest flow  
**And** it accepts an optional `guest_session_id` from the request body for guest record association  
**And** the existing response shape is extended to include `valuation_id`

**Expected success response shape:**
```json
{
  "identity": { "...": "..." },
  "valuation": { "...": "..." },
  "confidence": { "...": "..." },
  "valuation_id": "uuid-string"
}
```

### AC2: Save Failures Do Not Break Appraisal Success

**Given** the appraisal pipeline succeeds but persistence fails  
**When** `ValuationRepository.save()` raises an error  
**Then** the API still returns the appraisal result with HTTP 200  
**And** the error is logged clearly for debugging  
**And** the response includes `valuation_id: null` rather than failing the entire request

### AC3: AnalyzeRequest Supports Guest Session Metadata

**Given** guest valuations need a future auth-claim path  
**When** `backend/models.py` is updated  
**Then** `AnalyzeRequest` includes an optional `guest_session_id: str | None` field  
**And** existing callers that omit it continue to work unchanged  
**And** image size validation behavior remains unchanged

### AC4: Mobile Types Support Persisted Results

**Given** the backend returns a `valuation_id` after appraisal  
**When** mobile valuation types are updated  
**Then** the API response type includes `valuationId?: string | null`  
**And** the stored `Valuation` entity can represent:
- backend `id`
- `createdAt`
- `imageUri`
- item details
- market data
- confidence data
- optional guest metadata needed for local history

**And** the type changes remain backward-compatible with current mocked screens where practical

### AC5: Guest Local History Hook Exists

**Given** Epic 3 requires a shared guest-storage pattern across Stories 3.2, 3.3, and 3.5  
**When** a new mobile hook is added  
**Then** a `useLocalHistory` hook exists in the mobile app  
**And** it provides methods to:
- read local valuations
- save a valuation locally
- read or create a persistent `guest_session_id`

**And** it stores data in `AsyncStorage`  
**And** it enforces the 5-item cap from NFR-G1 by keeping the newest five valuations only  
**And** it serializes/deserializes safely without crashing on malformed local data

### AC6: Camera/Appraisal Flow Persists Real Results

**Given** a user completes a valuation from the camera tab  
**When** the mobile app receives a successful appraisal response  
**Then** it stores the returned `valuation_id` in the client-side valuation object  
**And** it saves the valuation into local guest history for immediate history-tab visibility  
**And** it preserves the local `imageUri` so the current device can show thumbnails later  
**And** the existing inline result UX remains intact

### AC7: Verification Coverage Exists

**Given** the new persistence behavior is implemented  
**When** tests are run  
**Then** backend tests cover:
- save-success response includes `valuation_id`
- save-failure still returns appraisal success with `valuation_id = null`
- `guest_session_id` is forwarded into `ValuationRecord.from_appraise_response()`

**And** mobile tests or targeted unit coverage exist for:
- `useLocalHistory` 5-item cap behavior
- guest session ID creation/reuse
- malformed AsyncStorage payload recovery

---

## Technical Notes

### Save Semantics

This story should treat persistence as a **best-effort side effect** of a successful appraisal, not as part of the core valuation correctness path. If GPT + eBay succeed, the user should still receive the valuation even if Supabase persistence temporarily fails.

### Guest Session Flow

`types/user.ts` already defines a `GuestUser` interface with a `sessionId` field. The `useLocalHistory` hook must source the guest session ID through this type, not introduce a parallel field. The flow is:
1. Mobile app gets or creates a stable `sessionId` stored in `AsyncStorage` (coerced as `GuestUser.sessionId`)
2. Mobile app sends it as `guest_session_id` in the `/api/appraise` request body
3. Backend stores guest valuations with `user_id = null` and `guest_session_id = sessionId`
4. Mobile also stores a local projection of the result in `AsyncStorage` for history

This sets up Epic 4 account claiming without requiring auth in this story.

### Local Image Handling

The backend `image_thumbnail_url` remains nullable for now. In Story 3.2, the local device should continue storing the image URI only in mobile local history. Cross-device image history is still a known gap and should remain documented, not solved here.

### Response Mapping

The backend response uses:
- `identity` (maps to `itemDetails` in mobile)
- `valuation` (maps to `marketData` in mobile)
- `confidence`
- `valuation_id` (new — maps to `valuationId`)

The existing `transformValuationResponse` transformer in `types/transformers.ts` currently expects `raw.item_identity` and `raw.market_data` as root keys — **these do not match the actual backend response** (`identity` and `valuation`). This is a latent bug hidden because the camera screen currently uses mock data, not real API calls. Task 3 must fix the transformer's raw type interface to reflect the real backend shape.

### `Valuation.id` Backward Compatibility

The current `Valuation` interface has `id: string` (required). To represent a result before the backend `valuation_id` is returned (e.g., if persistence fails and `valuation_id` is null), `id` should become `id?: string`. All current usage of `Valuation.id` must be audited during Task 3 to confirm no non-null assertion crashes result.

---

## Tasks / Subtasks

### Task 0: Install AsyncStorage Package (AC: #5)
**Estimated:** 5 min

- [ ] 0.1 Install `@react-native-async-storage/async-storage` in the mobile app: `npx expo install @react-native-async-storage/async-storage`
- [ ] 0.2 Confirm the package appears in `apps/mobile/package.json` dependencies

**Files to Modify:**
```
apps/mobile/package.json
```

---

### Task 1: Extend Request/Response Models (AC: #1, #3)
**Estimated:** 20 min

- [ ] 1.1 Add `guest_session_id: Optional[str] = None` to `AnalyzeRequest` in `backend/models.py`
- [ ] 1.2 Keep existing `image_base64` validation unchanged
- [ ] 1.3 Add or document the appraisal response contract to include `valuation_id`

**Files to Modify:**
```
backend/models.py
backend/main.py
```

---

### Task 2: Persist Successful Appraisals in Backend (AC: #1, #2)
**Estimated:** 45 min

- [ ] 2.1 Import `ValuationRecord` and `ValuationRepository` into `backend/main.py`
- [ ] 2.2 After confidence calculation succeeds, build a `ValuationRecord` via `ValuationRecord.from_appraise_response(...)`
- [ ] 2.3 Pass `guest_session_id=request.guest_session_id`
- [ ] 2.4 Save the record with `ValuationRepository.save()`
- [ ] 2.5 Return `valuation_id` in the success response
- [ ] 2.6 If save fails, log the exception and continue returning the appraisal result with `valuation_id: null`
- [ ] 2.7 Do not change the current AI/eBay error handling behavior

**Files to Modify:**
```
backend/main.py
```

---

### Task 3: Update Mobile Valuation Contracts (AC: #4)
**Estimated:** 30 min

- [ ] 3.1 Fix `transformValuationResponse` in `types/transformers.ts`: the raw type interface currently expects `raw.item_identity` and `raw.market_data` — update to `raw.identity` and `raw.valuation` to match the actual backend response
- [ ] 3.2 Add `valuation_id?: string | null` to the raw transformer input type; output `valuationId?: string | null`
- [ ] 3.3 Also add `confidence` (raw `confidence` dict) to the raw input type and thread it through `transformValuationResponse` so it is available from the transform output — add it now since the transformer is already being fixed and Story 3.4 will need it
- [ ] 3.4 In `types/valuation.ts`, change `Valuation.id: string` to `id?: string` to allow representing un-saved states (save fails → `valuation_id: null`)
- [ ] 3.5 Add `valuationId?: string | null` to `ValuationResponse` in `valuation.ts`
- [ ] 3.6 Audit: search for `.id` usages on `Valuation` objects across the codebase; confirm no non-null assertion crashes from making `id` optional

**Files to Modify:**
```
apps/mobile/types/valuation.ts
apps/mobile/types/transformers.ts
```

---

### Task 4: Create Shared Guest Local History Utility Module (AC: #5)
**Estimated:** 45 min

Implemented as a **plain utility module** (not a React hook — no `useState`/`useEffect`). Future stories may wrap these in a hook if component-level reactivity is needed; for now, async functions are sufficient and simpler.

- [ ] 4.1 Create `apps/mobile/lib/localHistory.ts`
- [ ] 4.2 Define `AsyncStorage` key constants at the top of the file: one for the history array, one for the guest session ID
- [ ] 4.3 Implement `getOrCreateGuestSessionId(): Promise<string>` — reads from `AsyncStorage`; if absent, generates a `uuid`-formatted string, stores it, and returns it. Aligns with the `sessionId` field of the existing `GuestUser` type in `types/user.ts`.
- [ ] 4.4 Implement `getLocalHistory(): Promise<Valuation[]>` — reads, JSON-parses, and validates the stored array; return `[]` on any parse error or malformed data rather than crashing
- [ ] 4.5 Implement `saveToLocalHistory(valuation: Valuation): Promise<void>` — reads current array, prepends the new item, trims to newest 5 (NFR-G1), writes back to `AsyncStorage`

**Files to Create:**
```
apps/mobile/lib/localHistory.ts
```

---

### Task 5: Create API Client and Wire Camera Flow to Real Results (AC: #6)
**Estimated:** 60 min

**Error handling decision:** The existing error states were modelled on simulated failures. They are NOT being preserved as-is — real HTTP errors must be mapped to the existing `ErrorType` union (`AI_IDENTIFICATION_FAILED`, `AI_TIMEOUT`, `INVALID_IMAGE`, `NETWORK_ERROR`, `RATE_LIMIT`, `GENERIC_ERROR`) from `components/molecules/error-state.tsx`. The existing `ErrorState` component stays; only the error source changes.

**Preview card decision:** The hardcoded "Recent valuations" section at the bottom of the camera screen (currently showing static `PREVIEW_ITEM` / `PREVIEW_MARKET`) is **removed**. It will be replaced with the last real appraisal result when one exists in the session. When no real result has been obtained yet, that section is hidden entirely.

- [ ] 5.1 Create `apps/mobile/lib/api.ts` with an `appraise(imageBase64: string, guestSessionId: string)` function that:
  - POSTs to `env.apiUrl + '/api/appraise'` with `{ image_base64, guest_session_id }` in the body
  - On non-2xx HTTP response, reads the error body and maps `error.code` to `ErrorType`: `AI_IDENTIFICATION_FAILED` → `AI_IDENTIFICATION_FAILED`, `RATE_LIMIT` → `RATE_LIMIT`, network/fetch failure → `NETWORK_ERROR`, anything else → `GENERIC_ERROR`
  - On success, returns the raw backend JSON
- [ ] 5.2 In `apps/mobile/app/(tabs)/index.tsx`:
  - Remove the `__DEV__ && Math.random() < 0.3` simulated error
  - Remove the `await new Promise(resolve => setTimeout(resolve, 6000))` fake delay
  - Remove the `PREVIEW_ITEM`, `PREVIEW_MARKET` constants and the hardcoded "Recent valuations" section at the bottom of the screen
  - Replace `handlePhotoCapture` body with a real `appraise()` call using `photo.base64`
- [ ] 5.3 Before the API call, call `getOrCreateGuestSessionId()` from `lib/localHistory.ts` and pass the result into `appraise()`
- [ ] 5.4 Pass the raw success response through `transformValuationResponse()` to get `itemDetails`, `marketData`, `valuationId`
- [ ] 5.5 Store the result in `lastResult` state; the inline result card display ("Valuation complete") remains intact
- [ ] 5.6 Call `saveToLocalHistory()` from `lib/localHistory.ts` with the complete valuation including `imageUri`
- [ ] 5.7 In `handlePhotoCapture` catch block, map thrown errors to `ErrorType` and call `setError()` — the existing `ErrorState` component renders the result unchanged
- [ ] 5.8 Append the last real result card under the capture area (replacing the static preview section), showing only when `lastResult` is non-null

**Files to Create / Modify:**
```
apps/mobile/lib/api.ts
apps/mobile/app/(tabs)/index.tsx
```

---

### Task 6: Add Verification Coverage (AC: #7)
**Estimated:** 45 min

- [ ] 6.1 Add backend tests for successful appraisal persistence and `valuation_id` response
- [ ] 6.2 Add backend test for save failure fallback — response is still 200 with `valuation_id: null`
- [ ] 6.3 Add backend test verifying `guest_session_id` flows into the saved `ValuationRecord`
- [ ] 6.4 Add mobile unit tests for `localHistory.ts` 5-item cap enforcement and guest ID creation/reuse
- [ ] 6.5 Add mobile unit test for malformed `AsyncStorage` payload recovery (bad JSON resets to `[]`)
- [ ] 6.6 Add mobile unit tests for `lib/api.ts`: undefined `apiUrl`, HTTP 422 mapped to `AI_IDENTIFICATION_FAILED`, HTTP 429 mapped to `RATE_LIMIT`, fetch exception mapped to `NETWORK_ERROR`

**Files to Create / Modify:**
```
backend/tests/test_appraise_persistence.py
apps/mobile/tests/localHistory.test.ts
apps/mobile/tests/api.test.ts
```

---

## Definition of Done

- [ ] Successful appraisals are saved automatically through `ValuationRepository`
- [ ] API returns `valuation_id` for saved results, or `null` when persistence fails
- [ ] Guest session IDs are supported end-to-end
- [ ] Mobile app can keep a local projection of the latest five guest valuations
- [ ] Story 3.3 can consume the shared local-history hook without redesign
- [ ] Tests cover backend save behavior and local guest-history behavior

---

## Notes for Implementation

- Keep Story 3.2 focused on **save flow**, not full history retrieval UI
- Do not solve auth in this story; all user flows remain guest-first
- Do not introduce remote image hosting yet; local `imageUri` is enough for now
- Prefer a small translation layer over spreading response-shape mapping across components

### Locked Decisions (from pre-dev review)

| Decision | Rationale |
|---|---|
| `localHistory` is a **utility module**, not a React hook | No component state needed; avoids false hook contract |
| `confidence` data added to transformer **now** | Transformer is already being fixed; Story 3.4 needs it anyway |
| Hardcoded preview card **removed**; replaced with last real result | Preview was mock-only; removing it is honest about current state |
| Error states **rewritten** to map real HTTP errors to `ErrorType` | Old states modelled simulated failures, not real network responses |
