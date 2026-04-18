# Story 4.11: Migrate Guest Data to Account

**Status:** done  
**Epic:** 4 — User Authentication  
**Points:** 5  
**FR:** FR43  
**NFRs:** NFR-G2 (data portability), NFR-P2 (≤ 5 s response time)

---

## Story

**As an** authenticated user who previously saved valuations as a guest,  
**I want** to migrate my guest-session history to my account when I sign in,  
**So that** my existing valuations are preserved and visible in the History tab under my permanent account.

---

## Background

### What Already Exists

| Already built | Detail |
|---|---|
| `getOrCreateGuestSessionId()` | `lib/localHistory.ts` — reads/creates a stable UUID stored under `AsyncStorage('valuesnap:guest_session_id')` |
| `getLocalHistory()` / `saveToLocalHistory()` / `deleteFromLocalHistory()` | `lib/localHistory.ts` — full guest valuation CRUD; `clearLocalHistory()` does NOT yet exist |
| `guest_session_id` column | `valuations` DB table — populated on every appraisal; `user_id IS NULL` while the record is unowned |
| `ValuationRepository.get_by_user(user_id)` | `backend/services/valuations.py` — returns `ValuationRecord[]` ordered newest-first |
| `get_supabase()` | `backend/cache.py` — service_role Supabase client; **already imported** in `main.py` |
| Bearer JWT auth pattern | `backend/main.py` — `DELETE /api/account` uses extract-and-verify Bearer JWT pattern; new endpoints in this story reuse it verbatim |
| `useAuth()` hook | `contexts/AuthContext.tsx` — provides `{ session, user, isGuest, isLoading, signOut }` |
| `supabase.auth.getSession()` | `lib/supabase.ts` — anon client; used in other screens for JWT retrieval |
| `useOnlineStatus()` | `lib/hooks/useOnlineStatus.ts` — **already imported** in `history.tsx` |
| History tab | `app/(tabs)/history.tsx` — `useFocusEffect` + `getLocalHistory()` + `mapValuationsToGridItems()` (all guest-only today) |
| `env.useMock` / `env.apiUrl` | `lib/env.ts` — mock mode flag; `env.useMock` used for bypasses in every screen |

### What This Story Delivers

1. **Backend `POST /api/migrate-guest`** — claims all unowned guest records for the authenticated user:
   - Auth: Bearer JWT
   - Input: `{ "guest_session_id": "<uuid>" }`
   - Action: `UPDATE valuations SET user_id = <auth_user_id> WHERE guest_session_id = :id AND user_id IS NULL`
   - Returns: `{ "migrated": N }` — count of rows updated
   - 401 for missing/invalid auth; 422 (Pydantic) for empty `guest_session_id`

2. **Backend `GET /api/valuations`** — fetches the authenticated user's server-side history:
   - Auth: Bearer JWT
   - Returns: `{ "valuations": [...] }` — list of valuation records, newest first
   - Used by the History tab after migration and on all subsequent opens
   - 401 for missing/invalid auth

3. **`clearLocalHistory()`** — new export in `lib/localHistory.ts`:
   - Removes `valuesnap:local_history` from AsyncStorage
   - Called after a successful migration

4. **`lib/migration.ts`** — new file with four exports:
   - `ServerValuation` — TypeScript type matching the shape returned by `GET /api/valuations`
   - `mapServerValuationsToGridItems(records)` — converts snake_case DB fields to `HistoryGridItem[]`
  - `fetchServerHistory(token)` — calls `GET /api/valuations`; returns `HistoryGridItem[]` on success and throws on failure so the screen can distinguish an empty success from a failed request
   - `migrateGuestData(token, guestSessionId)` — calls `POST /api/migrate-guest`; throws on failure

5. **History tab auth-awareness** (`app/(tabs)/history.tsx`):
   - Reads `{ session, isGuest }` from `useAuth()`
  - When authenticated: calls `fetchServerHistory()` and stores result in `serverItems` state
  - On server fetch failure: leaves `serverItems` as `null`, so the screen falls back to `mapValuationsToGridItems(history)` per AC5
   - `displayItems` = `serverItems !== null ? serverItems : mapValuationsToGridItems(history)`
   - When authenticated AND local history is non-empty: shows migration banner
   - Mock mode: skips all server calls, falls back to local history only

