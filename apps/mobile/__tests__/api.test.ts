/**
 * Tests for lib/api.ts
 * Stories: 3.2 (AC7), 5.5-7 (retry/backoff matrix)
 */

import { appraise, AppraiseError, fetchWithRetry } from '@/lib/api';

jest.mock('@/lib/env', () => ({
  env: {
    apiUrl: 'http://test-api.local',
    useMock: false,
  },
}));

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.useRealTimers();
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
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws NETWORK_ERROR after exhausting retries on fetch failure', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const promise = appraise('data', 'guest');
    // Catch unhandled-rejection noise while we advance timers.
    const assertion = expect(promise).rejects.toMatchObject({
      errorType: 'NETWORK_ERROR',
    });

    // Drain first backoff (1 s) and second backoff (3 s).
    await jest.advanceTimersByTimeAsync(1_000);
    await jest.advanceTimersByTimeAsync(3_000);

    await assertion;
    // 1 initial attempt + 2 retries
    expect(global.fetch).toHaveBeenCalledTimes(3);
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
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('maps HTTP 429 to RATE_LIMIT without retrying', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({}),
    });

    await expect(appraise('data', 'guest')).rejects.toMatchObject({
      errorType: 'RATE_LIMIT',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
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
    const envModule = require('@/lib/env');
    const original = envModule.env.apiUrl;
    envModule.env.apiUrl = undefined;

    await expect(appraise('data', 'guest')).rejects.toMatchObject({
      errorType: 'GENERIC_ERROR',
    });

    envModule.env.apiUrl = original;
  });
});

describe('fetchWithRetry', () => {
  // Use tiny backoff so the retry matrix runs with real timers in <50 ms.
  const fastOpts = { backoffBaseMs: 1, backoffFactor: 1, retries: 2 };

  it('retries on network error, then succeeds', async () => {
    const mock = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('net down'))
      .mockResolvedValueOnce({ ok: true, status: 200 });
    global.fetch = mock as unknown as typeof fetch;

    const response = await fetchWithRetry('http://x', { method: 'GET' }, fastOpts);

    expect(response.status).toBe(200);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('retries on 503, then succeeds', async () => {
    const mock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    global.fetch = mock as unknown as typeof fetch;

    const response = await fetchWithRetry('http://x', { method: 'GET' }, fastOpts);

    expect(response.status).toBe(200);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('retries on 502, then succeeds', async () => {
    const mock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 502 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    global.fetch = mock as unknown as typeof fetch;

    const response = await fetchWithRetry('http://x', { method: 'GET' }, fastOpts);

    expect(response.status).toBe(200);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on 400', async () => {
    const mock = jest.fn().mockResolvedValue({ ok: false, status: 400 });
    global.fetch = mock as unknown as typeof fetch;

    const response = await fetchWithRetry('http://x', { method: 'GET' }, fastOpts);

    expect(response.status).toBe(400);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on 429 (retrying would worsen rate-limit)', async () => {
    const mock = jest.fn().mockResolvedValue({ ok: false, status: 429 });
    global.fetch = mock as unknown as typeof fetch;

    const response = await fetchWithRetry('http://x', { method: 'GET' }, fastOpts);

    expect(response.status).toBe(429);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('throws terminal error after exhausting retries', async () => {
    const mock = jest.fn().mockRejectedValue(new TypeError('keeps failing'));
    global.fetch = mock as unknown as typeof fetch;

    await expect(
      fetchWithRetry('http://x', { method: 'GET' }, fastOpts),
    ).rejects.toThrow('keeps failing');
    expect(mock).toHaveBeenCalledTimes(3);
  });

  it('aborts the in-flight request after per-attempt timeout fires', async () => {
    jest.useFakeTimers();

    // Mock fetch that hangs until the AbortSignal fires.
    const mock = jest.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = (init as RequestInit)?.signal as AbortSignal | undefined;
          signal?.addEventListener('abort', () =>
            reject(new Error('AbortError')),
          );
        }),
    );
    global.fetch = mock as unknown as typeof fetch;

    const promise = fetchWithRetry('http://x', { method: 'GET' }, {
      timeoutMs: 500,
      retries: 0,
      backoffBaseMs: 1,
      backoffFactor: 1,
    });

    // Register the assertion BEFORE advancing timers so the rejection is
    // handled before Jest's unhandled-rejection detector sees it.
    const assertion = expect(promise).rejects.toThrow('AbortError');

    // Fire the 500 ms abort timer — AbortController.abort() fires, the mock
    // fetch rejects, and fetchWithRetry re-throws (retries=0).
    await jest.advanceTimersByTimeAsync(500);

    await assertion;
    expect(mock).toHaveBeenCalledTimes(1);
    // Verify the signal was passed through to fetch.
    const calledInit = mock.mock.calls[0][1] as RequestInit;
    expect(calledInit.signal).toBeDefined();
  });
});
