import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

import { Box, Stack } from '@/components/primitives';

/**
 * Shimmer animation component for skeleton loading states.
 * Creates a subtle pulsing effect that feels alive.
 */
function ShimmerBox({ className }: { className: string }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={className}
      style={{ opacity }}
    />
  );
}

export function ValuationCardSkeleton() {
  return (
    <Box className="bg-paper border-2 border-ink/10">
      <ShimmerBox className="aspect-square bg-divider/20" />

      <Stack gap={1} className="p-4">
        <ShimmerBox className="h-5 w-3/4 bg-divider" />
        <ShimmerBox className="h-10 w-1/2 bg-divider mt-1" />
        <ShimmerBox className="h-3 w-2/3 bg-divider mt-1" />
      </Stack>
    </Box>
  );
}