**No new npm packages. No new pip packages.**  
No changes to `AuthContext`, auth screens, or any file outside the scope table.

---

## Acceptance Criteria

### AC1: POST /api/migrate-guest Claims Records

**Given** a valid `Authorization: Bearer <jwt>` and `{ "guest_session_id": "<uuid>" }`  
**When** `POST /api/migrate-guest` is called  
**Then** all `valuations` rows where `guest_session_id = <uuid>` **AND** `user_id IS NULL` are updated to `user_id = <jwt_user_id>`  
**And** the endpoint returns HTTP 200 with `{ "migrated": N }` (N = count of updated rows)  
**And** rows owned by another user (`user_id IS NOT NULL`) are never touched

---

### AC2: Migration Auth Required

**Given** `POST /api/migrate-guest` is called  
**When** the `Authorization` header is missing, malformed, or contains an invalid/expired token  
**Then** HTTP 401 is returned  
**And** no rows are modified

---

### AC3: Empty guest_session_id Rejected

**Given** a valid auth token  
**When** `guest_session_id` is an empty string or missing from the body  
**Then** HTTP 422 is returned (Pydantic `min_length=1` validation)  
**And** no rows are modified

---

### AC4: GET /api/valuations Returns User's Records

**Given** a valid `Authorization: Bearer <jwt>`  
**When** `GET /api/valuations` is called  
**Then** HTTP 200 is returned with `{ "valuations": [...] }` containing the authenticated user's records, newest first  
**And** each record includes at minimum: `id`, `item_name`, `brand`, `fair_market_value`, `image_thumbnail_url`, `ai_response`, `ebay_data`, `created_at`  
**And** records belonging to other users are never included

---

### AC5: History Tab Shows Server Data When Authenticated

**Given** the user is authenticated (not a guest) and `env.useMock === false`  
**When** the History tab gains focus  
**Then** the tab calls `GET /api/valuations` with the session JWT  
**And** the returned records are displayed in the History grid  
**And** if the server fetch fails (network error, 4xx/5xx), the tab falls back to showing local history  
**And** no migration banner is shown if local history is empty

---

### AC6: Migration Banner Appears When Conditions Are Met

**Given** the user is authenticated (`isGuest === false`) **and** `getLocalHistory()` returns at least one item  
**When** the History tab gains focus (and the banner has not been dismissed this session)  
**Then** a migration banner is visible with `testID="migration-banner"`  
**And** the banner text includes the count of local items  
**And** the banner contains an "Import to account" button (`testID="migration-import-button"`) and a "Dismiss" button (`testID="migration-dismiss-button"`)  
**And** the server history is shown beneath the banner

---

### AC7: Accept Migration — Full Flow

**Given** the migration banner is visible  
**When** the user presses "Import to account"  
**Then:**
- `migrateGuestData(token, guestSessionId)` is called (guestSessionId from `getOrCreateGuestSessionId()`)
- The Import button shows `"Importing…"` and is disabled during the call
- On success: `clearLocalHistory()` is called, the banner is dismissed, the History tab refreshes showing the (now expanded) server items
- `signOut()` is NOT called; navigation does NOT change

---

### AC8: Dismiss Migration — No Backend Call

**Given** the migration banner is visible  
**When** the user presses "Dismiss"  
**Then:**
- No API call is made
- The banner is hidden for the remainder of the session
- Local items remain in AsyncStorage unchanged
- Server items remain displayed

---

### AC9: Migration Error Handling

**Given** the user presses "Import to account"  
**When** `POST /api/migrate-guest` returns a non-200 status or the network throws  
**Then:**
- An error message with `testID="migration-error"` is displayed, containing `"migration failed"` (case-insensitive)
- The Import button is re-enabled (`isMigrating` is set back to `false`)
- Local items are NOT cleared (`clearLocalHistory()` is NOT called)
- No navigation occurs

