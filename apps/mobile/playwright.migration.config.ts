import { defineConfig, devices } from '@playwright/test';

const port = 8084;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests',
  testMatch: 'migration-flow.spec.ts',
  outputDir: './test-results/migration-flow',
  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/migration-flow' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: [
      'env',
      'EXPO_NO_DOTENV=1',
      'EXPO_PUBLIC_USE_MOCK=false',
      'EXPO_PUBLIC_SUPABASE_URL=https://e2e.supabase.co',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY=e2e-anon-key',
      'EXPO_PUBLIC_API_URL=http://localhost:8000',
      'npx',
      'expo',
      'start',
      '--web',
      '--clear',
      '--port',
      String(port),
    ].join(' '),
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});