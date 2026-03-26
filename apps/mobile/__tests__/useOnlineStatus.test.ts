/**
 * Tests for getInitialOnlineStatus pure helper
 * Story 3.5, AC5
 */

import React from 'react';
import { act, create } from 'react-test-renderer';

import { getInitialOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';

describe('getInitialOnlineStatus', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('returns true when navigator.onLine is true', () => {
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });
    expect(getInitialOnlineStatus()).toBe(true);
  });

  it('returns false when navigator.onLine is false', () => {
    Object.defineProperty(global, 'navigator', {
      value: { onLine: false },
      writable: true,
      configurable: true,
    });
    expect(getInitialOnlineStatus()).toBe(false);
  });

  it('returns true (safe default) when navigator is undefined', () => {
    Object.defineProperty(global, 'navigator', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(getInitialOnlineStatus()).toBe(true);
  });
});

describe('useOnlineStatus', () => {
  const originalNavigator = global.navigator;
  const originalWindow = global.window;

  function TestComponent() {
    useOnlineStatus();
    return null;
  }

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  it('does not subscribe to browser events when window lacks DOM event APIs', () => {
    Object.defineProperty(global, 'navigator', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(global, 'window', {
      value: {},
      writable: true,
      configurable: true,
    });

    expect(() => {
      act(() => {
        const renderer = create(React.createElement(TestComponent));
        renderer.unmount();
      });
    }).not.toThrow();
  });
});
