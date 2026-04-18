   # Epic 2: AI Valuation Engine - Execution Plan

**Date:** January 31, 2026  
**Epic Duration:** Estimated 2-3 weeks  
**Stories:** 11 total  
**Dependencies:** Epic 1 (Camera Capture) ✅ Complete

---

## Executive Summary

Epic 2 is the **core value engine** of ValueSnap - where photos become valuations. This epic connects the frontend camera capture to the backend AI + eBay services, displaying results with confidence-aware messaging.

**The Flow:**
```
Photo (Epic 1) → Backend API → GPT-4o-mini → eBay Browse API → Valuation Result → Display
```

**Current State Analysis:**

### ✅ Already Built (Backend)
- FastAPI server with `/api/appraise` endpoint
- `services/ai.py` - GPT-4o-mini integration with structured output
- `services/ebay.py` - eBay Browse API with IQR filtering
- `models.py` - Pydantic models for ItemIdentity
- Mock services for development (`mock_ai.py`, `mock_ebay.py`)
- Config with `use_mock` toggle

### ✅ Already Built (Frontend)
- TypeScript types (`types/item.ts`, `types/market.ts`, `types/valuation.ts`)
- Mock data factories (`types/mocks.ts`)
- `ValuationCard` component (Story 0-5)
- `ValuationCardSkeleton` for loading states

### 🔧 Needs Building
- Frontend → Backend API integration (api client)
- Real image upload flow
- Processing progress states
- Error handling UI
- Confidence-based messaging
- Market velocity indicator

---

## Story Dependency Graph

```
                    ┌─────────────────────────────────────┐
                    │  BACKEND FOUNDATION (Stories 2-1 to 2-5)  │
                    └─────────────────────────────────────┘
                                      │
      ┌───────────────────────────────┼───────────────────────────────┐
      ▼                               ▼                               ▼
┌──────────┐                   ┌──────────┐                   ┌──────────┐
│  2-1     │◄──────────────────│  2-2     │──────────────────►│  2-3     │
│ API      │                   │ AI       │                   │ Cache    │
│ Endpoint │                   │ Integrate│                   │ Layer    │
└────┬─────┘                   └────┬─────┘                   └────┬─────┘
     │                              │                              │
     │                              ▼                              │
     │                        ┌──────────┐                         │
     │                        │  2-4     │◄────────────────────────┘
     │                        │ eBay     │
     │                        │ Integrate│
     │                        └────┬─────┘
     │                              │
     │                              ▼
     │                        ┌──────────┐
     └───────────────────────►│  2-5     │
                              │Confidence│
                              │ Service  │
                              └────┬─────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                              ▼
            ┌─────────────────────────────────────────────────┐
            │   FRONTEND DISPLAY (Stories 2-6 to 2-11)        │
            └─────────────────────────────────────────────────┘
                                   │
      ┌───────────────┬────────────┼────────────┬───────────────┐
      ▼               ▼            ▼            ▼               ▼
┌──────────┐   ┌──────────┐ ┌──────────┐ ┌──────────┐   ┌──────────┐
│  2-6     │   │  2-7     │ │  2-8     │ │  2-9     │   │  2-10    │
│ValuCard  │   │Progress  │ │AI Fail   │ │No Market │   │Confidence│
│Component │   │States    │ │Handler   │ │Handler   │   │Messaging │
└──────────┘   └──────────┘ └──────────┘ └──────────┘   └────┬─────┘
                                                              │
                                                              ▼
                                                        ┌──────────┐
                                                        │  2-11    │
                                                        │ Velocity │
                                                        │Indicator │
                                                        └──────────┘
```

---

## Implementation Order (Recommended)

### Phase A: Backend Integration (Stories 2-1 to 2-5)
**Estimated: 2-3 days**

These can be done in parallel since backend is mostly built. Focus is validation and testing.

| Order | Story | Effort | Dependencies | Notes |
|-------|-------|--------|--------------|-------|
| 1 | **2-1** Create Valuation API Endpoint | 2-3h | None | Verify existing `/api/appraise` works |
| 2 | **2-2** Integrate AI Item Identification | 2-3h | 2-1 | Test GPT integration, validate responses |
| 2 | **2-3** Implement Cache Layer for eBay | 2-3h | 2-1 | Redis or in-memory cache for tokens/results |
| 3 | **2-4** Integrate eBay Market Data | 3-4h | 2-2, 2-3 | Test real eBay API, validate IQR |
| 4 | **2-5** Implement Confidence Calculation | 2-3h | 2-4 | Finalize confidence tiers logic |

