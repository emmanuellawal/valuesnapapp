# Epic 3: History & Persistence — Execution Plan

**Date:** March 19, 2026  
**Epic Duration:** Estimated 1.5–2 weeks  
**Stories:** 6 total  
**Dependencies:** Epic 2 (AI Valuation Engine) ✅ Complete

---

## Executive Summary

Epic 3 transforms ValueSnap from a *one-shot valuation tool* into a **personal valuation ledger**. Every item a user photographs becomes a permanent asset they can reference, revisit, and eventually list on eBay.

**Epic 2 left us here:**
```
Photo → Backend → GPT → eBay → [Valuation Result displayed] → GONE
```

**Epic 3 delivers:**
```
Photo → Backend → GPT → eBay → [Valuation Result displayed] → SAVED
                                                                  ↓
                                          History Tab: [Grid of past valuations]
                                                                  ↓
                                          Tap any card: [Full detail view]
```

---

## Current State Analysis

### ✅ Already Built (Backend)
- FastAPI `/api/appraise` endpoint returns `{identity, valuation, confidence}` shape
- Supabase client in `cache.py` (`get_supabase()`) — reusable for valuations table
- `backend/models.py` with `ItemIdentity`, confidence types
- `backend/config.py` with `supabase_url`, `supabase_service_key`
- Working cache migration pattern (`migrations/001_create_cache_table.sql`)

### ✅ Already Built (Frontend)
- `Valuation` interface in `apps/mobile/types/valuation.ts`
- `HistoryGrid` organism component (mocked data)
- `ValuationCard` molecule component (mocked data)
- History tab screen with mock data (`app/(tabs)/history.tsx`)
- Skeleton loaders for history grid
- Primitives: `Box`, `Stack`, `Text`, `ScreenContainer`

### 🔧 Needs Building
- Supabase `valuations` table + RLS (Story 3.1)
- Auto-save after appraise (Story 3.2)
- Wire history tab to real data (Story 3.3)
- Valuation detail view (Story 3.4)
- Offline cache with network detection (Story 3.5)
- Desktop sidebar navigation for large screens (Story 3.6)

---

## Story Dependency Graph

```
3.1: DB Schema (backend only)
  └─► 3.2: Save Valuation Flow (backend + light frontend)
              └─► 3.3: History List View (frontend + backend API)
                        └─► 3.4: Valuation Details (frontend + backend API)
                                  └─► 3.5: Offline Viewing (frontend)
                                            └─► 3.6: Desktop Sidebar Navigation (frontend)
```

All stories are **strictly sequential** — each one depends on the prior.

---

## Story Summaries

### Story 3.1: Create Valuations Database Schema
**Backend only. Foundation for all other stories.**  
- Migration SQL: `valuations` table with JSONB columns + RLS
- `ValuationRecord` Pydantic model with `from_appraise_response()` classmethod  
- `ValuationRepository` service: `save()`, `get_by_user()`, `get_by_id()`  
- 4 integration tests (skip if no Supabase configured)

### Story 3.2: Implement Save Valuation Flow
**Backend + minimal frontend.**  
- Backend: Call `ValuationRepository.save()` at end of `/api/appraise`
- Backend: Return `valuation_id` in API response
- Frontend: Pass `valuation_id` through appraise response into `Valuation` entity
- Guest path: Save last 5 valuations to `AsyncStorage` (local storage on device)
- Image handling: Store compressed thumbnail URI locally; full image not persisted

### Story 3.3: Build History List View
**Frontend + new `/api/history` backend endpoint. NOTE: This is a full-stack story.**  
- New GET `/api/history?user_id={uid}&limit=50` endpoint (returns **summary projection**, no JSONB)
- Wire `app/(tabs)/history.tsx` to real API data (replace mock with real fetch)
- Empty state: "Start Valuing" CTA when no history
- Skeleton loading while fetching
- Guest path: Read from `AsyncStorage` (5-item cap shown with upgrade prompt)

### Story 3.4: Display Valuation Details
**Frontend + `/api/history/{id}` endpoint.**  
- Route: `app/valuation/[id].tsx` (new file)
- Full valuation detail: image, price range, confidence, sample size, description, timestamp
- Action buttons: "List on eBay" (Epic 5) and "Delete"
- Delete: calls `ValuationRepository` to remove from DB, pops back to history

