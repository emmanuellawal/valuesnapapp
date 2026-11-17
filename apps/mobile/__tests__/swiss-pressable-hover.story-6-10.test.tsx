import React from 'react';
import { act, create } from 'react-test-renderer';

import { SwissPressable } from '@/components/primitives/swiss-pressable';

function flattenStyle(style: unknown): Record<string, unknown> {
  if (!Array.isArray(style)) {
    return (style ?? {}) as Record<string, unknown>;
  }
  return style.reduce(
    (acc, curr) => ({ ...acc, ...(curr as Record<string, unknown>) }),
    {},
  );
}

function getStyleCallback() {
  let renderer: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <SwissPressable accessibilityLabel="Test pressable">
        <></>
      </SwissPressable>,
    );
  });
  // SwissPressable forwards accessibilityLabel to the underlying react-native
  // Pressable, so multiple tree nodes match { accessibilityLabel }. Only the
  // actual Pressable host-wrapper receives our style-callback function
  // (the outer SwissPressable composite's own `style` prop is undefined
  // since the test doesn't pass one in).
  const matches = renderer!.root.findAllByProps({ accessibilityLabel: 'Test pressable' });
  const pressable = matches.find((node) => typeof node.props.style === 'function');
  if (!pressable) {
    throw new Error('Could not find the Pressable node carrying the style callback');
  }
  return pressable.props.style as (state: Record<string, unknown>) => unknown;
}

describe('SwissPressable hover state (Story 6.10 AC #9)', () => {
  it('includes a NativeWind web hover class for the real exported browser surface', () => {
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <SwissPressable accessibilityLabel="Hover target">
          <></>
        </SwissPressable>,
      );
    });

    const pressable = renderer!.root
      .findAllByProps({ accessibilityLabel: 'Hover target' })
      .find((node) => typeof node.props.style === 'function')!;

    expect(pressable.props.className).toContain('hover:opacity-[0.85]');
  });

  it('applies opacity 0.85 when hovered and not pressed', () => {
    const styleFn = getStyleCallback();
    const style = flattenStyle(styleFn({ pressed: false, hovered: true }));

    expect(style.opacity).toBe(0.85);
  });

  it('gives pressed precedence over hovered (opacity 0.6)', () => {
    const styleFn = getStyleCallback();
    const style = flattenStyle(styleFn({ pressed: true, hovered: true }));

    expect(style.opacity).toBe(0.6);
  });

  it('defaults to opacity 1 when neither pressed nor hovered', () => {
    const styleFn = getStyleCallback();
    const style = flattenStyle(styleFn({ pressed: false, hovered: false }));

    expect(style.opacity).toBe(1);
  });

  it('treats hovered as false (no-op) when the style callback omits it (native platforms)', () => {
    const styleFn = getStyleCallback();
    const style = flattenStyle(styleFn({ pressed: false }));

    expect(style.opacity).toBe(1);
  });

  it('does not apply the scale transform on hover alone (opacity-only per DESIGN-PHILOSOPHY.md#L339-340)', () => {
    const styleFn = getStyleCallback();
    const style = flattenStyle(styleFn({ pressed: false, hovered: true }));

    expect(style.transform).toBeUndefined();
  });
});