**Phase A Deliverable:** Working backend that accepts image, returns valuation.

### Phase B: Frontend Display (Stories 2-6 to 2-11)
**Estimated: 3-4 days**

| Order | Story | Effort | Dependencies | Notes |
|-------|-------|--------|--------------|-------|
| 5 | **2-6** Build ValuationCard Component | 3-4h | 2-5 | Enhance existing card, Swiss design |
| 6 | **2-7** Display Processing Progress States | 2-3h | 2-6 | Progressive loading UI |
| 7 | **2-8** Handle AI Identification Failures | 2-3h | 2-7 | Error states, manual entry fallback |
| 8 | **2-9** Handle Insufficient Market Data | 2-3h | 2-7 | LOW/NONE confidence messaging |
| 9 | **2-10** Display Confidence-Based Messaging | 2-3h | 2-8, 2-9 | Typography-driven confidence UI |
| 10 | **2-11** Display Market Velocity Indicator | 2-3h | 2-10 | How fast items sell indicator |

**Phase B Deliverable:** Full valuation flow from camera to result display.

---

## Story Details

### Story 2-1: Create Valuation API Endpoint

**Status:** Backend exists, needs frontend client

**What Exists:**
- `/api/appraise` endpoint in `backend/main.py`
- Accepts `AnalyzeRequest` with `image_base64`
- Returns `{identity: {...}, valuation: {...}}`

**What's Needed:**
1. Create `apps/mobile/lib/api.ts` - API client
2. Create `apps/mobile/lib/hooks/useValuation.ts` - React Query hook
3. Handle image base64 encoding in frontend
4. Connect CameraScreen to API

**Acceptance Criteria:**
- [ ] Frontend can send photo to `/api/appraise`
- [ ] Response parsed and displayed
- [ ] Mock mode works (when `EXPO_PUBLIC_USE_MOCK=true`)
- [ ] Error states handled

**Estimated Effort:** 2-3 hours

---

### Story 2-2: Integrate AI Item Identification

**Status:** Backend exists, needs validation

**What Exists:**
- `services/ai.py` with `identify_item_from_image()`
- Uses `client.beta.chat.completions.parse()` for structured output
- Returns `ItemIdentity` model

**What's Needed:**
1. Test with real images (various item types)
2. Validate prompt handles edge cases
3. Ensure graceful fallback for unidentifiable items
4. Add retry logic for API failures

**Acceptance Criteria:**
- [ ] 10+ test images processed successfully
- [ ] "Unknown" items handled gracefully
- [ ] API failures return user-friendly errors
- [ ] Response time < 5 seconds (typical)

**Estimated Effort:** 2-3 hours

---

### Story 2-3: Implement Cache Layer for eBay API

**Status:** Token cache exists in memory, needs enhancement

**What Exists:**
- `TOKEN_CACHE` in `ebay.py` for OAuth token
- In-memory only (lost on server restart)

**What's Needed:**
1. Keep token cache (works for MVP)
2. Optional: Add Redis for production scale
3. Add response caching for common queries
4. TTL for cached results (1 hour suggested)

**Acceptance Criteria:**
- [ ] Token survives between requests (not re-fetched every time)
- [ ] Repeated queries use cache
- [ ] Cache invalidation works
- [ ] Mock mode bypasses cache

**Estimated Effort:** 2-3 hours (basic), +3h for Redis

---

### Story 2-4: Integrate eBay Market Data

**Status:** Backend exists, needs real testing

**What Exists:**
- `services/ebay.py` with `search_sold_listings()`
- OAuth flow implemented
- IQR outlier filtering

**What's Needed:**
1. Test against sandbox eBay API
2. Verify price extraction logic
3. Test with various search queries
4. Handle rate limits gracefully

**Acceptance Criteria:**
- [ ] Real eBay API calls work (sandbox)
- [ ] Prices parsed correctly
- [ ] IQR filtering removes outliers
- [ ] Rate limit returns graceful error

**Estimated Effort:** 3-4 hours

---

### Story 2-5: Implement Confidence Calculation Service

**Status:** Partially exists in code comments

**What's Needed:**
1. Formalize confidence tiers:
   - NONE: 0 results
   - LOW: 1-4 results
   - MEDIUM: 5-9 results
   - HIGH: 10+ results
2. Add confidence to response
3. Include sample size in response
4. Add `show_manual_review` flag

**Acceptance Criteria:**
- [ ] Confidence tier in API response
- [ ] Sample size visible
- [ ] LOW/NONE triggers manual review flag
- [ ] Confidence maps to frontend types

