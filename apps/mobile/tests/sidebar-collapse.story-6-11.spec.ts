import { expect, test } from '@playwright/test';

const appraisalRoute =
  '/appraisal?brand=Canon&model=AE-1&itemType=Camera&currentAskingEstimate=249&priceMin=199&priceMax=299&confidence=HIGH&pricesAnalyzed=24';

async function openDesktopAppraisal(page: import('@playwright/test').Page) {
  await page.goto(appraisalRoute);
  await page.waitForLoadState('networkidle');
  await page.getByTestId('appraisal-workstation').waitFor();
}

test.describe('Story 6.11 desktop sidebar collapse', () => {
  test.use({ viewport: { width: 1024, height: 900 } });

  test('marks Camera active and collapsed Settings navigation works', async ({ page }) => {
    await openDesktopAppraisal(page);

    const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(navigation.getByRole('button', { name: 'Camera' })).toHaveCSS(
      'border-left-color',
      'rgb(0, 0, 0)',
    );
    await expect(navigation.getByRole('button', { name: 'History' })).toHaveCSS(
      'border-left-color',
      'rgba(0, 0, 0, 0)',
    );

    await page.getByRole('button', { name: 'Collapse navigation' }).click();
    await expect(page.getByRole('button', { name: 'Expand navigation' })).toBeVisible();
    await expect
      .poll(async () => {
        const box = await page
          .getByTestId('appraisal-workstation')
          .getByTestId('swiss-sidebar-rail')
          .boundingBox();
        return Math.round(box?.width ?? 0);
      })
      .toBe(60);

    await navigation.getByRole('button', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test('expanded items clip their labels while the rail width animates', async ({ page }) => {
    await openDesktopAppraisal(page);

    await page.getByRole('button', { name: 'Collapse navigation' }).click();
    await expect(page.getByRole('button', { name: 'Expand navigation' })).toBeVisible();
    await page.getByRole('button', { name: 'Expand navigation' }).click();

    const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
    for (const label of ['Camera', 'History', 'Settings']) {
      const item = navigation.getByRole('button', { name: label });
      await expect(item).toHaveCSS('overflow-x', 'hidden');
      await expect(item).toHaveCSS('justify-content', 'flex-start');
    }
  });
});
