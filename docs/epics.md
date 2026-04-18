---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ['docs/prd.md', 'docs/architecture.md', 'docs/ux-design-specification.md']
workflowType: 'epics-stories'
lastStep: 4
project_name: 'valuesnapapp'
user_name: 'Elawa'
date: '2025-12-12'
status: 'complete'
requirementsValidated: true
frCount: 55
nfrCount: 45
additionalCount: 23
epicCount: 8
epicsApproved: true
storiesGenerated: true
totalStories: 73
revision: 2
revisionNotes: 'Addressed critique: reordered cache story, split oversized stories, fixed ACs, added foundation stories, separated success metrics'
validationPassed: true
---

# valuesnapapp - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for valuesnapapp, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**Image Capture & Input (FR1-7)**
- FR1: User can capture a photo of an item using the device camera
- FR2: User can upload an existing photo from their device's file system or photo library
- FR3: User can retake or replace a photo before submitting for valuation
- FR4: User can view a preview of the captured/uploaded image before submission
- FR5: System can detect when camera permission is denied and offer file upload alternative
- FR6: User can capture photos on both mobile and desktop devices
- FR7: User can receive feedback when photo quality is insufficient for accurate identification

**Item Identification & Valuation (FR8-18)**
- FR8: System can identify an item from a submitted photo using AI analysis
- FR9: System can retrieve recent sold prices for the identified item from eBay marketplace data
- FR10: System can calculate a price range estimate based on market data analysis
- FR11: System can determine confidence level (HIGH/MEDIUM/LOW) based on data quality and sample size
- FR12: User can view the identified item name, category, and key attributes
- FR13: User can view the estimated price range (low-high)
- FR14: User can view the confidence level for the valuation
- FR15: User can view the number of recent sales used to calculate the estimate
- FR16: User can view market velocity indicators (how quickly items sell)
- FR17: System can generate grammatically correct item descriptions
- FR18: User can view progress indication while valuation is being processed

**Marketplace Listing (FR19-28)**
- FR19: User can create an eBay listing pre-filled with valuation data
- FR20: System can pre-populate listing title from AI identification
- FR21: System can pre-populate listing description from AI-generated content
- FR22: System can pre-populate suggested listing price from valuation estimate
- FR23: System can pre-populate item category from AI classification
- FR24: System can pre-populate item condition based on AI assessment
- FR25: System can include the original item photo in the listing data
- FR26: User can edit any pre-filled listing field before finalizing
- FR27: User can copy listing data to clipboard for manual eBay entry
- FR28: User can distinguish between pre-filled fields and fields requiring manual input

**Valuation History & Management (FR29-34)**
- FR29: User can view a list of all their past valuations
- FR30: User can view details of any individual past valuation
- FR31: System can persist valuation history across sessions
- FR32: User can access valuation history from main navigation
- FR33: User can view when each valuation was created (date/time)
- FR34: User can view cached valuations when offline (if previously loaded)

**User Account & Authentication (FR35-42)**
- FR35: User can create an account to save their data
- FR36: User can sign in to access their saved valuations
- FR37: User can sign out of their account
- FR38: System can maintain user session across app restarts
- FR39: User can use the app without an account for basic valuation (limited history)
- FR40: User can view their account information in Settings
- FR41: User can access support/help information
- FR42: User can delete their account and associated data

**Application & Platform (FR43-49)**
- FR43: User can install the app to their device home screen (PWA)
- FR44: User can navigate between Camera, History, and Settings views
- FR45: User can access the app on mobile devices (phones, tablets)
- FR46: User can access the app on desktop browsers
- FR47: System can display responsive layouts appropriate to screen size
- FR48: User can access the marketing landing page to learn about the product
- FR49: User can launch the app from the landing page

**Error Handling & Feedback (FR50-55)**
- FR50: User can receive feedback when AI cannot identify an item
- FR51: User can receive feedback when insufficient market data exists for pricing
- FR52: System can display appropriate messaging based on confidence level
- FR53: User can receive feedback when network connectivity is unavailable
- FR54: User can retry a failed valuation request
- FR55: User can receive feedback when API rate limits are reached

### NonFunctional Requirements

**Performance (NFR-P1 to NFR-P7)**
- NFR-P1: Valuation response time < 3 seconds end-to-end
- NFR-P2: First Contentful Paint < 1.5 seconds
- NFR-P3: Largest Contentful Paint < 2.5 seconds
- NFR-P4: Time to Interactive < 3.5 seconds
- NFR-P5: Cumulative Layout Shift < 0.1
- NFR-P6: Bundle size < 500KB gzipped
- NFR-P7: Image processing < 1 second client-side

**Security (NFR-S1 to NFR-S10)**
- NFR-S1: Data encryption in transit (TLS 1.2+)
- NFR-S2: Data encryption at rest (Supabase default)
- NFR-S3: Authentication security (Supabase Auth with secure tokens)
- NFR-S4: API credential protection (server-side API calls only)
- NFR-S5: Input validation (prevent injection attacks)
- NFR-S6: Image retention (deleted within 24 hours, thumbnail only in history)
- NFR-S7: Account deletion (GDPR-compliant)
- NFR-S8: Rate limiting (10/hour guest, 100/hour authenticated)
- NFR-S9: Session timeout (7 days inactivity)
- NFR-S10: Concurrent sessions (max 3 simultaneous)

**Scalability (NFR-SC1 to NFR-SC6)**
- NFR-SC1: 100 concurrent users (MVP)
- NFR-SC2: 10,000 valuations per user capacity
- NFR-SC3: Graceful API rate limit handling
- NFR-SC4: 10x growth without major refactoring
- NFR-SC5: ≤2 eBay API calls per valuation
- NFR-SC6: <5% error rate under 100 concurrent users

**Accessibility (NFR-A1 to NFR-A6)**
- NFR-A1: Color contrast 4.5:1 ratio (WCAG 2.1 AA)
- NFR-A2: Touch targets minimum 44x44px
- NFR-A3: Visible focus states on all interactive elements
- NFR-A4: Meaningful alt text for all images
- NFR-A5: Proper heading hierarchy and landmarks
- NFR-A6: Errors announced to screen readers

**Integration (NFR-I1 to NFR-I5)**
- NFR-I1: eBay Browse API with caching (5,000 calls/day limit)
- NFR-I2: OpenAI API with rate limits, timeout, retry logic
- NFR-I3: Degraded operation if API unavailable (cached data or clear error)
- NFR-I4: API abstraction for version changes
- NFR-I5: OAuth 2.0 for eBay (Phase 2)

**Reliability (NFR-R1 to NFR-R6)**
- NFR-R1: 99% system availability
- NFR-R2: Graceful error handling (no unhandled exceptions)
- NFR-R3: PWA offline mode (cached valuations viewable)
- NFR-R4: Data persistence (valuations saved before network issues)
- NFR-R5: Session recovery across app restarts
- NFR-R6: >95% valuation success rate

**AI Quality (NFR-AI1 to NFR-AI7)**
- NFR-AI1: >80% identification accuracy
- NFR-AI2: <10% factual errors in descriptions
- NFR-AI3: <5% grammar issues
- NFR-AI4: >70% valuation accuracy (within ±15% of sale price)
- NFR-AI5: Confidence calibration (HIGH more accurate than LOW)
- NFR-AI6: <20% user correction rate
- NFR-AI7: Photo quality detection (minimum 800x600)

**Guest User Limitations (NFR-G1 to NFR-G3)**
- NFR-G1: Guest history limited to last 5 valuations (local storage)
- NFR-G2: Guest session until browser cache cleared
- NFR-G3: Listing pre-fill requires account (drives account creation)

### Success Metrics (Outcome-Based - Not Stories)

