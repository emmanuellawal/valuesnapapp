import { test, expect } from '@playwright/test';
import * as path from 'path';

/**
 * Visual screenshot tests for ValueSnap app
 * 
 * These tests capture screenshots that can be analyzed to verify:
 * - Swiss design tokens are correctly applied
 * - Typography scales are correct
 * - Colors match specifications
 * - No rounded corners or shadows appear
 * - Layout and spacing are correct
 */

test.describe('App Screenshots', () => {
  const screenshotsDir = path.join(__dirname, '../screenshots');
  const appraisalRoute =
    '/appraisal?brand=Canon&model=AE-1&itemType=Camera&fairMarketValue=249&priceMin=199&priceMax=299&confidence=HIGH&pricesAnalyzed=24&avgDaysToSell=21';

  async function waitForAppReady(page: any) {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  }

  test.describe('Web (desktop viewport)', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('web - Camera', async ({ page }) => {
      await page.goto('/');
      await waitForAppReady(page);
      await page.getByText("What are you selling").waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'web-camera.png'),
        fullPage: true,
      });
    });

    test('web - History', async ({ page }) => {
      await page.goto('/');
      await waitForAppReady(page);
      await page.click('text=History');
      await page.getByText('Your collection').waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'web-history.png'),
        fullPage: true,
      });
    });

    test('web - Appraisal report', async ({ page }) => {
      await page.goto(appraisalRoute);
      await waitForAppReady(page);
      await page.getByText('Appraisal').waitFor({ timeout: 15000 });
      await page.getByTestId('appraisal-valuation').scrollIntoViewIfNeeded();

      await page.screenshot({
        path: path.join(screenshotsDir, 'web-appraisal-report.png'),
        fullPage: true,
      });
    });

    test('web - Settings', async ({ page }) => {
      await page.goto('/');
      await waitForAppReady(page);
      await page.click('text=Settings');
      await page.getByText('Your account').waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'web-settings.png'),
        fullPage: true,
      });
    });

    // Confidence level validation tests (Story 2.10)
    test('web - Confidence HIGH', async ({ page }) => {
      await page.goto('/appraisal?confidence=HIGH&pricesAnalyzed=25&fairMarketValue=249&brand=Canon&model=AE-1');
      await waitForAppReady(page);
      await page.getByText('Appraisal').waitFor({ timeout: 15000 });
      await page.getByTestId('appraisal-valuation').scrollIntoViewIfNeeded();

      await page.screenshot({
        path: path.join(screenshotsDir, 'web-confidence-high.png'),
        fullPage: true,
      });
    });

    test('web - Confidence MEDIUM', async ({ page }) => {
      await page.goto('/appraisal?confidence=MEDIUM&pricesAnalyzed=12&fairMarketValue=145&brand=Anglepoise&model=Type%2075');
      await waitForAppReady(page);
      await page.getByText('Appraisal').waitFor({ timeout: 15000 });
      await page.getByTestId('appraisal-valuation').scrollIntoViewIfNeeded();

      await page.screenshot({
        path: path.join(screenshotsDir, 'web-confidence-medium.png'),
        fullPage: true,
      });
    });

    test('web - Confidence LOW', async ({ page }) => {
      await page.goto('/appraisal?confidence=LOW&pricesAnalyzed=3&fairMarketValue=55&brand=Unknown&model=Vintage%20botanical');
      await waitForAppReady(page);
      await page.getByText('Appraisal').waitFor({ timeout: 15000 });
      // Wait for LOW confidence warning to appear
      await page.getByText('Limited market data').waitFor({ timeout: 5000 });
      await page.getByTestId('appraisal-valuation').scrollIntoViewIfNeeded();

      await page.screenshot({
        path: path.join(screenshotsDir, 'web-confidence-low.png'),
        fullPage: true,
      });
    });

    // Velocity tests (Story 2.11)
    test('web - Velocity present', async ({ page }) => {
      await page.goto('/appraisal?confidence=HIGH&pricesAnalyzed=24&fairMarketValue=249&brand=Canon&model=AE-1&avgDaysToSell=21');
      await waitForAppReady(page);
      await page.getByText('Appraisal').waitFor({ timeout: 15000 });
      await page.getByText('Sells in ~21 days').waitFor({ timeout: 5000 });
      await page.getByTestId('appraisal-valuation').scrollIntoViewIfNeeded();

      await page.screenshot({
        path: path.join(screenshotsDir, 'web-velocity-present.png'),
        fullPage: true,
      });
    });

    test('web - Velocity absent', async ({ page }) => {
      await page.goto('/appraisal?confidence=HIGH&pricesAnalyzed=24&fairMarketValue=249&brand=Canon&model=AE-1&avgDaysToSell=0');
      await waitForAppReady(page);
      await page.getByText('Appraisal').waitFor({ timeout: 15000 });
      await expect(page.getByTestId('appraisal-valuation').getByText('Sells in')).not.toBeVisible();
      await page.getByTestId('appraisal-valuation').scrollIntoViewIfNeeded();

      await page.screenshot({
        path: path.join(screenshotsDir, 'web-velocity-absent.png'),
        fullPage: true,
      });
    });

    // Loading state — 1px progress bar (Swiss design spec)
    test('web - Loading state (progress bar)', async ({ page }) => {
      await page.goto('/appraisal?_demo=loading');
      await waitForAppReady(page);
      await page.getByText('Identifying item...').waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'web-loading-state.png'),
        fullPage: true,
      });
    });
  });

  test.describe('Mobile view (small viewport)', () => {
    test.use({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });

    test('mobile - Camera', async ({ page }) => {
      await page.goto('/');
      await waitForAppReady(page);
      await page.getByText("What are you selling").waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'mobile-camera.png'),
        fullPage: true,
      });
    });

    test('mobile - History', async ({ page }) => {
      await page.goto('/');
      await waitForAppReady(page);
      await page.click('text=History');
      await page.getByText('Your collection').waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'mobile-history.png'),
        fullPage: true,
      });
    });

    test('mobile - Appraisal report', async ({ page }) => {
      await page.goto(appraisalRoute);
      await waitForAppReady(page);
      await page.getByText('Appraisal').waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'mobile-appraisal-report.png'),
        fullPage: true,
      });
    });

    test('mobile - Settings', async ({ page }) => {
      await page.goto('/');
      await waitForAppReady(page);
      await page.click('text=Settings');
      await page.getByText('Your account').waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'mobile-settings.png'),
        fullPage: true,
      });
    });

    // Confidence level validation tests (Story 2.10)
    test('mobile - Confidence HIGH', async ({ page }) => {
      await page.goto('/appraisal?confidence=HIGH&pricesAnalyzed=25&fairMarketValue=249&brand=Canon&model=AE-1');
      await waitForAppReady(page);
      await page.getByText('Appraisal').waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'mobile-confidence-high.png'),
        fullPage: true,
      });
    });

    test('mobile - Confidence MEDIUM', async ({ page }) => {
      await page.goto('/appraisal?confidence=MEDIUM&pricesAnalyzed=12&fairMarketValue=145&brand=Anglepoise&model=Type%2075');
      await waitForAppReady(page);
      await page.getByText('Appraisal').waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'mobile-confidence-medium.png'),
        fullPage: true,
      });
    });

    test('mobile - Confidence LOW', async ({ page }) => {
      await page.goto('/appraisal?confidence=LOW&pricesAnalyzed=3&fairMarketValue=55&brand=Unknown&model=Vintage%20botanical');
      await waitForAppReady(page);
      await page.getByText('Appraisal').waitFor({ timeout: 15000 });
      // Wait for LOW confidence warning to appear
      await page.getByText('Limited market data').waitFor({ timeout: 5000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'mobile-confidence-low.png'),
        fullPage: true,
      });
    });

    // Velocity tests (Story 2.11)
    test('mobile - Velocity present', async ({ page }) => {
      await page.goto('/appraisal?confidence=HIGH&pricesAnalyzed=24&fairMarketValue=249&brand=Canon&model=AE-1&avgDaysToSell=21');
      await waitForAppReady(page);
      await page.getByText('Appraisal').waitFor({ timeout: 15000 });
      await page.getByText('Sells in ~21 days').waitFor({ timeout: 5000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'mobile-velocity-present.png'),
        fullPage: true,
      });
    });

    test('mobile - Velocity absent', async ({ page }) => {
      await page.goto('/appraisal?confidence=HIGH&pricesAnalyzed=24&fairMarketValue=249&brand=Canon&model=AE-1&avgDaysToSell=0');
      await waitForAppReady(page);
      await page.getByText('Appraisal').waitFor({ timeout: 15000 });
      await expect(page.getByTestId('appraisal-valuation').getByText('Sells in')).not.toBeVisible();

      await page.screenshot({
        path: path.join(screenshotsDir, 'mobile-velocity-absent.png'),
        fullPage: true,
      });
    });

    // Loading state — 1px progress bar (Swiss design spec)
    test('mobile - Loading state (progress bar)', async ({ page }) => {
      await page.goto('/appraisal?_demo=loading');
      await waitForAppReady(page);
      await page.getByText('Identifying item...').waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'mobile-loading-state.png'),
        fullPage: true,
      });
    });
  });
});

