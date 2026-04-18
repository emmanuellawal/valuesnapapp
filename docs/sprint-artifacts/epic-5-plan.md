# Epic 5: Listing Creation — Execution Plan

**Date:** April 6, 2026
**Epic Duration:** Estimated 1–2 weeks (remaining work)
**Stories:** 11 total (5-1 through 5-11 — 5-11 added via Story 4.5-6)
**Dependencies:** Epic 4.5 (Retrospective Debt Resolution) ✅ Complete

---

## Executive Summary

**This plan was written mid-epic.** Stories 5-1 and 5-2 are complete; 5-3 is ready-for-dev as of the plan date. The plan documents what was built, the architectural decisions that were locked in, and a clearheaded briefing for each remaining story.

**Epic 4.5 left us here:**
```
Authenticated user → taps "List on eBay" on appraisal screen
  ↓
/listing/<valuationId> — Swiss Minimalist 6-field form
  • Title:       pre-filled with AI-generated "Brand Model Type" string (≤80 chars)
  • Description: empty — AI description exists in backend but not yet surfaced
  • Category:    empty — AI category hint exists in ItemDetails
  • Condition:   empty — AI visual condition exists in ItemDetails
  • Price:       empty — fair market value exists in MarketData
  • Photos:      placeholder box
```

**Epic 5 delivers:**
```
/listing/<valuationId> — all 5 pre-fillable fields populated from AI
  • Title:       Brand Model Type [AI-generated] ← done ✅
  • Description: 1-3 sentence eBay description [AI-generated] ← ready-for-dev
  • Category:    AI-suggested eBay category search string [AI-generated]
  • Condition:   Mapped from AI visual condition assessment [AI-generated]
  • Price:       Fair market value from market data [AI-generated]
  • Photos:      Original valuation photo displayed
                          ↓
  User reviews → edits any field (AI badge disappears on edit) → taps "Copy to Clipboard"
                          ↓
  Formatted listing text block → paste into eBay's form
```

The goal (6/8 fields pre-filled, listing ready in ~2 minutes) has a clear path to completion.

---

## Current State Analysis (as of April 6, 2026)

### ✅ Already Built (Story 5-1 — Build Listing Form Component)

**Files created:**
- `apps/mobile/types/listing.ts` — `ListingCondition` union (`'new' | 'like_new' | 'very_good' | 'good' | 'acceptable'`), `listingFormSchema` (Zod, 5 fields), `ListingFormValues`, `ListingDraft`
- `apps/mobile/components/organisms/listing-form.tsx` — `ListingForm({ valuationId, onSubmit, initialValues? })`, 6-field Swiss form, React Hook Form + Zod, `FormInput` atoms, character counter on title, "Copy to Clipboard" stub button
- `apps/mobile/app/listing/[id].tsx` — Route, guest guard (`router.replace('/auth/register')`), `useState<Valuation | null | undefined>` with `getLocalHistory` + `findValuationById` pattern, `Loading…` state, back nav
- `apps/mobile/app/appraisal.tsx` — `handleEbay()` now routes to `/listing/{valuationId}`

**Tests created:**
- `apps/mobile/__tests__/listing-form.test.tsx` — Form rendering, guest guard, field validation, all 6 fields
- `apps/mobile/__tests__/listing-screen.test.tsx` — Guest guard redirect, back nav, valuation loading

### ✅ Already Built (Story 5-2 — Pre-Fill Title from AI)

**Files created/modified:**
- `apps/mobile/lib/utils/listing-title.ts` — NEW: `buildAiListingTitle(itemDetails)` — composes `brand + model + itemType`, filters `'unknown'` tokens, truncates at word boundary to ≤80 chars
- `apps/mobile/lib/utils/index.ts` — MODIFIED: barrel export for `buildAiListingTitle`
- `apps/mobile/components/organisms/listing-form.tsx` — MODIFIED: AI badge on title (`listing-title-ai-badge`), `initialValues` RHF `defaultValues` spread
- `apps/mobile/app/listing/[id].tsx` — MODIFIED: derives `aiTitle = buildAiListingTitle(valuation.response.itemDetails)`, passes `initialValues={aiTitle ? { title: aiTitle } : undefined}`