**Estimated Effort:** 2-3 hours

---

### Story 2-6: Build ValuationCard Component

**Status:** Skeleton exists, needs enhancement

**What Exists:**
- `ValuationCardSkeleton` in `components/molecules`
- TypeScript types in `types/market.ts`

**What's Needed:**
1. Create full `ValuationCard` with:
   - Item photo
   - Brand/Model (h3)
   - Price range (display size, bold)
   - Fair market value (emphasized)
   - Confidence indicator
   - Sample size caption
2. Swiss Minimalist styling
3. Interactive (pressable to view details)

**Acceptance Criteria:**
- [ ] Card displays all valuation data
- [ ] Typography hierarchy per Swiss spec
- [ ] Confidence visually distinct (typography weight)
- [ ] Pressable with navigation to details

**Estimated Effort:** 3-4 hours

---

### Story 2-7: Display Processing Progress States

**Status:** Basic exists, needs enhancement

**What Exists:**
- "Analyzing your item..." text in CameraScreen
- `ValuationCardSkeleton` for loading

**What's Needed:**
1. Progressive loading states:
   - "Identifying your item..." (0-3s)
   - "Searching market data..." (3-8s)
   - "Calculating fair value..." (8-15s)
2. Typography-driven (no spinners)
3. Timeout handling (25s max)

**Acceptance Criteria:**
- [ ] Three distinct loading messages
- [ ] Messages change based on elapsed time
- [ ] Skeleton shows during loading
- [ ] Timeout after 25s with retry option

**Estimated Effort:** 2-3 hours

---

### Story 2-8: Handle AI Identification Failures

**Status:** Backend returns error, frontend needs UI

**What's Needed:**
1. Error state UI for "AI couldn't identify"
2. Suggestions:
   - "Try a clearer photo"
   - "Photograph the label/tag"
3. Manual entry fallback link (future)
4. Retry button

**Acceptance Criteria:**
- [ ] Friendly error message displayed
- [ ] Helpful suggestions shown
- [ ] Retry button works
- [ ] Error tracked (for future analytics)

**Estimated Effort:** 2-3 hours

---

### Story 2-9: Handle Insufficient Market Data

**Status:** Backend returns status, frontend needs UI

**What's Needed:**
1. UI for "Not enough market data"
2. Show what was found (if any)
3. Suggestions:
   - "Try searching eBay manually"
   - Link to eBay search
4. Manual review flag respected

**Acceptance Criteria:**
- [ ] LOW/NONE confidence shows special UI
- [ ] Manual review suggestion displayed
- [ ] Still shows partial data if available
- [ ] Doesn't feel like failure (guidance)

**Estimated Effort:** 2-3 hours

---

### Story 2-10: Display Confidence-Based Messaging

**Status:** Types exist, needs implementation

**What's Needed:**
1. Typography-based confidence:
   - HIGH: Bold price, prominent display
   - MEDIUM: Regular weight, "reasonable estimate"
   - LOW: Light weight, "estimate may vary"
2. Sample size shown as caption
3. Trust-building language

**Acceptance Criteria:**
- [ ] HIGH confidence = bold, confident tone
- [ ] MEDIUM confidence = helpful, moderate tone
- [ ] LOW confidence = cautious, guidance tone
- [ ] Typography weight matches confidence

**Estimated Effort:** 2-3 hours

---

### Story 2-11: Display Market Velocity Indicator

**Status:** Not yet designed

**What's Needed:**
1. Calculate velocity from:
   - Number of listings
   - Recency of sales
   - Demand signals
2. Display as text:
   - "Selling fast" (high velocity)
   - "Steady demand" (medium)
   - "Limited activity" (low)
3. Swiss typography (no icons/colors)

**Acceptance Criteria:**
- [ ] Velocity calculated from market data
- [ ] Text indicator displayed
- [ ] No decorative elements
- [ ] Helpful for pricing decisions

**Estimated Effort:** 2-3 hours

---

## Technical Decisions

### API Client Architecture

**Recommended: Create dedicated API client**

```typescript
// apps/mobile/lib/api.ts
const API_BASE = process.env.EXPO_PUBLIC_API_URL;

export async function appraiseItem(imageBase64: string): Promise<ValuationResponse> {
  const response = await fetch(`${API_BASE}/api/appraise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: imageBase64 }),
  });
  
  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }
  
  return transformValuationResponse(await response.json());
}
```

### Image Encoding

**Use expo-file-system for base64 encoding:**

```typescript
import * as FileSystem from 'expo-file-system';

