# Frontend Pre-Review Checklist

Run this before marking any frontend story done.
Every item exists because a real finding already escaped into review.

## Hooks
- [ ] No duplicate `useEffect` and `useFocusEffect` for the same fetch or subscription — Epic 3.3
- [ ] Every `useCallback` dependency array is complete and intentional — Epic 3.3
- [ ] No conditional hook calls, especially around auth/loading branches — Epic 3.3 hook review hygiene

## Accessibility
- [ ] Every interactive element has an `accessibilityLabel` when text alone is not enough — Epic 3.3
- [ ] Non-interactive rows and containers do not render as `Pressable` or `TouchableOpacity` — Epic 4.8

## API Boundary
- [ ] If a transformer changed, a test exercises the real backend response shape — Epics 2–3
- [ ] Mock mode and real API mode are both covered when the story touches data flow — Epics 2–4

## Tests
- [ ] Error and escape paths have at least one test each (network, cancel, timeout, auth failure as applicable) — Epic 4.4-2
- [ ] New tests pass in isolation before the full suite runs — Epics 3–4

## Constants And Hygiene
- [ ] New breakpoint values use `BREAKPOINTS.*` instead of literals — Epics 3–4
- [ ] New timeouts, limits, and durations use named constants instead of magic numbers — Epics 3–4
- [ ] No backend-only credential is exposed through an `EXPO_PUBLIC_*` variable — Epic 4.1