---

### AC10: Mock Mode Bypass

**Given** `env.useMock === true`  
**When** the History tab loads (guest or authenticated)  
**Then:**
- `fetchServerHistory()` is NOT called
- `migrateGuestData()` is NOT called
- Local history is shown normally (existing behavior)
- The migration banner is NOT shown

---

### AC11: Full Test Suite Remains Green

**Given** all pre-existing tests  
**When** `cd apps/mobile && npx jest --no-coverage` runs  
**Then** all tests pass with no regressions  
**And** the 10 new backend tests and 8 new frontend tests all pass

---

## Scope

| What | File | Change type |
|------|------|-------------|
| `POST /api/migrate-guest` + `GET /api/valuations` endpoints | `backend/main.py` | **Modify** — add after `DELETE /api/account` |
| `MigrateGuestRequest` Pydantic model | `backend/models.py` | **Modify** — add model |
| Backend endpoint tests | `backend/tests/test_migrate_guest.py` | **Create** |
| `clearLocalHistory()` utility | `apps/mobile/lib/localHistory.ts` | **Modify** — add export |
| Migration utility + mapper + server history fetch | `apps/mobile/lib/migration.ts` | **Create** |
| History tab auth-awareness + migration banner | `apps/mobile/app/(tabs)/history.tsx` | **Modify** |
| Frontend migration banner tests | `apps/mobile/__tests__/history-migration.test.tsx` | **Create** |

---

## Dev Notes

### Backend: MigrateGuestRequest Model (`backend/models.py`)

Add after `AnalyzeRequest`. Import `Field` from pydantic (already imported via `BaseModel`):

```python
from pydantic import BaseModel, Field  # Field already available; add if not present

class MigrateGuestRequest(BaseModel):
    """Request body for POST /api/migrate-guest."""
    guest_session_id: str = Field(..., min_length=1)
```

> Pydantic's `min_length=1` validator returns 422 automatically for empty strings, satisfying AC3 without extra endpoint logic.

In `main.py` the models imports are currently on two separate lines (lines 8 and 13). Add `MigrateGuestRequest` to the `ValuationRecord` line:

```python
# Before (two lines):
from backend.models import AnalyzeRequest
...
from backend.models import ValuationRecord

# After:
from backend.models import AnalyzeRequest
...
from backend.models import ValuationRecord, MigrateGuestRequest
```

---

### Backend: POST /api/migrate-guest (`backend/main.py`)

Add after `DELETE /api/account`. The auth block is identical to that endpoint — same pattern, same error messages:

```python
@app.post("/api/migrate-guest")
async def migrate_guest(request: Request, body: MigrateGuestRequest):
    """Claim all guest-owned valuations for the authenticated user.

    Updates valuations where guest_session_id = body.guest_session_id
    AND user_id IS NULL. Only untouched records are claimed — records
    already owned by any user are never modified.

    Auth: Bearer JWT.
    NFR-G2: Guest work survives account creation.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    supabase = get_supabase()
    try:
        user_response = supabase.auth.get_user(token)
        user = getattr(user_response, "user", None)
        user_id = getattr(user, "id", None)
        if not user_id:
            raise ValueError("No user returned from token")
    except Exception as e:
        logger.warning(f"migrate-guest: token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token") from e

    try:
        result = (
            supabase.table("valuations")
            .update({"user_id": user_id})
            .eq("guest_session_id", body.guest_session_id)
            .is_("user_id", "null")
            .execute()
        )
        migrated = len(result.data or [])
        logger.info(f"Migrated {migrated} valuations for user {user_id} "
                    f"from session {body.guest_session_id}")
        return {"migrated": migrated}
    except Exception as e:
        logger.error(f"Failed to migrate guest data for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to migrate guest data") from e
```

> **Supabase `.is_("user_id", "null")`** — this is supabase-py's IS NULL filter. The string literal `"null"` is correct for the PostgREST adapter.

---

### Backend: GET /api/valuations (`backend/main.py`)

Add after `POST /api/migrate-guest`. Uses the existing `ValuationRepository.get_by_user()`:

