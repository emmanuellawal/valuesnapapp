# Story 0.6: Define Shared TypeScript Types and Interfaces

**Status:** complete

**Depends on:** Story 0.4 (Mock infrastructure established), Story 0.5 (Components ready for typing)

**\u26a0\ufe0f CRITICAL REQUIREMENT:** Types must match actual backend models from `backend/models.py` and mock service responses. Do NOT invent fields.

---

## Story

**As a** developer,  
**I want** shared type definitions for all domain entities,  
**So that** frontend and backend contracts are aligned and type-safe.

---

## Acceptance Criteria

1. **AC1:** `types/valuation.ts` exports `Valuation`, `ValuationRequest`, `ValuationResponse`
2. **AC2:** `types/item.ts` exports `ItemDetails` (matching backend `ItemIdentity`), `Identifiers`, `VisualCondition`
3. **AC3:** `types/market.ts` exports `MarketData` (matching backend mock response), `ConfidenceLevel`
4. **AC4:** `types/api.ts` exports `ApiResponse<T>` (discriminated union), `ApiSuccessResponse<T>`, `ApiErrorResponse`, `ErrorCode`
5. **AC5:** `types/user.ts` exports `User`, `GuestUser`, `AuthState`
6. **AC6:** All types are exported from `types/index.ts` barrel export
7. **AC7:** Types match ARCH-17 discriminated union pattern AND actual backend models exactly
8. **AC8:** TypeScript compilation passes with no errors (`npx tsc --noEmit`)
9. **AC9:** All field names use camelCase (TypeScript) matching snake_case backend fields
10. **AC10:** No invented fields that don't exist in backend responses

---

## Tasks / Subtasks

- [x] **Task 1: Create types directory and barrel export** (AC: 6)
  - [x] 1.1: Create `apps/mobile/types/` directory
  - [x] 1.2: Create `apps/mobile/types/index.ts` barrel export file
  - [x] 1.3: Verify path alias `@/types` resolves correctly in tsconfig.json

- [x] **Task 2: Define API wrapper types** (AC: 4, 7)
  - [x] 2.1: Create `types/api.ts` file
  - [x] 2.2: Define `ApiSuccessResponse<T>` with success: true and data: T
  - [x] 2.3: Define `ApiErrorResponse` with success: false and error object
  - [x] 2.4: Define `ApiResponse<T>` as discriminated union: `ApiSuccessResponse<T> | ApiErrorResponse`
  - [x] 2.5: Define `ErrorCode` enum with standard error codes
  - [x] 2.6: Add JSDoc comments with type narrowing examples
  - [x] 2.7: Export types from barrel (`types/index.ts`)

- [x] **Task 3: Define item identification types** (AC: 2, 9, 10)
  - [x] 3.1: Create `types/item.ts` file
  - [x] 3.2: Define `VisualCondition` union type matching backend values ('new', 'used_excellent', etc.)
  - [x] 3.3: Define `Identifiers` interface (upc, modelNumber, serialNumber)
  - [x] 3.4: Define `ItemDetails` interface matching backend `ItemIdentity` exactly
  - [x] 3.5: Ensure all fields match backend: itemType, brand, model, visualCondition, conditionDetails, estimatedAge, categoryHint, searchKeywords, identifiers
  - [x] 3.6: Export types from barrel (`types/index.ts`)

- [x] **Task 4: Define market data types** (AC: 3, 9, 10)
  - [x] 4.1: Create `types/market.ts` file
  - [x] 4.2: Define `ConfidenceLevel` union type ('HIGH' | 'MEDIUM' | 'LOW' | 'NONE')
  - [x] 4.3: Define `MarketData` interface matching backend mock response exactly
  - [x] 4.4: Include all backend fields: status, keywords, totalFound, pricesAnalyzed, outliersRemoved, priceRange (min/max), fairMarketValue, mean, stdDev, confidence
  - [x] 4.5: Match backend structure - no invented fields like 'velocity' or 'currency'
  - [x] 4.6: Export types from barrel (`types/index.ts`)

