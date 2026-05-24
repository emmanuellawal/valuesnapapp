# Epic 5.5: Pre-Epic 6 Readiness — Retrospective

**Date:** May 14, 2026  
**Epic Duration:** April 21, 2026 - April 30, 2026 (~10 days)  
**Team:** Elawa (Developer)  
**Status:** COMPLETE

---

## Epic Overview

**Goal:** Clear every real blocker called out at Epic 5 close so Epic 6 does not start on known broken foundations.

**What was delivered:**
```text
Process gates:
  - Mobile lint gate added and enforced (`--max-warnings 0`)
  - Frontend checklist extended with Epic 5 failure patterns
  - CI workflow + branch protection now block bad PRs

Runtime readiness:
  - Backend deployed to Render with stable public endpoint
  - Real-device appraisal path validated against live backend
  - Gallery picker restored to normal mobile flow
  - Settings rows (Theme/Notifications/Currency) now interactive + persisted

Post-deploy hardening:
  - Tunnel/ngrok dead weight removed
  - Appraise retry/backoff + timeout added
  - Photo upload crash fixed (`expo-file-system/legacy` import path)
  - eBay fallback links switched to WebBrowser path
  - OpenAI model eval completed (mini vs 4o): both 0/5, no upgrade
```

**Stories Completed:** 10/10 (100%)

| Story | Title | Status |
|-------|-------|--------|
| 5.5-1 | Enforce Debt Gates | COMPLETE |
| 5.5-2 | Deploy Backend to Render | COMPLETE |
| 5.5-3 | Wire and Polish Settings | COMPLETE |
| 5.5-4 | Restore Gallery Picker | COMPLETE |
| 5.5-5 | Lock Epic 6 Workstation ACs | COMPLETE |
| 5.5-6 | Add CI Lint Pipeline | COMPLETE |
| 5.5-7 | Network Polish | COMPLETE |
| 5.5-8 | Fix Photo Upload Base64 Crash | COMPLETE |
| 5.5-9 | Replace `Linking.openURL` with `WebBrowser` | COMPLETE |
| 5.5-10 | Evaluate OpenAI Model Upgrade | COMPLETE |

---

## What Went Well

### 1. Process Gates Finally Became Real Enforcement

Epic 5.5-1 + 5.5-6 closed the biggest process lie in the project: "we run lint/tests" turned into "you cannot merge without passing lint/tests." The `test-frontend` check is now required on `main`, strict mode is on, and a failing PR was verified as blocked.

**Key learning:** A local script is not a quality gate. Branch protection is.

### 2. Render Deployment Broke the Tunnel Dependency for Real

5.5-2 ended the "laptop must stay up + tunnel roulette" workflow. The backend is publicly reachable, health checks pass, and real-device appraisals were executed successfully against live infrastructure.

**Key learning:** Infrastructure readiness is a feature enabler, not an ops afterthought.

### 3. User-Facing "Looks Done but Isn't" Surfaces Were Fixed

5.5-3 and 5.5-4 closed visible trust gaps: settings preferences are now stateful and persistent, and gallery upload is accessible in the normal camera-permitted flow.

**Key learning:** UX debt that looks cosmetic often maps directly to trust debt.

### 4. CI and Runtime Follow-Ups Were Shipped in the Same Epic

The sprint did not stop at the first deployment success. It continued into practical stability fixes (5.5-7/8/9), removing dead tunnel code, adding retry/backoff, and fixing concrete runtime crashes.

**Key learning:** Closing a blocker means fixing the failure chain around it, not just the first symptom.

### 5. Epic 6 Planning Is More Concrete Than Prior Epic Handoffs

5.5-5 locked workstation and PWA acceptance criteria at planning time, with explicit constraints tied to existing code reality (`SwissSidebar`, `BREAKPOINTS.desktop`, static export and CLS gates).

**Key learning:** Vague ACs are deferred bugs.

---

## What Didn't Go Well

### 1. Initial Plan Accuracy Was Weak

