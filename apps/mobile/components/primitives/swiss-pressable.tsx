import React, { useState, useCallback } from 'react';
import {
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  ViewStyle,
  NativeSyntheticEvent,
  TargetedEvent,
} from 'react-native';

/**
 * SwissPressableProps interface for accessible button/pressable.
 * accessibilityLabel is REQUIRED for WCAG compliance.
 */
export interface SwissPressableProps extends Omit<PressableProps, 'accessibilityLabel'> {
  /** REQUIRED: Accessibility label for screen readers (WCAG compliance) */
  accessibilityLabel: string;
  /** Whether the button is disabled (opacity: 0.4) */
  disabled?: boolean;
  /** NativeWind className for styling */
  className?: string;
}

/**
 * Swiss-compliant opacity values for interaction states.
 * - Normal: 1.0 (full opacity)
 * - Hover: No change (Swiss is minimalist - hover implicit through cursor)
 * - Pressed: 0.6 (temporary feedback)
 * - Disabled: 0.4 (permanent visual indicator)
 */
const OPACITY_PRESSED = 0.6;
const OPACITY_DISABLED = 0.4;

/**
 * Focus indicator style (2px solid black border).
 * Uses border instead of outline for React Native Web compatibility.
 */
const FOCUS_STYLE: ViewStyle = {
  borderWidth: 2,
  borderColor: '#000000',
};

/**
 * SwissPressable - Accessible button/pressable with Swiss interaction states.
 *
 * Implements Swiss Minimalist design patterns for interaction feedback:
 * - No hover effect (minimalist - cursor change is implicit)
 * - Pressed: opacity 0.6 (temporary feedback)
 * - Disabled: opacity 0.4 (permanent visual indicator)
 * - Focus: 2px solid black border (accessible, visible, no glow)
 *
 * NEVER uses outlines (not supported consistently in React Native Web).
 *
 * @example
 * ```tsx
 * <SwissPressable
 *   onPress={() => console.log('pressed')}
 *   accessibilityLabel="Submit valuation"
 *   disabled={false}
 * >
 *   <Text variant="body">Submit</Text>
 * </SwissPressable>
 * ```
 *
 * @see Story 0.3: Create Primitive Components
 * @see docs/SWISS-MINIMALIST.md - Interaction Patterns
 */
export function SwissPressable({
  accessibilityLabel,
  disabled = false,
  className,
  children,
  style,
  onFocus,
  onBlur,
  ...props
}: SwissPressableProps) {
  const [isFocused, setIsFocused] = useState(false);

  // Note: accessibilityLabel is enforced by TypeScript as required prop.
  // Runtime check removed as it's redundant - TypeScript prevents compilation without it.

  const handleFocus = useCallback(
    (e: NativeSyntheticEvent<TargetedEvent>) => {
      setIsFocused(true);
      onFocus?.(e);
    },
    [onFocus]
  );

  const handleBlur = useCallback(
    (e: NativeSyntheticEvent<TargetedEvent>) => {
      setIsFocused(false);
      onBlur?.(e);
    },
    [onBlur]
  );

  return (
    <Pressable
      className={className}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={(state: PressableStateCallbackType) => {
        const { pressed } = state;
        // Base styles from style prop
        const baseStyles: StyleProp<ViewStyle> =
          typeof style === 'function' ? style(state) : style;

        // Calculate opacity based on state
        let opacity = 1;
        if (disabled) {
          opacity = OPACITY_DISABLED;
        } else if (pressed) {
          opacity = OPACITY_PRESSED;
        }

        // Combine all styles
        return [
          baseStyles,
          { opacity },
          isFocused && FOCUS_STYLE,
        ];
      }}
      {...props}
    >
      {children}
    </Pressable>
  );
}

export default SwissPressable;