```python
@app.get("/api/valuations")
async def get_valuations(request: Request):
    """Return the authenticated user's valuations, newest first.

    Auth: Bearer JWT.
    Used by the History tab to display server-side history.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    supabase = get_supabase()
    try:
        user_response = supabase.auth.get_user(token)
        user = getattr(user_response, "user", None)
        user_id = getattr(user, "id", None)
        if not user_id:
            raise ValueError("No user returned from token")
    except Exception as e:
        logger.warning(f"get-valuations: token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token") from e

    try:
        repo = ValuationRepository()
        records = repo.get_by_user(user_id)
        return {
            "valuations": [
                {
                    "id": r.id,
                    "item_name": r.item_name,
                    "item_type": r.item_type,
                    "brand": r.brand,
                    "price_min": float(r.price_min) if r.price_min is not None else None,
                    "price_max": float(r.price_max) if r.price_max is not None else None,
                    "fair_market_value": float(r.fair_market_value) if r.fair_market_value is not None else None,
                    "confidence": r.confidence,
                    "sample_size": r.sample_size,
                    "image_thumbnail_url": r.image_thumbnail_url,
                    "ai_response": r.ai_response,
                    "ebay_data": r.ebay_data,
                    "confidence_data": r.confidence_data,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in records
            ]
        }
    except Exception as e:
        logger.error(f"Failed to fetch valuations for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch valuations") from e
```

> **Auth duplication note:** The extract-and-verify bearer block is repeated across `delete_account`, `migrate_guest`, and `get_valuations`. This is intentional for Phase 1 — each endpoint is independently testable without a shared dependency. A future story can extract this to a `Depends(get_current_user)` FastAPI dependency.

---

### Frontend: clearLocalHistory (`lib/localHistory.ts`)

Add after `deleteFromLocalHistory`. The key constant `HISTORY_KEY` is already defined in the same file:

```typescript
/**
 * Clear all local valuation history.
 * Called after successful guest-to-account migration.
 * Best-effort — if AsyncStorage.removeItem fails, old data remains
 * but migration is already complete on the server.
 */
export async function clearLocalHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch {
    // Intentionally swallowed — see jsdoc above
  }
}
```

---

### Frontend: lib/migration.ts (new file)

