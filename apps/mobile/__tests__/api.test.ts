/**
 * Tests for lib/api.ts
 * Story 3.2, AC7
 */

import { appraise, AppraiseError } from '@/lib/api';

// Mock env module
jest.mock('@/lib/env', () => ({
  env: {
    apiUrl: 'http://test-api.local',
    useMock: false,
  },
}));

// Save original fetch
const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe('appraise', () => {
  it('returns parsed response on success', async () => {
    const mockResponse = {
      identity: { brand: 'Canon' },
      valuation: { fair_market_value: 200 },
      confidence: { market_confidence: 'HIGH' },
      valuation_id: 'uuid-1',
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await appraise('base64data', 'guest-123');

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://test-api.local/api/appraise',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          image_base64: 'base64data',
          guest_session_id: 'guest-123',
        }),
      }),
    );
  });

  it('throws NETWORK_ERROR on fetch failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(appraise('data', 'guest')).rejects.toThrow(AppraiseError);
    await expect(appraise('data', 'guest')).rejects.toMatchObject({
      errorType: 'NETWORK_ERROR',
    });
  });

  it('maps HTTP 422 with AI error code to AI_IDENTIFICATION_FAILED', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () =>
        Promise.resolve({
          success: false,
          error: { code: 'AI_IDENTIFICATION_FAILED', message: 'Cannot identify' },
        }),
    });

    await expect(appraise('data', 'guest')).rejects.toMatchObject({
      errorType: 'AI_IDENTIFICATION_FAILED',
    });
  });

  it('maps HTTP 429 to RATE_LIMIT', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({}),
    });

    await expect(appraise('data', 'guest')).rejects.toMatchObject({
      errorType: 'RATE_LIMIT',
    });
  });

  it('maps unknown error codes to GENERIC_ERROR', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          error: { code: 'UNKNOWN_CODE', message: 'Something broke' },
        }),
    });

    await expect(appraise('data', 'guest')).rejects.toMatchObject({
      errorType: 'GENERIC_ERROR',
    });
  });

  it('throws GENERIC_ERROR when apiUrl is not configured', async () => {
    // Override env for this test
    const envModule = require('@/lib/env');
    const original = envModule.env.apiUrl;
    envModule.env.apiUrl = undefined;

    await expect(appraise('data', 'guest')).rejects.toMatchObject({
      errorType: 'GENERIC_ERROR',
    });

    envModule.env.apiUrl = original;
  });
});