The original 5.5 plan estimated 7 stories in 2-3 days. Actual execution was 10 stories over ~10 days, with multiple deployment corrections (Python version pinning, config/env naming mismatches, missing dependency, response-shape drift).

**Impact:** Planning confidence was overstated; real complexity was underestimated.

### 2. "Mandatory Code Review Gate" Was Not Applied Uniformly

Even after 5.5-1 established the review mandate, some later follow-up stories did not include a full `## Code Review` section. The policy existed, but execution drifted under pressure.

**Impact:** The process rule was valid but inconsistently enforced exactly when rapid follow-up work happened.

### 3. Story Metadata Drifted from Story Reality

At least one story still contains review text saying it should remain in review pending manual validation while status ultimately became done after external validation. The outcome is correct; the narrative trail is not clean.

**Impact:** Auditability dropped; future readers have to reconcile contradictions manually.

### 4. Mobile Validation Still Depends on Manual Human Checks

Critical acceptance criteria (touch targets, on-device upload/link behavior, Expo Go quirks) remain partially non-automatable in CI. Tests reduced risk, but did not eliminate manual QA dependency.

**Impact:** "Green CI" is necessary but not sufficient for release confidence on mobile paths.

### 5. AI Identification Quality Is Still the Largest Product Risk

5.5-10 delivered the uncomfortable but useful result: `gpt-4o-mini` and `gpt-4o` both scored 0/5 on the evaluation set. The model swap is not the fix; prompt grounding is.

**Impact:** Listing quality is blocked by prompt/system design, not by paying for a bigger model.

---

## Action Items Before/Inside Epic 6

| # | Action | Owner | Priority | Notes |
|---|--------|-------|----------|-------|
| 1 | Front-load Story 6-13 (visual grounding for identification) before relying on AI listing quality | Dev | Critical | 5.5-10 proved model upgrade alone is a dead end |
| 2 | Enforce story-close checklist automatically (including required Code Review section) | SM + Dev | High | Prevent policy drift on rapid hotfix stories |
| 3 | Add backend CI gate to mirror frontend CI discipline | Dev | High | Frontend gate is live; backend still relies mostly on local discipline |
| 4 | Add a short "manual device validation evidence" template to story closure | SM | Medium | Keep status transitions and narrative evidence in sync |
| 5 | Evaluate `/api/appraise` idempotency key strategy | Dev + Architect | Medium | Retry/backoff is live; duplicate-write risk remains documented |
| 6 | Keep tunnel workflow removed; do not reintroduce `@expo/ngrok` without explicit story justification | Dev | Medium | Avoid re-opening known broken path |

---

## Epic 6 Readiness Assessment

**Readiness verdict:** **Conditional GO**

Epic 5.5 achieved its original readiness objective for infrastructure, process gating, and the two visible UX blockers. Epic 6 can proceed, but only if the team treats AI quality (Story 6-13) as a real risk stream, not a nice-to-have backlog item.

**Hard reality:**
- Doable: Epic 6 platform/PWA work can move forward on the current base.
- Not doable (yet): trustworthy AI-driven listing quality without grounding work.
- Alternative if 6-13 slips: gate AI-prefilled listing confidence with stricter user-facing warnings and force manual verification.

---

## Metrics and Closure Summary

| Metric | Result |
|--------|--------|
| Planned stories at kickoff | 7 |
| Stories actually executed | 10 |
| Stories completed | 10/10 |
| Planned duration | 2-3 days |
| Actual duration | ~10 days |
| Mobile tests at Epic 5 close | 271 |
| Mobile tests after Epic 5.5 work | 302 |
| Net test growth | +31 |
| Lint gate | `expo lint --max-warnings 0` |
| CI gate on `main` | `test-frontend` required + strict branch protection |
| OpenAI model eval result | mini: 0/5, 4o: 0/5 (no upgrade) |

**Closure statement:** Epic 5.5 delivered the gates and runtime fixes needed to stop carrying known debt into Epic 6. The remaining strategic risk is AI quality; if Story 6-13 is treated as optional polish instead of a core reliability task, the same class of product trust failures will repeat.
