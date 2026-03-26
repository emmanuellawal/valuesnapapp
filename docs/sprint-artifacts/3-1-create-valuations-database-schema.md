# Story 3.1: Create Valuations Database Schema

**Status:** complete

---

## Story

**As a** developer,
**I want** a Supabase schema for storing valuations,
**So that** user data persists across sessions.

---

## Business Context

### Why This Story Matters

Epic 2 completed the full AI + eBay valuation pipeline — users can now receive accurate, confidence-aware price estimates from a photo. But every valuation vanishes when they leave the screen. Story 3.1 lays the data foundation that makes valuations *permanent assets* rather than ephemeral results.

This is the **foundation story of Epic 3**. Every subsequent story in this epic (save flow, history view, detail view, offline cache) depends on the schema being correct and well-indexed.

**Current State:**
- ✅ Backend has Supabase configured for the eBay *cache* table (`migrations/001_create_cache_table.sql`)  
- ✅ `cache.py` has a working Supabase client (`get_supabase()`) that can be reused  
- ✅ `backend/models.py` has `ItemIdentity` and confidence models that define the data structure  
- ✅ `backend/main.py` returns `{"identity": ..., "valuation": ..., "confidence": ...}` shape  
- ✅ `apps/mobile/types/valuation.ts` has the `Valuation` interface ready  
- ❌ No `valuations` table in Supabase  
- ❌ No RLS policies protecting user data  
- ❌ No `ValuationRepository` service to read/write valuations  

**What This Story Delivers:**
- Migration SQL for the `valuations` table with RLS
- `ValuationRecord` Pydantic model for backend use
- A `ValuationRepository` service class (backend) with `save` / `get_by_user` / `get_by_id`
- Guest-safe schema: `user_id` is nullable (anonymous valuations stored without auth)

### Value Delivery

- **Foundation unlock:** Without this, Stories 3.2–3.5 cannot be implemented
- **Architecture correctness:** Supabase RLS ensures user data isolation from day one
- **Guest support:** Nullable `user_id` supports anonymous valuations (full auth in Epic 4)

### Epic Context

This is Story 1 of 5 in Epic 3 (History & Persistence). It is a backend-only story — no frontend changes required.

**Story Dependency Graph:**
```
3.1 DB Schema (this story)
   └─► 3.2 Save Valuation Flow
          └─► 3.3 History List View
                 └─► 3.4 Valuation Details
                        └─► 3.5 Offline Viewing
```

---

## Acceptance Criteria

### AC1: Valuations Table Created

