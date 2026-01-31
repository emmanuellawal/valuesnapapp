# Story 0.1: Initialize Expo Project with Tabs Template

**Status:** Done

---

## Story

**As a** developer,  
**I want** a properly configured Expo project with tabs navigation,  
**So that** I can start building features on a solid foundation.

---

## Acceptance Criteria

1. **AC1:** Project structure matches Expo Router conventions (file-based routing in `app/` directory)
2. **AC2:** TypeScript is properly configured with strict mode enabled
3. **AC3:** App runs successfully on web (`npx expo start --web`) without errors
4. **AC4:** Navigation between Camera, History, and Settings tabs works correctly
5. **AC5:** Tab icons and labels are visible and correctly positioned (bottom for mobile, adaptable for web)

---

## Tasks / Subtasks

- [x] **Task 1: Create Expo project from tabs template** (AC: 1, 2)
  - [x] 1.1: Expo project already exists at `apps/mobile/` with tabs template
  - [x] 1.2: Verified `app/(tabs)/` directory with `_layout.tsx`
  - [x] 1.3: Confirmed `tsconfig.json` exists with `strict: true`
  - [x] 1.4: Dependencies already installed

- [x] **Task 2: Configure for web platform** (AC: 3)
  - [x] 2.1: Web dependencies already installed (react-dom, react-native-web)
  - [x] 2.2: Verified `app.json` has web configuration
  - [x] 2.3: Added `index.js` entry point for Metro bundler compatibility
  - [x] 2.4: App renders successfully at localhost:8083

- [x] **Task 3: Rename default tabs to ValueSnap tabs** (AC: 4, 5)
  - [x] 3.1: Updated `app/(tabs)/index.tsx` to "Camera" with placeholder
  - [x] 3.2: Created `app/(tabs)/history.tsx` with "History" content
  - [x] 3.3: Created `app/(tabs)/settings.tsx` with "Settings" content
  - [x] 3.4: Updated `app/(tabs)/_layout.tsx` with correct tab configuration
  - [x] 3.5: Removed `app/(tabs)/two.tsx` (default template file)

- [x] **Task 4: Configure tab icons** (AC: 5)
  - [x] 4.1: Using Ionicons from @expo/vector-icons
  - [x] 4.2: Camera tab: `camera-outline` / `camera`
  - [x] 4.3: History tab: `time-outline` / `time`
  - [x] 4.4: Settings tab: `settings-outline` / `settings`
  - [x] 4.5: Icons change state on active/inactive (focused prop)

- [x] **Task 5: Verify complete setup** (AC: 1, 2, 3, 4, 5)
  - [x] 5.1: `npx expo start --web` loads successfully (HTTP 200)
  - [x] 5.2: All tabs render with correct content
  - [x] 5.3: `npx tsc --noEmit` passes with no errors
  - [x] 5.4: App renders correctly in browser

---

## Dev Notes

### Architecture Requirements (ARCH-1 to ARCH-3)

This story implements the foundation specified in the architecture document:

```bash
# ARCH-1: Exact command from architecture.md
npx create-expo-app@latest . --template tabs

# ARCH-3: Web platform configuration
npx expo install react-dom react-native-web @expo/metro-runtime
```

**Source:** [docs/architecture.md - Starter Template Evaluation]

### Project Structure (MUST Match)

After completion, the project structure should match:

```
app/
├── (tabs)/
│   ├── _layout.tsx          # Tab navigation layout
│   ├── index.tsx            # Camera tab (home)
│   ├── history.tsx          # History tab
│   └── settings.tsx         # Settings tab
├── _layout.tsx              # Root layout
└── +not-found.tsx           # 404 handler

components/                   # Will be populated in later stories
constants/
hooks/
```

**Source:** [docs/project_context.md - Project Structure]

### Tab Configuration Pattern

The `_layout.tsx` for tabs should follow this pattern:

```typescript
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#000000',  // Swiss: Ink color
        tabBarInactiveTintColor: '#666666', // Swiss: Muted
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Camera',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'camera' : 'camera-outline'} size={24} color={color} />
          ),
        }}
      />
      {/* History and Settings tabs follow same pattern */}
    </Tabs>
  );
}
```

### TypeScript Configuration

Ensure `tsconfig.json` has strict mode. The Expo tabs template should include this by default:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

### What NOT to Do

- ❌ Do NOT install NativeWind yet (Story 0.2)
- ❌ Do NOT add any styling beyond default
- ❌ Do NOT create components folder structure yet
- ❌ Do NOT install additional dependencies beyond web platform
- ❌ Do NOT modify the root `_layout.tsx` significantly
- ❌ Do NOT add authentication or API code

### Testing Checklist

Before marking complete, verify:

1. `npx expo start --web` → App loads in browser
2. Click Camera tab → Shows "Camera" content
3. Click History tab → Shows "History" content  
4. Click Settings tab → Shows "Settings" content
5. `npx tsc --noEmit` → No errors
6. Browser console → No red errors

---

## Dev Agent Record

### Context Reference

- docs/architecture.md (Starter Template Evaluation section)
- docs/project_context.md (Project Structure, Technology Stack)
- docs/epics.md (Story 0.1 acceptance criteria)

### Agent Model Used

Claude Opus 4 (via Cursor)

### Debug Log References

- Fixed Metro bundler entry point issue by creating `index.js`
- Created `babel.config.js` and `metro.config.js` for proper configuration

### Code Review Findings (2025-12-12)

**TypeScript Compilation Issue Fixed:**
- Re-added required `@ts-expect-error` comment in `ExternalLink.tsx` line 18
- The comment is necessary because ExternalLink accepts string hrefs for external URLs, but expo-router uses strict typed routes
- TypeScript compilation now passes (`npx tsc --noEmit` ✓)

**Scope Creep Identified:**
- NativeWind and Tailwind CSS dependencies found pre-installed in package.json
- `tailwind.config.js` exists with full Swiss design token configuration
- This is technically Story 0.2's scope, but only partial setup is complete
- Babel plugin, CSS imports, and type definitions still needed for Story 0.2

**Technical Decisions Documented:**
- React 19.1.0 is used (released December 2024) - cutting edge but compatible with Expo 54
- index.js serves as project entry point per Expo Router conventions

### Completion Notes List

1. Expo project existed at `apps/mobile/` with tabs template pre-configured
2. Renamed default tabs (Tab One, Tab Two) to ValueSnap tabs (Camera, History, Settings)
3. Updated tab layout to use Ionicons with Swiss-aligned colors (#000000 active, #666666 inactive)
4. Added `index.js` entry point per Expo Router conventions
5. Removed unused EditScreenInfo component references from tab screens
6. TypeScript strict mode verified, all type checks pass (after code review fix)
7. **Note:** NativeWind/Tailwind found pre-installed (Story 0.2 scope) but not fully configured

### File List

**Created:**
- `apps/mobile/app/(tabs)/history.tsx`
- `apps/mobile/app/(tabs)/settings.tsx`
- `apps/mobile/index.js`
- `apps/mobile/babel.config.js`
- `apps/mobile/metro.config.js`

**Modified:**
- `apps/mobile/app/(tabs)/index.tsx` (renamed to Camera screen)
- `apps/mobile/app/(tabs)/_layout.tsx` (updated tabs, icons, colors)
- `apps/mobile/components/ExternalLink.tsx` (added required @ts-expect-error for external link typing)

**Deleted:**
- `apps/mobile/app/(tabs)/two.tsx`

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-12 | Story created with comprehensive context | create-story workflow |
| 2025-12-12 | Implementation complete - all ACs verified | dev-story workflow |
| 2025-12-12 | Code review completed - TypeScript error fixed, scope creep documented | code-review workflow |