**Tests created/modified:**
- `apps/mobile/lib/utils/__tests__/listing-title.test.ts` — NEW: `buildAiListingTitle` unit tests (~6 cases)
- `apps/mobile/__tests__/listing-form.test.tsx` — EXTENDED: prefill, badge shown, badge absent
- `apps/mobile/__tests__/listing-screen.test.tsx` — EXTENDED: title prefill, not-found empty title, hidden badge when all tokens = 'unknown'

### ⬜ Ready for Dev (5-3 — Pre-Fill Description from AI)

Story file at `docs/sprint-artifacts/5-3-pre-fill-description-from-ai.md`.

Key detail: `description` exists in `backend/models.py:ItemIdentity` but is **absent from all 4 frontend files** (ItemDetails interface, RawItemIdentity, transformItemDetails(), createMockItemDetails()). Tasks 1–2 of Story 5-3 close that gap before any UI work.

### ⬜ Backlog (5-4 through 5-11)

Story files do not exist yet. Planned below.

---

## Architectural Decisions Locked In

These decisions were made in Stories 5-1 and 5-2. Every subsequent story must follow them.

### 1. Pre-fill via `initialValues` Prop

`ListingForm` accepts `initialValues?: Partial<ListingFormValues>`. RHF spreads it into `defaultValues`. **All Stories 5-3 through 5-6 must merge their field into this object — do NOT add new props or new state.**

```typescript
// Current pattern in listing/[id].tsx (after 5-2):
const aiTitle = valuation?.response?.itemDetails
  ? buildAiListingTitle(valuation.response.itemDetails)
  : undefined;

initialValues={aiTitle ? { title: aiTitle } : undefined}

// After all pre-fill stories are done (5-6):
initialValues={
  (aiTitle || aiDescription || aiCategory || aiCondition || aiPrice)
    ? {
        ...(aiTitle       ? { title: aiTitle }             : {}),
        ...(aiDescription ? { description: aiDescription } : {}),
        ...(aiCategory    ? { category: aiCategory }       : {}),
        ...(aiCondition   ? { condition: aiCondition }     : {}),
        ...(aiPrice       ? { price: aiPrice }             : {}),
      }
    : undefined
}
```

⚠️ Never pass `{ key: undefined }` in the spread — this causes RHF to ignore the schema's `defaultValues` for that field. Always use the `? { key: value } : {}` conditional spread pattern.

### 2. Screen Already Loads `valuation` — No New `useEffect`

`listing/[id].tsx` already has one `useEffect` that calls `getLocalHistory()` and runs `findValuationById`. Every pre-fill story (5-3 through 5-7) derives its value from the already-loaded `valuation` object. **Do not add a second `useEffect` or a second `getLocalHistory()` call.**

### 3. Empty-Value Guard: `|| undefined`, Not `??`

The backend defaults all optional fields to `""`. The guard pattern that converts empty strings to `undefined` (preventing the AI badge from appearing):
```typescript
const aiDescription = valuation?.response?.itemDetails?.description?.trim() || undefined;
```
Use `||`, not `??`. The `??` operator only guards `null`/`undefined`, not empty strings.

### 4. AI Badge Pattern

All six fields follow this exact pattern. Don't invent anything new until Story 5-8.

| Element | Value |
|---|---|
| Wrapper | `<Stack gap={1}>` |
| Badge component | `<Text variant="caption" className="text-ink-muted" testID="listing-{field}-ai-badge">AI-generated</Text>` |
| Show condition | `initialValues?.{field}` is truthy |
| Story 5-8 will change | Badge becomes hidden after user edits the field (`!formState.dirtyFields.{field}`) |