These are tracked post-launch, not implemented as stories:

| Metric | Target | Measurement |
|--------|--------|-------------|
| NFR-AI1 | >80% identification accuracy | Post-launch user feedback analysis |
| NFR-AI4 | >70% valuation accuracy (±15% of sale) | Compare valuations to actual sale prices |
| NFR-AI5 | Confidence calibration | HIGH more accurate than LOW statistically |
| NFR-AI6 | <20% user correction rate | Track field edits before listing |
| NFR-R6 | >95% valuation success rate | Error rate monitoring |
| NFR-SC4 | 10x growth without refactoring | Architecture review milestone |
| NFR-SC6 | <5% error rate under 100 concurrent | Load testing verification |

### Additional Requirements

**From Architecture - Starter Template:**
- ARCH-1: Use Expo tabs template (`npx create-expo-app@latest valuesnapapp --template tabs`)
- ARCH-2: Add NativeWind v4 (Tailwind for React Native) - **NOTE: Breaking changes from v2**
- ARCH-3: Configure for web (`react-dom`, `react-native-web`, `@expo/metro-runtime`)

**From Architecture - Mock Infrastructure (P0):**
- ARCH-4: Mock AI interpreter for frontend development without backend
- ARCH-5: Mock eBay fetcher for backend development without external APIs
- ARCH-6: `USE_MOCK=true` environment variable for testing mode
- ARCH-7: Quality gate: Mock mode must work immediately after extraction

**From Architecture - Backend Services:**
- ARCH-8: GPT interpreter with Pydantic v2 from prototype (`gpt_interpreter.py`)
- ARCH-9: eBay client with IQR filtering from prototype (`ebay_client.py`)
- ARCH-10: eBay OAuth with Fernet encryption from prototype (`ebay_oauth.py`)
- ARCH-11: Confidence calculation as isolated service with configurable thresholds

**From Architecture - Data Layer:**
- ARCH-12: Supabase cache table for eBay market data (4-24 hour TTL)
- ARCH-13: Hybrid schema (normalized tables + JSONB for AI/eBay responses)
- ARCH-14: Row-level security (RLS) on Supabase tables
- ARCH-15: eBay tokens stored encrypted, separate from user auth

**From Architecture - API Design:**
- ARCH-16: REST API with OpenAPI spec (`/docs` Swagger UI)
- ARCH-17: Standardized API response wrapper (`ApiResponse<T>`)
- ARCH-18: Error codes as UPPER_SNAKE (VALUATION_FAILED, RATE_LIMIT_EXCEEDED, etc.)
- ARCH-19: camelCase for JSON, snake_case for Python internals

**From Architecture - CI/CD:**
- ARCH-20: GitHub Actions CI/CD pipeline
- ARCH-21: Backend tests with pytest + coverage
- ARCH-22: Frontend tests with npm + lint
- ARCH-23: Auto-deploy staging (develop branch) and production (main branch)

