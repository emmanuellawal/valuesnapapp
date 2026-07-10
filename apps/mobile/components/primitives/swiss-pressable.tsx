import React, { useState, useCallback } from 'react';
import {
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  ViewStyle,
  NativeSyntheticEvent,
  TargetedEvent,
  Platform,
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
 */
const OPACITY_PRESSED = 0.6;
const OPACITY_DISABLED = 0.4;

const FOCUS_STYLE_WEB: ViewStyle = {
  outlineStyle: 'solid',
  outlineWidth: 2,
  outlineColor: '#000000',
  outlineOffset: 2,
};

const FOCUS_STYLE_NATIVE: ViewStyle = {
  borderWidth: 2,
  borderColor: '#000000',
};

export function SwissPressable({
  accessibilityLabel,
  disabled = false,
  className,
  children,
  style,
  onFocus,
  onBlur,
  accessibilityState,
  ...props
}: SwissPressableProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(
    (e: NativeSyntheticEvent<TargetedEvent>) => {
      setIsFocused(true);
      onFocus?.(e);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (e: NativeSyntheticEvent<TargetedEvent>) => {
      setIsFocused(false);
      onBlur?.(e);
    },
    [onBlur],
  );

  const mergedAccessibilityState = {
    ...accessibilityState,
    disabled,
  };

  return (
    <Pressable
      className={className}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={mergedAccessibilityState}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={(state: PressableStateCallbackType) => {
        const { pressed } = state;
        const baseStyles: StyleProp<ViewStyle> =
          typeof style === 'function' ? style(state) : style;

        let opacity = 1;
        if (disabled) {
          opacity = OPACITY_DISABLED;
        } else if (pressed) {
          opacity = OPACITY_PRESSED;
        }

        return [
          baseStyles,
          { opacity },
          pressed && !disabled && { transform: [{ scale: 0.98 }] },
          isFocused && (Platform.OS === 'web' ? FOCUS_STYLE_WEB : FOCUS_STYLE_NATIVE),
        ];
      }}
      {...props}
    >
      {children}
    </Pressable>
  );
}

export default SwissPressable;
