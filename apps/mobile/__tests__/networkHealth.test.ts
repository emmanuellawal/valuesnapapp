/**
 * Tests for lib/networkHealth.ts
 * Story 6.12, AC2
 *
 * Mocks global.fetch directly: this is the module that itself calls fetch
 * (same convention as __tests__/api.test.ts).
 */

jest.mock('@/lib/env', () => ({
  env: { useMock: false, apiUrl: 'http://localhost:8000' },
}));

import { env } from '@/lib/env';
import { checkBackendHealth } from '@/lib/networkHealth';

const mockFetch = jest.fn();
const originalFetch = global.fetch;

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: jest.fn().mockResolvedValue(body),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
  (env as { apiUrl: string | undefined }).apiUrl = 'http://localhost:8000';
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.useRealTimers();
});

describe('checkBackendHealth', () => {
  it('returns true for HTTP 200 with status "healthy"', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ status: 'healthy' }));

    await expect(checkBackendHealth()).resolves.toBe(true);
  });

  it('probes GET {apiUrl}/health with an abort signal', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ status: 'healthy' }));

    await checkBackendHealth();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:8000/health');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.method ?? 'GET').toBe('GET');
  });

  it('strips trailing slashes from env.apiUrl so /health never becomes //health', async () => {
    (env as { apiUrl: string | undefined }).apiUrl = 'http://localhost:8000///';
    mockFetch.mockResolvedValue(jsonResponse({ status: 'healthy' }));

    await expect(checkBackendHealth()).resolves.toBe(true);
    expect(mockFetch.mock.calls[0][0]).toBe('http://localhost:8000/health');
  });

  it('does not probe /health/appraise', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ status: 'healthy' }));

    await checkBackendHealth();

    expect(mockFetch.mock.calls[0][0]).not.toContain('/health/appraise');
  });

  it('returns false for a non-200 response', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ status: 'healthy' }, { ok: false, status: 503 }));

    await expect(checkBackendHealth()).resolves.toBe(false);
  });

  it.each([
    ['unhealthy status', { status: 'degraded' }],
    ['wrong key', { ok: true }],
    ['null body', null],
    ['string body', 'healthy'],
    ['array body', ['healthy']],
  ])('returns false for a 200 with %s', async (_label, body) => {
    mockFetch.mockResolvedValue(jsonResponse(body));

    await expect(checkBackendHealth()).resolves.toBe(false);
  });

  it('returns false when the body is not valid JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockRejectedValue(new SyntaxError('bad json')),
    });

    await expect(checkBackendHealth()).resolves.toBe(false);
  });

  it('returns false when fetch throws a network error', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(checkBackendHealth()).resolves.toBe(false);
  });

  it('returns false and never calls fetch when the API URL is not configured', async () => {
    (env as { apiUrl: string | undefined }).apiUrl = undefined;

    await expect(checkBackendHealth()).resolves.toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('aborts and returns false when the probe exceeds the timeout', async () => {
    jest.useFakeTimers();
    mockFetch.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    const pending = checkBackendHealth({ timeoutMs: 5000 });
    await jest.advanceTimersByTimeAsync(4999);
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    await jest.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toBe(false);
  });

  it('defaults the timeout to 5000ms', async () => {
    jest.useFakeTimers();
    mockFetch.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    const pending = checkBackendHealth();
    await jest.advanceTimersByTimeAsync(5000);

    await expect(pending).resolves.toBe(false);
  });

  it('clears its timeout after a fast response (no stray timer)', async () => {
    jest.useFakeTimers();
    mockFetch.mockResolvedValue(jsonResponse({ status: 'healthy' }));

    await checkBackendHealth();

    expect(jest.getTimerCount()).toBe(0);
  });
});
