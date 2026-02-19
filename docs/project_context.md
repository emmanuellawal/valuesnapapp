# ValueSnap Project Context

> **For AI Agents:** This document captures critical rules, patterns, and conventions. Follow these exactly to ensure consistent, high-quality implementation.

---

## Project Identity

**ValueSnap** is an AI-powered valuation-to-listing platform for resellers. The core flow is **Photo → Value → List** in minutes, not hours.

**Project Type:** Mobile-First PWA (Expo Router + React Native Web)  
**Primary Users:** Estate sellers, casual collectors, thrift flippers  
**Phase:** MVP (V2 rebuild from prototype)

---

## Technology Stack (Exact Versions Matter)

### Frontend
| Technology | Version/Notes |
|------------|---------------|
| Expo Router | File-based routing, tabs template |
| React Native Web | Web platform target |
| NativeWind v4 | Tailwind for React Native — **v4 has breaking changes from v2** |
| TanStack Query | Server state management — **NOT useState for API data** |
| React Hook Form | Form state + Zod validation |
| TypeScript | Strict mode enabled |

### Backend
| Technology | Version/Notes |
|------------|---------------|
| FastAPI | Python 3.11, async |
| Pydantic v2 | Request/response validation |
| Supabase | Postgres + Auth + Storage |
| OpenAI | GPT-4o-mini for identification |
| eBay APIs | Browse API (valuation) + Trading API (listing) |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Vercel | Frontend hosting (Expo Web export) |
| Railway | Backend hosting (FastAPI) |
| Supabase | Database + Auth + Storage |
| Sentry | Error tracking |

---

## Critical Naming Conventions

### Database (Postgres/Supabase)
```
Tables:       snake_case, plural     → valuations, ebay_tokens
Columns:      snake_case             → user_id, created_at
Foreign Keys: {table}_id             → user_id, valuation_id
Indexes:      idx_{table}_{columns}  → idx_valuations_user_id
```

### Python (Backend)
```
Files:        snake_case.py          → ebay_client.py
Classes:      PascalCase             → ValuationService
Functions:    snake_case             → create_valuation()
Variables:    snake_case             → user_id, price_range
Constants:    UPPER_SNAKE            → MAX_RETRIES
```

### TypeScript (Frontend)
```
Files:        kebab-case.tsx         → valuation-card.tsx
Components:   PascalCase             → ValuationCard
Hooks:        useCamelCase           → useValuations()
Functions:    camelCase              → createValuation()
Variables:    camelCase              → userId, priceRange
Types:        PascalCase             → Valuation, ApiResponse<T>
```

### API Layer
```
Endpoints:    /api/v1/{resource}     → /api/v1/valuations (plural)
Query params: snake_case             → ?user_id=123&limit=10
JSON body:    camelCase              → { "priceRange": {...} }
```

**⚠️ Key Rule:** Python internals use snake_case, API JSON uses camelCase. Pydantic aliases handle conversion.

---

## API Response Format (Mandatory)

All API responses MUST use this wrapper format:

```typescript
// Success Response
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: { timestamp: string; requestId: string };
}

// Error Response
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;           // UPPER_SNAKE: VALUATION_FAILED
    message: string;        // Human-readable
    details?: {
      reason: string;
      suggestion?: string;
      field?: string;
    };
  };
}
```

### Standard Error Codes
| Code | HTTP | Description |
|------|------|-------------|
| `VALUATION_FAILED` | 422 | AI couldn't identify item |
| `EBAY_API_ERROR` | 502 | eBay API unavailable |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `AUTH_REQUIRED` | 401 | Missing or invalid auth |
| `EBAY_AUTH_REQUIRED` | 403 | eBay account not linked |
| `INVALID_IMAGE` | 400 | Image too small or corrupt |

---

## Project Structure (DO NOT deviate)