- [x] **Task 5: Define valuation types** (AC: 1)
  - [x] 5.1: Create `types/valuation.ts` file
  - [x] 5.2: Define `ValuationRequest` interface (imageUrl, options)
  - [x] 5.3: Define `ValuationResponse` interface (itemDetails, marketData)
  - [x] 5.4: Define `Valuation` interface (full entity with id, createdAt, status)
  - [x] 5.5: Add valuation status enum (PENDING, SUCCESS, ERROR)
  - [x] 5.6: Export types from barrel (`types/index.ts`)

- [x] **Task 6: Define user and auth types** (AC: 5)
  - [x] 6.1: Create `types/user.ts` file
  - [x] 6.2: Define `User` interface (id, email, createdAt, tier)
  - [x] 6.3: Define `GuestUser` interface (sessionId, valuationLimit)
  - [x] 6.4: Define `AuthState` union type (User | GuestUser | null)
  - [x] 6.5: Add optional fields for user preferences
  - [x] 6.6: Export types from barrel (`types/index.ts`)

- [x] **Task 7: Add JSDoc documentation** (AC: All)
  - [x] 7.1: Document each interface/type with JSDoc comments
  - [x] 7.2: Include usage examples in key type definitions (especially ApiResponse type narrowing)
  - [x] 7.3: Document backend field mappings (snake_case → camelCase)
  - [x] 7.4: Add `@example` blocks showing typical usage patterns

- [x] **Task 8: Validate TypeScript compilation** (AC: 8)
  - [x] 8.1: Run `npx tsc --noEmit` from apps/mobile directory
  - [x] 8.2: Fix any compilation errors
  - [x] 8.3: Verify all types are importable via barrel export
  - [x] 8.4: Test import pattern: `import { Valuation, ItemDetails } from '@/types'`

- [x] **Task 9: Validate backend alignment** (AC: 7, 9, 10)
  - [x] 9.1: Compare ItemDetails against backend/models.py ItemIdentity class
  - [x] 9.2: Compare MarketData against backend mock response structure  
  - [x] 9.3: Verify all snake_case fields converted to camelCase
  - [x] 9.4: Ensure no fields exist in types that aren't in backend

- [x] **Task 10: Update existing components to use types** (AC: All)
  - [x] 10.1: Update ValuationCard props to use ItemDetails and MarketData types
  - [x] 10.2: Update component to access nested fields (itemDetails.brand, marketData.fairMarketValue)
  - [x] 10.3: Update mock data in components to match backend structure
  - [x] 10.4: Run `npx expo start --web` and verify app still works

---

## Dev Notes

### ⚠️ CRITICAL: Type System Architecture

**🚨 MUST READ BEFORE IMPLEMENTATION:**

1. **Backend Contract is King**: The TypeScript types MUST match the actual backend models from `backend/models.py` and the mock service responses. Do NOT invent fields or structures.

2. **Check Actual Backend Code**: Before creating any type, read:
   - `backend/models.py` for `ItemIdentity` and `Identifiers`
   - `backend/services/mocks/mock_ebay.py` for actual return structure of `search_sold_listings()`
   - `backend/services/mocks/mock_ai.py` for actual return structure of `identify_item_from_image()`

3. **Discriminated Union Pattern**: The `ApiResponse<T>` type MUST use a discriminated union (`ApiSuccessResponse | ApiErrorResponse`) not optional fields. This enables TypeScript type narrowing.

4. **Field Name Conversion**: 
   - Backend: `item_type`, `visual_condition`, `search_keywords` (snake_case)
   - Frontend: `itemType`, `visualCondition`, `searchKeywords` (camelCase)