Title badge is in a `<Stack gap={1}>` alongside the character counter (two items), so it's inside an outer `<Stack gap={2}>`. Description and other fields only have the badge, so their wrapper is the single `<Stack gap={1}>`.

### 5. Type-Chain Gap Status

| Field | `ItemDetails` gap? | Fixed by |
|---|---|---|
| `description` | ❌ Missing today | Story 5-3 |
| `categoryHint` | ✅ Already present | — |
| `visualCondition` | ✅ Already present | — |
| `fairMarketValue` | N/A (on `MarketData`, not `ItemDetails`) | — |

Stories 5-4, 5-5, and 5-6 do **not** need to add new fields to the frontend type chain — only 5-3 does.

### 6. `listingFormSchema` Field Shapes

Remaining stories must conform to the existing schema:

| Field | Zod type | Default | Notes |
|---|---|---|---|
| `title` | `string().trim().min(1).max(80)` | `''` | buildAiListingTitle covers the 80-char constraint |
| `description` | `string().optional().default('')` | `''` | May be empty |
| `category` | `string().trim().min(1)` | `''` | Required — pre-fill with `categoryHint` |
| `condition` | `enum(LISTING_CONDITION_VALUES)` | `''` | Must be valid enum value or `undefined` (no pre-fill for invalid mapping) |
| `price` | `string().trim().min(1).refine(>0)` | `''` | Backend `fairMarketValue` is `number`; must `.toString()` |

---

## Story Dependency Graph

```
5-1: Build Listing Form Component        ✅ done
  │
5-2: Pre-Fill Title from AI             ✅ done
  │
5-3: Pre-Fill Description from AI       ← ready-for-dev (type chain fix + pre-fill)
  │
5-4: Pre-Fill Price from Valuation      ← no type-chain gap (MarketData already has fairMarketValue)
5-5: Pre-Fill Category from AI          ← no type-chain gap (ItemDetails.categoryHint exists)
5-6: Pre-Fill Condition from AI         ← no type-chain gap (ItemDetails.visualCondition exists; needs mapping utility)
  │   (5-3  ─┤
  │   (5-4  ─┤  These four pre-fills are independent of each other.
  │   (5-5  ─┤  All require the screen's valuation loading (from 5-2) and
  │   (5-6  ─┘  initialValues prop (from 5-1). Run in any order.
  │
5-7: Include Original Photo in Listing  ← separate concern; not blocked by 5-3—5-6
  │
5-8: Enable Field Editing               ← depends on pre-fills 5-2 through 5-6 being done
  │                                       (tracking "was this field AI-generated?" requires the fields to be pre-filled)
5-9: Implement Copy to Clipboard        ← depends on form having correct data; does not depend on 5-8
  │
5-10: Display Pre-Filled vs Manual      ← depends on 5-8 (editing state is the source of truth for distinction)
  │
5-11: Image Hosting / Thumbnails        ← depends on 5-7 (extends photo inclusion to upload/serve)
```

**Recommended execution order:** 5-3 → 5-4 → 5-5 → 5-6 (all pre-fills together) → 5-9 (clipboard is independent, low-risk) → 5-7 → 5-8 → 5-10 → 5-11.

> **Why 5-3 before 5-4:** Story 5-3 is the only pre-fill story with a type-chain gap (4 files must be updated before any UI work). Executing it first ensures 5-4, 5-5, and 5-6 inherit a complete, correct frontend type system with no structural surprises.
>
> **Alternative sequencing to consider:** Move Story 5-8's `dirtyFields` badge guard (but not the condition picker) before 5-5. Once 5-3 and 5-4 ship, the form shows two simultaneous "AI-generated" badges with no dismissal mechanism. Adding a third (5-5) without the guard risks a form that feels fully automated — see Risk 4 below. A minimal Story 5-8 (badge guard only, no picker) after 5-4 keeps the cumulative UX correct from 5-5 onward.

---

## Implementation Phases

### Phase A: Complete Pre-Fill Sprint (Stories 5-3, 5-4, 5-5, 5-6)
**Estimated: 2–3 days total**