**Given** Supabase is configured (`SUPABASE_URL` + `SUPABASE_SERVICE_KEY` in `.env`)  
**When** migration `002_create_valuations_table.sql` is executed in Supabase SQL Editor  
**Then** the `public.valuations` table exists with these columns:

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `UUID` | NOT NULL | Primary key, `gen_random_uuid()` default |
| `user_id` | `UUID` | NULL | FK to `auth.users(id) ON DELETE SET NULL`, nullable for guests |
| `guest_session_id` | `TEXT` | NULL | Device/session ID for guest valuations (Epic 4 claim path) |
| `image_thumbnail_url` | `TEXT` | NULL | Stored thumbnail URL (full image deleted per NFR-S6) |
| `item_name` | `TEXT` | NOT NULL | e.g., "Sony WH-1000XM4 Headphones" |
| `item_type` | `TEXT` | NOT NULL | e.g., "wireless headphones" |
| `brand` | `TEXT` | NOT NULL | e.g., "Sony" |
| `price_min` | `NUMERIC(10,2)` | NULL | Low end of price range |
| `price_max` | `NUMERIC(10,2)` | NULL | High end of price range |
| `fair_market_value` | `NUMERIC(10,2)` | NULL | Median estimate |
| `confidence` | `TEXT` | NOT NULL | CHECK in ('HIGH','MEDIUM','LOW') |
| `sample_size` | `INTEGER` | NULL | Number of sales analyzed |
| `ai_response` | `JSONB` | NULL | Full `identity` dict from AI |
| `ebay_data` | `JSONB` | NULL | Full `valuation` dict from eBay |
| `confidence_data` | `JSONB` | NULL | Full `confidence` dict |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` default |

**And** the following indexes are created:
- `idx_valuations_user_id` on `(user_id)`
- `idx_valuations_created_at` on `(created_at DESC)`
- `idx_valuations_user_created` on `(user_id, created_at DESC)` (composite, for history queries)
- `idx_valuations_guest_session` on `(guest_session_id)` WHERE `guest_session_id IS NOT NULL` (partial index, for guest claim path)

---

### AC2: Row Level Security Configured

**Given** the `valuations` table exists  
**When** RLS policies are applied  
**Then** `ALTER TABLE public.valuations ENABLE ROW LEVEL SECURITY` is set  
**And** the following policies exist:

| Policy | Operation | Role | Condition |
|--------|-----------|------|-----------|
| "Service role full access" | ALL | `service_role` | `true` |
| "Users can view own valuations" | SELECT | `authenticated` | `auth.uid() = user_id` |
| "Users can insert own valuations" | INSERT | `authenticated` | `auth.uid() = user_id` |
| "Users can delete own valuations" | DELETE | `authenticated` | `auth.uid() = user_id` |

**And** guest valuations (null `user_id`) are written by service role only (no client-side insert)

---

### AC3: ValuationRecord Pydantic Model

**Given** the database schema is defined  
**When** `backend/models.py` is updated  
**Then** a `ValuationRecord` Pydantic model exists with fields matching the table schema  
**And** it includes a `from_appraise_response(identity_dict, valuation_dict, confidence_dict, user_id=None, guest_session_id=None)` class method that constructs a `ValuationRecord` using these exact key mappings:

| `ValuationRecord` field | Source |
|---|---|
| `item_type` | `identity_dict["item_type"]` |
| `brand` | `identity_dict["brand"]` |
| `ai_response` | `identity_dict` (full dict) |
| `price_min` | `valuation_dict["price_range"]["min"]` |
| `price_max` | `valuation_dict["price_range"]["max"]` |
| `fair_market_value` | `valuation_dict.get("fair_market_value")` |
| `sample_size` | `valuation_dict.get("prices_analyzed")` ← NOT `sample_size` |
| `ebay_data` | `valuation_dict` (full dict) |
| `confidence` | `confidence_dict["market_confidence"]` |
| `confidence_data` | `confidence_dict` (full dict) |

**And** the model handles `None` for `user_id` and `guest_session_id` (guest use case)

---

### AC4: ValuationRepository Service

**Given** the `ValuationRecord` model exists  
**When** `backend/services/valuations.py` is created  
**Then** it contains a `ValuationRepository` class with these methods:

| Method | Signature | Returns |
|--------|-----------|---------|
| `save` | `(record: ValuationRecord) -> str` | Saved valuation `id` |
| `get_by_user` | `(user_id: str, limit: int = 50) -> list[ValuationRecord]` | Ordered newest-first |
| `get_by_id` | `(valuation_id: str, user_id: str | None = None) -> ValuationRecord | None` | None if not found |
| `delete_by_id` | `(valuation_id: str, user_id: str | None = None) -> bool` | True if deleted, False if not found |

**And** all methods use the existing `get_supabase()` client from `cache.py`  
**And** database errors are caught and re-raised as `ValueError` with descriptive messages  
**And** `save()` returns the UUID string of the created record

---

### AC5: Migration Verification

**Given** the migration has been run  
**When** the backend test suite is run  
**Then** a `test_valuations_repository.py` test file passes with:
- `test_save_valuation_guest()` — saves a record with `user_id=None`, returns a UUID string
- `test_save_valuation_authenticated()` — saves with a valid `user_id`
- `test_get_by_user_empty()` — returns `[]` for user with no valuations
- `test_get_by_id_not_found()` — returns `None` for nonexistent ID
- `test_delete_by_id()` — saves a record, deletes it, confirms `get_by_id` returns `None`
- `test_rls_cross_user_isolation()` — saves record with `user_id=A`, queries with `user_id=B`, confirms returns `None`

**And** all 6 tests pass  
**And** tests that require real Supabase are skipped when `SUPABASE_URL` is not set (using `pytest.mark.skipif`)

---

## Technical Notes

### Schema Design Decisions

**Why JSONB for `ai_response`, `ebay_data`, `confidence_data`?**  
The full API response shapes will evolve as Epic 2 models are refined. Storing them as JSONB gives us the flexibility to query sub-fields in future sprints while normalizing the most-queried columns (`item_name`, `price_min`, `price_max`, `confidence`).

This follows ARCH-13 (hybrid schema: normalized tables + JSONB for AI/eBay responses).

**Why nullable `user_id` + `guest_session_id`?**  
Epic 4 handles authentication. For Epic 3, valuations from the current session (guest or pre-auth) should still be saveable. The backend service role writes these records. The `guest_session_id` column (a device-generated UUID stored in AsyncStorage) provides the **claim path**: when a guest creates an account in Epic 4, we run `UPDATE valuations SET user_id = ? WHERE guest_session_id = ?` to associate their anonymous valuations with their new account. Without this column, there's no way to identify which null-user rows belong to which guest.

**Why `item_name` is NOT NULL?**  
It's derived at write time with cascading fallback logic: `"{brand} {model}"` → `"{brand} {item_type}"` → `"{item_type}"`. We always have `item_type` from the AI response, so this is always populated. This enables history display without parsing JSONB and avoids storing `"unknown unknown"` as a name.

### Reusing Existing Infrastructure

- `get_supabase()` in `cache.py` — use as-is; no new Supabase client needed
- `backend/models.py` — add `ValuationRecord` here alongside existing models
- `backend/config.py` — `supabase_url` and `supabase_service_key` already defined

### Migration File Convention

Follow the existing pattern from `migrations/001_create_cache_table.sql`:
- File: `backend/migrations/002_create_valuations_table.sql`
- Include: table creation, indexes, RLS enable, policy creation, column comments

---

## Tasks / Subtasks

### Task 1: Write Migration SQL (AC: #1, #2)
**Estimated:** 30 min

- [ ] 1.1: Create `backend/migrations/002_create_valuations_table.sql`
- [ ] 1.2: Define table with all columns from AC1 (UUID PK, nullable `user_id` with `REFERENCES auth.users(id) ON DELETE SET NULL`, `guest_session_id`, JSONB columns, timestamps)
- [ ] 1.3: Add `CHECK (confidence IN ('HIGH','MEDIUM','LOW'))` constraint
- [ ] 1.4: Create the three indexes (user_id, created_at DESC, composite)
- [ ] 1.5: Enable RLS and create the four policies from AC2
- [ ] 1.6: Add column comments for documentation
- [ ] 1.7: Run migration in Supabase SQL Editor and verify table appears in Table Editor

**Files to Create:**
```
backend/migrations/002_create_valuations_table.sql
```

---

### Task 2: Create ValuationRecord Pydantic Model (AC: #3)
**Estimated:** 30 min

- [ ] 2.1: Add `ValuationRecord` class to `backend/models.py`
- [ ] 2.2: Include all fields from the database schema (use `Optional` for nullable columns)
- [ ] 2.3: Add `id: Optional[str] = None` (populated after save, not before)
- [ ] 2.4: Implement `from_appraise_response(identity_dict, valuation_dict, confidence_dict, user_id=None, guest_session_id=None)` classmethod — use the exact field mapping table in AC3
- [ ] 2.5: In `from_appraise_response()`, construct `item_name` with fallback logic: if brand AND model are both `"unknown"`, use `item_type` (e.g., "wireless headphones"); if only model is `"unknown"`, use `f"{brand} {item_type}"`; otherwise use `f"{brand} {model}"`
- [ ] 2.6: Ensure `created_at` defaults to `datetime.now(timezone.utc)` if not provided
- [ ] 2.7: ⚠️ `model_dump()` pitfall — always use `record.model_dump(mode='json', exclude_none=True)` when passing to Supabase: `mode='json'` converts `datetime` → ISO string (plain `model_dump()` returns Python objects that crash `json.dumps()`); `exclude_none=True` omits `id=None` so Postgres uses `gen_random_uuid()` default (passing `"id": null` explicitly breaks the NOT NULL PK)

**Files to Modify:**
```
backend/models.py
```

---

### Task 3: Implement ValuationRepository (AC: #4)
**Estimated:** 45 min

- [ ] 3.1: Create `backend/services/valuations.py`
- [ ] 3.2: Import `get_supabase` from `backend.cache` (no new client needed)
- [ ] 3.3: Implement `ValuationRepository` class
- [ ] 3.4: Implement `save(record)` with the exact Supabase v2 pattern:
  ```python
  result = supabase.table("valuations").insert(
      record.model_dump(mode='json', exclude_none=True)
  ).execute()
  return result.data[0]["id"]
  ```
  Use `mode='json', exclude_none=True` — see Task 2.7 for why this is critical
- [ ] 3.5: Implement `get_by_user(user_id, limit=50)` — query with `.eq("user_id", user_id).order("created_at", desc=True).limit(limit)`
- [ ] 3.6: Implement `get_by_id(valuation_id, user_id=None)` — query by `id`; if `user_id` is provided, add `.eq("user_id", user_id)` for RLS-safe access
- [ ] 3.7: Implement `delete_by_id(valuation_id, user_id=None)` — delete by `id`; if `user_id` is provided, add `.eq("user_id", user_id)`; return `True` if deleted, `False` if not found
- [ ] 3.8: Wrap database calls in try/except; re-raise as `ValueError` with message
- [ ] 3.9: ⚠️ Do NOT add exports to `backend/services/__init__.py` — it is intentionally empty; all other services are imported directly (e.g. `from backend.services.ai import ...`). Import as: `from backend.services.valuations import ValuationRepository`

**Files to Create:**
```
backend/services/valuations.py
```

---

### Task 4: Write Tests (AC: #5)
**Estimated:** 60 min

> **Pattern to follow:** `backend/tests/test_cache.py` — use `@patch('backend.cache.get_supabase')` + `MagicMock()` for unit tests. Unit tests MUST always run in CI (no skip). Integration tests (real Supabase) are a separate class with `skipif`.

- [ ] 4.1: Create `backend/tests/test_valuations_repository.py` with two test classes:
  - `TestValuationRepositoryUnit` — mocked Supabase, always runs in CI
  - `TestValuationRepositoryIntegration` — real Supabase, skipped if no credentials
- [ ] 4.2: For the integration class only: `pytestmark = pytest.mark.skipif(not os.getenv("SUPABASE_URL"), reason="Supabase not configured")`
- [ ] 4.3: Write `test_save_valuation_guest()` — use `ValuationRecord.from_appraise_response()` with mock dicts, call `repo.save()`, assert result is a non-empty string UUID
- [ ] 4.4: Write `test_save_valuation_authenticated()` — same but with a test `user_id` UUID
- [ ] 4.5: Write `test_get_by_user_empty()` — query with a random UUID, assert returns `[]`
- [ ] 4.6: Write `test_get_by_id_not_found()` — query with a random UUID, assert returns `None`
- [ ] 4.7: Write `test_delete_by_id()` — save a record, call `delete_by_id()`, assert returns `True`, then `get_by_id()` returns `None`
- [ ] 4.8: Write `test_rls_cross_user_isolation()` — save with `user_id=uuid_a`, call `get_by_id(id, user_id=uuid_b)`, assert `None`
- [ ] 4.9: Unit tests to add in `TestValuationRepositoryUnit`:
  - `test_save_returns_id()` — mock `insert().execute()` returning `[{"id": "uuid-abc"}]`, assert result is `"uuid-abc"`
  - `test_get_by_user_empty_returns_list()` — mock `.execute()` returning `{"data": []}`, assert returns `[]`
  - `test_get_by_id_not_found_returns_none()` — mock `.execute()` returning `{"data": []}`, assert returns `None`
  - `test_delete_by_id_returns_true_when_deleted()` — mock `.execute()` returning `{"data": [{"id": "x"}]}`, assert `True`
  - `test_delete_by_id_returns_false_when_not_found()` — mock returning `{"data": []}`, assert `False`
- [ ] 4.10: In `TestValuationRepositoryIntegration`, define cleanup as `@pytest.fixture(autouse=True)` within the class (no separate `conftest.py` needed — there is no existing one in `backend/tests/`)
- [ ] 4.11: Run `pytest backend/tests/test_valuations_repository.py -v` — unit tests must always pass; integration tests skip cleanly without Supabase

**Files to Create:**
```
backend/tests/test_valuations_repository.py
```

---

## Definition of Done

- [ ] Migration SQL file created and committed
- [ ] Migration run in Supabase and table visible in dashboard
- [ ] `ValuationRecord` model added to `backend/models.py` with `from_appraise_response()` classmethod
- [ ] `ValuationRepository` created in `backend/services/valuations.py` with `save`, `get_by_user`, `get_by_id`, `delete_by_id`
- [ ] 6 tests written in `test_valuations_repository.py`; all pass or skip cleanly
- [ ] RLS policies prevent cross-user data access (verified manually or via test)
- [ ] No changes to the frontend in this story
- [ ] Story 3.2 can now be started (save flow will call `ValuationRepository.save()`)

---

## Out of Scope

- Saving valuations automatically on the frontend (Story 3.2)
- History UI (Story 3.3)
- Image thumbnail generation (deferred to Story 3.2 — no image upload in this story)
- Account authentication (Epic 4)
- Guest local storage (Story 3.2 will handle the guest path using AsyncStorage)
