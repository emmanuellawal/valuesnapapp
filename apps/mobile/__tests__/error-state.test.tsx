import React from 'react';
import { Platform } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn().mockResolvedValue({ type: 'opened' }),
}));

import * as WebBrowser from 'expo-web-browser';
import { ErrorState } from '@/components/molecules/error-state';
import { ConfidenceWarning } from '@/components/molecules/confidence-warning';

const mockOpenBrowser = WebBrowser.openBrowserAsync as jest.Mock;

describe('ErrorState fallback link onPress (Story 5.5-9)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
  });

  it('opens the fallback URL via WebBrowser.openBrowserAsync on native', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ErrorState
          errorType="AI_IDENTIFICATION_FAILED"
          fallbackLink={{
            text: 'Search eBay manually',
            href: 'https://www.ebay.com/sch/',
          }}
        />,
      );
    });

    const link = renderer!.root.findByProps({ accessibilityRole: 'link' });

    await act(async () => {
      link.props.onPress();
      await Promise.resolve();
    });

    expect(mockOpenBrowser).toHaveBeenCalledWith('https://www.ebay.com/sch/');
  });

  it('opens the fallback URL with window.open on web', async () => {
    Platform.OS = 'web';
    const originalWindow = globalThis.window;
    const openSpy = jest.fn();
    Object.defineProperty(globalThis, 'window', {
      value: { ...(originalWindow ?? {}), open: openSpy },
      configurable: true,
    });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ErrorState
          errorType="AI_IDENTIFICATION_FAILED"
          fallbackLink={{
            text: 'Search eBay manually',
            href: 'https://www.ebay.com/sch/',
          }}
        />,
      );
    });

    const link = renderer!.root.findByProps({ accessibilityRole: 'link' });

    await act(async () => {
      link.props.onPress();
      await Promise.resolve();
    });

    expect(openSpy).toHaveBeenCalledWith(
      'https://www.ebay.com/sch/',
      '_blank',
      'noopener,noreferrer',
    );
    expect(mockOpenBrowser).not.toHaveBeenCalled();

    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
    });
  });

  it('does not surface an unhandled rejection when openBrowserAsync rejects', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockOpenBrowser.mockRejectedValueOnce(new Error('User cancelled'));

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ErrorState
          errorType="GENERIC_ERROR"
          fallbackLink={{
            text: 'Search eBay manually',
            href: 'https://www.ebay.com/sch/',
          }}
        />,
      );
    });

    const link = renderer!.root.findByProps({ accessibilityRole: 'link' });

    await act(async () => {
      link.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(warnSpy).toHaveBeenCalledWith('openUrl failed:', expect.any(Error));
    warnSpy.mockRestore();
  });
});

describe('ConfidenceWarning Verify on eBay onPress (Story 5.5-9)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
  });

  it('opens the eBay search URL via WebBrowser.openBrowserAsync on native', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        <ConfidenceWarning
          confidence="LOW"
          itemType="headphones"
          brand="Apple"
          model="AirPods Max"
        />,
      );
    });

    const link = renderer!.root.findByProps({ accessibilityRole: 'link' });

    await act(async () => {
      link.props.onPress();
      await Promise.resolve();
    });

    expect(mockOpenBrowser).toHaveBeenCalledTimes(1);
    expect(mockOpenBrowser.mock.calls[0][0]).toMatch(/^https:\/\/www\.ebay\.com\/sch\//);
    expect(mockOpenBrowser.mock.calls[0][0]).toMatch(/Apple\+AirPods\+Max\+headphones|Apple%20AirPods%20Max%20headphones/);
  });

  it('renders nothing when confidence is HIGH', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ConfidenceWarning confidence="HIGH" itemType="headphones" />);
    });

    expect(renderer!.toJSON()).toBeNull();
  });
});
