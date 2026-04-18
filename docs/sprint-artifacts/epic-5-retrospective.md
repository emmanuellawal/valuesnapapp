# Epic 5: Listing Creation — Retrospective

**Date:** April 18, 2026
**Epic Duration:** April 3, 2026 - April 15, 2026 (~13 days)
**Team:** Elawa (Developer)
**Status:** COMPLETE

---

## Epic Overview

**Goal:** Turn each appraisal into a usable listing draft that can be reviewed, edited, and copied into eBay while closing the cross-device photo debt carried forward from Epic 3.

**What was delivered:**
```
Appraisal result -> List on eBay
                     /listing/:id
                       - Title, description, category, condition, and price pre-filled from AI
                       - Original photo included in the listing flow
                       - Image hosting / thumbnails added for durable photo access
                       - User can edit fields and distinguish AI-prefilled vs manual content
                       - Copy to Clipboard flow produces a reusable listing draft
```

**Stories Completed:** 11/11 (100%)

| Story | Title | Status |
|-------|-------|--------|
| 5-1 | Build Listing Form Component | COMPLETE |
| 5-2 | Pre-Fill Title from AI | COMPLETE |
| 5-3 | Pre-Fill Description from AI | COMPLETE |
| 5-4 | Pre-Fill Price from Valuation | COMPLETE |
| 5-5 | Pre-Fill Category from AI | COMPLETE |
| 5-6 | Pre-Fill Condition from AI | COMPLETE |
| 5-7 | Include Original Photo in Listing | COMPLETE |
| 5-8 | Enable Field Editing | COMPLETE |
| 5-9 | Implement Copy to Clipboard | COMPLETE |
| 5-10 | Display Pre-Filled vs Manual Field Distinction | COMPLETE |
| 5-11 | Image Hosting / Thumbnails | COMPLETE |

---

## What Went Well

### 1. Form Scaffold and Route Landed Early

Story 5-1 gave the epic a stable shell early: route wiring, guest guard, valuation loading, and the listing form shape were established before the pre-fill stories started. That reduced churn in every subsequent story.

**Key learning:** A durable screen scaffold at the start of a form-heavy epic keeps later stories focused on business logic instead of route or layout rework.

### 2. The `initialValues` Pattern Scaled Cleanly Across Pre-Fill Work

The form design from Stories 5-1 and 5-2 let title, description, category, condition, and price pre-fill ship through the same path instead of adding field-specific state. The pattern held through Stories 5-2 to 5-6 without redesigning form state management.

**Key learning:** When several stories all populate the same form, one shared initialization path is worth locking in early.

### 3. The Description Type-Chain Gap Was Caught Before It Multiplied

The AI description already existed in backend models, but the frontend type chain was missing it. That mismatch was found and corrected before it spread across more stories.

**Key learning:** Frontend-backend type chains need to be validated at the first consumer, not assumed to stay in sync.

### 4. Code Review Paid for Itself on the Stories That Used It

Reviewed stories caught real issues rather than style trivia. The pre-fill workflow, field distinction behavior, and listing interactions all benefited when another pass happened before closeout.

**Key learning:** Review quality was useful; the problem was coverage, not value.

### 5. Epic 3 Image Debt Was Actually Closed

Story 5-11 mattered beyond listing polish. Image hosting and thumbnails removed a long-standing cross-device weakness from the history flow and made listing photos durable instead of device-local only.

**Key learning:** Carry-forward debt is most effective when it gets attached to an active feature epic with a direct user-facing payoff.

### 6. Test Growth Kept Pace with Feature Growth

The suite grew from 163 tests to 271 tests during the epic, adding 108 tests while finishing 11 stories. Coverage reached 66% by epic close.

**Key learning:** Shipping speed and test growth were compatible when the implementation stayed within existing patterns.

---

## What Didn't Go Well

### 1. FR2 Was Still Not Fully Honored on Real Mobile

The camera roll / gallery path existed technically, but the main mobile happy path still did not expose it properly. That left a core requirement looking complete on paper while still broken in practice.

**Impact:** Real users on mobile could still miss the intended file-upload flow.

### 2. The Settings Screen Looked More Complete Than It Was

Everything above the About section still contained stub preference rows. Theme, Notifications, and Currency looked interactive without being wired, and the screen also had a visible safe-area / header offset issue.

**Impact:** Settings undercut trust at the exact point where the app should feel polished.

### 3. Preventable Frontend Debt Repeated Across Multiple Stories

The same classes of issues kept recurring:
- whitespace guards repeated across three stories
- weak test assertions slipped through
- duplicated `getTextContent` style helpers appeared again
- the mobile lint script still was not added
- Stories 5-6 and 5-10 closed without code review sections

**Impact:** Small preventable problems accumulated into visible process debt.

### 4. External Review Surfaced Real UX Gaps Late

Professor feedback called out issues that were legitimate:
- visible scrollbar
- long load time
- submission failing during device testing
- slow startup (~22s)
- wide-screen layout feeling too empty

**Impact:** The app still presented as a prototype in key desktop and device-testing moments.

### 5. User Feedback Confirmed the Same Gaps from Actual Usage

