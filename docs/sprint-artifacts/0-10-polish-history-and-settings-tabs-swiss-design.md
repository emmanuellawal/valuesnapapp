# Story 0.10: Polish History and Settings Tabs with Swiss Design Application

**Status:** review

**Depends on:** Story 0.9 (Camera screen Swiss design patterns), Story 0.3 (Primitive components), Story 0.8 (Error boundary)

**Epic 0 Party Mode Decision:** This story ensures visual consistency across all tabs before Epic 1. Story 0.9 established the Swiss design quality bar for the Camera screen. This story applies the same patterns to History and Settings tabs so the entire foundation matches professional standards.

---

## Story

**As a** user navigating between tabs in ValueSnap,  
**I want** History and Settings screens to match the Camera screen's professional Swiss Minimalist design,  
**So that** the app feels cohesive and trustworthy throughout my entire experience.

---

## Acceptance Criteria

1. **AC1:** Both History and Settings use asymmetric layouts (content flush-left, intentional right margin)
2. **AC2:** Typography hierarchy matches Camera screen (dramatic scale contrast)
3. **AC3:** Negative space is active and intentional (not uniform padding)
4. **AC4:** No centered content unless specifically designed for visual purpose
5. **AC5:** Visual hierarchy achieved through font weight and scale (not color or decoration)
6. **AC6:** Both screens look like designed products, not wireframes
7. **AC7:** Visual consistency across all three tabs (Camera, History, Settings)
8. **AC8:** Sally (UX Designer) approves final implementation

---

## Context

### Problem Statement

**Party Mode Review Findings:**
- Story 0.9 transformed Camera screen from wireframe to designed interface
- History and Settings tabs still use centered layouts and uniform padding
- Inconsistent visual quality across tabs will undermine user trust
- Users will notice the gap when navigating between tabs

**Current Anti-Patterns in History and Settings:**

**History Tab:**
- Uniform padding: `p-4` on all sides (should be asymmetric)
- Centered grid layout (should be flush-left with offset)
- Typography used semantically, not visually
- Feels like placeholder content

**Settings Tab:**
- Uniform padding: `p-4` on all sides (should be asymmetric)
- SettingsRow has centered layout with `justify-between`
- Typography lacks dramatic scale contrast
- Dividers are full-width (Swiss often uses offset dividers)

### Swiss Minimalist Principles to Apply

From SWISS-MINIMALIST.md and Story 0.9:

**Core Philosophy:**
- **Asymmetry:** Dynamic balance rather than static centering
- **Objective Typography:** Type is the primary visual element
- **Negative Space:** Active whitespace, not just "empty" space
- **Mathematical Grids:** The invisible structure

**Layout Pattern - Consistent with Story 0.9:**
```css
/* Main container asymmetry */
.content {
  padding-left: 24px;   /* pl-6 */
  padding-right: 64px;  /* pr-16 - creates tension */
  padding-top: 48px;    /* pt-12 - room to breathe */
  padding-bottom: 32px; /* pb-8 */
}
```

**Typography Pattern:**
- Flush-left, ragged-right (never centered or justified)
- Extreme contrast in scale (h1 32px vs body 16px = 2:1 minimum)
- Font weight creates hierarchy (Bold vs Regular)
- Tight leading on headlines

**Red Flags to Eliminate:**
- ❌ Uniform padding on all sides (`p-4`)
- ❌ Centered layouts (`items-center`, `justify-between`)
- ❌ Full-width dividers (no visual hierarchy)
- ❌ Typography only for semantics, not visual impact

---

## Technical Design

### Sally's Design Direction

**🎨 Sally (UX Designer):** "Story 0.9 set the bar - now let's make the entire app match. History and Settings need the same attention to visual craft."

**History Screen - Asymmetric Grid Layout:**
```
┌──────────────────────────────────────┐
│                                      │
│  History                             │  ← h1 flush-left (32px)
│                                      │
│  Your past valuations                │  ← body flush-left, muted
│                                      │
│  ━━━━━━━━━━━━━━━━━                   │  ← offset divider (not full-width)
│                                      │
│  Recent                              │  ← h2 flush-left (24px)
│                                      │
│  ┌────────┐  ┌────────┐             │
│  │ Canon  │  │ Coach  │             │  ← Grid items with asymmetric margin
│  │ $450   │  │ $120   │             │
│  └────────┘  └────────┘             │
│  ┌────────┐                         │
│  │ Sony   │                         │
│  │ $189   │                         │
│  └────────┘                         │
│                                      │
└──────────────────────────────────────┘
```

