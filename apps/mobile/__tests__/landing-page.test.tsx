import React from 'react';
import { Platform } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

jest.mock('expo-router', () => {
  const ReactLocal = require('react');

  return {
    useRouter: jest.fn(),
    Redirect: (props: any) => ReactLocal.createElement('RedirectMock', props),
  };
});

jest.mock('expo-router/head', () => {
  const ReactLocal = require('react');

  return ({ children }: { children: React.ReactNode }) =>
    ReactLocal.createElement(ReactLocal.Fragment, null, children);
});

import { useRouter } from 'expo-router';
import LandingPage from '@/app/index';

const mockUseRouter = useRouter as jest.Mock;

describe('Landing page route', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: jest.fn(), replace: jest.fn(), back: jest.fn() });
  });

  afterEach(() => {
    Platform.OS = originalPlatform;
  });

  async function renderScreen() {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<LandingPage />);
    });

    return renderer!;
  }

  it('redirects native platforms to /camera', async () => {
    Platform.OS = 'android';

    const renderer = await renderScreen();
    const redirect = renderer.root.findByType('RedirectMock');

    expect(redirect.props.href).toBe('/camera');
    expect(renderer.root.findAllByProps({ children: 'Photo → Value → List' })).toHaveLength(0);
  });

  it('renders landing hero copy on web', async () => {
    Platform.OS = 'web';

    const renderer = await renderScreen();

    expect(renderer.root.findByProps({ children: 'Photo → Value → List' })).toBeTruthy();
  });

  it('navigates to /camera when the CTA is pressed on web', async () => {
    Platform.OS = 'web';
    const push = jest.fn();
    mockUseRouter.mockReturnValue({ push, replace: jest.fn(), back: jest.fn() });

    const renderer = await renderScreen();
    const cta = renderer.root.findByProps({ accessibilityLabel: 'Start valuing items' });

    await act(async () => {
      cta.props.onPress();
    });

    expect(push).toHaveBeenCalledWith('/camera');
  });
});