All four pre-fill stories follow the same `initialValues` merge pattern established in Story 5-2. Executing them together keeps context warm and avoids repeated setup.

| Story | Effort | Source field | Note |
|-------|--------|-------------|------|
| **5-3** Pre-Fill Description | ~2–3h | `itemDetails.description` | Type chain fix is the hard part |
| **5-4** Pre-Fill Price | ~1–2h | `marketData.fairMarketValue` | Number → string conversion |
| **5-5** Pre-Fill Category | ~1–2h | `itemDetails.categoryHint` | Free string, no ID lookup needed for MVP |
| **5-6** Pre-Fill Condition | ~2–3h | `itemDetails.visualCondition` | Requires VisualCondition → ListingCondition mapping utility |

**Phase A Deliverable:** All 5 text fields pre-filled from AI data when a valuation exists. User sees `[AI-generated]` caption on every pre-filled field.

### Phase B: Copy to Clipboard (Story 5-9)
**Estimated: ~1–2h**

The "Copy to Clipboard" button already exists in `ListingForm` as a functional stub (calls `handleSubmit`, triggers Zod validation, but does nothing on valid submit). Story 5-9 makes it actually copy.

This story is intentionally placed before 5-7 and 5-8 because it requires no UI changes — only the `onSubmit` prop and clipboard implementation. It also enables manual end-to-end testing of the full pre-fill flow before the more complex stories begin.

**Phase B Deliverable:** User can complete the full flow: open listing → review pre-filled fields → tap Copy → paste into eBay.

### Phase C: Photos (Story 5-7)
**Estimated: ~3–4h** *(higher uncertainty — see story details)*

The photos section placeholder is built. Story 5-7 displays the original valuation photo. This depends on how/where the photo is stored — investigation required at story creation time.

**Phase C Deliverable:** Valuation photo displayed in the Photos section. User can see the item they're listing.

### Phase D: Field Editing (Story 5-8)
**Estimated: ~2–3h**

Currently `initialValues` is set at mount and never changes. When a user edits a pre-filled field, the AI badge stays visible even after the value has been changed — this is the gap Story 5-8 closes.

RHF's `formState.dirtyFields` tracks which fields have been modified from their `defaultValues`. The badge guard changes from `initialValues?.{field}` to `initialValues?.{field} && !dirtyFields.{field}`.

The Condition field (currently a plain text input set by Step 5-6) also needs to become a proper enum picker in this story — inline editing requires a picker control, not just a text input.

**Phase D Deliverable:** AI badges disappear when the user edits a field. Condition field usable as a dropdown/picker.

### Phase E: Polish (Stories 5-10, 5-11)
**Estimated: 2–3 days**

| Story | Effort | Note |
|-------|--------|------|
| **5-10** Pre-Filled vs Manual Distinction | ~2–3h | Depends on 5-8 for `dirtyFields` tracking |
| **5-11** Image Hosting / Thumbnails | ~4–6h | Likely Supabase Storage; higher complexity |

---

## Story Details (Remaining Stories)

### Story 5-3: Pre-Fill Description from AI

**Status:** ready-for-dev — full story file exists at `docs/sprint-artifacts/5-3-pre-fill-description-from-ai.md`.

**Key technical note:** `description` is missing from the entire frontend type chain. Four files must be updated **before** any UI work:
1. `apps/mobile/types/item.ts` — add `description: string` to `ItemDetails`
2. `apps/mobile/types/transformers.ts` — add to `RawItemIdentity` and `transformItemDetails()`
3. `apps/mobile/types/mocks.ts` — add default to `createMockItemDetails()`
4. `apps/mobile/__tests__/transformers.test.ts` — update `baseIdentity` fixture and `toEqual` assertion

Source: `valuation.response.itemDetails.description?.trim() || undefined`

---

### Story 5-4: Pre-Fill Price from Valuation

**Source:** `valuation?.response?.marketData?.fairMarketValue`

