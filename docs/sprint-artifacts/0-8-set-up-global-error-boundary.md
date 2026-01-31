# Story 0.8: Set Up Global Error Boundary

**Status:** done

**Depends on:** Story 0.3 (Primitive components available)

---

## Story

**As a** developer,  
**I want** a global error boundary that catches unhandled errors,  
**So that** the app fails gracefully instead of crashing.

---

## Acceptance Criteria

1. **AC1:** The error boundary catches unhandled errors in the component tree
2. **AC2:** A user-friendly error screen is displayed (Swiss Minimalist design)
3. **AC3:** A "Try Again" button reloads the app
4. **AC4:** Error details are logged (not shown to user in production)
5. **AC5:** The error boundary follows React error boundary patterns
6. **AC6:** Error boundary is wrapped at the root layout level
7. **AC7:** Error state can be reset without full app reload (when possible)

---

## Context

### Current State

The project currently re-exports `ErrorBoundary` from `expo-router` in `app/_layout.tsx`:

```typescript
export {
  ErrorBoundary,
} from 'expo-router';
```

This provides a basic error boundary but uses Expo Router's default UI. We need a custom, Swiss Minimalist styled error boundary that:
- Matches the design system
- Provides better UX with a "Try Again" option
- Logs errors properly for debugging

### Architecture Requirements

From NFR-R2:
> Graceful error handling (no unhandled exceptions)

From the Epics file:
> Error boundary should catch unhandled errors, display user-friendly error screen (Swiss Minimalist), include "Try Again" button, log error details (not shown to user), and follow React error boundary patterns.

### Swiss Minimalist Design Principles (from SWISS-MINIMALIST.md)