```typescript
import type { HistoryGridItem } from '@/components/organisms/history-grid'; // re-used as return type
import type { ItemDetails } from '@/types/item';
import type { MarketData } from '@/types/market';
import { env } from '@/lib/env';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape of one record returned by GET /api/valuations. */
export interface ServerValuation {
  id: string;
  item_name: string;
  item_type: string;
  brand: string | null;
  price_min: number | null;
  price_max: number | null;
  fair_market_value: number | null;
  confidence: string | null;
  sample_size: number | null;
  image_thumbnail_url: string | null;
  ai_response: Record<string, unknown> | null;
  ebay_data: Record<string, unknown> | null;
  confidence_data: Record<string, unknown> | null;
  created_at: string | null;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

/**
 * Map a single server-side ValuationRecord to a HistoryGridItem.
 *
 * ai_response stores identity.model_dump() — the raw AI response in snake_case.
 * ebay_data stores the eBay market response in snake_case.
 * Both are cast to camelCase UI types here.
 */
function mapServerValuationToGridItem(v: ServerValuation): HistoryGridItem {
  const ai = (v.ai_response ?? {}) as Record<string, unknown>;
  const ebay = (v.ebay_data ?? {}) as Record<string, unknown>;

  const itemDetails: ItemDetails = {
    itemType: (ai.item_type as string) ?? v.item_type ?? 'unknown',
    brand: (ai.brand as string) ?? v.brand ?? 'unknown',
    model: (ai.model as string) ?? 'unknown',
    visualCondition:
      (ai.visual_condition as ItemDetails['visualCondition']) ?? 'used_good',
    conditionDetails: (ai.condition_details as string) ?? '',
    estimatedAge: (ai.estimated_age as string) ?? '',
    categoryHint: (ai.category_hint as string) ?? '',
    searchKeywords: (ai.search_keywords as string[]) ?? [],
    identifiers: {
      upc: null,
      modelNumber: (ai.model as string) ?? null,
      serialNumber: null,
    },
  };

  const priceRange =
    (ebay.price_range as { min: number; max: number } | undefined) ??
    ({ min: v.price_min ?? 0, max: v.price_max ?? 0 } as const);

  const marketData: MarketData = {
    status: (ebay.status as MarketData['status']) ?? 'success',
    keywords: (ebay.keywords as string) ?? '',
    totalFound: (ebay.total_found as number) ?? 0,
    pricesAnalyzed: (ebay.prices_analyzed as number) ?? v.sample_size ?? 0,
    outliersRemoved: (ebay.outliers_removed as number) ?? 0,
    priceRange,
    fairMarketValue:
      (ebay.fair_market_value as number) ?? v.fair_market_value ?? 0,
    mean: (ebay.mean as number) ?? 0,
    stdDev: (ebay.std_dev as number) ?? 0,
    avgDaysToSell: (ebay.avg_days_to_sell as number) ?? undefined,
    confidence:
      (ebay.confidence as MarketData['confidence']) ??
      (v.confidence as MarketData['confidence']) ??
      'LOW',
  };

  return {
    id: v.id,
    imageUri: v.image_thumbnail_url ?? undefined,
    itemDetails,
    marketData,
  };
}

export function mapServerValuationsToGridItems(
  records: ServerValuation[],
): HistoryGridItem[] {
  return records.map(mapServerValuationToGridItem);
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Fetch the authenticated user's valuations from the server.
 * Returns mapped items on success.
 * Throws on any failure so the screen can distinguish:
 * - success with zero rows -> []
 * - failed request -> fallback to local history
 */
export async function fetchServerHistory(
  token: string,
): Promise<HistoryGridItem[]> {
  if (!env.apiUrl) throw new Error('API URL is not configured');

  const response = await fetch(`${env.apiUrl}/api/valuations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`History fetch failed with status ${response.status}`);
  }

  const body = (await response.json()) as { valuations: ServerValuation[] };
  return mapServerValuationsToGridItems(body.valuations ?? []);
}

/**
 * Migrate guest-owned valuations to the authenticated user's account.
 *
 * @throws Error on non-200 response or network failure.
 */