**From UX Design - Design System:**
- UX-1: Swiss Minimalist design (typography-driven, no decoration)
- UX-2: Color palette: Paper (#FFFFFF), Ink (#000000), Signal (#E53935)
- UX-3: Typography weight for confidence (Bold = HIGH, Regular = MEDIUM/LOW)
- UX-4: No traffic light colors, no rounded corners, no shadows
- UX-5: 12-column modular grid with mathematical collapse (12→6→4→3)

**From UX Design - Component Architecture:**
- UX-6: 6-layer component hierarchy (Primitives → Atoms → Molecules → Organisms → Templates)
- UX-7: Primitives: Box, Stack, Text, SwissPressable
- UX-8: Skeleton loaders instead of spinners (Swiss Minimalist)
- UX-9: Typography-based processing states ("Analyzing..." → "Identifying...")

**From UX Design - Platform Behavior:**
- UX-10: Mobile: Camera as home screen, bottom navigation
- UX-11: Desktop: Left workstation sidebar with 10/45/45 appraisal layout and desktop-first upload workflow
- UX-12: Result cards slide up over camera viewfinder
- UX-13: Offline: Cached valuations viewable, request queuing

**From UX Design - User Flows:**
- UX-14: eBay authorization shown AFTER first valuation (value before ask)
- UX-15: Trust-through-transparency (sample sizes visible, confidence explicit)
- UX-16: Error recovery with guidance (never dead-ends)
- UX-17: Pre-filled listings with inline editing

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | Camera capture |
| FR2 | Epic 1 | File upload |
| FR3 | Epic 1 | Retake photo |
| FR4 | Epic 1 | Preview image |
| FR5 | Epic 1 | Permission denied fallback |
| FR6 | Epic 1 | Cross-device capture |
| FR7 | Epic 1 | Photo quality feedback |
| FR8 | Epic 2 | AI identification |
| FR9 | Epic 2 | eBay sold prices |
| FR10 | Epic 2 | Price range calculation |
| FR11 | Epic 2 | Confidence level |
| FR12 | Epic 2 | Item details display |
| FR13 | Epic 2 | Price range display |
| FR14 | Epic 2 | Confidence display |
| FR15 | Epic 2 | Sample size display |
| FR16 | Epic 2 | Market velocity |
| FR17 | Epic 2 | Description generation |
| FR18 | Epic 2 | Processing progress |
| FR19 | Epic 5 | Pre-filled listing |
| FR20 | Epic 5 | Title pre-fill |
| FR21 | Epic 5 | Description pre-fill |
| FR22 | Epic 5 | Price pre-fill |
| FR23 | Epic 5 | Category pre-fill |
| FR24 | Epic 5 | Condition pre-fill |
| FR25 | Epic 5 | Photo inclusion |
| FR26 | Epic 5 | Field editing |
| FR27 | Epic 5 | Copy to clipboard |
| FR28 | Epic 5 | Field distinction |
| FR29 | Epic 3 | History list |
| FR30 | Epic 3 | Valuation details |
| FR31 | Epic 3 | Persistence |
| FR32 | Epic 3 | Navigation access |
| FR33 | Epic 3 | Timestamps |
| FR34 | Epic 3 | Offline viewing |
| FR35 | Epic 4 | Account creation |
| FR36 | Epic 4 | Sign in |
| FR37 | Epic 4 | Sign out |
| FR38 | Epic 4 | Session persistence |
| FR39 | Epic 4 | Guest mode |
| FR40 | Epic 4 | Account info |
| FR41 | Epic 4 | Support/help |
| FR42 | Epic 4 | Account deletion |
| FR43 | Epic 6 | PWA install |
| FR44 | Epic 6 | Navigation |
| FR45 | Epic 6 | Mobile access |
| FR46 | Epic 6 | Desktop access |
| FR47 | Epic 6 | Responsive layouts |
| FR48 | Epic 6 | Landing page |
| FR49 | Epic 6 | App launch |
| FR50 | Epic 2 | AI failure feedback |
| FR51 | Epic 2 | Data insufficient feedback |
| FR52 | Epic 2 | Confidence messaging |
| FR53 | Epic 6 | Network error feedback |
| FR54 | Epic 6 | Retry failed request |
| FR55 | Epic 6 | Rate limit feedback |

## Epic List

### Epic 0: Developer Foundation
**Goal:** Development team can build features in parallel with mock infrastructure and design system ready.

**Requirements covered:** ARCH-1 to ARCH-7, UX-6 to UX-9

**Key Deliverables:**
- Expo tabs template with NativeWind v4
- Mock AI interpreter and eBay fetcher
- Swiss Minimalist design tokens (colors, typography, spacing)
- Primitives layer (Box, Stack, Text, SwissPressable)
- Shared TypeScript types (`types/index.ts`)
- Environment configuration (`.env.example`, `lib/env.ts`)
- Global error boundary
- `USE_MOCK=true` environment working

---

### Epic 1: Camera Capture
**Goal:** Users can capture photos of items on any device with a seamless experience.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7

**Key Deliverables:**
- Mobile: Full-bleed viewfinder, single-tap capture
- Desktop: File upload with drag-and-drop
- Permission handling with graceful fallback
- Photo quality validation (800x600 minimum)
- Preview and retake functionality

---

### Epic 2: AI Valuation Engine
**Goal:** Users receive instant valuations with transparent confidence indicators and graceful error handling.

**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR50, FR51, FR52

**Requirements covered:** ARCH-8 to ARCH-12

**Key Deliverables:**
- GPT-4o-mini AI identification integration
- **Cache layer for eBay API efficiency** (moved from Epic 3)
- eBay Browse API with IQR filtering
- Confidence calculation service (HIGH/MEDIUM/LOW)
- ValuationCard component with Swiss design
- Typography-based processing states
- Error handling for AI/data failures

---

### Epic 3: History & Persistence
**Goal:** Users can save, view, and manage their valuations across sessions, even offline.

**FRs covered:** FR29, FR30, FR31, FR32, FR33, FR34

**Requirements covered:** ARCH-13 to ARCH-15 (ARCH-12 cache layer moved to Epic 2)

**Key Deliverables:**
- Supabase database with valuation storage
- Offline viewing of cached valuations
- History grid with Swiss card layout
- Guest users: local storage (5 valuations max)

---

### Epic 4: User Authentication
**Goal:** Users can create accounts, sync data across devices, and unlock full features.

**FRs covered:** FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR42

**Requirements covered:** NFR-G1 to NFR-G3, NFR-S3, NFR-S9, NFR-S10

**Key Deliverables:**
- Supabase Auth (Email + Google OAuth)
- Guest → Account upgrade flow
- Settings screen with account info
- Account deletion (GDPR compliant)
- Session persistence across app restarts

---

### Epic 5: Listing Creation
**Goal:** Users can create eBay listings in 2 minutes with 6/8 fields pre-filled.

**FRs covered:** FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28

**Key Deliverables:**
- Pre-fill: title, category, condition, price, description, photo
- Copy-to-clipboard for MVP (no OAuth required)
- Inline editing of all fields
- Swiss form patterns
- Clear AI-generated field indicators

---

### Epic 6: Platform & PWA
**Goal:** Users can install the app, access the marketing page, and experience reliable error handling.

**FRs covered:** FR43, FR44, FR45, FR46, FR47, FR48, FR49, FR53, FR54, FR55

**Key Deliverables:**
- PWA with add-to-homescreen
- Marketing landing page (Expo static export)
- Responsive 12-column grid (mobile → desktop)
- Tab navigation (Camera | History | Settings)
- Network error handling with retry
- Rate limit feedback

---

### Epic 7: Accessibility & Polish
**Goal:** Users enjoy a performant, accessible, production-ready experience.

**Requirements covered:** NFR-A1 to NFR-A6, NFR-P1 to NFR-P7, ARCH-20 to ARCH-23

**Key Deliverables:**
- WCAG 2.1 AA compliance
- Performance optimization (<500KB bundle, <3s valuation)
- GitHub Actions CI/CD pipeline
- Lighthouse audits passing
- Cross-browser testing (Chrome, Safari, Firefox, Edge)

---

## Epic Summary

| Epic | Name | Stories | FRs | Focus |
|------|------|---------|-----|-------|
| 0 | Developer Foundation | 8 | ARCH, UX | Setup, types, mocks, error boundary |
| 1 | Camera Capture | 6 | 7 | Photo input |
| 2 | AI Valuation Engine | 11 | 14 | Core value prop + cache layer |
| 3 | History & Persistence | 5 | 6 | Data storage |
| 4 | User Authentication | 11 | 8 | Accounts |
| 5 | Listing Creation | 10 | 10 | eBay listings |
| 6 | Platform & PWA | 10 | 10 | App experience |
| 7 | Accessibility & Polish | 12 | NFRs | Production ready |

**Total Stories:** 73  
**Total FRs covered:** 55/55 ✅

### Clarifications

**eBay OAuth (ARCH-10 vs NFR-I5):** The architecture doc references `ebay_oauth.py` from the prototype, but OAuth is explicitly deferred to Phase 2 (NFR-I5). For MVP, include the OAuth module as **dormant code** (not active) to enable quick Phase 2 activation. MVP uses copy-to-clipboard flow only.

---

## Epic 0: Developer Foundation

**Goal:** Development team can build features in parallel with mock infrastructure and design system ready.

**Requirements covered:** ARCH-1 to ARCH-7, UX-6 to UX-9

**⚠️ Accessibility Note:** All primitives and components built in this epic MUST include accessibility attributes from the start. Epic 7's accessibility stories verify and enhance—they don't retrofit. Specifically:
- All `Text` variants must have proper semantic roles
- All `SwissPressable` must have `accessibilityRole="button"` and `accessibilityLabel`
- Color tokens must meet 4.5:1 contrast ratio (already verified in Swiss palette)

### Story 0.1: Initialize Expo Project with Tabs Template

**As a** developer,
**I want** a properly configured Expo project with tabs navigation,
**So that** I can start building features on a solid foundation.

**Acceptance Criteria:**

**Given** a fresh project directory
**When** the Expo tabs template is initialized
**Then** the project structure matches Expo Router conventions
**And** TypeScript is properly configured
**And** the app runs successfully on web (`npx expo start --web`)
**And** navigation between Camera, History, and Settings tabs works

---

### Story 0.2: Configure NativeWind and Swiss Design Tokens

**As a** developer,
**I want** NativeWind v4 configured with Swiss Minimalist design tokens,
**So that** all components follow the design system consistently.

**Acceptance Criteria:**

**Given** the Expo project from Story 0.1
**When** NativeWind v4 is installed and configured
**Then** Tailwind classes work in React Native components
**And** Swiss color tokens are defined (paper, ink, ink-light, ink-muted, signal, divider)
**And** Typography scale is defined (display, h1, h2, h3, body, caption)
**And** Spacing scale is defined (4px base: 1, 2, 3, 4, 6, 8, 12, 16)
**And** `tailwind.config.js` restricts rounded corners and shadows to `none`

---

### Story 0.3: Create Primitive Components

**As a** developer,
**I want** reusable primitive components (Box, Stack, Text, SwissPressable),
**So that** I can build higher-level components with consistent patterns.

**Acceptance Criteria:**

**Given** NativeWind configuration from Story 0.2
**When** primitive components are implemented
**Then** `Box` component wraps View with className support
**And** `Stack` component provides vertical/horizontal layouts with gap
**And** `Text` component supports variants (display, h1, h2, h3, body, caption)
**And** `SwissPressable` handles interaction states (hover, press, focus, disabled)
**And** all primitives are exported from `components/primitives/index.ts`

---

### Story 0.4: Set Up Mock Infrastructure

**As a** developer,
**I want** mock services for AI and eBay APIs,
**So that** I can develop frontend and backend independently without external API calls.

**Acceptance Criteria:**

**Given** the project structure
**When** mock infrastructure is implemented
**Then** `USE_MOCK=true` environment variable enables mock mode
**And** Mock AI interpreter returns valid `ItemDetails` response
**And** Mock eBay fetcher returns valid market data with price range
**And** Mock responses include realistic delays (500-1500ms)
**And** Mock mode is documented in README

---

### Story 0.5: Create Skeleton Loader Components

**As a** developer,
**I want** skeleton loader components for loading states,
**So that** the app provides visual feedback during data fetching.

**Acceptance Criteria:**

**Given** the primitives layer from Story 0.3
**When** skeleton components are created
**Then** `ValuationCardSkeleton` matches the card dimensions
**And** skeletons use `bg-divider` color with `animate-pulse`
**And** no rounded corners (Swiss Minimalist)
**And** skeleton components are exported from `components/molecules/index.ts`

---

### Story 0.6: Define Shared TypeScript Types and Interfaces

**As a** developer,
**I want** shared type definitions for all domain entities,
**So that** frontend and backend contracts are aligned and type-safe.

**Acceptance Criteria:**

**Given** the project structure
**When** shared types are defined
**Then** `types/valuation.ts` exports `Valuation`, `ValuationRequest`, `ValuationResponse`
**And** `types/item.ts` exports `ItemDetails`, `ItemCategory`, `ItemCondition`
**And** `types/market.ts` exports `MarketData`, `PriceRange`, `ConfidenceLevel`
**And** `types/api.ts` exports `ApiResponse<T>`, `ApiError`, `ErrorCode`
**And** `types/user.ts` exports `User`, `GuestUser`, `AuthState`
**And** all types are exported from `types/index.ts`
**And** types match the API response wrapper format from ARCH-17

---

### Story 0.7: Configure Environment Variables

**As a** developer,
**I want** environment configuration properly set up,
**So that** secrets are managed securely and environments are isolated.

**Acceptance Criteria:**

**Given** the project structure
**When** environment configuration is created
**Then** `.env.example` documents all required variables
**And** `.env.local` is gitignored
**And** `USE_MOCK` variable toggles mock mode (default: true for development)
**And** `SUPABASE_URL` and `SUPABASE_ANON_KEY` are configured
**And** `OPENAI_API_KEY` placeholder exists for backend
**And** `EBAY_APP_ID` placeholder exists for backend
**And** `lib/env.ts` provides typed environment access with validation
**And** missing required variables throw clear error on app start

---

### Story 0.8: Set Up Global Error Boundary

**As a** developer,
**I want** a global error boundary that catches unhandled errors,
**So that** the app fails gracefully instead of crashing.

**Acceptance Criteria:**

**Given** the app component tree
**When** an unhandled error occurs in any component
**Then** the error boundary catches it
**And** a user-friendly error screen is displayed (Swiss Minimalist)
**And** a "Try Again" button reloads the app
**And** error details are logged (not shown to user)
**And** the error boundary follows React error boundary patterns
**And** error boundary is wrapped at the root layout level

---

## Epic 1: Camera Capture

**Goal:** Users can capture photos of items on any device with a seamless experience.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7

### Story 1.1: Implement Mobile Camera Capture

**As a** user on a mobile device,
**I want** to capture a photo using my device camera,
**So that** I can quickly photograph items for valuation.

**Acceptance Criteria:**

**Given** the user is on the Camera tab on mobile
**When** the camera permission is granted
**Then** a full-bleed viewfinder displays the camera feed
**And** a single tap on the capture button takes a photo
**And** visual feedback confirms the capture (brief flash/animation)
**And** the captured image is stored temporarily for processing

**Given** the camera tab is opened
**When** camera permission has not been requested
**Then** the system prompts for camera permission with clear messaging

---

### Story 1.2: Implement File Upload for Desktop

**As a** user on a desktop browser,
**I want** to upload an existing photo from my computer,
**So that** I can value items without a camera.

**Acceptance Criteria:**

**Given** the user is on the Camera tab on desktop
**When** no camera is detected or user prefers upload
**Then** a file upload zone is displayed with drag-and-drop support
**And** clicking the zone opens a file picker
**And** accepted formats are JPG, PNG, WEBP
**And** the uploaded image is stored temporarily for processing

**Given** an invalid file type is selected
**When** the user attempts to upload
**Then** an error message explains accepted formats

---

### Story 1.3: Handle Camera Permission Denied

**As a** user who denied camera permission,
**I want** a fallback option to upload photos,
**So that** I can still use the app without camera access.

**Acceptance Criteria:**

**Given** the user has denied camera permission
**When** the Camera tab is displayed
**Then** a friendly message explains camera access was denied
**And** a file upload button is prominently displayed as fallback
**And** instructions for enabling camera in settings are shown
**And** no error or broken UI is displayed

---

### Story 1.4: Photo Preview and Retake

**As a** user,
**I want** to preview my photo and retake if needed,
**So that** I can ensure the photo is clear before submitting.

**Acceptance Criteria:**

**Given** the user has captured or uploaded a photo
**When** the photo is ready
**Then** a preview displays the full image
**And** a "Retake" button allows starting over
**And** a "Use Photo" button proceeds to valuation
**And** the preview maintains aspect ratio without cropping

---

### Story 1.5: Photo Quality Validation

**As a** user,
**I want** feedback when my photo quality is insufficient,
**So that** I can take a better photo for accurate identification.

**Acceptance Criteria:**

**Given** the user has captured/uploaded a photo
**When** the image is below minimum quality (800x600 pixels)
**Then** a warning message explains the issue
**And** suggestions are provided ("Try better lighting", "Move closer")
**And** the user can choose to proceed anyway or retake
**And** photos meeting quality requirements proceed without warning

---

### Story 1.6: Cross-Platform Camera Component

**As a** developer,
**I want** a unified CameraCapture component that works on web and native,
**So that** the camera experience is consistent across platforms.

**Acceptance Criteria:**

**Given** the CameraCapture organism component on mobile web
**When** rendered on iOS Safari
**Then** camera access requires HTTPS (enforced by environment)
**And** camera activation is triggered by user gesture (tap)
**And** camera stream starts successfully after user grants permission

**Given** the CameraCapture component on Chrome/Firefox mobile
**When** camera permission is granted
**Then** `getUserMedia` API is used for camera access
**And** rear camera is selected by default on mobile

**Given** the CameraCapture component on desktop
**When** rendered without webcam detected
**Then** file upload interface is displayed as primary option
**And** drag-and-drop zone is shown

**Given** the CameraCapture component on desktop with webcam
**When** rendered
**Then** both webcam and file upload options are available
**And** file upload is the default selection

---

## Epic 2: AI Valuation Engine

**Goal:** Users receive instant valuations with transparent confidence indicators and graceful error handling.

**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR50, FR51, FR52

**Additional:** ARCH-8 to ARCH-11

### Story 2.1: Create Valuation API Endpoint

**As a** frontend developer,
**I want** a POST `/api/v1/valuations` endpoint,
**So that** I can submit photos and receive valuation data.

**Acceptance Criteria:**

**Given** a valid image is submitted to the endpoint
**When** the request is processed
**Then** the response follows the `ApiResponse<T>` wrapper format
**And** the response includes item identification, price range, and confidence
**And** the response time is under 3 seconds (NFR-P1)
**And** errors return standardized error codes (VALUATION_FAILED, etc.)

**Given** an invalid or missing image
**When** the request is submitted
**Then** a 400 error with `INVALID_IMAGE` code is returned

---

### Story 2.2: Integrate AI Item Identification

**As a** user,
**I want** my item automatically identified from the photo,
**So that** I don't have to manually describe what I'm selling.

**Acceptance Criteria:**

**Given** a photo is submitted for valuation
**When** the AI identification service processes it
**Then** GPT-4o-mini returns structured `ItemDetails` (name, category, attributes)
**And** the AI generates a grammatically correct description (FR17)
**And** mock mode returns realistic test data when `USE_MOCK=true`

**Given** the AI cannot identify the item
**When** confidence is below threshold
**Then** a partial result is returned with LOW confidence flag

**Given** valid test images from the test suite
**When** processed by the AI service
**Then** at least 8/10 test images return correct item category

---

### Story 2.3: Implement Cache Layer for eBay API

**As a** developer,
**I want** a cache layer for eBay market data,
**So that** we minimize API calls and improve response times.

**Acceptance Criteria:**

**Given** the Supabase cache table exists (ARCH-12)
**When** market data is requested for an item
**Then** the cache is checked first before calling eBay API
**And** cache entries have configurable TTL (4-24 hours)
**And** expired entries are automatically cleaned up
**And** cache key includes item identification hash
**And** cache hit returns data without API call
**And** cache miss triggers API call and stores result

**Note:** This story MUST be completed before Story 2.4 (eBay Market Data integration).

---

### Story 2.4: Integrate eBay Market Data

**As a** user,
**I want** real market prices based on actual eBay sales,
**So that** I can trust the valuation is based on real data.

**Acceptance Criteria:**

**Given** an item has been identified and cache layer exists (Story 2.3)
**When** the eBay Browse API is queried
**Then** cache is checked first (cache hit skips API call)
**And** recent sold prices are retrieved for matching items
**And** IQR filtering removes outliers from price data
**And** results are stored in cache with TTL
**And** API calls are limited to ≤2 per valuation (NFR-SC5)

**Given** no eBay sold data exists for the item
**When** the market data service runs
**Then** active listing prices are used as fallback
**And** the response indicates "limited data" status

---

### Story 2.5: Implement Confidence Calculation Service

**As a** user,
**I want** to see how confident the app is in its valuation,
**So that** I know when to trust it and when to verify manually.

**Acceptance Criteria:**

**Given** market data has been retrieved
**When** confidence is calculated
**Then** HIGH confidence requires ≥20 sold items with <25% variance
**And** MEDIUM confidence requires 5-19 sold items with <40% variance
**And** LOW confidence is assigned for <5 sold items
**And** AI_ONLY flag is set when 0 sold and <3 active listings
**And** confidence thresholds are configurable (ARCH-11)

---

### Story 2.6: Build ValuationCard Component

**As a** user,
**I want** to see my valuation results in a clear, data-first format,
**So that** I can quickly understand what my item is worth.

**Acceptance Criteria:**

**Given** a valuation result is ready
**When** the ValuationCard is rendered
**Then** the item photo is displayed prominently
**And** the item name is shown (h3, bold)
**And** the price range is displayed large and bold (display size)
**And** confidence is shown via typography weight (Bold=HIGH, Regular=MEDIUM/LOW)
**And** sample size is shown as caption ("Based on 47 sales")
**And** the card follows Swiss Minimalist design (no shadows, no rounded corners)

---

### Story 2.7: Display Processing Progress States

**As a** user,
**I want** to see progress while my item is being valued,
**So that** I know the app is working and roughly how long to wait.

**Acceptance Criteria:**

**Given** a photo has been submitted for valuation
**When** processing begins
**Then** typography-based progress is shown ("Analyzing...")
**And** progress updates through stages ("Identifying item...", "Finding market data...", "Calculating value...")
**And** a skeleton loader shows where the result will appear
**And** the total processing time targets <10 seconds

---

### Story 2.8: Handle AI Identification Failures

**As a** user,
**I want** helpful feedback when the AI can't identify my item,
**So that** I can take action instead of being stuck.

**Acceptance Criteria:**

**Given** the AI cannot identify the item (FR50)
**When** the valuation fails
**Then** a clear message explains the issue ("Unable to identify item")
**And** suggestions are provided ("Try a different angle", "Include brand/model in frame")
**And** a manual search link is offered ("Search eBay manually")
**And** a retry button is available

---

### Story 2.9: Handle Insufficient Market Data

**As a** user,
**I want** to know when market data is limited,
**So that** I understand the valuation has higher uncertainty.

**Acceptance Criteria:**

**Given** limited market data exists for the item (FR51)
**When** the valuation is displayed
**Then** the confidence shows LOW with explicit explanation
**And** the message "Limited data (3 sales)" is shown
**And** a guidance message suggests verification ("Consider manual verification")
**And** the price range is wider to reflect uncertainty

---

### Story 2.10: Display Confidence-Based Messaging

**As a** user,
**I want** appropriate messaging based on confidence level,
**So that** I know how to interpret the valuation.

**Acceptance Criteria:**

**Given** a HIGH confidence valuation (FR52)
**When** displayed to user
**Then** no additional warnings are shown
**And** bold typography indicates trustworthiness

**Given** a MEDIUM confidence valuation
**When** displayed to user
**Then** sample size is clearly shown for context

**Given** a LOW confidence valuation
**When** displayed to user
**Then** guidance text appears in Signal color
**And** manual verification is recommended

---

### Story 2.11: Display Market Velocity Indicator

**As a** user,
**I want** to see how quickly similar items sell,
**So that** I can set realistic expectations for my listing.

**Acceptance Criteria:**

**Given** market data includes timing information (FR16)
**When** the valuation card is displayed
**Then** market velocity is shown as caption text
**And** velocity indicates relative speed ("Sells in ~5 days" or "Slow mover")
**And** velocity is calculated from average days-to-sell in sold data

---

## Epic 3: History & Persistence

**Goal:** Users can save, view, and manage their valuations across sessions, even offline.

**FRs covered:** FR29, FR30, FR31, FR32, FR33, FR34

**Additional:** ARCH-12 to ARCH-15

### Story 3.1: Create Valuations Database Schema

**As a** developer,
**I want** a Supabase schema for storing valuations,
**So that** user data persists across sessions.

**Acceptance Criteria:**

**Given** Supabase is configured
**When** the valuations table is created
**Then** the schema includes: id, user_id (nullable FK), image_url, item_name, price_min, price_max, confidence, sample_size, ai_response (JSONB), ebay_data (JSONB), created_at
**And** Row Level Security (RLS) policies are configured
**And** user_id nullable allows guest valuations
**And** indexes are created on user_id and created_at

---

### Story 3.2: Implement Save Valuation Flow

**As a** user,
**I want** my valuations saved automatically,
**So that** I can access them later without re-photographing.

**Acceptance Criteria:**

**Given** a valuation has been completed
**When** the result is displayed
**Then** the valuation is automatically saved to the database
**And** a thumbnail of the image is stored (full image deleted per NFR-S6)
**And** the save happens before any network interruption can lose data (NFR-R4)
**And** guest users save to local storage (limited to 5 per NFR-G1)

---

### Story 3.3: Build History List View

**As a** user,
**I want** to see all my past valuations in a list,
**So that** I can review what I've valued before.

**Acceptance Criteria:**

**Given** the user navigates to the History tab (FR32)
**When** the history page loads
**Then** a grid of ValuationCards displays all saved valuations
**And** cards are ordered by date (newest first)
**And** the grid follows responsive layout (1 col mobile, 2 tablet, 3-4 desktop)
**And** skeleton loaders show while data is fetching

**Given** the user has no valuations
**When** the history page loads
**Then** an empty state explains how to get started
**And** a "Start Valuing" button links to Camera tab

---

### Story 3.4: Display Valuation Details

**As a** user,
**I want** to view the full details of a past valuation,
**So that** I can see all the information for listing or reference.

**Acceptance Criteria:**

**Given** the user taps a valuation card in history (FR30)
**When** the detail view opens
**Then** the full item photo is displayed
**And** all valuation data is shown (name, price range, confidence, sample size, description)
**And** the timestamp shows when the valuation was created (FR33)
**And** action buttons are available ("List on eBay", "Delete")

---

### Story 3.5: Implement Offline Viewing

**As a** user,
**I want** to view my cached valuations when offline,
**So that** I can reference my data without internet connection.

**Acceptance Criteria:**

**Given** valuations have been previously loaded (FR34)
**When** the device is offline
**Then** cached valuations are displayed from local storage
**And** an indicator shows "Offline mode"
**And** new valuations are disabled with clear messaging
**And** the app does not crash or show errors

---

## Epic 4: User Authentication

**Goal:** Users can create accounts, sync data across devices, and unlock full features.

**FRs covered:** FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR42

**Additional:** NFR-G1 to NFR-G3, NFR-S3, NFR-S9, NFR-S10

### Story 4.1: Configure Supabase Auth

**As a** developer,
**I want** Supabase Auth configured for the app,
**So that** users can create accounts and sign in securely.

**Acceptance Criteria:**

**Given** Supabase project is set up
**When** Auth is configured
**Then** Email/Password auth is enabled
**And** Google OAuth provider is configured
**And** JWT tokens are used for session management (NFR-S3)
**And** session timeout is set to 7 days (NFR-S9)
**And** Supabase client is initialized in `lib/supabase.ts`

---

### Story 4.2: Implement User Registration

**As a** new user,
**I want** to create an account with my email,
**So that** I can save my valuations and sync across devices.

**Acceptance Criteria:**

**Given** the user is on the signup page (FR35)
**When** they enter email and password
**Then** a new account is created in Supabase Auth
**And** email validation is enforced (valid format)
**And** password requirements are enforced (min 8 characters)
**And** a confirmation email is sent (if email confirmation enabled)
**And** the user is redirected to the app after signup

**Given** the email is already registered
**When** signup is attempted
**Then** a clear error message is shown

---

### Story 4.3: Implement User Sign In

**As a** returning user,
**I want** to sign in to my account,
**So that** I can access my saved valuations.

**Acceptance Criteria:**

**Given** the user is on the login page (FR36)
**When** they enter valid credentials
**Then** the user is authenticated
**And** the session token is stored securely
**And** the user is redirected to the Camera tab
**And** their valuation history is loaded

**Given** invalid credentials are entered
**When** login is attempted
**Then** a clear error message is shown
**And** rate limiting prevents brute force (NFR-S8)

---

### Story 4.4: Implement Google OAuth Sign In

**As a** user,
**I want** to sign in with my Google account,
**So that** I can use the app without creating a new password.

**Acceptance Criteria:**

**Given** the user taps "Sign in with Google"
**When** OAuth flow completes
**Then** the user is authenticated via Supabase
**And** a user record is created if first sign-in
**And** the session is maintained across app restarts

---

### Story 4.5: Implement Sign Out

**As a** signed-in user,
**I want** to sign out of my account,
**So that** I can secure my data on shared devices.

**Acceptance Criteria:**

**Given** the user is signed in (FR37)
**When** they tap "Sign Out" in Settings
**Then** the session is terminated
**And** local auth tokens are cleared
**And** the user is redirected to the Camera tab
**And** guest mode is enabled automatically

---

### Story 4.6: Implement Session Persistence

**As a** user,
**I want** to stay signed in across app restarts,
**So that** I don't have to log in every time.

**Acceptance Criteria:**

**Given** the user has signed in previously (FR38)
**When** the app is reopened
**Then** the session is automatically restored
**And** authentication state is checked on app launch
**And** session recovery works across app restarts (NFR-R5)
**And** max 3 concurrent sessions are enforced (NFR-S10)

---

### Story 4.7: Implement Guest Mode

**As a** user,
**I want** to try the app without creating an account,
**So that** I can see if it's useful before committing.

**Acceptance Criteria:**

**Given** the user opens the app without signing in (FR39)
**When** they use the valuation feature
**Then** valuations work normally
**And** history is limited to 5 items in local storage (NFR-G1)
**And** a banner prompts account creation after 3 valuations
**And** listing pre-fill requires account creation (NFR-G3)

---

### Story 4.8: Build Settings Screen

**As a** user,
**I want** to view and manage my account in Settings,
**So that** I can control my data and preferences.

**Acceptance Criteria:**

**Given** the user navigates to Settings tab (FR40)
**When** the Settings page loads
**Then** account info is displayed (email, sign-in method)
**And** "Sign Out" button is available
**And** "Delete Account" option is available
**And** "Help & Support" link is available (FR41)
**And** app version is displayed

---

### Story 4.9: Implement Account Deletion Confirmation

**As a** user,
**I want** clear confirmation before deleting my account,
**So that** I don't accidentally lose all my data.

**Acceptance Criteria:**

**Given** the user taps "Delete Account" in Settings (FR42)
**When** the confirmation dialog appears
**Then** consequences are clearly explained ("This will permanently delete all your valuations")
**And** the dialog requires typing "DELETE" to confirm
**And** "Cancel" button dismisses the dialog with no action
**And** "Delete My Account" button is styled in Signal color (destructive action)

---

### Story 4.10: Execute Account Deletion

**As a** user,
**I want** my account and all data permanently deleted when confirmed,
**So that** I can exercise my right to be forgotten.

**Acceptance Criteria:**

**Given** the user confirms deletion (Story 4.9)
**When** deletion is executed
**Then** all valuations are deleted from the database
**And** user profile is removed from Supabase Auth
**And** the user is signed out
**And** local storage is cleared
**And** a success message confirms deletion
**And** the user is redirected to Camera tab in guest mode
**And** deletion completes within 5 seconds
**And** deletion is GDPR-compliant (NFR-S7)

---

### Story 4.11: Migrate Guest Data to Account

**As a** guest user who creates an account,
**I want** my existing valuations migrated to my new account,
**So that** I don't lose my work.

**Acceptance Criteria:**

**Given** a guest user has valuations in local storage
**When** they create an account or sign in
**Then** migration prompt appears ("Migrate your 3 valuations?")
**And** local valuations are uploaded to their account
**And** local storage is cleared after successful migration
**And** the user sees their complete history immediately

**Given** migration of a single valuation fails
**When** the error occurs
**Then** failed items are retained in local storage
**And** user is notified ("2 of 3 valuations migrated")
**And** retry option is available for failed items

**Given** network is unavailable during migration
**When** user signs in
**Then** migration is queued for next online session
**And** user can use app normally with local data

---

## Epic 5: Listing Creation

**Goal:** Users can create eBay listings in 2 minutes with 6/8 fields pre-filled.

**FRs covered:** FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28

### Story 5.1: Build Listing Form Component

**As a** user,
**I want** a form to create an eBay listing from my valuation,
**So that** I can list my item quickly.

**Acceptance Criteria:**

**Given** the user taps "List on eBay" from a valuation (FR19)
**When** the listing form loads
**Then** a Swiss Minimalist form is displayed
**And** the form has fields for: Title, Category, Condition, Price, Description, Photos
**And** the form follows Swiss form patterns (labels above inputs, flush-left)
**And** required fields are marked with asterisk

---

### Story 5.2: Pre-Fill Title from AI Identification

**As a** user,
**I want** the listing title pre-filled from the AI identification,
**So that** I don't have to type it manually.

**Acceptance Criteria:**

**Given** a valuation exists with item identification (FR20)
**When** the listing form opens
**Then** the title field is pre-filled with AI-generated title
**And** the title follows eBay best practices (brand + model + key attributes)
**And** the title length is ≤80 characters (eBay limit)
**And** the field shows an "AI-generated" indicator

---

### Story 5.3: Pre-Fill Description from AI

**As a** user,
**I want** the item description pre-filled from AI,
**So that** I have a professional description without writing it myself.

**Acceptance Criteria:**

**Given** a valuation exists with AI-generated description (FR21)
**When** the listing form opens
**Then** the description field is pre-filled with AI text
**And** the description is grammatically correct (NFR-AI3)
**And** the description includes key attributes and condition
**And** the field shows an "AI-generated" indicator

---

### Story 5.4: Pre-Fill Price from Valuation

**As a** user,
**I want** the listing price pre-filled from the valuation estimate,
**So that** I start with a competitive price.

**Acceptance Criteria:**

**Given** a valuation exists with price range (FR22)
**When** the listing form opens
**Then** the price field is pre-filled with suggested price
**And** the suggested price is based on market data (median or strategic point in range)
**And** the original price range is shown as reference ("Estimated: $85-120")
**And** the user can adjust the price freely

---

### Story 5.5: Pre-Fill Category from AI Classification

**As a** user,
**I want** the eBay category pre-filled from AI classification,
**So that** my item is listed in the right place.

**Acceptance Criteria:**

**Given** a valuation exists with AI category (FR23)
**When** the listing form opens
**Then** the category field is pre-filled with AI-suggested eBay category
**And** the category maps to valid eBay category IDs
**And** the user can change the category if needed
**And** the field shows an "AI-generated" indicator

---

### Story 5.6: Pre-Fill Condition from AI Assessment

**As a** user,
**I want** the item condition pre-filled from AI assessment,
**So that** I don't have to evaluate condition manually.

**Acceptance Criteria:**

**Given** a valuation exists with AI condition assessment (FR24)
**When** the listing form opens
**Then** the condition dropdown is pre-filled (New, Like New, Good, Acceptable)
**And** the condition matches eBay's condition options
**And** the user can change the condition if needed
**And** the field shows an "AI-generated" indicator

---

### Story 5.7: Include Original Photo in Listing

**As a** user,
**I want** my original photo included in the listing,
**So that** buyers can see what they're getting.

**Acceptance Criteria:**

**Given** a valuation has an associated photo (FR25)
**When** the listing form opens
**Then** the photo is displayed in the photos section
**And** the user can add more photos (camera or upload)
**And** photos are displayed in a grid layout
**And** the primary photo is marked/selectable

---

### Story 5.8: Enable Field Editing

**As a** user,
**I want** to edit any pre-filled field before listing,
**So that** I can customize my listing.

**Acceptance Criteria:**

**Given** the listing form has pre-filled fields (FR26)
**When** the user taps any field
**Then** inline editing is enabled
**And** changes are saved locally
**And** validation runs on field blur
**And** the "AI-generated" indicator is removed after editing

---

### Story 5.9: Implement Copy to Clipboard

**As a** user,
**I want** to copy my listing data to clipboard,
**So that** I can paste it into eBay's listing form manually.

**Acceptance Criteria:**

**Given** the listing form is complete (FR27)
**When** the user taps "Copy to Clipboard"
**Then** all listing data is copied in a formatted text block
**And** the format is easy to paste into eBay's interface
**And** a success message confirms the copy
**And** the clipboard includes: Title, Description, Price, Category, Condition

---

### Story 5.10: Display Pre-Filled vs Manual Field Distinction

**As a** user,
**I want** to clearly see which fields are AI-generated vs manual,
**So that** I know what to review carefully.

**Acceptance Criteria:**

**Given** the listing form has mixed field sources (FR28)
**When** the form is displayed
**Then** AI-generated fields show a subtle indicator badge
**And** user-edited fields lose the AI indicator
**And** fields requiring manual input are highlighted
**And** the distinction uses Swiss Minimalist styling (no colors, typography-based)

---

## Epic 6: Platform & PWA

**Goal:** Users can install the app, access the marketing page, and experience reliable error handling.

**FRs covered:** FR43, FR44, FR45, FR46, FR47, FR48, FR49, FR53, FR54, FR55

### Story 6.1: Implement Tab Navigation

**As a** user,
**I want** to navigate between Camera, History, and Settings,
**So that** I can access all app features easily.

**Acceptance Criteria:**

**Given** the user is in the app (FR44)
**When** navigation is displayed
**Then** mobile shows bottom tab bar with 3 tabs (Camera, History, Settings)
**And** desktop shows a compact left workstation sidebar with the same navigation items
**And** active tab is visually indicated (bold text, no color change)
**And** tab icons are consistent line-weight style

---

### Story 6.2: Implement Responsive Grid System

**As a** user,
**I want** the app to adapt its grid layout to my screen size,
**So that** content is readable and well-organized on any device.

**Acceptance Criteria:**

**Given** the 12-column modular grid system (UX-5)
**When** rendered at different breakpoints
**Then** mobile (<640px) collapses to 4 columns (single content column)
**And** tablet (640-1023px) uses 6 columns (2-column card grids)
**And** desktop (1024-1439px) uses 12 columns (3-column card grids)
**And** wide desktop (1440px+) uses 12 columns with max-width container
**And** gutters are 16px mobile, 24px tablet, 32px desktop
**And** no horizontal scrolling occurs at any breakpoint

**Note:** Platform-specific UX patterns (navigation, camera behavior) are covered in Stories 6.9 and 6.10.

---

### Story 6.3: Configure PWA Manifest

**As a** user,
**I want** to install the app to my home screen,
**So that** I can access it like a native app.

**Acceptance Criteria:**

**Given** the app is accessed in a supported browser (FR43)
**When** PWA requirements are met
**Then** `manifest.json` is configured with app name, icons, theme colors
**And** the app is installable via browser prompt
**And** installed app opens in standalone mode (no browser chrome)
**And** splash screen displays during app load

---

### Story 6.4: Implement Service Worker for Offline

**As a** user,
**I want** the app to work offline,
**So that** I can view my valuations without internet.

**Acceptance Criteria:**

**Given** the app has been used while online
**When** the device goes offline
**Then** cached pages load successfully
**And** cached valuations are viewable
**And** an offline indicator is displayed
**And** new valuations show appropriate messaging ("Requires internet")

---

### Story 6.5: Build Marketing Landing Page

**As a** potential user,
**I want** to learn what ValueSnap does before signing up,
**So that** I can decide if it's right for me.

**Acceptance Criteria:**

**Given** the user visits the root URL (FR48)
**When** the landing page loads
**Then** the value proposition is clear ("Photo → Value → List")
**And** key benefits are highlighted
**And** a CTA button launches the app (FR49)
**And** the page follows Swiss Minimalist design
**And** the page is statically exported (Expo static export)
**And** basic SEO meta tags are included

---

### Story 6.6: Handle Network Errors

**As a** user,
**I want** clear feedback when the network is unavailable,
**So that** I know what's happening and can retry.

**Acceptance Criteria:**

**Given** a network request fails (FR53)
**When** the error is detected
**Then** a clear message explains the issue ("Connection failed")
**And** the user is not shown technical error details
**And** a retry button is available (FR54)
**And** the request is queued for retry when possible

---

### Story 6.7: Implement Retry Mechanism

**As a** user,
**I want** to retry failed requests easily,
**So that** temporary issues don't stop me.

**Acceptance Criteria:**

**Given** a valuation request has failed (FR54)
**When** the user taps "Retry"
**Then** the request is resubmitted
**And** loading state is shown during retry
**And** success or failure is clearly communicated
**And** automatic retry happens on network restoration

---

### Story 6.8: Handle Rate Limit Exceeded

**As a** user,
**I want** to know when I've hit usage limits,
**So that** I understand why I can't value more items.

**Acceptance Criteria:**

**Given** the user exceeds rate limits (FR55)
**When** a 429 response is received
**Then** a clear message explains the limit ("You've reached your limit")
**And** the time until reset is shown ("Try again in 45 minutes")
**And** account upgrade is suggested for guest users
**And** the user is not shown technical error codes

---

### Story 6.9: Implement Mobile UX Patterns

**As a** mobile user,
**I want** touch-optimized interactions and navigation,
**So that** I can use the app comfortably with one hand.

**Acceptance Criteria:**

**Given** the user is on a mobile device (FR45)
**When** the app loads
**Then** Camera tab is the default home screen (UX-10)
**And** bottom tab bar navigation is fixed at screen bottom
**And** camera viewfinder is full-bleed (edge-to-edge)
**And** valuation results slide up as overlay over camera (UX-12)
**And** pull-to-refresh works on History list
**And** swipe gestures are disabled (avoid accidental navigation)

**Note:** Touch target sizes (44x44px) are enforced globally in Story 7.2.

---

### Story 6.10: Implement Desktop UX Patterns

**As a** desktop user,
**I want** keyboard navigation and efficient workflows,
**So that** I can be more productive with mouse and keyboard.

**Acceptance Criteria:**

**Given** the user is on a desktop browser (FR46)
**When** the app loads
**Then** a compact left workstation sidebar replaces bottom tabs (UX-11)
**And** active appraisal screens use a 10/45/45 split for navigation, image review, and data
**And** file upload zone is the primary capture method
**And** keyboard shortcuts work: Tab (focus), Enter (select), Escape (cancel/close)
**And** focus trap is active in modals
**And** hover states provide visual feedback on interactive elements
**And** right-click context menus are not blocked

**Note:** Grid column counts are handled in Story 6.2.

---

## Epic 7: Accessibility & Polish

**Goal:** Users enjoy a performant, accessible, production-ready experience.

**Requirements covered:** NFR-A1 to NFR-A6, NFR-P1 to NFR-P7, ARCH-20 to ARCH-23

### Story 7.1: Implement Color Contrast Compliance

**As a** user with visual impairments,
**I want** sufficient color contrast throughout the app,
**So that** I can read all text and see all UI elements.

**Acceptance Criteria:**

**Given** the app uses Swiss Minimalist color palette (NFR-A1)
**When** contrast is measured
**Then** all text meets 4.5:1 contrast ratio (WCAG AA)
**And** Ink on Paper (#000 on #FFF) = 21:1 ✅
**And** Ink-light on Paper (#666 on #FFF) = 5.74:1 ✅
**And** Signal on Paper (#E53935 on #FFF) = 4.5:1 ✅
**And** contrast checker audit passes

---

### Story 7.2: Ensure Touch Target Sizes

**As a** user with motor impairments,
**I want** large enough touch targets,
**So that** I can tap buttons accurately.

**Acceptance Criteria:**

**Given** interactive elements exist (NFR-A2)
**When** touch targets are measured
**Then** all buttons are minimum 44x44px
**And** all tappable areas have 8px minimum spacing
**And** bottom navigation tabs meet size requirements
**And** form inputs are easily tappable

---

### Story 7.3: Implement Focus Indicators

**As a** keyboard user,
**I want** visible focus indicators,
**So that** I know which element is selected.

**Acceptance Criteria:**

**Given** the user navigates with keyboard (NFR-A3)
**When** focus moves between elements
**Then** a visible focus ring appears (2px solid ink)
**And** focus order follows logical reading order
**And** focus is trapped in modals
**And** focus returns to trigger after modal closes

---

### Story 7.4: Add Meaningful Alt Text

**As a** screen reader user,
**I want** descriptive alt text on images,
**So that** I understand what images show.

**Acceptance Criteria:**

**Given** images are displayed (NFR-A4)
**When** a screen reader reads the page
**Then** item photos have descriptive alt text ("Photo of vintage camera")
**And** decorative images have empty alt=""
**And** icons with function have aria-label
**And** the valuation card photo describes the item

---

### Story 7.5: Implement Semantic HTML Structure

**As a** screen reader user,
**I want** proper heading hierarchy and landmarks,
**So that** I can navigate the page efficiently.

**Acceptance Criteria:**

**Given** pages use semantic HTML (NFR-A5)
**When** structure is analyzed
**Then** pages have a single h1
**And** headings follow h1 → h2 → h3 hierarchy (no skipping)
**And** landmarks are defined (main, nav, header)
**And** lists use proper ul/ol elements

---

### Story 7.6: Announce Errors to Screen Readers

**As a** screen reader user,
**I want** errors announced automatically,
**So that** I know when something goes wrong.

**Acceptance Criteria:**

**Given** an error occurs (NFR-A6)
**When** the error message is displayed
**Then** the message uses aria-live="assertive"
**And** the error is announced immediately
**And** form validation errors are associated with inputs
**And** success messages use aria-live="polite"

---

### Story 7.7: Optimize Bundle Size

**As a** user on a slow connection,
**I want** the app to load quickly,
**So that** I can start using it right away.

**Acceptance Criteria:**

**Given** the app is built for production (NFR-P6)
**When** bundle is analyzed
**Then** JavaScript bundle is <500KB gzipped
**And** code splitting is implemented for routes
**And** unused dependencies are removed
**And** images are optimized

---

### Story 7.8: Achieve Performance Targets

**As a** user,
**I want** fast page loads and interactions,
**So that** the app feels responsive.

**Acceptance Criteria:**

**Given** the app is loaded (NFR-P2 to NFR-P5)
**When** Lighthouse is run
**Then** First Contentful Paint is <1.5 seconds
**And** Largest Contentful Paint is <2.5 seconds
**And** Time to Interactive is <3.5 seconds
**And** Cumulative Layout Shift is <0.1
**And** Performance score is >90

---

### Story 7.9: Set Up GitHub Actions CI/CD

**As a** developer,
**I want** automated testing and deployment,
**So that** code quality is maintained and deployments are reliable.

**Acceptance Criteria:**

**Given** code is pushed to GitHub (ARCH-20)
**When** CI pipeline runs
**Then** backend tests run with pytest (ARCH-21)
**And** frontend lint and tests run (ARCH-22)
**And** develop branch auto-deploys to staging (ARCH-23)
**And** main branch auto-deploys to production
**And** failed tests block deployment

---

### Story 7.10: Implement Reduced Motion Support

**As a** user with vestibular disorders,
**I want** animations disabled when I prefer reduced motion,
**So that** the app doesn't cause discomfort.

**Acceptance Criteria:**

**Given** the user has prefers-reduced-motion enabled
**When** the app is used
**Then** all animations are disabled
**And** transitions are instant or removed
**And** skeleton pulse animations are disabled
**And** the app remains fully functional

---

### Story 7.11: Cross-Browser Testing

**As a** user on any browser,
**I want** the app to work correctly,
**So that** I can use my preferred browser.

**Acceptance Criteria:**

**Given** the app is accessed on different browsers
**When** functionality is tested
**Then** Chrome (last 2 versions) works correctly
**And** Safari (iOS 15+, macOS 14+) works correctly
**And** Firefox (last 2 versions) works correctly
**And** Edge (last 2 versions) works correctly
**And** no critical bugs exist on any platform

---

### Story 7.12: Configure Production Monitoring

**As a** developer,
**I want** error tracking and monitoring configured,
**So that** we can detect and respond to production issues.

**Acceptance Criteria:**

**Given** the production environment
**When** monitoring is configured
**Then** Sentry error tracking captures unhandled exceptions
**And** Sentry captures breadcrumbs for error context
**And** source maps are uploaded for readable stack traces
**And** environment tag distinguishes staging vs production
**And** performance monitoring captures slow transactions (>3s)

---

## Production Readiness Gate

**This is a MILESTONE, not a story.** Before production launch, verify:

| Category | Verification | Owner |
|----------|--------------|-------|
| Performance | Lighthouse score >90, LCP <2.5s, bundle <500KB | Dev |
| Accessibility | axe audit passes, manual screen reader test | QA |
| Security | No exposed secrets, RLS policies active, HTTPS enforced | Dev |
| Monitoring | Sentry configured, alerts set up | DevOps |
| Environments | Production env vars set, staging verified | DevOps |

---

