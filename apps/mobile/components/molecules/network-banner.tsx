import React from 'react';

import { Box, Text } from '@/components/primitives';
import type { ErrorType } from './error-state';

export interface NetworkBannerProps {
  /** The current error type — banner is a no-op when this is not NETWORK_ERROR. */
  errorType: ErrorType | null | undefined;
  /** Current network status from useOnlineStatus(). */
  isOnline: boolean;
}

export function NetworkBanner({ errorType, isOnline }: NetworkBannerProps) {
  if (errorType !== 'NETWORK_ERROR') {
    return null;
  }

  const message = isOnline
    ? 'Tap Retry to submit your request'
    : 'Offline — request queued';

  return (
    <Box className="bg-ink px-4 py-2">
      <Text variant="body-sm" className="text-paper">
        {message}
      </Text>
    </Box>
  );
}
