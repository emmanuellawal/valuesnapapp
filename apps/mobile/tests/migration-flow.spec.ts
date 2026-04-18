import { expect, test } from '@playwright/test';

import {
  installSupabasePasswordAuthStub,
  signInWithEmail,
  waitForAuthenticatedSnapshot,
  waitForAuthSnapshot,
} from './helpers/supabaseAuth';

const HISTORY_KEY = 'valuesnap:local_history';
const GUEST_SESSION_KEY = 'valuesnap:guest_session_id';
const SIGN_IN_EMAIL = 'user@example.com';
const SIGN_IN_PASSWORD = 'password123!';
const SUPABASE_AUTH_PATH = '/auth/v1/';

const LOCAL_VALUATION = {
  id: 'local-1',
  createdAt: '2026-04-01T12:00:00.000Z',
  status: 'SUCCESS',
  request: {},
  response: {
    itemDetails: {
      itemType: 'camera',
      brand: 'Canon',
      model: 'AE-1',
      visualCondition: 'used_good',
      conditionDetails: 'Minor wear',
      estimatedAge: '1970s',
      categoryHint: 'Cameras',
      searchKeywords: ['Canon AE-1', 'film camera'],
      identifiers: { upc: null, modelNumber: null, serialNumber: null },
    },
    marketData: {
      status: 'success',
      keywords: 'Canon AE-1 film camera',
      totalFound: 20,
      pricesAnalyzed: 15,
      priceRange: { min: 80, max: 200 },
      fairMarketValue: 130,
      confidence: 'HIGH',
    },
  },
};

const SESSION = {
  access_token: 'e2e-access-token',
  refresh_token: 'e2e-refresh-token',
  expires_in: 3600,
  expires_at: 4102444800,
  token_type: 'bearer',
};

const USER = {
  id: 'user-123',
  email: 'user@example.com',
  created_at: '2026-04-01T00:00:00.000Z',
  app_metadata: { provider: 'email' },
  user_metadata: { tier: 'FREE', preferences: {} },
  aud: 'authenticated',
  role: 'authenticated',
};

const SERVER_HISTORY_RESPONSE = {
  valuations: [
    {
      id: 'server-1',
      item_name: 'Seiko SKX007',
      item_type: 'watch',
      brand: 'Seiko',
      price_min: 100,
      price_max: 200,
      fair_market_value: 150,
      confidence: 'HIGH',
      sample_size: 12,
      image_thumbnail_url: 'https://example.com/thumb.jpg',
      ai_response: {
        item_type: 'watch',
        brand: 'Seiko',
        model: 'SKX007',
        visual_condition: 'used_good',
        condition_details: 'Minor wear',
        estimated_age: '2010s',
        category_hint: 'Watches',
        search_keywords: ['Seiko', 'SKX007'],
        identifiers: {
          UPC: null,
          model_number: 'SKX007',
          serial_number: null,
        },
      },
      ebay_data: {
        status: 'success',
        keywords: 'seiko skx007',
        total_found: 20,
        prices_analyzed: 12,
        price_range: { min: 100, max: 200 },
        fair_market_value: 150,
        mean: 148,
        std_dev: 12,
        avg_days_to_sell: 5,
        confidence: 'HIGH',
      },
      confidence_data: { market_confidence: 'HIGH' },
      created_at: '2026-04-01T12:00:00+00:00',
    },
  ],
};

test.describe('Guest-to-account migration flow', () => {
  test('imports local guest history into the authenticated server history view', async ({ page }) => {
    let valuationsRequests = 0;

    await installSupabasePasswordAuthStub(page, {
      session: SESSION,
      user: USER,
      signInEmail: SIGN_IN_EMAIL,
      signInPassword: SIGN_IN_PASSWORD,
      supabaseAuthPath: SUPABASE_AUTH_PATH,
    });

    await page.addInitScript(
      ({ historyKey, guestSessionKey, localValuation }) => {
        window.localStorage.setItem(historyKey, JSON.stringify([localValuation]));
        window.localStorage.setItem(guestSessionKey, 'guest-123');
      },
      {
        historyKey: HISTORY_KEY,
        guestSessionKey: GUEST_SESSION_KEY,
        localValuation: LOCAL_VALUATION,
      },
    );

    await page.route('**/api/valuations', async (route) => {
      valuationsRequests += 1;
      const body = valuationsRequests === 1 ? { valuations: [] } : SERVER_HISTORY_RESPONSE;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });

    await page.route('**/api/migrate-guest', async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toEqual({ guest_session_id: 'guest-123' });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ migrated: 1 }),
      });
    });

    await page.goto('/auth/sign-in');
    await page.waitForLoadState('networkidle');
    await waitForAuthSnapshot(page);
    await signInWithEmail(page, {
      email: SIGN_IN_EMAIL,
      password: SIGN_IN_PASSWORD,
    });
    await waitForAuthenticatedSnapshot(page);

    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    await page.getByText('Your collection').waitFor({ timeout: 15000 });

    const migrationBanner = page.getByTestId('migration-banner');
    await expect(migrationBanner).toContainText('1 valuation');

    await page.getByTestId('migration-import-button').click();

    await expect(migrationBanner).toHaveCount(0);
    await expect(page.getByText('1 items valued')).toBeVisible();
    await expect(page.getByText('Seiko SKX007')).toBeVisible();
    expect(valuationsRequests).toBeGreaterThanOrEqual(2);
  });
});