async function encodeImageToBase64(uri: string): Promise<string> {
  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}
```

### Mock Mode Toggle

**Already configured in `.env`:**
- `EXPO_PUBLIC_USE_MOCK=true` → Frontend uses mock data
- `USE_MOCK=true` → Backend uses mock services

---

## Risk Assessment

### High Risk
1. **eBay API Rate Limits** - Sandbox has 5000 calls/day
   - Mitigation: Cache responses, test efficiently
   
2. **OpenAI API Costs** - GPT-4o-mini ~$0.003/image
   - Mitigation: Use mock mode for development

### Medium Risk
3. **Response Time Variability** - GPT can take 3-15s
   - Mitigation: Progressive loading states, 25s timeout

4. **Identification Accuracy** - GPT may misidentify
   - Mitigation: Story 2-8 handles failures gracefully

### Low Risk
5. **Type Mismatches** - Backend/Frontend types differ
   - Mitigation: Transformer functions exist, add validation

---

## Success Metrics

### Phase A (Backend)
- [ ] `/api/appraise` returns valid JSON for 10+ test images
- [ ] Response time < 10 seconds (GPT + eBay combined)
- [ ] Error rate < 5% for valid images
- [ ] Mock mode works for frontend development

### Phase B (Frontend)
- [ ] Full flow works: camera → valuation display
- [ ] Loading states feel responsive (not stuck)
- [ ] Errors are friendly and actionable
- [ ] Confidence messaging builds trust

### Epic Complete
- [ ] User can photograph item and see valuation
- [ ] Confidence clearly communicated
- [ ] Errors handled gracefully
- [ ] 11/11 stories done

---

## Environment Setup

### Backend (already done)
```bash
cd backend
source venv/bin/activate
# Ensure .env has:
# - OPENAI_API_KEY
# - EBAY_SANDBOX_APP_ID
# - EBAY_SANDBOX_CERT_ID
# - USE_MOCK=true (for dev)

uvicorn backend.main:app --reload --port 8000
```

### Frontend
```bash
cd apps/mobile
# Ensure .env has:
# - EXPO_PUBLIC_API_URL=http://localhost:8000
# - EXPO_PUBLIC_USE_MOCK=true (for dev)

npm run start:tunnel  # or npm run web
```

---

## Recommended First Steps

### Day 1: Validate Backend
1. Run backend with mock mode
2. Test `/api/appraise` with curl/Postman
3. Verify response structure matches frontend types
4. Fix any discrepancies

### Day 2: Create API Client
1. Create `apps/mobile/lib/api.ts`
2. Add image base64 encoding
3. Connect CameraScreen to real backend (mock mode)
4. See valuation result appear

### Day 3: Polish Loading States
1. Implement progressive loading messages
2. Add timeout handling
3. Test with slow network simulation

### Day 4+: Error Handling & Confidence
1. Handle AI failures
2. Handle insufficient data
3. Implement confidence-based messaging
4. Add market velocity

---

## Sprint Status Update

When starting Epic 2:

```yaml
epic-2: in-progress
2-1-create-valuation-api-endpoint: in-progress
```

---

## Questions for User Before Starting

1. **Mock Mode vs Real API?**
   - Do you have OpenAI API key configured?
   - Do you have eBay sandbox credentials?
   - Or should we start with mock mode only?

2. **Backend Running?**
   - Is the backend currently running?
   - Have you tested `/api/appraise` directly?

3. **Priority Preference?**
   - Start with backend validation (stories 2-1 to 2-5)?
   - Or jump to frontend display (stories 2-6 to 2-11)?

---

## Estimated Timeline

| Phase | Stories | Effort | Duration |
|-------|---------|--------|----------|
| Phase A: Backend | 2-1 to 2-5 | 12-16h | 2-3 days |
| Phase B: Frontend | 2-6 to 2-11 | 14-19h | 3-4 days |
| Buffer | Testing/Polish | 4-6h | 1 day |
| **Total** | **11 stories** | **30-41h** | **6-8 days** |

**Note:** Epic 1 took 18 hours for 6 stories (3h/story average). Epic 2 is larger and more complex. Budget 3-4h per story.

---

## Ready to Start? 🚀

Let me know when you'd like to:
1. Mark Epic 2 as `in-progress`
2. Create detailed Story 2-1 file
3. Begin implementation

The backend is 80% ready - this epic is primarily about connecting the pieces and building great UX for the valuation flow.
