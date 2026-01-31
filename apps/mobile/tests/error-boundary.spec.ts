import { test, expect } from '@playwright/test';

/**
 * Error Boundary tests for Story 0.8
 * 
 * Validates that the ErrorBoundary component:
 * - Catches unhandled errors in the component tree
 * - Displays Swiss Minimalist styled error screen
 * - Provides working "Try Again" functionality
 * - Uses flush-left text alignment (not centered)
 * - Has proper accessibility attributes
 */

test.describe('ErrorBoundary Component', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for app to load
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should display error screen with Swiss Minimalist design', async ({ page, context }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Inject a test component that throws an error
    await page.evaluate(() => {
      // Create a button that will throw when clicked
      const button = document.createElement('button');
      button.textContent = 'Trigger Error';
      button.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 9999; padding: 8px 16px; background: #E53935; color: white;';
      button.onclick = () => {
        // Force React to throw by accessing a component that will error
        throw new Error('Test error - ErrorBoundary validation');
      };
      document.body.appendChild(button);
    });

    // Click the error trigger button
    await page.click('text=Trigger Error');
    
    // Wait a moment for error boundary to catch and render
    await page.waitForTimeout(1000);

    // Verify error screen appears with expected text
    const errorHeading = page.getByText('Something went wrong');
    await expect(errorHeading).toBeVisible();

    // Verify user-friendly message appears
    const errorMessage = page.getByText('The app stopped working. Tap Try Again to restart.');
    await expect(errorMessage).toBeVisible();

    // Verify "Try Again" button exists
    const tryAgainButton = page.getByLabel('Try again to reload the app');
    await expect(tryAgainButton).toBeVisible();

    // Verify console error was logged
    expect(consoleErrors.some(err => err.includes('ErrorBoundary caught an error'))).toBeTruthy();

    // Take screenshot for visual validation of Swiss design
    await page.screenshot({
      path: 'screenshots/error-boundary-screen.png',
    });
  });

  test('should use flush-left text alignment (Swiss design)', async ({ page }) => {
    // Inject error trigger
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.textContent = 'Trigger Error';
      button.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 9999; padding: 8px 16px; background: #E53935; color: white;';
      button.onclick = () => {
        throw new Error('Test error for alignment check');
      };
      document.body.appendChild(button);
    });

    await page.click('text=Trigger Error');
    await page.waitForTimeout(1000);

    // Check that error text is NOT centered
    const errorHeading = page.getByText('Something went wrong');
    const headingStyles = await errorHeading.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        textAlign: computed.textAlign,
      };
    });

    // Swiss design requires flush-left, not center
    expect(headingStyles.textAlign).not.toBe('center');
  });

  test('should have accessibility attributes', async ({ page }) => {
    // Inject error trigger
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.textContent = 'Trigger Error';
      button.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 9999; padding: 8px 16px; background: #E53935; color: white;';
      button.onclick = () => {
        throw new Error('Test error for accessibility check');
      };
      document.body.appendChild(button);
    });

    await page.click('text=Trigger Error');
    await page.waitForTimeout(1000);

    // Verify error container has proper accessibility role
    const errorContainer = page.locator('[role="alert"]');
    await expect(errorContainer).toBeVisible();

    // Verify Try Again button has proper accessibility label
    const tryAgainButton = page.getByLabel('Try again to reload the app');
    await expect(tryAgainButton).toBeVisible();
  });

  test('should reset error state on "Try Again" click', async ({ page }) => {
    // Inject error trigger
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.textContent = 'Trigger Error';
      button.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 9999; padding: 8px 16px; background: #E53935; color: white;';
      button.onclick = () => {
        throw new Error('Test error for retry check');
      };
      document.body.appendChild(button);
    });

    await page.click('text=Trigger Error');
    await page.waitForTimeout(1000);

    // Verify error screen appears
    const errorHeading = page.getByText('Something went wrong');
    await expect(errorHeading).toBeVisible();

    // Click Try Again button
    const tryAgainButton = page.getByLabel('Try again to reload the app');
    await tryAgainButton.click();
    
    await page.waitForTimeout(1000);

    // Verify error screen is gone (app should recover)
    // Note: In real scenario, if error persists, it will show again
    // But ErrorBoundary should at least attempt to remount children
    await expect(errorHeading).not.toBeVisible();
  });

  test('should use Swiss Minimalist color palette', async ({ page }) => {
    // Inject error trigger
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.textContent = 'Trigger Error';
      button.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 9999; padding: 8px 16px; background: #E53935; color: white;';
      button.onclick = () => {
        throw new Error('Test error for color check');
      };
      document.body.appendChild(button);
    });

    await page.click('text=Trigger Error');
    await page.waitForTimeout(1000);

    // Check background is Paper white
    const errorContainer = page.locator('[role="alert"]');
    const containerStyles = await errorContainer.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
      };
    });

    // Paper (#FFFFFF) should be rgb(255, 255, 255)
    expect(containerStyles.backgroundColor).toBe('rgb(255, 255, 255)');

    // Check heading text is Ink black
    const errorHeading = page.getByText('Something went wrong');
    const headingStyles = await errorHeading.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
      };
    });

    // Ink (#000000) should be rgb(0, 0, 0)
    expect(headingStyles.color).toBe('rgb(0, 0, 0)');
  });
});