**Data shape:** `fairMarketValue` is `number | undefined` in `MarketData`. The schema field `price` is `z.string()` (price input is text, schema validates it's a positive number).

**Derivation:**
```typescript
const aiPrice = valuation?.response?.marketData?.fairMarketValue != null
  ? valuation.response.marketData.fairMarketValue.toString()
  : undefined;
```
Use `!= null` (double-equals) to guard both `null` and `undefined`. `fairMarketValue` of `0` would stringify to `'0'` and fail the Zod `> 0` refine—the `!= null` guard is correct here because $0 is not a valid listing price.

**Epics AC note:** "the original price range is shown as reference ('Estimated: $85-120')". This is a **read-only caption** next to the price field — not a form field. Render it as:
```tsx
{valuation?.response?.marketData?.priceRange && (
  <Text variant="caption" className="text-ink-muted">
    Estimated: ${valuation.response.marketData.priceRange.min}–${valuation.response.marketData.priceRange.max}
  </Text>
)}
```
Place it inside the `<Stack gap={1}>` wrapper alongside the AI badge. No new prop or state needed.

**No type-chain changes needed** — `MarketData.fairMarketValue` is already typed as `number | undefined`.

**Tests to add:** price prefill with numeric value, no prefill when `fairMarketValue` is absent, price range caption shown/hidden.

---

### Story 5-5: Pre-Fill Category from AI Classification

**Source:** `valuation?.response?.itemDetails?.categoryHint`

**Data shape:** `categoryHint` is `string` in `ItemDetails`. The schema field `category` is `z.string().trim().min(1)`.

**Epics AC note:** "the category maps to valid eBay category IDs" — for MVP, **do not implement eBay category ID lookup**. Pre-fill with the raw `categoryHint` string (e.g., "Film Cameras"). The string is eBay-vocabulary-aligned from the AI prompt. A future story can add numeric ID resolution if eBay API listing creation becomes a target. This interpretation is consistent with the current clipboard-based MVP scope (FR27 — copy to clipboard, no direct eBay API posting).

**Derivation:**
```typescript
const aiCategory = valuation?.response?.itemDetails?.categoryHint?.trim() || undefined;
```

**No type-chain changes needed** — `ItemDetails.categoryHint` already exists.

**Tests to add:** category prefill, badge shown/hidden, empty categoryHint falls back to empty field.

---

### Story 5-6: Pre-Fill Condition from AI Assessment

**Source:** `valuation?.response?.itemDetails?.visualCondition`

**Challenge:** `VisualCondition` and `ListingCondition` are different enums:

| `VisualCondition` (AI output) | Maps to `ListingCondition` (eBay) |
|---|---|
| `'new'` | `'new'` |
| `'used_excellent'` | `'like_new'` |
| `'used_good'` | `'good'` |
| `'used_fair'` | `'acceptable'` |
| `'damaged'` | `undefined` (no valid eBay condition) |

A mapping utility is required. Create `apps/mobile/lib/utils/listing-condition.ts`:
```typescript
import type { VisualCondition } from '@/types/item';
import type { ListingCondition } from '@/types/listing';

const CONDITION_MAP: Partial<Record<VisualCondition, ListingCondition>> = {
  new: 'new',
  used_excellent: 'like_new',
  used_good: 'good',
  used_fair: 'acceptable',
  // 'damaged' intentionally absent — no safe eBay equivalent
};

export function mapVisualConditionToListingCondition(
  visual: VisualCondition
): ListingCondition | undefined {
  return CONDITION_MAP[visual];
}
```

Export from `apps/mobile/lib/utils/index.ts`.

**Derivation:**
```typescript
const aiCondition = valuation?.response?.itemDetails?.visualCondition
  ? mapVisualConditionToListingCondition(valuation.response.itemDetails.visualCondition)
  : undefined;
```

**Schema note:** `listingFormSchema` condition field is `z.enum(LISTING_CONDITION_VALUES)`. Passing `undefined` for `aiCondition` and not including it in `initialValues` means RHF uses the default `'' as ListingCondition` — which correctly shows an empty condition field.  Do NOT pass `condition: undefined` — use the `? { condition: aiCondition } : {}` pattern.

**Condition picker:** Story 5-6 may convert the condition input from `<FormInput>` to a proper picker/segmented control (since it's an enum, not free text). If deferred to 5-8, note it clearly. Either is acceptable — the test assertion will differ (picker vs text input).

**No type-chain changes needed** — `ItemDetails.visualCondition` already exists.

**Tests to add:** condition prefill for each valid mapping, `'damaged'` → empty field, badge shown/hidden.

---

### Story 5-7: Include Original Photo in Listing

**Investigation required at story creation time.** The `listing/[id].tsx` screen has `valuationId` — but the photo itself must be traced.

**Key question:** Where is the original valuation photo stored/accessible?

Check these paths in order:
1. **`apps/mobile/lib/localHistory.ts`** — Does `Valuation` or `ValuationRecord` include a `photoUri` / `imageUri`?
2. **`backend/models.py:ValuationResponse`** — Does the backend response include a photo URL (e.g., from Supabase Storage)?
3. **`apps/mobile/app/appraisal.tsx`** — The appraisal screen has the photo available at the time it calls `router.push('/listing/{id}')` — was it passed via route params or stored in `localHistory`?

From Story 3.2 (Save Valuation Flow), `getLocalHistory()` returns `Valuation[]`. Check `apps/mobile/types/valuation.ts` for the presence of an image URI field.

**If localHistory has a photo URI:** simple `<Image source={{ uri: photoUri }}/>`  
**If no storage path:** the photo may need to be passed as a route parameter (base64 is too large; file URI works)

The Photos section placeholder built in 5-1 (`testID="listing-photo-placeholder"`) is the target for replacement.

---

### Story 5-8: Enable Field Editing

**The AI badge becomes dynamic.** Currently badges check `initialValues?.{field}` — a value that never changes post-mount. After this story, badges also check that the user hasn't edited the field.

**RHF `dirtyFields` approach:**
```typescript
const { control, handleSubmit, watch, formState: { errors, dirtyFields } } = useForm<ListingFormValues>({ ... });
```

Badge guard changes from:
```tsx
{initialValues?.title ? <Text testID="listing-title-ai-badge">AI-generated</Text> : null}
```
to:
```tsx
{initialValues?.title && !dirtyFields.title ? <Text testID="listing-title-ai-badge">AI-generated</Text> : null}
```

**Condition picker:** If Story 5-6 left condition as a `<FormInput>` text input, Story 5-8 converts it to a proper picker/segmented control so users can actually select a `ListingCondition` enum value. The Condition field's AI badge follows the same `dirtyFields.condition` guard.

**Key behavior:** story 5-10 (display pre-filled vs manual) depends on this story's `dirtyFields` tracking being in place.

**Note:** RHF `dirtyFields` marks a field dirty if its current value differs from the `defaultValues` passed to `useForm`. Pre-filled fields start as non-dirty (value equals the AI-sourced `defaultValues`) and become dirty when edited. This is exactly the desired semantics.

---

### Story 5-9: Implement Copy to Clipboard

**The "Copy to Clipboard" button already exists** in `ListingForm` (it calls `handleSubmit(handleValidSubmit)` which only validates before calling the no-op `onSubmit?.(values)`).

**What's needed:**
1. Pass an `onSubmit` prop from `listing/[id].tsx` that calls `Clipboard.setStringAsync(formatted)` from `expo-clipboard`
2. Format the listing as a multi-line text block

**Check:** is `expo-clipboard` already installed?
```bash
cd apps/mobile && grep expo-clipboard package.json
```
If not: `npx expo install expo-clipboard`

**Format (from Epics AC):**
```
Title: {title}
Description: {description}
Price: ${price}
Category: {category}
Condition: {condition}
```

**Success feedback:** Toast or `Alert.alert('Copied!', 'Listing copied to clipboard.')` — keep it simple, follow the Alert pattern used elsewhere in the app.

**Validation gate:** The button already runs Zod validation. If Title/Category/Condition/Price are empty, the copy doesn't execute and errors appear inline. This is correct behavior — don't bypass it.

**Test coverage note:** `expo-clipboard` operations can fail silently on some iOS configurations (clipboard permission restrictions or system-level blocks). The story's test suite should cover both the success path (mock `Clipboard.setStringAsync` to resolve, assert success feedback) and the failure path (mock to reject, assert the app shows appropriate feedback — e.g., an `Alert` — rather than an unhandled rejection).

---

### Story 5-10: Display Pre-Filled vs Manual Field Distinction

**Depends on Story 5-8** (which adds `formState.dirtyFields` to the form).

After 5-8, pre-filled fields that haven't been edited already show "AI-generated". This story handles the other side: marking fields that were either:
1. Pre-filled and then edited (user changed it — badge already disappeared in 5-8)
2. Never pre-filled and require manual input

**Epics AC:**
> AI-generated fields show a subtle indicator badge  
> User-edited fields lose the AI indicator  
> Fields requiring manual input are highlighted  
> Swiss Minimalist styling (no colors, typography-based)

For fields that have no AI pre-fill (condition dropped due to `'damaged'`, or any field where valuation data is absent): consider a `Required — enter manually` caption. But keep it optional if it clutters the form.

**Swiss Minimalist constraint:** no colors. Typography only. "AI-generated" caption already exists. A "Review manually" or "Enter manually" caption may be enough.

---

### Story 5-11: Image Hosting / Thumbnails

**Origin:** Epic 3 retro + Story 3.4 notes. "Listings need associated photos for hosting."

**Scope:** Once Story 5-7 shows the photo in the form, Story 5-11 handles the hosting concern: the listing format (clipboard text) can't include a local file system path. For a buyer to see the photo, it must be hosted somewhere.

**Likely approach:** Supabase Storage upload — store the photo when the listing is created (or when the valuation is saved, if not already stored). Return a public URL. Include the URL in the clipboard format.

**Higher complexity:** involves backend changes (or direct Supabase Storage client upload), file size concerns, and upload UX. Create the story file with a dedicated investigation section.

**Dependency:** Story 5-7 must establish what the current photo storage situation is before Story 5-11 can be scoped accurately.

---

## Known Technical Risks

### Risk 1: Condition Picker UX Decision

The `condition` field is currently a plain `<FormInput>` with `'' as ListingCondition` as default. Condition is an enum — the user needs to pick one of 5 values. Two points in Epic 5 touch this:
- **Story 5-6** pre-fills the value programmatically
- **Story 5-8** converts the input to a picker for editing

If 5-6 ships with a text input and the user can type anything, Zod enum validation will reject non-standard values. Either:
a) Story 5-6 converts it to a picker (preferred — closes the UX gap while doing the pre-fill), or
b) Story 5-6 leaves the text input with a note that 5-8 will convert it (acceptable if picker is complex)