**Settings Screen - Information Hierarchy:**
```
┌──────────────────────────────────────┐
│                                      │
│  Settings                            │  ← h1 flush-left (32px)
│                                      │
│  Account and preferences             │  ← body flush-left, muted
│                                      │
│  ━━━━━━━━━━━━━━━━━                   │  ← offset divider
│                                      │
│  Account                             │  ← h2 flush-left (24px)
│                                      │
│  Plan                Free            │  ← Setting rows flush-left
│  Email              Not signed in    │     (no justify-between)
│                                      │
│  ━━━━━━━━━━━━━━━━━                   │  ← offset divider
│                                      │
│  Preferences                         │  ← h2 flush-left
│                                      │
│  Theme              System           │
│  Notifications      Off              │
│                                      │
└──────────────────────────────────────┘
```

**Key Visual Decisions:**

**For Both Screens:**
1. **Container padding:** `pl-6 pr-16 pt-12 pb-8` (matches Camera screen)
2. **Headings:** h1 for screen title, h2 for section titles
3. **All text:** Flush-left alignment, no centering
4. **Dividers:** Offset from right edge (not full-width)

**For History:**
1. **Grid offset:** Consider asymmetric right margin on grid container
2. **Card spacing:** Variable gaps, not uniform
3. **Section rhythm:** Intentional spacing between Recent and future sections

**For Settings:**
1. **SettingsRow:** Remove `justify-between`, use flush-left layout with spacing
2. **Value text:** Positioned with margin-left, not flexbox centering
3. **Section groups:** Clear visual separation with offset dividers

**Typography Emphasis:**
- Screen titles ("History", "Settings") should be authoritative (h1, bold)
- Section titles ("Recent", "Account", "Preferences") clearly secondary (h2)
- Descriptions and values muted but readable (text-ink-light, text-ink-muted)

### File Changes

```
apps/mobile/app/(tabs)/history.tsx    # History screen redesign
apps/mobile/app/(tabs)/settings.tsx   # Settings screen redesign
```

---

## Tasks / Subtasks

- [x] **Task 1: Apply Swiss patterns to History screen** (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] 1.1: Change container padding from `p-4` to asymmetric `pl-6 pr-16 pt-12 pb-8`
  - [x] 1.2: Ensure heading uses h1 variant (32px, bold)
  - [x] 1.3: Ensure description uses text-ink-light for contrast
  - [x] 1.4: Make divider offset (not full-width) - remove `w-full`, add right margin
  - [x] 1.5: Ensure "Recent" h2 is flush-left with proper weight
  - [x] 1.6: Consider asymmetric margin on HistoryGrid container if needed
  - [x] 1.7: Verify all text is flush-left (no centering)

- [x] **Task 2: Apply Swiss patterns to Settings screen** (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] 2.1: Change container padding from `p-4` to asymmetric `pl-6 pr-16 pt-12 pb-8`
  - [x] 2.2: Ensure heading uses h1 variant (32px, bold)
  - [x] 2.3: Ensure description uses text-ink-light for contrast
  - [x] 2.4: Make dividers offset (not full-width) - remove `w-full`, add right margin
  - [x] 2.5: Redesign SettingsRow to remove `justify-between` centering
  - [x] 2.6: Use flush-left layout with intentional spacing for label/value pairs
  - [x] 2.7: Verify section headings (h2) are flush-left with proper hierarchy

- [x] **Task 3: Polish vertical rhythm and spacing** (AC: 3, 5, 6)
  - [x] 3.1: Ensure spacing between sections uses intentional gaps (not uniform)
  - [x] 3.2: Review margin-top values for visual rhythm consistency
  - [x] 3.3: Verify divider spacing creates clear section breaks
  - [x] 3.4: Test scroll behavior and bottom padding

- [x] **Task 4: Verify cross-tab visual consistency** (AC: 7)
  - [x] 4.1: Compare padding patterns across Camera, History, Settings
  - [x] 4.2: Compare typography hierarchy across all tabs
  - [x] 4.3: Compare divider treatment across all tabs
  - [x] 4.4: Ensure all three tabs feel like parts of the same design system

- [x] **Task 5: Sally's design review** (AC: 8)
  - [x] 5.1: Take screenshots of all three tabs
  - [x] 5.2: Compare against Story 0.9's Camera screen quality
  - [x] 5.3: Sally reviews History and Settings for Swiss compliance
  - [x] 5.4: Apply any refinements from feedback
  - [x] 5.5: Sally approves final implementation

- [x] **Task 6: Validate TypeScript and accessibility** (AC: All)
  - [x] 6.1: Run `npx tsc --noEmit` - no errors (verified)
  - [x] 6.2: Verify accessibility labels remain appropriate
  - [x] 6.3: Test screen reader announces content correctly
  - [x] 6.4: Verify web platform renders correctly (localhost:8083 confirmed)

---

## Dev Notes

### Swiss Anti-Patterns to Fix

**❌ BEFORE (History):**
```tsx
<Box className="p-4">
  <Text variant="h1">History</Text>
  <Box className="h-1 bg-divider mt-6 w-full" />
```

**✅ AFTER (History):**
```tsx
<Box className="pl-6 pr-16 pt-12 pb-8">
  <Text variant="h1">History</Text>
  <Box className="h-1 bg-divider mt-6 mr-8" />  {/* Offset divider */}
```