### Frontend
```
app/                            # Expo Router (file-based routing)
├── (tabs)/
│   ├── _layout.tsx             # Tab navigation
│   ├── index.tsx               # Camera (home)
│   ├── history.tsx
│   └── settings.tsx
├── listing/[id].tsx
├── valuation/[id].tsx
└── auth/

components/
├── primitives/                 # box, stack, text, swiss-pressable
├── atoms/                      # button, input, icon, badge
├── molecules/                  # confidence-indicator, price-range
└── organisms/                  # valuation-card, camera-capture

lib/
├── api/                        # API client & calls
├── hooks/                      # TanStack Query hooks
├── providers/                  # Context providers
├── utils/
└── supabase.ts

types/                          # TypeScript types
constants/                      # Query keys, config
```

### Backend
```
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── api/v1/                 # Route handlers
│   ├── services/               # Business logic
│   │   ├── ai_interpreter.py
│   │   ├── ebay_market.py
│   │   ├── confidence_service.py
│   │   └── mocks/              # Mock implementations
│   ├── models/
│   │   ├── schemas.py          # Pydantic
│   │   └── database.py
│   └── utils/
│       └── errors.py
└── tests/
    ├── unit/
    └── integration/
```

---

## Design System: Swiss Minimalist

ValueSnap uses **authentic Swiss International Style** — objective, grid-based, typography-driven.

### Color Palette (STRICT)
| Role | Color | Hex |
|------|-------|-----|
| Primary | Black | `#000000` |
| Background | White | `#FFFFFF` |
| Surface | Off-white | `#FAFAFA` |
| Accent | Signal Red | `#FF0000` — **Primary CTA ONLY** |
| Muted | Gray | `#666666` |

**⚠️ NO traffic light colors for confidence.** Use typography weight:
- HIGH: Bold
- MEDIUM: Regular
- LOW: Light

### Typography
- **Font Stack:** Inter, Helvetica Neue, Helvetica, Arial, sans-serif
- **Text alignment:** Flush-left, ragged-right — **NEVER justify**
- **Hierarchy:** Size + weight only — **NOT color**

### Spacing Scale (Tailwind tokens)
| Token | Size |
|-------|------|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |
| `2xl` | 48px |

### Swiss Design Anti-Patterns (NEVER DO)
- ❌ Centered text paragraphs
- ❌ Decorative borders, ornaments, gradients
- ❌ Drop shadows, bevels, rounded corners
- ❌ Justified text
- ❌ Emotional or decorative fonts
- ❌ Traffic light colors (green/yellow/red)
- ❌ Opacity overlays (things are visible or not there)

---

## State Management Rules

### Server State → TanStack Query
```typescript
// ✅ CORRECT
const { data, isLoading, isError } = useValuation(id);

// ❌ WRONG - Never use useState for API data
const [valuation, setValuation] = useState(null);
useEffect(() => { fetchValuation().then(setValuation) }, []);
```

### TanStack Query Defaults
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 minutes
      gcTime: 1000 * 60 * 60,        // 1 hour
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Query Keys Convention
```typescript
const queryKeys = {
  valuations: {
    all: ['valuations'] as const,
    detail: (id: string) => ['valuations', id] as const,
    list: (filters: ValuationFilters) => ['valuations', 'list', filters] as const,
  },
};
```

---

## Error Handling Patterns

### Backend (FastAPI)
```python
from app.utils.errors import ValuationError

@router.post("/valuations")
async def create_valuation(...):
    try:
        result = await service.process(...)
    except ValuationError as e:
        raise HTTPException(status_code=422, detail={
            "code": e.code,
            "message": e.message,
            "details": e.details
        })
```

### Frontend (React)
```typescript
if (isLoading) return <ValuationCardSkeleton />;
if (isError) return <ErrorDisplay error={error} />;
return <ValuationCard data={data} />;
```

---

## Confidence Calculation (Business Logic)

Confidence is a **first-class service** with configurable thresholds:

