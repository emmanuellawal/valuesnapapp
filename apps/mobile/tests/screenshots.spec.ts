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

  async function waitForAppReady(page: any) {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  }

  test.describe('Web (desktop viewport)', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('web - Camera', async ({ page }) => {
      await page.goto('/');
      await waitForAppReady(page);
      await page.getByRole('heading', { name: 'What are you selling?' }).waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'web-camera.png'),
        fullPage: true,
      });
    });

    test('web - History', async ({ page }) => {
      await page.goto('/');
      await waitForAppReady(page);
      await page.click('text=History');
      await page.getByRole('heading', { name: 'Your collection' }).waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'web-history.png'),
        fullPage: true,
      });
    });

    test('web - Appraisal report', async ({ page }) => {
      await page.goto('/');
      await waitForAppReady(page);
      await page.getByRole('button', { name: /^Open valuation for / }).first().click();
      await page.getByRole('heading', { name: 'Appraisal report' }).waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'web-appraisal-report.png'),
        fullPage: true,
      });
    });

    test('web - Settings', async ({ page }) => {
      await page.goto('/');
      await waitForAppReady(page);
      await page.click('text=Settings');
      await page.getByRole('heading', { name: 'Your account' }).waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'web-settings.png'),
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
      await page.getByRole('heading', { name: 'What are you selling?' }).waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'mobile-camera.png'),
        fullPage: true,
      });
    });

    test('mobile - History', async ({ page }) => {
      await page.goto('/');
      await waitForAppReady(page);
      await page.click('text=History');
      await page.getByRole('heading', { name: 'Your collection' }).waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'mobile-history.png'),
        fullPage: true,
      });
    });

    test('mobile - Appraisal report', async ({ page }) => {
      await page.goto('/');
      await waitForAppReady(page);
      await page.getByRole('button', { name: /^Open valuation for / }).first().click();
      await page.getByRole('heading', { name: 'Appraisal report' }).waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'mobile-appraisal-report.png'),
        fullPage: true,
      });
    });

    test('mobile - Settings', async ({ page }) => {
      await page.goto('/');
      await waitForAppReady(page);
      await page.click('text=Settings');
      await page.getByRole('heading', { name: 'Your account' }).waitFor({ timeout: 15000 });

      await page.screenshot({
        path: path.join(screenshotsDir, 'mobile-settings.png'),
        fullPage: true,
      });
    });
  });
});