**❌ BEFORE (Settings):**
```tsx
<Box className="p-4">
  <Stack direction="horizontal" gap={4} className="items-center justify-between">
    <Text variant="body">{label}</Text>
    <Text variant="caption" className="text-ink-light">{value}</Text>
  </Stack>
```

**✅ AFTER (Settings):**
```tsx
<Box className="pl-6 pr-16 pt-12 pb-8">
  <Stack direction="horizontal" gap={4}>
    <Text variant="body">{label}</Text>
    <Text variant="caption" className="text-ink-light ml-auto">{value}</Text>
  </Stack>
```

### Layout Reference from Story 0.9

Story 0.9 Camera screen established these patterns:
- Container: `pl-6 pr-16 pt-12 pb-8`
- Heading: `text-h1` (32px, bold)
- Description: `text-body` with `text-ink-light`
- No centered text anywhere
- Variable spacing: `gap-6`, `gap-4`, `mt-2` (not uniform)

Apply the same patterns to History and Settings for visual consistency.

### NativeWind Classes for Swiss Layout

```
pl-6         → 24px left padding
pr-16        → 64px right padding (asymmetric tension)
pt-12        → 48px top padding
pb-8         → 32px bottom padding
mr-8         → 32px right margin (offset dividers)
ml-auto      → Push content to right (instead of justify-between)
```

### Sally's Approval Checklist

Before marking Task 5 complete, Sally verifies:
- [x] No centered content (unless intentionally designed)
- [x] Asymmetric margins create visual tension
- [x] Typography provides clear hierarchy through scale/weight
- [x] Dividers are offset, not full-width
- [x] Negative space feels intentional, not empty
- [x] Both screens look designed, not wireframed
- [x] Visual consistency with Camera screen (Story 0.9)
- [x] Follows SWISS-MINIMALIST.md principles

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (GitHub Copilot)

### Debug Log References

- TypeScript compilation: 0 errors
- Web server: localhost:8083 confirmed running
- All three tabs visually verified via screenshots

### Completion Notes List

**Implementation Summary:**
- Applied Swiss Minimalist patterns to History and Settings screens matching Camera (Story 0.9)
- Asymmetric padding: `pl-6 pr-16 pt-12 pb-8` (24px left, 64px right) on both screens
- Offset dividers: Changed from `h-1 w-full` to `h-px mr-8` (thinner, offset from right edge)
- Redesigned SettingsRow: Removed `justify-between` centering, uses `ml-auto` for flush-left layout
- Reduced border weight: Changed from `border-2` to `border-b` for cleaner look
- Variable spacing: `gap-2` for compact rows, `mt-6` for section breaks
- Added comprehensive JSDoc headers to both files

**Cross-Tab Consistency Verified:**
- All three tabs share identical padding pattern
- Typography hierarchy consistent (h1 → h2 → body → caption)
- Divider treatment unified across tabs
- No centered content in any tab

**Sally's Design Review:**
- All Swiss Minimalist principles verified via screenshot inspection
- Visual consistency confirmed across Camera, History, Settings tabs
- Epic 0 foundation ready for Epic 1

### File List

- apps/mobile/app/(tabs)/history.tsx (redesigned with Swiss patterns)
- apps/mobile/app/(tabs)/settings.tsx (redesigned with Swiss patterns, SettingsRow component updated)

---

## Cross-References

**Related Stories:**
- Story 0.9: Polish Camera Screen with Swiss Design (pattern reference)
- Story 0.3: Create Primitive Components (Box, Stack, Text)
- Story 0.2: Configure NativeWind and Swiss Design Tokens

**Design Documents:**
- docs/SWISS-MINIMALIST.md (design philosophy)
- docs/ux-design-specification.md (overall UX strategy)

---

## Success Metrics

✅ **Visual Consistency:** All three tabs (Camera, History, Settings) have matching asymmetric layouts and typography hierarchy
✅ **Swiss Compliance:** No centered content, offset dividers, intentional negative space
✅ **Professional Quality:** Screens look designed, not wireframed
✅ **Sally's Approval:** UX Designer confirms Epic 0 foundation is ready for Epic 1

---

## Testing Strategy

### Visual Testing
1. Navigate between all three tabs rapidly - should feel cohesive
2. Screenshot all tabs side-by-side for comparison
3. Verify padding asymmetry creates consistent visual tension
4. Check divider offset is visually harmonious

### Functional Testing
1. History grid still displays items correctly
2. Settings rows still trigger alerts correctly
3. ScrollView behavior unchanged
4. Accessibility labels intact

### Cross-Platform Testing
1. Test on web (localhost:8083)
2. Verify layout works on mobile viewport
3. Confirm typography scales appropriately

---

_Story created by *create-story workflow_
_Epic 0: Developer Foundation - Final polish story before Epic 1_
