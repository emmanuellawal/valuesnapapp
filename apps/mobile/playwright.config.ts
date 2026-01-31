import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Expo web app visual testing
 * 
 * This config is set up to:
 * - Take screenshots of the app running on localhost:8083 (avoids stale SW cache)
 * - Wait for the app to be ready before capturing
 * - Save screenshots to ./screenshots directory
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  
  // Timeouts
  timeout: 30 * 1000, // 30 seconds per test
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },
  
  // Run tests in parallel (but only one at a time for screenshots)
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // One worker to avoid port conflicts
  
  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
  ],
  
  // Browser configuration
  use: {
    baseURL: process.env.EXPO_WEB_URL || 'http://localhost:8083',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },
  
  // Projects - test on Chromium (fastest for screenshots)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  
  // Web server configuration - start Expo if not already running
  webServer: {
    command: 'npm run web',
    url: 'http://localhost:8083',
    reuseExistingServer: !process.env.CI, // Reuse if already running
    timeout: 120 * 1000, // 2 minutes to start
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

