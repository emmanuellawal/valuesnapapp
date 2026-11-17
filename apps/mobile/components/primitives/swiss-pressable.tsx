import React, { useState, useCallback } from 'react';
import {
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  View,
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
const OPACITY_HOVERED = 0.85;

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

export const SwissPressable = React.forwardRef<View, SwissPressableProps>(function SwissPressable({
    accessibilityLabel,
    accessibilityRole = 'button',
    disabled = false,
    className,
    children,
    style,
    onFocus,
    onBlur,
    accessibilityState,
    ...props
  }, ref) {
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

  const mergedAccessibilityState = disabled
    ? { ...accessibilityState, disabled: true }
    : accessibilityState;

  return (
    <Pressable
      ref={ref}
      className={`${className ?? ''} hover:opacity-[0.85] active:!opacity-60 disabled:!opacity-40`}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={mergedAccessibilityState}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={(state: PressableStateCallbackType) => {
        const { pressed } = state;
        // react-native-web's Pressable passes { pressed, focused, hovered }
        // to the style callback on web (node_modules/react-native-web/dist/exports/Pressable/index.js:81-85);
        // core PressableStateCallbackType only types `pressed`, so cast
        // explicitly. On native, `hovered` is never set (stays undefined),
        // making this branch a no-op there.
        const hovered = Boolean(
          (state as PressableStateCallbackType & { hovered?: boolean }).hovered,
        );
        const baseStyles: StyleProp<ViewStyle> =
          typeof style === 'function' ? style(state) : style;

        let opacity = 1;
        if (disabled) {
          opacity = OPACITY_DISABLED;
        } else if (pressed) {
          opacity = OPACITY_PRESSED;
        } else if (hovered) {
          opacity = OPACITY_HOVERED;
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
});

SwissPressable.displayName = 'SwissPressable';

export default SwissPressable;
