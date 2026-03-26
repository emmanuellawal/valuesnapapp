import { useState, useEffect } from 'react';

function getBrowserWindow(): (Window & typeof globalThis) | undefined {
  if (typeof globalThis.window === 'undefined') {
    return undefined;
  }

  return globalThis.window;
}

function supportsOnlineStatusEvents(): boolean {
  const browserWindow = getBrowserWindow();

  return (
    typeof browserWindow?.addEventListener === 'function' &&
    typeof browserWindow?.removeEventListener === 'function'
  );
}

/**
 * Returns the current network online status using navigator.onLine.
 * Safe default is `true` — on native platforms where navigator.onLine
 * is unavailable, we assume online and let the API error path handle failures.
 */
export function getInitialOnlineStatus(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.onLine === 'undefined') {
    return true;
  }
  return navigator.onLine;
}

/**
 * Hook: useOnlineStatus
 *
 * Cross-platform network detection for the ValueSnap PWA.
 * Uses window `online`/`offline` events on web; returns true always on native.
 *
 * Usage:
 *   const isOnline = useOnlineStatus();
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(getInitialOnlineStatus);

  useEffect(() => {
    if (!supportsOnlineStatusEvents()) return;

    const browserWindow = getBrowserWindow();

    if (!browserWindow) return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    browserWindow.addEventListener('online', handleOnline);
    browserWindow.addEventListener('offline', handleOffline);

    return () => {
      browserWindow.removeEventListener('online', handleOnline);
      browserWindow.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