### Story 3.5: Implement Offline Viewing
**Frontend only. Progressive enhancement.**  
- `useOnlineStatus` hook using `navigator.onLine` plus `online`/`offline` window events
- Show a non-blocking offline banner in History while cached local valuations continue to render
- Replace the Camera tab UI with an offline state and a "View History" CTA when offline
- No new dependency required; native fallback remains online-safe and API layer still handles failures

### Story 3.6: Desktop Sidebar Navigation
**Frontend only. Responsive layout enhancement.**  
- Switch tab navigation at `width >= 1024` from bottom bar to a compact left desktop rail
- Use React Navigation `tabBarPosition: 'left'` with a custom `SwissSidebar`
- Preserve the existing `SwissTabBar` unchanged below 1024px
- Keep the same three routes (Camera, History, Settings) with text-only Swiss Minimalist navigation
- Historical implementation note: Story 3.6 shipped with a fixed 240px width, but future desktop polish is governed by the 10/45/45 workstation model adopted in the Epic 5 retrospective

---

## Technical Decisions

### Guest vs Authenticated

For Epic 3, we do not implement authentication (that's Epic 4). The approach:

| Scenario | Storage | Limit |
|----------|---------|-------|
| Guest (no auth) | `AsyncStorage` on device | 5 valuations (NFR-G1) |
| Authenticated | Supabase `valuations` table | Unlimited |

Guest valuations written by the **backend service role** with `user_id = null` and a `guest_session_id` (device-generated UUID stored in AsyncStorage). In Epic 4, a "claim" migration associates them with the user's real ID: `UPDATE valuations SET user_id = ? WHERE guest_session_id = ?`.

### Image Storage

Per NFR-S6: "full image deleted within 24 hours, thumbnail only in history."

For Epic 3:
- The compressed preview image URI is stored **locally only** (in the `Valuation` entity's `imageUri`)  
- No S3/Supabase Storage uploads yet — this keeps complexity low and sidesteps image hosting costs
- The `image_thumbnail_url` column is created but nullable; image hosting deferred to Epic 6 (PWA polish)

> **Known gap:** History cards won't show images from the server. The local `imageUri` only works on the device that took the photo. Cross-device history (Epic 4+) will show no images until image hosting is added. A placeholder icon will be shown when `imageUri` is null.

### API Route for History

New endpoint: `GET /api/history`
- Query param: `user_id` (optional — guest returns empty, future: auth header)
- Returns: array of `ValuationRecord` **summary projections** (no JSONB blobs — only `id`, `item_name`, `item_type`, `brand`, `price_min`, `price_max`, `fair_market_value`, `confidence`, `sample_size`, `image_thumbnail_url`, `created_at`)
- Full JSONB columns (`ai_response`, `ebay_data`, `confidence_data`) only loaded in detail view (`GET /api/history/{id}`)
- Pagination: `limit` param (default 50, max 200)

> **Epic 4 migration note:** In Epic 4, `user_id` will come from the JWT auth header, not a query param. The `ValuationRepository.get_by_user(user_id)` method signature stays stable regardless of where the ID originates.

### Shared Guest Storage Pattern

Stories 3.2, 3.3, and 3.5 all interact with AsyncStorage for guest history. To avoid duplication:
- **Story 3.2** creates a `useLocalHistory` hook with `saveLocal()` and `getLocal()` methods
- **Stories 3.3 and 3.5** reuse this hook rather than reimplementing AsyncStorage logic
- The hook enforces the 5-item cap (NFR-G1) and handles serialization/deserialization
- This also stores the `guest_session_id` for the Epic 4 claim path

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Supabase migration breaks cache table | Low | Migration tested in isolation; cache uses separate table |
| JSONB columns slow down history queries | Low | Indexed scalar columns (`item_name`, `confidence`) used for list view; JSONB only in detail view |
| AsyncStorage race conditions (guest) | Medium | Serialize reads/writes with mutex or sequential async; tested in Story 3.5 |
| Offline detection unreliable on some devices | Medium | Graceful fallback: show cached data if fetch fails, not just when explicitly offline |

---

## Epic 3 Exit Criteria

- [ ] Users can complete a valuation and find it in the History tab 30 seconds later
- [ ] History tab shows real persisted data (not mocks)
- [ ] Tapping a history card opens a full detail view
- [ ] Guest users see up to 5 valuations in history
- [ ] App shows cached history when offline (no crash, no empty screen)
- [ ] All 6 stories reach `done` status in `sprint-status.yaml`