- **No rounded corners, no shadows** - borders only if needed
- **Typography-driven** - clear text hierarchy
- **Paper (#FFFFFF)** background, **Ink (#000000)** text
- **Signal (#E53935)** for CTAs only
- **Asymmetric layout** - flush-left text
- **Active negative space**

### Existing Patterns to Follow

From `app/_layout.tsx`:
- Uses `ThemeProvider` with `SwissTheme`
- Validates environment at startup with `validateEnv()`
- Uses Expo Router's Stack navigation

From primitive components:
- `Box` for layout containers
- `Text` with variants (h1, h2, body, caption)
- `SwissPressable` for accessible buttons
- `Stack` for vertical layouts with spacing

---

## Technical Design

### File Structure

```
apps/mobile/
├── components/
│   └── organisms/
│       └── ErrorBoundary.tsx    # Custom error boundary component
├── app/
│   └── _layout.tsx              # Updated to use custom ErrorBoundary
```

### Component Architecture

```typescript
// components/organisms/ErrorBoundary.tsx

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;  // Optional custom fallback
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryKey: number;  // Increment on retry to force children remount
}

// Class component required - React error boundaries need getDerivedStateFromError
// and componentDidCatch, which are not available in function components
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static getDerivedStateFromError(error: Error): ErrorBoundaryState;
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void;
  handleRetry: () => void;
  render(): React.ReactNode;
}
```

### Error Screen Design (Swiss Minimalist)

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                                      │
│  Something went wrong                │  ← h1, text-ink
│                                      │
│  We've encountered an unexpected     │  ← body, text-ink-muted
│  error. Please try again.            │
│                                      │
│  ┌────────────────────────────────┐  │
│  │         Try Again              │  │  ← SwissPressable, bg-ink, text-paper
│  └────────────────────────────────┘  │
│                                      │
│  Error Code: ERR_UNKNOWN             │  ← caption, text-ink-muted (dev only)
│                                      │
│                                      │
└──────────────────────────────────────┘
```

### Integration with expo-router

Expo Router exports its own ErrorBoundary. We have two options:

**Option A (Recommended):** Keep expo-router's ErrorBoundary export but wrap our Stack in a custom ErrorBoundary:
```tsx
// app/_layout.tsx
export { ErrorBoundary } from 'expo-router';  // Keep for Expo Router internals

function RootLayoutNav() {
  return (
    <ThemeProvider value={SwissTheme}>
      <CustomErrorBoundary>
        <Stack>...</Stack>
      </CustomErrorBoundary>
    </ThemeProvider>
  );
}
```

**Option B:** Replace expo-router's ErrorBoundary entirely (may cause issues with router's internal error handling).

We'll use Option A to be safe and ensure expo-router's internals still work.

### Error Logging Strategy

```typescript
componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  // Always log to console for development
  console.error('ErrorBoundary caught an error:', error, errorInfo);
  
  // In production, you'd send to error tracking service (Sentry)
  // Future: sentry.captureException(error, { extra: errorInfo });
  
  // Never show stack traces to users in production
}
```

---

## Tasks / Subtasks

- [x] **Task 1: Create ErrorBoundary component** (AC: 1, 5)
  - [x] 1.1: Create `components/organisms/ErrorBoundary.tsx`
  - [x] 1.2: Implement class component with `getDerivedStateFromError`
  - [x] 1.3: Implement `componentDidCatch` for error logging
  - [x] 1.4: Add proper TypeScript types for props and state

- [x] **Task 2: Create error fallback UI** (AC: 2)
  - [x] 2.1: Design error screen using Box, Stack, Text primitives
  - [x] 2.2: Use Swiss Minimalist colors (bg-paper, text-ink)
  - [x] 2.3: Center content vertically with proper spacing
  - [x] 2.4: Add user-friendly error message (h1 + body text)

- [x] **Task 3: Implement Try Again functionality** (AC: 3, 7)
  - [x] 3.1: Add SwissPressable "Try Again" button
  - [x] 3.2: Implement `handleRetry` to reset error state
  - [x] 3.3: Use `expo-router` reload if state reset doesn't work
  - [x] 3.4: Style button with bg-ink, text-paper (inverted Swiss style)

- [x] **Task 4: Implement error logging** (AC: 4)
  - [x] 4.1: Log error and errorInfo to console in development
  - [x] 4.2: Add TODO comment for future Sentry integration
  - [x] 4.3: Show error code only in __DEV__ mode
  - [x] 4.4: Never expose stack trace to users

- [x] **Task 5: Integrate at root layout** (AC: 6)
  - [x] 5.1: Import CustomErrorBoundary in `app/_layout.tsx`
  - [x] 5.2: Wrap Stack navigation in ErrorBoundary
  - [x] 5.3: Keep expo-router's ErrorBoundary export for router internals
  - [x] 5.4: Test that errors in any screen are caught

- [x] **Task 6: Add index export** (AC: 5)
  - [x] 6.1: Export ErrorBoundary from `components/organisms/index.ts`
  - [x] 6.2: Add JSDoc documentation to component

- [x] **Task 7: Manual testing** (AC: 1-7)
  - [x] 7.1: Create temporary test that throws error in a component
    ```typescript
    // Temporary error simulation (add to any screen)
    // Remove after validation
    const TestErrorButton = () => (
      <SwissPressable
        accessibilityLabel="Test error boundary"
        onPress={() => {
          throw new Error('Test error - ErrorBoundary validation');
        }}
      >
        <Text>Trigger Test Error</Text>
      </SwissPressable>
    );
    ```
  - [x] 7.2: Verify error screen displays with Swiss styling
  - [x] 7.3: Verify "Try Again" button works (retryKey increments, children remount)
  - [x] 7.4: Verify error logging in console (dev mode)
  - [x] 7.5: Remove temporary test code

---

## Dev Notes

### React Error Boundary Requirements

Error boundaries MUST be class components. Function components cannot use:
- `getDerivedStateFromError()` - Update state to render fallback UI
- `componentDidCatch()` - Log error info

### Key Implementation Details

1. **State reset vs full reload:**
   - First attempt: Reset `hasError` to `false` and increment `retryKey` to force fresh mount
   - If error persists: Use `expo-router` navigation to reload
   - Last resort: Full app reload with `Updates.reloadAsync()` (if available)

2. **Children re-rendering:**
   - Use `retryKey` in state that increments on each retry attempt
   - Wrap children in fragment with key: `<React.Fragment key={this.state.retryKey}>{children}</React.Fragment>`
   - This forces React to fully remount children with fresh state on retry
   - Prevents persistent errors from immediately re-triggering

3. **Error boundary placement:**
   - Above `Stack` but below `ThemeProvider` so fallback can use theme
   - Expo Router's exported `ErrorBoundary` handles router-specific errors

4. **Full app reload fallback (optional):**
   ```typescript
   // For last-resort full app reload
   import * as Updates from 'expo-updates';
   
   // In handleRetry method (after state reset attempts):
   try {
     if (Updates.reloadAsync) {
       await Updates.reloadAsync();
     }
   } catch (e) {
     // expo-updates not available, use router reload instead
     router.replace(router.pathname);
   }
   ```

### Primitives to Use

```typescript
import { Box } from '@/components/primitives/box';
import { Stack } from '@/components/primitives/stack';
import { Text } from '@/components/primitives/text';
import { SwissPressable } from '@/components/primitives/swiss-pressable';
```

### NativeWind Classes for Error Screen

```
bg-paper          → White background
flex-1            → Fill available space
items-center      → Center horizontally
justify-center    → Center vertically
p-6               → 24px padding
text-ink          → Black text
text-ink-muted    → Gray text for secondary content
bg-ink            → Black button background
min-h-[44px]      → 44px minimum touch target
min-w-[200px]     → Reasonable button width
```

### Project Structure Notes

- Component goes in `organisms/` (complex UI with logic)
- Not `molecules/` (those are stateless compositions)
- File naming: `ErrorBoundary.tsx` (PascalCase for components)
- Export via barrel file: `components/organisms/index.ts`

### References

- [Source: docs/epics.md#Story 0.8]
- [Source: docs/SWISS-MINIMALIST.md#Interaction Patterns]
- [Source: docs/project_context.md#Technology Stack]
- [Source: apps/mobile/app/_layout.tsx - current error boundary export]
- [Source: apps/mobile/components/primitives/ - Box, Stack, Text, SwissPressable]

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (GitHub Copilot)

### Debug Log References

- TypeScript compilation: `npx tsc --noEmit` - passed with 0 errors
- Web server: `npm run web` - started successfully on localhost:8083

### Completion Notes List

1. Created `ErrorBoundary.tsx` class component with:
   - `getDerivedStateFromError()` for error state capture
   - `componentDidCatch()` for error logging with retry context
   - `handleRetry()` with retryKey increment for proper remount
   - Swiss Minimalist styled fallback UI
   - Support for custom fallback via props

2. Error UI features:
   - **Flush-left asymmetric layout** with Box, Stack primitives (pl-6 pr-16 py-8)
   - h1 heading "Something went wrong"
   - Objective body text "The app stopped working. Tap Try Again to restart."
   - Inverted Swiss style button (bg-ink, text-paper)
   - Error details only shown in __DEV__ mode
   - **Accessibility**: role="alert" and accessibilityLiveRegion="polite"

3. Integration approach:
   - ErrorBoundary wraps Stack inside ThemeProvider
   - expo-router's ErrorBoundary export preserved for router internals
   - retryKey pattern forces full children remount on retry

4. All acceptance criteria verified:
   - AC1: ✅ Catches errors via getDerivedStateFromError
   - AC2: ✅ Swiss Minimalist error screen (flush-left, asymmetric spacing)
   - AC3: ✅ "Try Again" button with handleRetry
   - AC4: ✅ console.error logging, no user-facing stack traces
   - AC5: ✅ Follows React error boundary patterns (class component)
   - AC6: ✅ Wrapped at root layout level
   - AC7: ✅ retryKey enables reset without full reload

5. **Code review fixes applied (2024-12-24):**
   - Fixed Swiss design violation: Changed text-center to flush-left alignment
   - Fixed accessibility: Added role="alert" and accessibilityLiveRegion="polite"
   - Fixed asymmetric spacing: Changed p-6 to pl-6 pr-16 py-8
   - Improved error message: More objective and action-oriented
   - Added JSDoc @public annotation to handleRetry method
   - Created comprehensive Playwright test suite (error-boundary.spec.ts)

### File List

- components/organisms/ErrorBoundary.tsx (created, updated by code review)
- components/organisms/index.ts (updated - added ErrorBoundary export)
- app/_layout.tsx (updated - integrated ErrorBoundary)
- tests/error-boundary.spec.ts (created - Playwright test suite)
