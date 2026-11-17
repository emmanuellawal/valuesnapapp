import React from 'react';
import { Platform, ScrollView } from 'react-native';
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

  it('renders landing hero copy as a level-1 semantic heading on web without hardcoded hex background', async () => {
    Platform.OS = 'web';

    const renderer = await renderScreen();
    const hero = renderer.root.findByProps({ children: 'Photo → Value → List' });

    expect(hero.props.variant).toBe('display');
    expect(hero.props.accessibilityRole).toBe('header');
    expect(hero.props['aria-level']).toBe(1);

    const scrollView = renderer.root.findByType(ScrollView);
    expect(scrollView.props.className).toContain('bg-paper');
    expect(scrollView.props.style?.backgroundColor).toBeUndefined();
  });

  it('renders the estimate-honest subtitle and all three key benefits on web (AC2)', async () => {
    Platform.OS = 'web';

    const renderer = await renderScreen();

    expect(
      renderer.root.findAllByProps({
        children:
          'Photograph any item. Get an instant market price estimate. Generate a selling listing.',
      }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root.findAllByProps({ children: 'AI identifies your item from a photo' }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root.findAllByProps({
        children:
          'Live eBay market data — price estimates from active listings, not guaranteed sale prices',
      }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root.findAllByProps({ children: 'One-tap listing generation for eBay' }).length,
    ).toBeGreaterThan(0);
  });

  it('emits SEO title, description, and Open Graph head tags on web (AC6)', async () => {
    Platform.OS = 'web';

    const renderer = await renderScreen();
    const titleNode = renderer.root.findByType('title' as unknown as React.ElementType);
    const metaNodes = renderer.root.findAllByType('meta' as unknown as React.ElementType);

    expect(titleNode.props.children).toBe('ValueSnap — Photo. Value. List.');

    const descriptionMeta = metaNodes.find((node) => node.props.name === 'description');
    const ogTitleMeta = metaNodes.find((node) => node.props.property === 'og:title');
    const ogDescriptionMeta = metaNodes.find((node) => node.props.property === 'og:description');

    expect(descriptionMeta?.props.content).toBe(
      'Photograph any item. Get an instant eBay market price estimate. Generate a pre-filled selling listing in seconds.',
    );
    expect(ogTitleMeta?.props.content).toBe('ValueSnap — Photo. Value. List.');
    expect(ogDescriptionMeta?.props.content).toBe(
      'Photograph any item. Get an instant eBay market price estimate. Generate a pre-filled selling listing in seconds.',
    );
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