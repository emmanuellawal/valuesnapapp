import React from 'react';
import { Box, BoxProps } from './box';

/** Valid gap values matching NativeWind spacing scale (4px base) */
export type GapValue = 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16;

/**
 * StackProps interface for flexbox layout with gap spacing.
 * Extends BoxProps for consistent className and View prop support.
 */
export interface StackProps extends BoxProps {
  /** Stack direction: 'vertical' (default) or 'horizontal' */
  direction?: 'vertical' | 'horizontal';
  /** Gap spacing between children (1-16, default: 4 = 16px) */
  gap?: GapValue;
}

/**
 * Maps gap prop value to NativeWind gap class.
 * Uses 4px base spacing scale: gap-1 = 4px, gap-4 = 16px, etc.
 */
const gapClassMap: Record<GapValue, string> = {
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
  12: 'gap-12',
  16: 'gap-16',
};

/**
 * Validates and clamps gap value to valid range, defaults to 4.
 * Warns in dev mode if invalid gap value is provided.
 */
function getValidGap(gap: number | undefined): GapValue {
  if (gap === undefined) return 4;
  const validGaps: GapValue[] = [1, 2, 3, 4, 6, 8, 12, 16];
  if (validGaps.includes(gap as GapValue)) return gap as GapValue;
  
  // Clamp to nearest valid value
  let clampedGap: GapValue;
  if (gap < 1) {
    clampedGap = 1;
  } else if (gap > 16) {
    clampedGap = 16;
  } else {
    // Find closest valid gap
    clampedGap = validGaps.reduce((prev, curr) =>
      Math.abs(curr - gap) < Math.abs(prev - gap) ? curr : prev
    );
  }
  
  // Warn in dev mode about invalid gap values
  if (__DEV__) {
    console.warn(
      `Stack: Invalid gap value ${gap}. Valid values are: 1, 2, 3, 4, 6, 8, 12, 16. ` +
      `Using clamped value: ${clampedGap}`
    );
  }
  
  return clampedGap;
}

/**
 * Stack - Flexbox layout component with gap spacing.
 *
 * Provides vertical or horizontal layouts with configurable gap spacing
 * between children. Built on Box primitive for consistent styling.
 *
 * @example
 * ```tsx
 * // Vertical stack with defaults (direction="vertical", gap={4})
 * <Stack>
 *   <Text>Item 1</Text>
 *   <Text>Item 2</Text>
 * </Stack>
 *
 * // Explicit vertical stack
 * <Stack direction="vertical" gap={4}>
 *   <Text>Item 1</Text>
 *   <Text>Item 2</Text>
 * </Stack>
 *
 * // Horizontal stack
 * <Stack direction="horizontal" gap={2}>
 *   <Box>...</Box>
 *   <Box>...</Box>
 * </Stack>
 * ```
 *
 * @see Story 0.3: Create Primitive Components
 */
export function Stack({
  direction = 'vertical',
  gap,
  className,
  children,
  ...props
}: StackProps) {
  const validGap = getValidGap(gap);
  const directionClass = direction === 'horizontal' ? 'flex-row' : 'flex-col';
  const gapClass = gapClassMap[validGap];

  // Combine direction, gap, and any additional className
  const combinedClassName = [directionClass, gapClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <Box className={combinedClassName} {...props}>
      {children}
    </Box>
  );
}

export default Stack;

