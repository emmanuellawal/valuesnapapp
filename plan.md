# ValueSnap V2: Master Execution Plan

> **Mission:** Build a scalable, production-ready AI appraisal and listing tool.  
> **Design Philosophy:** Swiss International Style (Minimalist, Objective, Data-First).  
> **Target Scale:** 1000s of concurrent users.  
> **Last Updated:** 2025-12-08 (Post-Brainstorming Session)

---

## 1. Architecture Stack

| Component | Technology | Reasoning |
|-----------|------------|-----------|
| Frontend | Expo Router (v3) | Solves web navigation/scroll bugs using standard DOM history |
| Styling | NativeWind | Enforces strict "Swiss" design system (high contrast, grid-based) |
| Backend | FastAPI (Async) | Non-blocking. Handles concurrent OpenAI/eBay requests |
| Database | Supabase | Postgres + Auth + Storage. Row Level Security (RLS) for user isolation |
| AI Logic | GPT-4o-mini | Optimized for Visual Identification only (10x cheaper than GPT-4 Vision) |
| Valuation | eBay Browse API | Statistical outlier detection (IQR) on sold listings |

---

## 2. Directory Structure

```
/valuesnapapp
  ├── /apps
  │    └── /mobile              # Expo Router Frontend
  │         ├── /app            # Routes (file-based navigation)
  │         │    ├── /(auth)    # Auth routes (login, callback)
  │         │    └── /(tabs)    # Main app tabs
  │         ├── /components     # Reusable Swiss UI components
  │         └── /lib            # Supabase & API clients
  ├── /backend                  # FastAPI Backend
  │    ├── /services            # Business Logic (AI, eBay, Auth)
  │    ├── main.py              # Entry point
  │    └── models.py            # Pydantic Data Structures
  ├── /docs
  │    └── /analysis            # Brainstorming & analysis artifacts
  └── PLAN.md                   # This document
```

---

## 3. Critical Findings (Pre-Implementation)

> ⚠️ **These issues were identified during stress-testing and MUST be addressed during implementation.**  
> **Updated:** 2025-12-08 (Post-Brainstorming Session - 20 failure modes + 8 edge cases identified)

### Root Cause Patterns

**Three patterns cause 15+ of the 20 failure modes:**

1. **Trust-First Design** → Assumed good behavior → No rate limits, no abuse protection
2. **No Load Testing** → Assumed "works locally" = "works at scale" → Rate limits, cold starts
3. **Feature Over Sustainability** → Prioritized features over business → Cost explosion, no monitoring

**Fix these 3 patterns to prevent most failures.**

### 🔴 MUST FIX (Before Writing Code)

| # | Issue | Risk | Solution |
|---|-------|------|----------|
| 1 | **GPT JSON Parsing** | GPT returns malformed/unexpected JSON → 500 errors | JSON mode + Pydantic validation + graceful "Manual Review" fallback |
| 2 | **eBay Data Confidence** | Insufficient sold listings → garbage valuations | Multi-tier confidence system (none/low/medium/high) |
| 3 | **Supabase Mobile Auth** | Magic links don't return to app → users stuck | Deep linking (`valuesnap://`) + AsyncStorage config |
| 4 | **Rate Limit Protection** | OpenAI rate limits hit → complete outage | Exponential backoff + circuit breaker + request queue |
| 5 | **Cost Explosion** | Unexpected API costs → bankruptcy | Per-user rate limits (5/day free) + billing alerts + cost tracking |
| 6 | **Abuse Protection** | Malicious users spam API → costs explode | Email verification + IP rate limits + abuse detection |
| 7 | **API Authentication** | Direct API calls bypass protections | Require API keys + backend rate limiting |
| 8 | **Identification Confirmation** | Wrong identification → financial loss | "Does this look correct?" confirmation screen |
| 9 | **Legal Disclaimers** | AI-generated content liability | ToS + "user responsible" language + disclaimers |

### 🟡 SHOULD FIX (During Phase 1)