Document the decision in the Story 5-6 file.

### Risk 2: Photo Storage Architecture

Story 5-7 depends on knowing where the photo is accessible from the `Valuation` object. If it's not stored anywhere retrievable at listing time (only in the device's temporary camera buffer), the story may need a prerequisite step.

**Recommended spike (run in parallel with Story 5-4 or 5-5):** Before creating the Story 5-7 file, verify:
1. Does `apps/mobile/types/valuation.ts` include an `imageUri` / `photoUri` field on `Valuation` or `ValuationRecord`?
2. Does `backend/models.py:ValuationResponse` include a photo URL (e.g., a Supabase Storage URL)?
3. Does `apps/mobile/app/appraisal.tsx` have access to a local file URI at the point `router.push('/listing/{id}')` is called — and if so, is it persisted to `localHistory`?

Running this spike before Story 5-5 begins gives lead time to design any architectural change before photo-dependent stories (5-7, 5-11) are reached.

### Risk 3: Story 5-8 `dirtyFields` Semantics

RHF marks a field dirty when its current value differs from `defaultValues`. This is set at `useForm` call time — not at mount time of `ListingForm`. If `initialValues` is provided, the `defaultValues` spread includes the pre-fill. A user typing the exact same AI-generated text back in would unmark the field as dirty (badge reappears). This is acceptable behavior — it matches the intent of `initialValues?.{field} && !dirtyFields.{field}`.

