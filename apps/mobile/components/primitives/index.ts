/**
 * Primitive Components - Foundation of the Component Hierarchy
 *
 * These primitives form the base layer of the 6-layer component architecture:
 * Primitives → Atoms → Molecules → Organisms → Templates → Pages
 *
 * All future components should be built using these primitives for
 * consistent Swiss Minimalist design compliance.
 *
 * @example
 * ```tsx
 * import { Box, Stack, Text, SwissPressable } from '@/components/primitives';
 * ```
 *
 * @see Story 0.3: Create Primitive Components
 * @see docs/ux-design-specification.md - Component Architecture, UX-6
 */

export { Box } from './box';
export type { BoxProps } from './box';

export { Stack } from './stack';
export type { StackProps, GapValue } from './stack';

export { Text } from './text';
export type { TextProps, TextVariant } from './text';

export { SwissPressable } from './swiss-pressable';
export type { SwissPressableProps } from './swiss-pressable';

