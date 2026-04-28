import React from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Box } from './box';

export interface ScreenContainerProps extends ScrollViewProps {
  /** NativeWind className for additional styling on the inner container */
  className?: string;
  children: React.ReactNode;
}

/**
 * ScreenContainer — Consistent page-level layout wrapper.
 *
 * Provides the shared layout structure for every screen:
 * - Full-bleed paper background
 * - Max-width content column (640px) for desktop readability
 * - Standardized horizontal padding (24px)
 * - Standardized vertical padding (64px top, 64px bottom)
 * - ScrollView with bounce
 *
 * Swiss design rationale:
 * - Max-width prevents line lengths >80ch on desktop
 * - Consistent padding eliminates screen-to-screen jank
 * - Flush-left alignment within the constrained column
 *
 * @example
 * ```tsx
 * <ScreenContainer>
 *   <Text variant="h1">Page Title</Text>
 *   <Divider />
 *   <Text variant="body">Content</Text>
 * </ScreenContainer>
 * ```
 */
export function ScreenContainer({ className, children, ...scrollProps }: ScreenContainerProps) {
  const insets = React.useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };

  return (
    <ScrollView
      className="flex-1 bg-paper"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      {...scrollProps}
    >
      <Box
        className={`px-6 pb-16 w-full max-w-2xl ${className ?? ''}`}
        style={{ paddingTop: Math.max(insets.top, 64) }}
      >
        {children}
      </Box>
    </ScrollView>
  );
}
