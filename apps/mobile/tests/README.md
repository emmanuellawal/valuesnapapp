# Playwright Visual Testing

This directory contains Playwright tests for capturing screenshots of the ValueSnap app.

## Purpose

These tests allow the AI assistant to "see" what the app looks like by:
- Taking automated screenshots of each screen/tab
- Capturing specific design elements (typography, colors, spacing)
- Verifying Swiss design compliance (no rounded corners, no shadows)

## Quick Start

### Option 1: Run with Expo already running (Recommended)

1. Start Expo in one terminal:
   ```bash
   npm run web
   ```

2. In another terminal, run screenshots:
   ```bash
   npm run test:screenshots
   ```

### Option 2: Let Playwright start Expo automatically

```bash
npm run test:screenshots
```

Playwright will automatically start Expo, wait for it to be ready, then take screenshots.

## Available Commands

- `npm run test:screenshots` - Run screenshot tests (headless)
- `npm run test:screenshots:ui` - Run with Playwright UI (interactive)
- `npm run test:screenshots:headed` - Run with visible browser window

## Screenshots Location

Screenshots are saved to: `apps/mobile/screenshots/`

Files created:
- `camera-tab-full.png` - Full Camera tab screenshot
- `swiss-design-test.png` - Swiss design test component
- `history-tab.png` - History tab
- `settings-tab.png` - Settings tab
- `display-typography.png` - Display text element ($299)
- `signal-color.png` - Signal red color element
- `spacing-grid.png` - Spacing grid demo
- `no-decorations-check.png` - Full page for decoration verification

## Sharing Screenshots with AI

After running tests, you can:
1. Share the screenshots directory with the AI
2. Ask the AI to analyze specific design elements
3. Verify Swiss design token compliance
4. Check for visual regressions

## Configuration

- Config file: `playwright.config.ts`
- Base URL: `http://localhost:8083`
- Browser: Chromium (fastest for screenshots)

## Troubleshooting

**Port already in use:**
- Make sure Expo isn't running, or set `EXPO_WEB_URL` environment variable

**Screenshots are blank:**
- Wait longer for app to load (increase timeout in config)
- Check that Expo web is accessible at localhost:8083

**Tests timeout:**
- Ensure Expo web is running and accessible
- Check browser console for errors