The user independently raised the same categories of issues:
- camera roll picker missing on mobile
- settings buttons above About were stubs
- settings page scroll / header positioning felt off

**Impact:** Internal findings, external review, and direct usage feedback were aligned. These were not theoretical defects.

### 6. Debt Was Still Treated as Optional Too Often

Important follow-up work was recognized but not consistently turned into hard gates. That made it too easy to carry debt forward again instead of forcing closure before the next epic.

**Impact:** The project risk was not just missing features. It was repeatedly tolerating known debt.

---

## Team Decision Before Epic 6

The professor's guidance was useful, but the team aligned on a narrower decision for this project state.

### Architecture Decision

**Decision:** Stay on Expo Router + React Native Web for Epic 6. Do not pivot to Solito + Next.js now.

**Reasoning:**
- current PRD and architecture explicitly reject a Next.js split
- the repo is not structured as a Solito monorepo today
- the current product only needs one SEO-relevant marketing page, which Expo static export already covers
- a Solito pivot would discard working Expo Router integration work and increase maintenance cost before launch

**Revisit condition:** Only reconsider a separate Next.js web app if concrete SSR or public SEO requirements emerge after launch.

### Professor Suggestions: Adopt / Adapt / Skip

| Suggestion | Team Decision | Notes |
|------------|---------------|-------|
| Solito + Next.js monorepo | SKIP | Wrong tradeoff for current scope and architecture |
| 10/45/45 desktop workstation ratio | ADOPT | Minimal vertical nav, not an oversized sidebar |
| Swiss PWA manifest (`theme_color`, `background_color`, `display: standalone`) | ADOPT | Fits Epic 6 directly |
| Static export audit | ADOPT | Add as Epic 6 acceptance criterion |
| Font preload / CLS verification | ADAPT | Verify current Expo web output before rebuilding architecture |
| Desktop sidebar with 1px divider | ADOPT | Already compatible with current stack |
| Image optimization on web | ADAPT | Validate within Expo web path |
| Vercel for static frontend hosting | ADOPT | Pair with Render backend |

### Debt Policy Going Into Epic 6

The team agreed the following are **mandatory gates**, not optional cleanup:
- add the missing mobile lint script
- extend the frontend pre-review checklist with Epic 5 failure patterns
- require a code review section on every story before closeout

---

## Action Items

| # | Action | Owner | Priority | Notes |
|---|--------|-------|----------|-------|
| 1 | Deploy backend for real-mode device testing | Dev + Architect | Critical | Render free tier for persistent API access; keep total testing cost under $10 |
| 2 | Add camera roll picker to the normal mobile flow | Dev | High | Closes the remaining FR2 gap on real devices |
| 3 | Wire Theme, Notifications, and Currency settings | Dev | High | Preferences above About must stop being stubs |
| 4 | Fix settings safe-area / header offset and mobile scrollbar polish | Dev | Medium | Bundle with settings work or Epic 6 polish |
| 5 | Lock Epic 6 workstation acceptance criteria in the current stack | Architect + UX | High | 10/45/45 desktop ratio, minimal left nav, static export audit, font preload verification, Swiss PWA manifest |
| 6 | Enforce debt gates before Epic 6 starts | SM + QA | Critical | Lint script, checklist extension, mandatory code review coverage |
| 7 | Preserve tunnel fix as closed infrastructure work | Dev | Done | ngrok v3 adapter + postinstall patch already resolved during the retro |

---

## Next Epic Readiness

Epic 6 should not start as a normal feature sprint until the following preconditions are satisfied:

| Gate | Reason |
|------|--------|
| Real backend reachable from device testing | Current submission failures and mock-mode drift block meaningful validation |
| Mobile gallery picker restored to the main flow | Core requirement still feels incomplete on phone |
| Settings preferences wired and visually stable | Prevents another visible "looks finished but is not" surface |
| Debt gates implemented | Stops known review and lint failures from repeating in Epic 6 |

**Epic 6 direction, now locked:**
- stay on Expo Router web export for the app and marketing page
- target a **10/45/45** desktop workstation ratio with a restrained vertical nav
- use Vercel for static frontend hosting and Render for backend hosting
- validate export quality early instead of assuming the web layer will feel production-ready by default

**Primary risk:** Epic 6 is still a platform-shift epic. Even without a framework pivot, responsive desktop UX, web export validation, and PWA quality need early proof rather than late cleanup.

---

## Metrics and Closure Summary

| Metric | Result |
|--------|--------|
| Stories completed | 11/11 |
| Test growth | 163 -> 271 (+108) |
| Coverage at epic close | 66% |
| Stories with code reviews | 8/11 |
| Stories with dev agent records | 9/11 |

**Key wins:** scaffold speed, scalable pre-fill pattern, the description type-chain catch, and closing image-hosting debt.

**Key misses:** missing gallery picker in the main mobile flow, stub settings, recurring frontend debt, and visible runtime / desktop polish gaps raised by both professor review and direct usage.

**Budget decision:** Real-device testing remains viable under $10 by combining a free backend host with low-cost `gpt-4o-mini` usage and free eBay test access.

**Retro closure statement:** Epic 5 is complete, but Epic 6 should begin only after the agreed debt gates and real-device readiness tasks are closed.