export async function migrateGuestData(
  token: string,
  guestSessionId: string,
): Promise<{ migrated: number }> {
  if (!env.apiUrl) throw new Error('API URL is not configured');

  const response = await fetch(`${env.apiUrl}/api/migrate-guest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ guest_session_id: guestSessionId }),
  });

  if (!response.ok) {
    throw new Error(`Migration failed with status ${response.status}`);
  }

  return response.json() as Promise<{ migrated: number }>;
}
```

---

### Frontend: History Tab Changes (`app/(tabs)/history.tsx`)

**New imports to add:**

```typescript
import { View } from 'react-native';                        // add View to existing RN import
import { useAuth } from '@/contexts/AuthContext';            // new
import { env } from '@/lib/env';                            // new
import {
  getLocalHistory,                                          // already imported — keep, add:
  getOrCreateGuestSessionId,
  clearLocalHistory,
} from '@/lib/localHistory';                                // extend existing import
import { fetchServerHistory, migrateGuestData } from '@/lib/migration'; // new
```

> `HistoryGridItem` is already imported from `@/components/organisms/history-grid` on line 7 of `history.tsx`. Do NOT import it again from `migration.ts` — the type is the same, and a duplicate import creates a conflict. The `serverItems` state is typed `HistoryGridItem[] | null` using the existing import.

**New state variables** (inside `HistoryScreen`):

```tsx
const { session, isGuest } = useAuth();

const [serverItems, setServerItems] = useState<HistoryGridItem[] | null>(null);
const [migrationBanner, setMigrationBanner] = useState<{ count: number } | null>(null);
const [isMigrating, setIsMigrating] = useState(false);
const [migrationError, setMigrationError] = useState<string | null>(null);
const bannerDismissed = useRef(false);
```

**Updated `fetchHistory` callback** — replace the existing implementation entirely.  
The existing `const [history, setHistory] = useState<Valuation[]>([])` and `isOnline` state remain:

```tsx
const fetchHistory = useCallback(async () => {
  // Mock mode: always local-only (AC10)
  if (env.useMock) {
    const data = await getLocalHistory();
    setHistory(data);
    setServerItems(null);
    return;
  }

  if (!isGuest && session) {
    // Authenticated: fetch server history.
    // IMPORTANT: fetchServerHistory throws on failure so we can distinguish
    // a failed request from a valid empty history response.
    try {
      const items = await fetchServerHistory(session.access_token);
      setServerItems(items);
    } catch {
      setServerItems(null); // AC5 fallback: local history remains visible
    }

    // Check whether local history exists → show migration banner if so (AC6)
    const local = await getLocalHistory();
    setHistory(local);
    if (local.length > 0 && !bannerDismissed.current) {
      setMigrationBanner({ count: local.length });
    } else {
      setMigrationBanner(null);
    }
  } else {
    // Guest mode: local history only
    setServerItems(null);
    setMigrationBanner(null);
    const data = await getLocalHistory();
    setHistory(data);
  }
}, [isGuest, session]);
```

**Migration handlers** (inside `HistoryScreen`, before `return`):

```tsx
const handleImport = async () => {
  if (!session) return;
  setIsMigrating(true);
  setMigrationError(null);

  try {
    const guestSessionId = await getOrCreateGuestSessionId();
    await migrateGuestData(session.access_token, guestSessionId);
    await clearLocalHistory();
    setHistory([]);
    setMigrationBanner(null);
    bannerDismissed.current = true;

    // Refresh to show the newly-claimed records (AC7).
    // If this refresh fails, migration has still succeeded; do not surface it
    // as a migration failure. Leave serverItems null and let the next focus
    // attempt retry the fetch.
    try {
      const items = await fetchServerHistory(session.access_token);
      setServerItems(items);
    } catch {
      setServerItems(null);
    }
  } catch {
    setMigrationError('Account migration failed. Please try again.');
  } finally {
    setIsMigrating(false);
  }
};

const handleDismiss = () => {
  bannerDismissed.current = true;
  setMigrationBanner(null);
};
```

**Updated items computation** (replaces `const historyItems = mapValuationsToGridItems(history)`):

```tsx
const historyItems =
  serverItems !== null ? serverItems : mapValuationsToGridItems(history);
```

> The existing `itemCount` and `totalValue` computations below this line use `historyItems` and need no changes.

**Migration banner JSX** — insert at the very beginning of the `<ScreenContainer>` children, before the "Your collection" caption:

```tsx
{migrationBanner ? (
  <View testID="migration-banner" className="mb-6">
    <Text variant="body" className="text-ink mb-4">
      {`You have ${migrationBanner.count} ${
        migrationBanner.count === 1 ? 'valuation' : 'valuations'
      } from your guest session.`}
    </Text>

    {migrationError ? (
      <View accessibilityLiveRegion="polite" testID="migration-error">
        <Text variant="body-sm" className="text-signal mb-3">
          {migrationError}
        </Text>
      </View>
    ) : null}

    <SwissPressable
      onPress={handleImport}
      disabled={isMigrating}
      testID="migration-import-button"
      accessibilityLabel="Import guest valuations to account"
      className="py-4 border-b border-divider"
    >
      <Text variant="body" className="text-signal">
        {isMigrating ? 'Importing…' : 'Import to account'}
      </Text>
    </SwissPressable>

    <SwissPressable
      onPress={handleDismiss}
      testID="migration-dismiss-button"
      accessibilityLabel="Dismiss migration prompt"
      className="py-4 border-b border-divider"
    >
      <Text variant="body" className="text-ink">
        Dismiss
      </Text>
    </SwissPressable>
  </View>
) : null}
```

> **Note on `View` import:** Add `View` to the `react-native` import that already has `useWindowDimensions`. The `bannerDismissed` ref needs `import { useRef } from 'react'` — `useRef` and `useCallback` are already used, so this should already be imported.

> **Note on `accessibilityLiveRegion`:** Place the attribute on the `View` wrapper, not on `Text` directly — this matches the pattern established in `delete-confirm.tsx` (Story 4.10) and is consistent with how React Native handles live-region announcements on both iOS (`accessibilityLiveRegion`) and Android.

---

### Required Backend Test Cases (`backend/tests/test_migrate_guest.py`)

Pattern: `unittest.mock.patch` on `backend.main.get_supabase` for migration tests; `backend.main.ValuationRepository` for history tests.

**`TestMigrateGuest`** (7 cases):

1. `test_migrate_success` — mock Supabase returns 2 rows updated → 200 `{ "migrated": 2 }`; `.update()..eq()..is_()..execute()` called with correct args
2. `test_migrate_missing_auth_header` — no `Authorization` → 401; `get_supabase` NOT called
3. `test_migrate_invalid_token` — `get_user` raises → 401; no DB call
4. `test_migrate_empty_session_id` — body `{ "guest_session_id": "" }` → 422; no Supabase call
5. `test_migrate_zero_rows` — `.execute()` returns empty `data` list → 200 `{ "migrated": 0 }`
6. `test_migrate_is_null_filter_applied` — Independently documents the idempotency invariant: assert that `.is_` is called with exactly `("user_id", "null")` on the Supabase chain, and that `.update` is called with `{"user_id": "user-123"}`. This test's purpose is to make the IS NULL guard an explicit, named contract — distinct from the broader success assertions in `test_migrate_success`.
7. `test_migrate_db_failure` — `.execute()` raises `RuntimeError` → 500

**`TestGetValuations`** (3 cases):

1. `test_get_valuations_success` — patch `ValuationRepository`; `get_by_user.return_value = [record]` → 200; response `valuations` list has 1 item; `get_by_user` called with correct `user_id`
2. `test_get_valuations_missing_auth_header` — 401; `ValuationRepository` NOT instantiated
3. `test_get_valuations_invalid_token` — `get_user` raises → 401

> For `TestGetValuations`, patch both `backend.main.get_supabase` (for auth) and `backend.main.ValuationRepository` (for the repo call). Supply a `ValuationRecord` instance via `ValuationRecord(id="v-1", item_name="Test", item_type="watch", brand="Seiko", confidence="HIGH")` as the `get_by_user` return value.

---

### Required Frontend Test Cases (`apps/mobile/__tests__/history-migration.test.tsx`)

New test file. Use hoisted `jest.mock` for all dependencies. Mock `history.tsx`'s imports — NOT the History component itself.

**Mocks required (all hoisted):**

```tsx
jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/localHistory', () => ({
  getLocalHistory: jest.fn(),
  getOrCreateGuestSessionId: jest.fn(),
  clearLocalHistory: jest.fn(),
}));
jest.mock('@/lib/migration', () => ({
  fetchServerHistory: jest.fn(),
  migrateGuestData: jest.fn(),
}));
jest.mock('@/lib/env', () => ({ env: { useMock: false, apiUrl: 'http://localhost:8000' } }));
jest.mock('@/lib/hooks', () => ({ useOnlineStatus: jest.fn(() => true) }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useFocusEffect: jest.fn((cb) => cb()),
}));
```

> `useFocusEffect` must be mocked so the `fetchHistory` callback fires synchronously in tests. The mock `(cb) => cb()` calls the callback once immediately.

> **Async flush pattern:** `fetchHistory` is an `async` function. The `useFocusEffect` mock fires it synchronously but does not `await` it, so its state updates (setting `serverItems`, `history`, `migrationBanner`) are still pending after `create(...)` returns. Every test that renders `HistoryScreen` and asserts on state-derived elements **must** flush pending promises before asserting:
> ```tsx
> await act(async () => {
>   renderer = create(<HistoryScreen />);
> });
> // — or after create —
> await act(async () => {});
> ```
> This is the same pattern used in `delete-confirm.test.tsx` for the execution tests.

**7 test cases:**

> Every render-based test must flush async state before asserting on the banner, error text, or server items. Use `await act(async () => {})` after `create(<HistoryScreen />)` so the `fetchHistory()` promise chain has a chance to settle.

1. **`shows migration banner when authenticated with local history`**  
   Auth: non-guest, `session.access_token = 'tok'`; `getLocalHistory` → `[mockValuation]`; `fetchServerHistory` → `[]`.  
  Render, flush async state; expect `testID="migration-banner"` in tree; text contains `"1 valuation"`.

2. **`does not show banner for guest users`**  
   Auth: `isGuest: true`; `getLocalHistory` → `[mockValuation]`.  
  Render, flush async state; expect no element with `testID="migration-banner"`.

3. **`does not show banner when local history is empty`**  
   Auth: non-guest; `getLocalHistory` → `[]`; `fetchServerHistory` → `[]`.  
  Render, flush async state; expect no `migration-banner`.

4. **`falls back to local history when server fetch fails`**  
  Auth: non-guest; `getLocalHistory` → `[mockValuation]`; `fetchServerHistory` rejects with `new Error('500')`.  
  Render, flush async state. Expect the migration banner to still appear (because local history loaded). Expect the local-history-derived UI to remain visible. This verifies AC5's distinction between empty success and failed request.

5. **`import: success flow — clears local, refreshes server items`**  
   Setup: banner visible. Press `testID="migration-import-button"`.  
   Expect `migrateGuestData` called once with `('tok', mockGuestSessionId)`.  
   Expect `clearLocalHistory` called once.  
   Expect `fetchServerHistory` called twice (initial load + post-import refresh).  
   Expect banner dismissed (no `migration-banner` in tree after act).

6. **`import: shows error on migration failure`**  
   `migrateGuestData` rejects with `new Error('500')`.  
   Press Import. Expect `testID="migration-error"` text contains `"migration failed"` (case-insensitive).  
   Expect `clearLocalHistory` NOT called.  
   Expect Import button re-enabled (`disabled = false`).

7. **`dismiss: hides banner without API call`**  
   Banner visible. Press `testID="migration-dismiss-button"`.  
   Expect no `migration-banner` in tree.  
   Expect `migrateGuestData` NOT called.  
   Expect `clearLocalHistory` NOT called.

8. **`mock mode: skips server fetch and shows local history`**  
   `env.useMock = true`; Auth: non-guest; `getLocalHistory` → `[mockValuation]`.  
   Render; expect `fetchServerHistory` NOT called; expect no `migration-banner`.

---

### testID Reference

| testID | Element | Present when |
|--------|---------|--------------|
| `migration-banner` | Migration prompt container | Authenticated + local items + not dismissed |
| `migration-import-button` | "Import to account" / "Importing…" | Banner visible |
| `migration-dismiss-button` | "Dismiss" | Banner visible |
| `migration-error` | Inline error text | After failed import attempt |

---

### What NOT to Do

- Do NOT show the migration banner in mock mode — it'd break the development workflow
- Do NOT clear local history until AFTER the server confirms `{ "migrated": N }` — avoids data loss on partial failure
- Do NOT navigate away on migration success — the user stays in History, which now shows their full account history
- Do NOT add Toast or modal — Swiss Minimalist philosophy: the banner is inline and dismissable; the post-migration History refresh is the confirmation
- Do NOT migrate automatically without user confirmation — AC7 requires user intent (the banner press)
- Do NOT remove `mapValuationsToGridItems` — it's still used for guest mode and as the fallback path when server fetch fails

### Migration Order Rationale

The `.is_("user_id", "null")` Supabase filter (`WHERE user_id IS NULL`) is critical: it ensures that if the same `guest_session_id` is somehow reused or the migration is triggered twice, only genuinely unowned records are claimed. Rows already owned by this user (from a previous partial migration) or by another user (edge case) are never overwritten.

The local history clear happens client-side after the server confirms success. If the server UPDATE succeeds but `clearLocalHistory()` throws (AsyncStorage failure), the user sees the migration banner again on next load — they can dismiss it. Their data is safe in both places.
