# 📸 Automated Screenshots Setup

Playwright is now configured to automatically capture screenshots of your app!

## 🚀 Quick Start

### Method 1: Expo Already Running (Fastest)

```bash
# Terminal 1: Start Expo
cd apps/mobile
npm run web

# Terminal 2: Take screenshots
npm run test:screenshots
```

### Method 2: Let Playwright Start Expo

```bash
cd apps/mobile
npm run test:screenshots
```

## 📁 Where Screenshots Are Saved

All screenshots go to: `apps/mobile/screenshots/`

## 🎯 What Gets Captured

The test suite automatically captures:
- ✅ Full Camera tab (Swiss design test)
- ✅ History tab
- ✅ Settings tab
- ✅ Typography elements (display, h1, h2, etc.)
- ✅ Color tokens (signal red, ink, paper)
- ✅ Spacing grid demo
- ✅ Decoration check (verifies no rounded corners/shadows)

## 🔍 Sharing with AI

After running screenshots, you can:

1. **Share the screenshots folder** - I can analyze them visually
2. **Ask specific questions** - "Does the typography look correct?"
3. **Verify design compliance** - "Are there any rounded corners?"
4. **Check color accuracy** - "Does the signal red match #E53935?"

## 📝 Available Commands

| Command | Description |
|---------|-------------|
| `npm run test:screenshots` | Run tests (headless, fastest) |
| `npm run test:screenshots:ui` | Run with Playwright UI (interactive) |
| `npm run test:screenshots:headed` | Run with visible browser |

## ⚙️ Configuration

- **Config**: `playwright.config.ts`
- **Tests**: `tests/screenshots.spec.ts`
- **Base URL**: `http://localhost:8083`

## 💡 Pro Tips

- Run screenshots after implementing new features to verify visual changes
- Use `--ui` mode to debug test issues interactively
- Screenshots are automatically checked for border-radius and box-shadow violations

---

**Next Steps:**
1. Run `npm run test:screenshots` to capture your first screenshots
2. Check the `screenshots/` folder
3. Share screenshots with me to analyze the Swiss design implementation!

