import React from 'react';
import { View, ViewProps } from 'react-native';

/**
 * BoxProps interface extending ViewProps with className support for NativeWind.
 * Box is the foundational layout primitive - all other primitives build upon it.
 */
export interface BoxProps extends ViewProps {
  /** NativeWind className for styling (bg-paper, p-4, etc.) */
  className?: string;
}

/**
 * Box - Low-level layout wrapper component.
 *
 * Replaces raw View usage throughout the app, providing consistent
 * className support for NativeWind styling.
 *
 * @example
 * ```tsx
 * <Box className="bg-paper p-4">
 *   <Text>Content</Text>
 * </Box>
 * ```
 *
 * @see Story 0.3: Create Primitive Components
 */
export function Box({ className, children, ...props }: BoxProps) {
  return (
    <View className={className} {...props}>
      {children}
    </View>
  );
}