5. **No Invented Fields**: Common mistakes to avoid:
   - ❌ `ItemDetails.name` (backend has `item_type`)
   - ❌ `ItemDetails.category` (backend has `category_hint`)
   - ❌ `ItemDetails.confidence` (confidence is separate in response)
   - ❌ `MarketData.velocity` (backend doesn't return this)
   - ❌ `MarketData.currency` (backend doesn't return this)
   - ❌ `PriceRange.currency` (backend `price_range` only has min/max)

6. **Test with Real Backend**: After creating types, test imports against actual backend mock responses to ensure alignment.

### Type System Best Practices

This story establishes the **type contract layer** between frontend and backend. These types are the single source of truth for data structures across the entire application.

**Key Principles:**
- **Frontend/Backend Alignment:** Types must match backend Pydantic models (Story 0.4 established these)
- **API Response Wrapper:** ARCH-17 specifies standardized response format - all API calls use this
- **Strict TypeScript:** No `any` types, all interfaces explicit, strict mode enabled
- **Component Props First:** Existing components (ValuationCard, skeletons) should adopt these types immediately

**Source:** [docs/architecture.md - Data Models, lines 675-710]  
**Source:** [docs/epics.md - Epic 0, Story 0.6, lines 552-568]

---

### Type Structure Overview

**Type Hierarchy (Aligned with Backend):**
```
ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse
  ↓
ValuationResponse
  ├── ItemDetails (mirrors backend ItemIdentity)
  │   ├── itemType: string
  │   ├── brand: string
  │   ├── model: string
  │   ├── visualCondition: VisualCondition
  │   ├── conditionDetails: string
  │   ├── estimatedAge: string
  │   ├── categoryHint: string
  │   ├── searchKeywords: string[]
  │   └── identifiers: Identifiers
  └── MarketData (mirrors backend eBay mock response)
      ├── status: string
      ├── priceRange: { min: number, max: number }
      ├── fairMarketValue: number
      ├── confidence: ConfidenceLevel
      └── ... (statistics fields)
```

**File Organization:**
```
apps/mobile/types/
├── api.ts          # Generic API wrappers (discriminated union)
├── item.ts         # Item identification types (mirrors ItemIdentity)
├── market.ts       # Market/pricing types (mirrors eBay response)
├── valuation.ts    # Valuation entity types
├── user.ts         # User/auth types
└── index.ts        # Barrel export
```

---

### Architecture Requirements (ARCH-17)

**API Response Wrapper Format (Discriminated Union):**

```typescript
// Success response
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

// Error response
interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: {
      reason?: string;
      suggestion?: string;
      field?: string;
    };
  };
}

// Union type for API responses
type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AI_ERROR = 'AI_ERROR',
  EBAY_ERROR = 'EBAY_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
```

**Why Discriminated Union?**
- TypeScript can narrow the type based on `success` field
- When `success === true`, TypeScript knows `data` exists
- When `success === false`, TypeScript knows `error` exists
- No unsafe optional chaining required

**Source:** [docs/architecture.md - API Response Wrapper, lines 720-750]

---

### Backend Type Alignment (CRITICAL)

**⚠️ ACTUAL Backend Models (from prototype-repomix.txt):**

The TypeScript types MUST match the actual Pydantic models, not inferred structures:

**ItemIdentity (backend/models.py):**
```python
class ItemIdentity(BaseModel):
    item_type: str              # "vintage wristwatch"
    brand: str                  # "Rolex" or "unknown"
    model: str                  # "Submariner" or "unknown"
    visual_condition: str       # "new" | "used_excellent" | "used_good" | "used_fair" | "damaged"
    condition_details: str      # Human-readable condition notes
    estimated_age: str          # "1990s" or "unknown"
    category_hint: str          # eBay category for search
    search_keywords: List[str]  # 3-5 keywords for eBay API
    identifiers: Identifiers    # Nested barcode/model data

class Identifiers(BaseModel):
    UPC: Optional[str]
    model_number: Optional[str]
    serial_number: Optional[str]
```

**MarketData (backend/services/mocks/mock_ebay.py returns):**
```python
# Actual return structure from search_sold_listings():
{
    "status": "success",
    "keywords": str,
    "total_found": int,
    "prices_analyzed": int,
    "outliers_removed": int,
    "price_range": {"min": float, "max": float},
    "fair_market_value": float,
    "mean": float,
    "std_dev": float,
    "confidence": "HIGH" | "MEDIUM" | "LOW" | "NONE"
}
```

**TypeScript Must Mirror Exactly:**
```typescript
// ItemDetails mirrors ItemIdentity
interface ItemDetails {
  itemType: string;
  brand: string;
  model: string;
  visualCondition: VisualCondition;
  conditionDetails: string;
  estimatedAge: string;
  categoryHint: string;
  searchKeywords: string[];
  identifiers: Identifiers;
}

interface Identifiers {
  upc?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
}

type VisualCondition = 'new' | 'used_excellent' | 'used_good' | 'used_fair' | 'damaged';

// MarketData mirrors eBay mock response
interface MarketData {
  status: 'success' | 'no_data' | 'no_prices';
  keywords: string;
  totalFound: number;
  pricesAnalyzed: number;
  outliersRemoved: number;
  priceRange: {
    min: number;
    max: number;
  };
  fairMarketValue: number;
  mean: number;
  stdDev: number;
  confidence: ConfidenceLevel;
}

type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
```

**Critical Rules:**
1. **Field names**: snake_case (Python) → camelCase (TypeScript)
2. **Enums**: Backend uses string literals → TypeScript uses union types or enums
3. **Optional fields**: Python `Optional[T]` → TypeScript `T | null | undefined`
4. **Nested objects**: Mirror exactly, don't flatten
5. **Arrays**: Python `List[T]` → TypeScript `T[]`

**Source:** [prototype-repomix.txt - backend/models.py, lines 1-50]  
**Source:** [prototype-repomix.txt - backend/services/mocks/mock_ebay.py, lines 50-100]

---

### Component Integration Points

**Existing Components to Update:**

1. **ValuationCard (Story 0.5):**
```typescript
// Before:
interface ValuationCardProps {
  title: string;
  price: string;
  confidenceText: string;
}

// After (backend-aligned):
import { ItemDetails, MarketData } from '@/types';

interface ValuationCardProps {
  itemDetails: ItemDetails;  // Full ItemIdentity structure
  marketData: MarketData;    // Full eBay response structure
  onPress?: () => void;
}

// Component can now access:
// - itemDetails.brand
// - itemDetails.model
// - itemDetails.visualCondition
// - marketData.fairMarketValue
// - marketData.priceRange.min/max
```

2. **Future API Hooks (Epic 2):**
```typescript
// Type narrowing with discriminated union
async function fetchValuation(imageUrl: string) {
  const response: ApiResponse<ValuationResponse> = await api.post('/valuation', { imageUrl });
  
  if (response.success) {
    // TypeScript knows response.data exists here
    const { itemDetails, marketData } = response.data;
    console.log(itemDetails.brand); // No optional chaining needed!
    return response.data;
  } else {
    // TypeScript knows response.error exists here
    throw new Error(response.error.message);
  }
}
```

3. **Mock Data Construction:**
```typescript
// Example mock matching backend structure
const mockItemDetails: ItemDetails = {
  itemType: 'vintage wristwatch',
  brand: 'Rolex',
  model: 'Submariner',
  visualCondition: 'used_excellent',
  conditionDetails: 'Minor hairline scratches',
  estimatedAge: '1990s',
  categoryHint: 'Wristwatches',
  searchKeywords: ['Rolex Submariner', 'Rolex automatic'],
  identifiers: {
    upc: null,
    modelNumber: 'Submariner',
    serialNumber: null
  }
};

const mockMarketData: MarketData = {
  status: 'success',
  keywords: 'Rolex Submariner stainless',
  totalFound: 15,
  pricesAnalyzed: 15,
  outliersRemoved: 0,
  priceRange: { min: 4500, max: 8500 },
  fairMarketValue: 6200,
  mean: 6150,
  stdDev: 850,
  confidence: 'HIGH'
};
```

---

### Swiss Minimalist Constraints (Reminder)

While this story focuses on TypeScript types (no visual components), keep Swiss principles in mind for future type-driven UX:

- ❌ NO status colors (red/yellow/green) for ConfidenceLevel display
- ✅ Use opacity for state differentiation (e.g., LOW confidence = text-ink-muted)
- ✅ Text-first design: confidence displayed as "Confidence: High (0.82)" not color-coded badges
- ❌ NO decorative icons or badges for ItemCondition
- ✅ Typography hierarchy for importance (e.g., h1 for price, caption for metadata)

**Source:** [docs/SWISS-MINIMALIST.md]  
**Source:** [docs/ux-design-specification.md - UX-1 to UX-4]

---

### Testing Standards

**TypeScript Validation (Required):**
```bash
cd apps/mobile
npx tsc --noEmit
```

**Expected:** Zero errors, zero warnings

**Import Testing:**
```typescript
// Test all exports work
import {
  Valuation, ValuationRequest, ValuationResponse,
  ItemDetails, ItemCategory, ItemCondition,
  MarketData, PriceRange, ConfidenceLevel,
  ApiResponse, ApiError, ErrorCode,
  User, GuestUser, AuthState,
} from '@/types';

// All imports should resolve without errors
```

**Runtime Testing:**
```bash
cd apps/mobile
npx expo start --web
# Verify app still loads without errors
# Check browser console for type-related warnings
```

**No Unit Tests Required (yet):**
- Epic 7 (Accessibility & Polish) will add comprehensive testing
- For now, TypeScript compilation is the test
- Manual verification that existing components still work

**Source:** [docs/sprint-artifacts/0-3-create-primitive-components-validation-report.md - Testing approach]

---

### Project Context Reference

**From project-context.md (if exists):**
- Check for any existing type definitions that should be consolidated
- Verify no conflicting type definitions in other files
- Ensure types align with overall project architecture patterns

**File Locations (Established Patterns):**
- Frontend types: `apps/mobile/types/`
- Backend models: `backend/models.py` (Pydantic)
- Shared contracts: These TypeScript types should mirror backend models exactly

**Import Pattern:**
```typescript
// Clean imports via barrel export
import { Valuation, ItemDetails } from '@/types';

// NOT:
import { Valuation } from '@/types/valuation';
import { ItemDetails } from '@/types/item';
```

---

### Common Gotchas & Learnings

**From Previous Stories:**

1. **TypeScript Strict Mode (Story 0.1):**
   - All types must be explicit
   - No implicit `any` allowed
   - Required props must be non-optional

2. **Barrel Exports (Story 0.3, 0.5):**
   - ALWAYS create `index.ts` for clean imports
   - Export both types and interfaces
   - Use `export type { ... }` for type-only exports

3. **camelCase vs snake_case (Story 0.4):**
   - Backend uses snake_case (Python convention)
   - Frontend uses camelCase (TypeScript convention)
   - Type definitions should match frontend convention
   - API serialization layer handles conversion

4. **Optional vs Required Fields:**
   - Make fields optional only if backend can omit them
   - Document why fields are optional in JSDoc
   - Provide sensible defaults or guards in components

5. **Enum vs Union Types:**
   - Use enums for exhaustive sets (ItemCondition, ConfidenceLevel)
   - Use union types for open-ended categories
   - Enums generate runtime code, union types are type-only

**Source:** Learnings from Stories 0.1-0.5 dev notes

---

### Dependencies & Integration

**Depends On:**
- **Story 0.4:** Mock infrastructure defines backend contract
- **Story 0.5:** ValuationCard/skeletons will use these types

**Enables:**
- **Epic 1:** Camera capture will use `ValuationRequest`
- **Epic 2:** AI Valuation will use `ValuationResponse`
- **Epic 3:** History will use `Valuation` entity
- **Epic 4:** Authentication will use `User`, `AuthState`

**Critical Path:** This story unblocks Epic 2 (AI Valuation Engine) - types must be ready before API integration

---

### Success Criteria

**Definition of Done:**
- ✅ All 8 acceptance criteria met
- ✅ TypeScript compilation passes (`npx tsc --noEmit`)
- ✅ All types exported from barrel (`types/index.ts`)
- ✅ ValuationCard updated to use typed props (no visual changes)
- ✅ Mock services return typed responses
- ✅ App still loads without errors (`npx expo start --web`)
- ✅ JSDoc documentation complete for all types
- ✅ File list updated in Dev Agent Record
- ✅ Change log entry added

**No Manual Testing Required:**
- TypeScript compiler is the test
- Runtime verification confirms no regressions
- Visual appearance unchanged (type-only story)

---

## Context Reference

**Source Documents:**
- [docs/epics.md - Epic 0, Story 0.6, lines 552-568]
- [docs/architecture.md - Data Models, lines 675-710]
- [docs/architecture.md - API Response Wrapper (ARCH-17), lines 685-695]
- [docs/prd.md - Functional Requirements, lines 150-180]
- [docs/sprint-artifacts/0-4-set-up-mock-infrastructure.md - Backend contracts]
- [docs/sprint-artifacts/0-5-create-skeleton-loader-components.md - Component patterns]

**Previous Story Learnings:**
- Story 0.1: TypeScript strict mode, tsconfig patterns
- Story 0.3: Barrel exports, props interfaces, component typing
- Story 0.4: Backend Pydantic models, API response format
- Story 0.5: Component props evolution, type-safe composition

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- TypeScript compilation: `npx tsc --noEmit` passed with 0 errors

### Completion Notes List

1. Created types directory with clean slate (removed previous incorrect implementation)
2. Implemented `ApiResponse<T>` as discriminated union per ARCH-17:
   - `ApiSuccessResponse<T>` with `success: true` and required `data: T`
   - `ApiErrorResponse` with `success: false` and required `error` object
3. `ItemDetails` now mirrors backend `ItemIdentity` exactly:
   - All 9 fields from backend present with correct camelCase naming
   - Nested `Identifiers` type for UPC/model/serial numbers
   - `VisualCondition` union type matches backend string values
4. `MarketData` mirrors backend mock_ebay.py response exactly:
   - Includes all statistical fields (mean, stdDev, fairMarketValue)
   - Uses `MarketDataStatus` for 'success'/'no_data'/'no_prices'
   - Optional fields marked correctly for error states
5. Updated ValuationCard to use new types:
   - Builds title from brand + model or itemType
   - Handles priceRange correctly with null check
   - Uses `confidence` instead of invented `confidenceLevel`
6. Updated all mock data in index.tsx and history.tsx to match backend structure

### File List

- apps/mobile/types/api.ts (created)
- apps/mobile/types/item.ts (created)
- apps/mobile/types/market.ts (created)
- apps/mobile/types/valuation.ts (created)
- apps/mobile/types/user.ts (created)
- apps/mobile/types/index.ts (created)
- apps/mobile/components/molecules/valuation-card.tsx (updated)
- apps/mobile/app/(tabs)/index.tsx (updated)
- apps/mobile/app/(tabs)/history.tsx (updated)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-21 | Story created with comprehensive type system context | create-story workflow |
| 2025-12-22 | Story updated with backend alignment fixes (party-mode critique) | Dev Agent |
| 2025-12-22 | Implementation complete - all types aligned with backend models | Claude Opus 4.5 |