---

### Risk 4: Cumulative Badge UX

Once Stories 5-3, 5-4, and 5-5 all ship, the listing form shows three simultaneous "AI-generated" captions simultaneously with no user dismissal mechanism until Story 5-8 lands. If all five pre-fill stories (5-3 through 5-6) complete before 5-8, the form can feel fully automated — undermining user confidence that they control the listing. Validate the two-badge experience (post-5-4) before shipping more pre-fills without the badge guard in place. See the sequencing note in the Story Dependency Graph section.

No workaround is needed unless the user specifically calls out this edge case.

---

## Quick Reference: File Locations

```
apps/mobile/
├── app/
│   ├── appraisal.tsx                    ← "List on eBay" CTA → /listing/{id}
│   └── listing/
│       └── [id].tsx                     ← Screen: loads valuation, derives AI values, passes initialValues
├── components/
│   └── organisms/
│       └── listing-form.tsx             ← Form: initialValues prop, AI badges, submit button
├── lib/
│   └── utils/
│       ├── index.ts                     ← Barrel: buildAiListingTitle exported (+ mapVisualConditionToListingCondition in 5-6)
│       ├── listing-title.ts             ← buildAiListingTitle() — 80-char, unknown-filtering
│       └── listing-condition.ts        ← mapVisualConditionToListingCondition() — NEW in 5-6
├── types/
│   ├── listing.ts                       ← ListingCondition, ListingFormValues, listingFormSchema, ListingDraft
│   ├── item.ts                          ← ItemDetails (description: string missing — fixed in 5-3)
│   ├── transformers.ts                  ← transformItemDetails() (description not mapped — fixed in 5-3)
│   └── mocks.ts                         ← createMockItemDetails() (description default missing — fixed in 5-3)
└── __tests__/
    ├── transformers.test.ts             ← baseIdentity + toEqual must be updated in 5-3
    ├── listing-form.test.tsx            ← extended per pre-fill story
    └── listing-screen.test.tsx          ← extended per pre-fill story
```