| Confidence | Sold Count | Price Variance | Handling |
|------------|------------|----------------|----------|
| HIGH | ≥20 | <25% | Standard flow |
| MEDIUM | 5-19 | <40% | Standard flow |
| LOW | <5 | any | Encourage verification |
| AI_ONLY | 0 sold, <3 active | — | Explicit "AI estimate, no market data" |

**Key insight:** Sample size matters more than variance for trust.

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| Valuation API response | < 3 seconds |
| First Contentful Paint | < 1.5 seconds |
| Bundle size (gzipped) | < 500KB |
| Cumulative Layout Shift | < 0.1 |

---

## Accessibility Requirements

| Requirement | Target |
|-------------|--------|
| Color contrast | 4.5:1 ratio (WCAG 2.1 AA) |
| Touch targets | 44x44px minimum |
| Focus indicators | Visible on all interactive elements |
| Alt text | All images |
| Semantic HTML | Proper heading hierarchy |

---

## Testing Strategy

### Mock Mode (Critical for Development)
```bash
USE_MOCK=true  # Enables mock AI + mock eBay
```

**P0 Priority:** Mock infrastructure enables:
- Frontend dev without backend
- Backend dev without external APIs
- CI/CD without API rate limits

### Test File Location
Tests mirror source structure:
```
backend/tests/unit/test_ai_interpreter.py     → backend/app/services/ai_interpreter.py
backend/tests/integration/test_api_valuations.py
```

---

## Code Quality Enforcement

| Tool | Purpose |
|------|---------|
| ESLint | TypeScript linting |
| Prettier | Code formatting |
| Ruff | Python linting |
| pyright | Python type checking |
| tsc --noEmit | TypeScript type checking |

---

## Environment Variables

### Frontend (.env.local)
```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=
```

### Backend (.env)
```bash
# Supabase
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_KEY=

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# eBay
EBAY_APP_ID=
EBAY_CERT_ID=
EBAY_DEV_ID=
EBAY_USE_SANDBOX=true

# Security
FERNET_KEY=

# Development
USE_MOCK=false
DEBUG=true
```

---

## Rate Limiting

| User Type | Limit | Window |
|-----------|-------|--------|
| Guest | 10 valuations | 1 hour |
| Authenticated | 100 valuations | 1 hour |

---

## Quick Reference: Component Patterns

### Good Component Example
```typescript
export function ValuationCard({ valuation }: ValuationCardProps) {
  return (
    <Card>
      <Card.Image source={valuation.imageUrl} />
      <Card.Content>
        <PriceRange range={valuation.priceRange} />
        <ConfidenceIndicator level={valuation.confidence} />
      </Card.Content>
    </Card>
  );
}
```

### Bad Component Example
```typescript
// ❌ Wrong naming (camelCase), any type, HTML elements
export default function valuationCard(props: any) {
  return <div>...</div>;
}
```

### Good API Endpoint Example
```python
@router.get("/api/v1/valuations/{id}")
async def get_valuation(id: str) -> ValuationResponse:
    valuation = await service.get_by_id(id)
    return ValuationResponse(
        success=True,
        data=valuation.to_response()
    )
```

### Bad API Endpoint Example
```python
# ❌ Wrong naming, missing types, no response wrapper
@router.get("/getValuation")
def get_valuation(id):
    return {"valuation": ...}
```

---

## Implementation Sequence (MVP)

1. **Week 1:** Supabase setup + Backend extraction (mocks → AI interpreter → eBay client)
2. **Week 2:** Frontend setup (Expo + NativeWind + TanStack Query)
3. **Week 3:** Camera flow + Valuation display
4. **Week 4:** Listing flow + Polish

---

## Document References

| Document | Location | Purpose |
|----------|----------|---------|
| Architecture | `docs/architecture.md` | Full technical decisions |
| PRD | `docs/prd.md` | Requirements & user journeys |
| Swiss Design | `docs/SWISS-MINIMALIST.md` | Design system reference |

---

**Last Updated:** 2025-12-11  
**Status:** Ready for Implementation