| # | Issue | Risk | Solution |
|---|-------|------|----------|
| 10 | **Condition Mapping** | GPT condition doesn't match eBay taxonomy | Translation layer + user confirmation step |
| 11 | **Cold Start UX** | 8-18 second waits on serverless cold start | Progressive loading states + 25s timeout + `/health` endpoint |
| 12 | **Image Compression** | expo-image-manipulator fails on some devices | Try/catch fallback + force JPEG + 5MB size limit |
| 13 | **Graceful Error Handling** | All-or-nothing failures → poor UX | Distinguish 503 vs 500, queue failed saves, offline mode |
| 14 | **Load Testing** | Unknown behavior under load → Day 1 failure | Simulate 1000 concurrent users before launch |
| 15 | **Unknown Item Handling** | GPT can't identify → dead end | Manual entry fallback + "Try photographing label" guidance |
| 16 | **Category Mapping** | Wrong eBay category → wrong prices | Use eBay category IDs + user confirmation |
| 17 | **Price Manipulation Protection** | Stale/fake data skews valuations | Filter by date (90 days) + IQR outlier removal |
| 18 | **Offline Mode** | Can't view appraisals without internet | Cache locally + sync when online |

### ⚪ ACKNOWLEDGED (Post-MVP)

| # | Issue | Risk | Solution |
|---|-------|------|----------|
| 19 | **Token Caching** | In-memory token cache lost on serverless cold start | Redis or Supabase token storage (Winston's note) |
| 20 | **Caching Strategy** | Every appraisal = fresh API call | Cache GPT identifications for common items (cost optimization) |
| 21 | **Multi-Provider Fallback** | Single vendor dependency | Abstract AI provider, support OpenAI + Anthropic |
| 22 | **International Support** | US-only eBay → international users confused | Detect location, search local marketplaces |
| 23 | **Multi-Item Photos** | Multiple items in one photo → misses others | Detect multiple items, allow crop/select |
| 24 | **Performance Monitoring** | Silent degradation → users abandon | Track API call times, alert if >10s |
| 25 | **Dependency Monitoring** | Security vulnerabilities in dependencies | Dependabot/Snyk automated scanning |

---

## 4. Execution Phases

### 🧱 Phase 1: The Foundation (Week 1)

**Goal:** A working skeleton with Auth, AI, and Data Confidence built in from day one.

#### 1.1 Backend Core (FastAPI)

**Setup:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn[standard] python-multipart httpx python-dotenv openai supabase pydantic-settings numpy
```

**Files to Create:**

1. **`backend/models.py`** — Pydantic V2 models with strict typing
```python
from pydantic import BaseModel, Field
from typing import Literal
from enum import Enum

class ConditionLevel(str, Enum):
    NEW = "new"
    LIKE_NEW = "like_new"
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"

class ItemIdentification(BaseModel):
    brand: str = Field(..., description="Manufacturer brand name")
    model: str = Field(..., description="Specific model identifier")
    condition: str = Field(..., description="Condition assessment")
    confidence: float = Field(ge=0, le=1, description="AI confidence 0-1")
    category: str | None = Field(None, description="Product category if identifiable")

class DataConfidence(str, Enum):
    NONE = "none"       # 0 results
    LOW = "low"         # 1-4 results
    MEDIUM = "medium"   # 5-9 results
    HIGH = "high"       # 10+ results

class ValuationResult(BaseModel):
    status: DataConfidence
    price_low: float | None = None
    price_median: float | None = None
    price_high: float | None = None
    sample_size: int
    outliers_removed: int = 0
    message: str
    show_manual_review: bool = False
```

2. **`backend/services/ai.py`** — GPT-4o-mini with JSON mode + validation
```python
from openai import OpenAI
from pydantic import ValidationError
from models import ItemIdentification
import json

client = OpenAI()

async def identify_item(image_base64: str) -> dict:
    """
    Identify item using GPT-4o-mini with JSON mode.
    Returns parsed ItemIdentification or error state.
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},  # 🔴 CRITICAL FIX #1
            messages=[
                {
                    "role": "system",
                    "content": """You are a product identification expert. Analyze the image and return JSON with:
                    - brand: manufacturer name
                    - model: specific model identifier  
                    - condition: one of (new, like_new, excellent, good, fair, poor)
                    - confidence: 0-1 score of your certainty
                    - category: product category
                    
                    Return ONLY the JSON object, no other text."""
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                    ]
                }
            ],
            max_tokens=500
        )
        
        raw_content = response.choices[0].message.content
        
        # Validate against Pydantic model
        item = ItemIdentification.model_validate_json(raw_content)
        return {"status": "success", "data": item.model_dump()}
        
    except ValidationError as e:
        # 🔴 CRITICAL FIX #1: Graceful fallback
        return {
            "status": "review_needed",
            "reason": "AI response didn't match expected format",
            "errors": str(e),
            "raw_response": raw_content if 'raw_content' in locals() else None
        }
    except Exception as e:
        return {
            "status": "error",
            "reason": str(e)
        }
```

3. **`backend/services/ebay.py`** — IQR with confidence tiers + condition mapping
```python
import httpx
import numpy as np
from models import DataConfidence, ValuationResult

# 🟡 FIX #4: Condition mapping
CONDITION_MAP = {
    "new": 1000,
    "sealed": 1000,
    "like_new": 1500,
    "excellent": 3000,
    "good": 3000,
    "fair": 3000,
    "poor": 7000,
}

async def get_valuation(item_name: str, condition: str) -> ValuationResult:
    """
    Query eBay Browse API and calculate valuation with confidence tiers.
    """
    ebay_condition = CONDITION_MAP.get(condition.lower().replace(" ", "_"), 3000)
    
    # Query eBay (simplified - add your actual API logic)
    sold_items = await query_ebay_sold(item_name, ebay_condition)
    prices = [item["price"] for item in sold_items]
    count = len(prices)
    
    # 🔴 CRITICAL FIX #2: Multi-tier confidence system
    if count == 0:
        return ValuationResult(
            status=DataConfidence.NONE,
            sample_size=0,
            message="No recent sales found. Try manual eBay search.",
            show_manual_review=True
        )
    
    if count < 5:
        return ValuationResult(
            status=DataConfidence.LOW,
            price_low=min(prices),
            price_median=np.median(prices),
            price_high=max(prices),
            sample_size=count,
            message=f"Based on only {count} sale(s). Estimate may be unreliable.",
            show_manual_review=True
        )
    
    if count < 10:
        # Basic IQR without aggressive outlier removal
        q1, median, q3 = np.percentile(prices, [25, 50, 75])
        return ValuationResult(
            status=DataConfidence.MEDIUM,
            price_low=q1,
            price_median=median,
            price_high=q3,
            sample_size=count,
            message=f"Based on {count} sales. Reasonable estimate."
        )
    
    # Full IQR with outlier removal
    q1, q3 = np.percentile(prices, [25, 75])
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    
    filtered = [p for p in prices if lower_bound <= p <= upper_bound]
    outliers_removed = count - len(filtered)
    
    return ValuationResult(
        status=DataConfidence.HIGH,
        price_low=np.percentile(filtered, 25),
        price_median=np.median(filtered),
        price_high=np.percentile(filtered, 75),
        sample_size=len(filtered),
        outliers_removed=outliers_removed,
        message=f"Based on {len(filtered)} sales. {outliers_removed} outliers removed."
    )
```

4. **`backend/main.py`** — Entry point with health endpoint
```python
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

app = FastAPI(title="ValueSnap Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🟡 FIX #5: Health endpoint for warming
@app.get("/health")
def health():
    return {"status": "warm", "timestamp": datetime.now().isoformat()}

@app.get("/")
def read_root():
    return {"system": "ValueSnap V2", "status": "operational"}

@app.post("/api/appraise")
async def appraise(image: UploadFile = File(...)):
    # Implementation combines ai.py + ebay.py
    pass
```

#### 1.2 Database & Auth (Supabase)

**SQL Schema:**
```sql
-- Enable RLS
ALTER TABLE appraisals ENABLE ROW LEVEL SECURITY;

CREATE TABLE appraisals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    item_data JSONB NOT NULL,
    valuation_data JSONB NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy: Users can only see their own appraisals
CREATE POLICY "Users can view own appraisals" ON appraisals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own appraisals" ON appraisals
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

**Auth Configuration:**
1. Enable Email/Password in Supabase Dashboard
2. Set redirect URL: `valuesnap://auth/callback`

#### 1.3 Frontend Core (Expo + Swiss UI)

**Setup:**
```bash
npx create-expo-app@latest apps/mobile --template tabs
cd apps/mobile
npm install nativewind tailwindcss @supabase/supabase-js @react-native-async-storage/async-storage expo-image-manipulator expo-camera expo-linking
```

**Key Files:**

1. **`apps/mobile/app.json`** — Deep linking config
```json
{
  "expo": {
    "scheme": "valuesnap",
    "name": "ValueSnap",
    ...
  }
}
```

2. **`apps/mobile/lib/supabase.ts`** — 🔴 CRITICAL FIX #3
```typescript
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,  // Critical for mobile
    },
  }
)
```

3. **`apps/mobile/lib/camera.ts`** — 🟡 FIX #6: Robust image compression
```typescript
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

const MAX_FILE_SIZE = 5_000_000; // 5MB

export async function compressImage(uri: string): Promise<{ uri: string; warning?: string }> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { 
        compress: 0.8, 
        format: ImageManipulator.SaveFormat.JPEG  // Force JPEG
      }
    );
    
    if (!result?.uri) {
      throw new Error('Compression returned empty result');
    }
    
    // Validate file size
    const fileInfo = await FileSystem.getInfoAsync(result.uri);
    if (fileInfo.exists && fileInfo.size > MAX_FILE_SIZE) {
      // Try more aggressive compression
      const retry = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 768 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );
      return { uri: retry.uri, warning: 'Image compressed aggressively due to size' };
    }
    
    return { uri: result.uri };
  } catch (error) {
    console.error('Image compression failed:', error);
    // Fallback: return original with warning
    return { uri, warning: 'Compression failed, using original image' };
  }
}
```

4. **`apps/mobile/lib/api.ts`** — 🟡 FIX #5: Progressive loading
```typescript
const API_TIMEOUT = 25000; // 25 seconds

export type LoadingState = 
  | 'analyzing'      // 0-5s
  | 'identifying'    // 5-10s  
  | 'pricing'        // 10-20s
  | 'finalizing';    // 20-25s

export async function appraise(
  imageUri: string, 
  onProgress: (state: LoadingState) => void
): Promise<AppraisalResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  
  // Progressive state updates
  onProgress('analyzing');
  const stateTimer1 = setTimeout(() => onProgress('identifying'), 5000);
  const stateTimer2 = setTimeout(() => onProgress('pricing'), 10000);
  const stateTimer3 = setTimeout(() => onProgress('finalizing'), 20000);
  
  try {
    const response = await fetch(`${API_URL}/api/appraise`, {
      method: 'POST',
      body: createFormData(imageUri),
      signal: controller.signal,
    });
    
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
    clearTimeout(stateTimer1);
    clearTimeout(stateTimer2);
    clearTimeout(stateTimer3);
  }
}
```

---

### 🧠 Phase 2: The Appraisal Loop (Week 2)

**Goal:** Complete the capture → identify → valuate → display flow.

#### 2.1 The Camera Flow

1. Implement `components/CameraView.tsx` with expo-camera
2. Integrate compression from `lib/camera.ts`
3. Add condition confirmation step before API call

#### 2.2 The "Money" Screen (`app/(tabs)/result/[id].tsx`)

**UI Requirements:**
- Header: Bold typography for Item Title
- Confidence indicator (color-coded based on data tier)
- Price range visualization (horizontal bar)
- Sample size disclosure ("Based on X sales")
- "Manual Review" CTA when confidence is low/none
- "List on eBay" action (Phase 3)

**Confidence → UI Mapping:**

| Confidence | Color | UI Treatment |
|------------|-------|--------------|
| high | `success` (#34C759) | Bold prices, prominent actions |
| medium | `warning` (#FF9500) | Prices with amber badge, "Verify" note |
| low | `destructive` (#FF3B30) | Muted prices, red warning, manual review CTA |
| none | `text` (#1D1D1F) | No prices, "No data found" message |

#### 2.3 The Connection

Wire up: Camera → Compress → Confirm Condition → API → Supabase Insert → Result Screen

---

### 🛒 Phase 3: The Marketplace (Week 3)

**Goal:** Close the loop from "What is it worth?" to "It is listed."

#### 3.1 eBay OAuth

- Add encrypted token columns to Supabase
- Implement `GET /api/ebay/auth` (redirect to eBay)
- Implement `GET /api/ebay/callback` (exchange code, encrypt tokens)

#### 3.2 Listing Creation

- Implement `POST /api/ebay/draft`
- Map AI-generated data to eBay Trading API XML
- Add "List on eBay" button to Result Screen

---

## 5. Technical Constraints & Rules

| Rule | Enforcement |
|------|-------------|
| No Web Scroll Bugs | Main content uses standard flow layout, no absolute positioning |
| Strict Types | Frontend interfaces match Backend Pydantic models exactly |
| Stateless API | No session state in memory (use Supabase) |
| Error Handling | Never crash on bad data; show "Manual Review Needed" state |
| Honest UX | Always communicate data quality/confidence to user |
| User Agency | AI proposes, human confirms (especially for condition) |

---

## 6. Reference Documents

- **Brainstorming Session:** `docs/analysis/brainstorming-session-2025-12-08.md`
- **Original Critique:** Winston (Architect), Sally (UX), John (PM), Mary (Analyst)
- **Design System:** Swiss International Style, NativeWind implementation

---

## 7. Quick Start Checklist

### Before Writing Any Code:
- [ ] Create Supabase project
- [ ] Enable Email/Password auth
- [ ] Set redirect URL to `valuesnap://auth/callback`
- [ ] Run SQL schema with RLS policies
- [ ] Create `.env` with all API keys

### Phase 1 Validation:
- [ ] `/health` endpoint returns warm status
- [ ] GPT returns valid JSON with fallback working
- [ ] eBay returns confidence-tiered results
- [ ] Auth flow works on mobile (deep link returns to app)
- [ ] Image compression works with fallback
- [ ] Progressive loading states display correctly

---

*This plan incorporates 25 critical findings from pre-implementation stress testing. See brainstorming session for full analysis.*

---

## 8. Brainstorming Session Summary

**Session Date:** 2025-12-08  
**Techniques Used:** Assumption Reversal, Failure Analysis, Five Whys, Alternative Approaches, Competitive Analysis  
**Total Findings:** 20 failure modes + 8 edge cases + 4 competitive threats

### Key Insights

1. **9 Critical Fixes Required** (~12-15 hours) - Rate limits, cost monitoring, abuse protection, API auth, confirmation screens, legal disclaimers, load testing
2. **3 Root Cause Patterns** - Fix these to prevent 15+ failures:
   - Trust-first → Defensive design
   - No load testing → Test under load
   - Feature over sustainability → Model unit economics
3. **Low Competitive Moat** - Technology is copyable. Focus on execution + trust. First mover advantage.

### Updated Work Estimate

- **Original Plan:** Week 1 foundation
- **Additional Work:** ~24-32 hours (root cause fixes + edge cases)
- **Total:** Still doable in 3 weeks if focused

**Full Analysis:** `docs/analysis/brainstorming-session-2025-12-08.md`