---

## Retrospective Debt Watch Items

These items from prior retros are directly relevant to Epic 5 execution:

### From Epic 4.5-3 (Frontend Pre-Review Checklist — `docs/frontend-review-checklist.md`)

Before marking any Epic 5 story done, run through:
- **No new `useEffect` added** (screen already loads valuation — all pre-fills derive from the loaded state)
- **`|| undefined` guards** prevent empty AI strings from triggering AI badges
- **Transformer contract tests updated** when ItemDetails or RawItemIdentity changes (Story 5-3 adds `description` — transformer test must be updated simultaneously)
- **No `Partial<ListingFormValues>` re-declared** — `initialValues` prop already exists on `ListingFormProps`

### From Epic 4.5-6 (Formalise Deferred Backlog Stories)

Story 5-11 (Image Hosting / Thumbnails) was added to the backlog in 4.5-6 from Epic 3 retro notes. Its inclusion in this epic is intentional but its implementation is lower priority than the pre-fill stories. It may slip to a follow-on epic if photo storage architecture is more complex than expected.

### From Epic 2 Retro (eBay sold-listings API)

Story 4.5-5 concluded: "accept active-listing proxy for now". Epic 5 is a clipboard copy flow, not a direct eBay API post, so valuation data quality is less critical. The price pre-fill in Story 5-4 uses `fairMarketValue` which is calculated from active-listing data. No action needed for Epic 5 — this remains a future improvement if console access is obtained.
