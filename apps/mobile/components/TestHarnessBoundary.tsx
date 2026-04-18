import { useEffect } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { publishBrowserTestHarnessAuthSnapshot } from '@/lib/testHarness';

export function TestHarnessBoundary() {
  const { session, isGuest, isLoading } = useAuth();

  useEffect(() => {
    publishBrowserTestHarnessAuthSnapshot({
      hasSession: session !== null,
      isGuest,
      isLoading,
    });
  }, [isGuest, isLoading, session]);

  return null;
}