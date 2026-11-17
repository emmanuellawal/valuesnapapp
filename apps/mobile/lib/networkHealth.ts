/**
 * Backend health probe (Story 6.12, AC2)
 *
 * `useOnlineStatus()` only says the device has a network. It cannot say whether
 * the Render free-tier backend is awake (it sleeps after 15 minutes idle and can
 * take 30-60s to cold start). This cheap probe fails fast so the *next* retry
 * event (focus, resume, reconnect, pull-to-refresh) tries again instead of this
 * call hanging against a sleeping instance.
 *
 * Contract (backend/main.py `/health`): HTTP 200 with `{"status": "healthy"}`.
 * Nothing else counts as healthy. This deliberately probes `/health`, not
 * `/health/appraise`, which checks AI/eBay dependencies irrelevant to migration.
 *
 * Do not wrap this in fetchWithRetry: that retries 502/503/504, which is the
 * opposite of what a fail-fast probe wants.
 */

import { BACKEND_HEALTH_TIMEOUT_MS } from '@/constants/migration';
import { env } from '@/lib/env';

export async function checkBackendHealth(
  { timeoutMs = BACKEND_HEALTH_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<boolean> {
  const baseUrl = env.apiUrl?.replace(/\/+$/, '');
  if (!baseUrl) return false;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/health`, { signal: controller.signal });
    if (!response.ok) return false;

    const body = await response.json().catch(() => null);
    return (body as { status?: string } | null)?.status === 'healthy';
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}
