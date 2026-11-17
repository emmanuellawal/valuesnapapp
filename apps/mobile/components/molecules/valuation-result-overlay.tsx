import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { Box, Stack, SwissPressable, Text } from '@/components/primitives';
import { ValuationCard } from './valuation-card';
import type { ItemDetails } from '@/types/item';
import type { MarketData } from '@/types/market';

export interface ValuationResultOverlayProps {
  item: ItemDetails;
  market: MarketData;
  imageUri: string;
  onViewReport: () => void;
  onDismiss: () => void;
}

/** Swiss motion token — 150ms linear. [Source: docs/ux-design-specification.md#L725-733] */
const MOTION_DURATION_MS = 150;

/** Fraction of overlay height a downward drag must cross to commit a dismiss. */
const DISMISS_DRAG_THRESHOLD = 0.25;
/** Fast downward flick velocity (px/ms) that commits a dismiss regardless of distance. */
const DISMISS_VELOCITY_THRESHOLD = 1.5;
/** Keep the card off-screen until its real height and motion preference are known. */
const INITIAL_OFFSCREEN_TRANSLATE_Y = 10_000;

const WEB_FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function shouldDismissOverlayGesture(
  dy: number,
  vy: number,
  overlayHeight: number,
): boolean {
  return (
    dy > overlayHeight * DISMISS_DRAG_THRESHOLD ||
    vy > DISMISS_VELOCITY_THRESHOLD
  );
}

export function getWebFocusWrapTarget<T>(
  focusable: T[],
  active: T | null,
  shiftKey: boolean,
  activeInside: boolean,
): T | null {
  if (focusable.length === 0) return null;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (shiftKey && (active === first || !activeInside)) return last;
  if (!shiftKey && (active === last || !activeInside)) return first;
  return null;
}

/**
 * ValuationResultOverlay — Result Card Overlay (Camera Flow)
 *
 * Slides up from the bottom over the camera surface after a successful
 * appraisal. Backed by a 50% black scrim; dismissible by tapping the scrim
 * or swiping down. This is the single sanctioned exception to the "no slide
 * animations" rule in the Swiss motion system.
 *
 * [Source: docs/ux-design-specification.md#L2246-2252, #L2216]
 *
 * Accessibility: native sibling content is hidden by the parent while this
 * modal is open; accessibilityViewIsModal adds iOS modal semantics. On web,
 * Tab/Shift+Tab cycle within this overlay and Escape dismisses it.
 */
export function ValuationResultOverlay({
  item,
  market,
  imageUri,
  onViewReport,
  onDismiss,
}: ValuationResultOverlayProps) {
  const { height: viewportHeight } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(INITIAL_OFFSCREEN_TRANSLATE_Y)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const overlayRef = useRef<View>(null);
  const firstActionRef = useRef<View>(null);
  const overlayHeightRef = useRef(0);
  const reduceMotionRef = useRef<boolean | null>(null);
  const hasMeasuredRef = useRef(false);
  const entranceStartedRef = useRef(false);
  const isDismissingRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        reduceMotionRef.current = enabled;
        setReduceMotion(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      reduceMotionRef.current = enabled;
      setReduceMotion(enabled);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const runTiming = useCallback((
    toValue: number,
    onComplete?: () => void,
    onInterrupted?: () => void,
  ) => {
    Animated.timing(translateY, {
      toValue,
      duration: reduceMotionRef.current ? 0 : MOTION_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onComplete?.();
      } else {
        onInterrupted?.();
      }
    });
  }, [translateY]);

  const animateOutAndDismiss = useCallback(() => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;
    runTiming(
      overlayHeightRef.current || viewportHeight,
      onDismiss,
      () => {
        isDismissingRef.current = false;
      },
    );
  }, [onDismiss, runTiming, viewportHeight]);

  const animateOutAndDismissRef = useRef(animateOutAndDismiss);
  animateOutAndDismissRef.current = animateOutAndDismiss;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    overlayHeightRef.current = height;

    if (!hasMeasuredRef.current) {
      hasMeasuredRef.current = true;
      translateY.setValue(height);
      if (reduceMotionRef.current !== null) {
        entranceStartedRef.current = true;
        runTiming(0);
      }
    }
  };

  // If layout wins the race with the asynchronous OS preference lookup, keep
  // the card off-screen and start only after the preference is known.
  useEffect(() => {
    if (
      reduceMotion === null ||
      !hasMeasuredRef.current ||
      entranceStartedRef.current
    ) {
      return;
    }

    entranceStartedRef.current = true;
    translateY.setValue(reduceMotion ? 0 : overlayHeightRef.current);
    runTiming(0);
  }, [reduceMotion, runTiming, translateY]);

  // Move initial focus into the modal. Web focus cycling is handled below;
  // native screen-reader focus targets the first action.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (Platform.OS === 'web') {
        const element = overlayRef.current as unknown as HTMLElement | null;
        if (typeof element?.querySelector === 'function') {
          element.querySelector<HTMLElement>(WEB_FOCUSABLE_SELECTOR)?.focus();
        }
      } else if (firstActionRef.current) {
        AccessibilityInfo.sendAccessibilityEvent(firstActionRef.current, 'focus');
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Escape closes the modal and Tab/Shift+Tab remain inside it on web.
  // [Source: docs/ux-design-specification.md#L2386, #L2390-2393]
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        animateOutAndDismissRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const container = overlayRef.current as unknown as HTMLElement | null;
      const focusable = container
        ? Array.from(container.querySelectorAll<HTMLElement>(WEB_FOCUSABLE_SELECTOR))
        : [];
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const active = document.activeElement;
      const target = getWebFocusWrapTarget(
        focusable,
        active as HTMLElement | null,
        event.shiftKey,
        Boolean(container?.contains(active)),
      );
      if (target) {
        event.preventDefault();
        target.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldDismiss = shouldDismissOverlayGesture(
          gestureState.dy,
          gestureState.vy,
          overlayHeightRef.current,
        );

        if (shouldDismiss) {
          animateOutAndDismissRef.current();
        } else {
          runTiming(0);
        }
      },
      onPanResponderTerminate: () => runTiming(0),
    }),
  ).current;

  const webAriaProps = Platform.OS === 'web' ? { 'aria-live': 'polite' as const } : {};
  const isCompactViewport = viewportHeight < 700;

  return (
    <View
      ref={overlayRef}
      testID="valuation-result-overlay"
      accessibilityLiveRegion="polite"
      accessibilityViewIsModal
      accessibilityRole="summary"
      className="absolute top-0 left-0 right-0 bottom-0"
      {...webAriaProps}
    >
      <Pressable
        testID="valuation-result-scrim"
        accessibilityLabel="Dismiss valuation result"
        onPress={animateOutAndDismiss}
        className="absolute top-0 left-0 right-0 bottom-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      />

      <Animated.View
        testID="valuation-result-card"
        onLayout={handleLayout}
        className="absolute left-0 right-0 bottom-0"
        style={{ transform: [{ translateY }] }}
        {...panResponder.panHandlers}
      >
        <Box
          className={`bg-paper border-t-2 border-ink ${isCompactViewport ? 'p-2' : 'p-4'}`}
          style={{ maxHeight: viewportHeight }}
        >
          <Stack gap={isCompactViewport ? 2 : 4}>
            <Box className="w-full">
              <ValuationCard
                itemDetails={item}
                marketData={market}
                imageUri={imageUri}
                onPress={onViewReport}
                compact={isCompactViewport}
              />
            </Box>
            <Stack direction="horizontal" gap={isCompactViewport ? 2 : 3}>
              <SwissPressable
                ref={firstActionRef}
                accessibilityLabel="View full appraisal report"
                onPress={onViewReport}
                className={`border border-ink bg-ink px-4 ${isCompactViewport ? 'py-2' : 'py-3'}`}
              >
                <Text variant="body" className="text-paper font-semibold">
                  View report
                </Text>
              </SwissPressable>
              <SwissPressable
                accessibilityLabel="Value another item"
                onPress={animateOutAndDismiss}
                className={`border border-divider bg-paper px-4 ${isCompactViewport ? 'py-2' : 'py-3'}`}
              >
                <Text variant="body" className="text-ink">
                  Value another
                </Text>
              </SwissPressable>
            </Stack>
          </Stack>
        </Box>
      </Animated.View>
    </View>
  );
}

export default ValuationResultOverlay;
