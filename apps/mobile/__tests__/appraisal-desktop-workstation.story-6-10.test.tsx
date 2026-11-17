import React from 'react';
import { Platform } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

// Spy on the real react-native module's useWindowDimensions rather than
// jest.mock('react-native', ...) — see camera-full-bleed.story-6-9.test.tsx
// for why a wholesale factory-replace crashes jest-expo's native module
// registration. Platform.OS is a plain mutable property (react-native's
// Platform.ios.js: `OS: 'ios'`), so it's set/restored directly.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ReactNative = require('react-native');
const mockUseWindowDimensions = jest.spyOn(ReactNative, 'useWindowDimensions');

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/localHistory', () => ({
  getLocalHistory: jest.fn(),
  deleteFromLocalHistory: jest.fn(),
}));

import AppraisalReportScreen from '@/app/appraisal';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getLocalHistory } from '@/lib/localHistory';
import { ValuationStatus } from '@/types/valuation';

const mockUseAuth = useAuth as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;
const mockGetLocalHistory = getLocalHistory as jest.Mock;

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
const originalPlatformOS = Platform.OS;

function guestAuth() {
  return { session: null, user: null, accessToken: null, isGuest: true, isLoading: false, signOut: jest.fn() };
}

function makeDetailValuation() {
  return {
    id: 'valuation-1',
    createdAt: '2026-03-27T10:00:00.000Z',
    status: ValuationStatus.SUCCESS,
    request: {},
    response: {
      itemDetails: {
        itemType: 'camera',
        brand: 'Canon',
        model: 'AE-1',
        visualCondition: 'used_good',
        conditionDetails: '',
        estimatedAge: 'unknown',
        categoryHint: 'Cameras',
        searchKeywords: ['canon', 'camera'],
        identifiers: { upc: null, modelNumber: null, serialNumber: null },
      },
      marketData: {
        status: 'success',
        keywords: 'Canon AE-1',
        totalFound: 10,
        pricesAnalyzed: 10,
        priceRange: { min: 100, max: 150 },
        confidence: 'HIGH',
      },
    },
    imageUri: 'file://photo.jpg',
  };
}

async function renderScreen() {
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(<AppraisalReportScreen />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  return renderer!;
}

function findRailItem(renderer: ReactTestRenderer, accessibilityLabel: string) {
  const item = renderer.root
    .findAllByProps({ accessibilityLabel })
    .find(
      (node) =>
        typeof node.props.className === 'string' &&
        node.props.className.includes('border-l-2'),
    );
  if (!item) {
    throw new Error(`Could not find rail item "${accessibilityLabel}"`);
  }
  return item;
}

describe('AppraisalReportScreen — desktop workstation (Story 6.10 AC #1, #3, #8)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseAuth.mockReturnValue(guestAuth());
  });

  afterEach(() => {
    Platform.OS = originalPlatformOS;
  });

  describe('main branch (no id param)', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({
        brand: 'Canon',
        model: 'AE-1',
        itemType: 'camera',
        fairMarketValue: '249',
        priceMin: '199',
        priceMax: '299',
        confidence: 'HIGH',
        pricesAnalyzed: '24',
      });
    });

    it('renders the workstation at desktop width on web', async () => {
      Platform.OS = 'web';
      mockUseWindowDimensions.mockReturnValue({ width: 1440, height: 900, scale: 1, fontScale: 1 });

      const renderer = await renderScreen();

      expect(renderer.root.findByProps({ testID: 'appraisal-workstation' })).toBeTruthy();
      expect(renderer.root.findByProps({ testID: 'appraisal-image-pane' })).toBeTruthy();
      expect(renderer.root.findByProps({ testID: 'appraisal-data-pane' })).toBeTruthy();
      expect(renderer.root.findAllByProps({ testID: 'screen-container' })).toHaveLength(0);

      // ValuationCard's testID lives inside the image pane, not the data pane.
      const imagePane = renderer.root.findByProps({ testID: 'appraisal-image-pane' });
      expect(imagePane.findByProps({ testID: 'appraisal-valuation' })).toBeTruthy();

      for (const label of ['Camera', 'History', 'Settings']) {
        expect(renderer.root.findAllByProps({ accessibilityLabel: label }).length).toBeGreaterThan(0);
      }

      expect(findRailItem(renderer, 'Camera').props.className).toContain('border-ink');
      expect(findRailItem(renderer, 'History').props.className).toContain('border-transparent');
      expect(findRailItem(renderer, 'Settings').props.className).toContain('border-transparent');
    });

    it('keeps the single-column ScreenContainer layout below desktop width', async () => {
      Platform.OS = 'web';
      mockUseWindowDimensions.mockReturnValue({ width: 375, height: 800, scale: 1, fontScale: 1 });

      const renderer = await renderScreen();

      expect(renderer.root.findByProps({ testID: 'screen-container' })).toBeTruthy();
      expect(renderer.root.findAllByProps({ testID: 'appraisal-workstation' })).toHaveLength(0);
    });

    it('does not render the workstation on a native platform even at desktop width (iPad Pro landscape guard)', async () => {
      Platform.OS = 'ios';
      mockUseWindowDimensions.mockReturnValue({ width: 1200, height: 900, scale: 1, fontScale: 1 });

      const renderer = await renderScreen();

      expect(renderer.root.findByProps({ testID: 'screen-container' })).toBeTruthy();
      expect(renderer.root.findAllByProps({ testID: 'appraisal-workstation' })).toHaveLength(0);
    });
  });

  describe('detail-view branch (id param present)', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({ id: 'valuation-1' });
      mockGetLocalHistory.mockResolvedValue([makeDetailValuation()]);
    });

    it('renders the workstation at desktop width on web, with ValuationCard in the image pane', async () => {
      Platform.OS = 'web';
      mockUseWindowDimensions.mockReturnValue({ width: 1440, height: 900, scale: 1, fontScale: 1 });

      const renderer = await renderScreen();

      expect(renderer.root.findByProps({ testID: 'appraisal-workstation' })).toBeTruthy();
      expect(renderer.root.findByProps({ testID: 'appraisal-image-pane' })).toBeTruthy();
      expect(renderer.root.findByProps({ testID: 'appraisal-data-pane' })).toBeTruthy();
      expect(renderer.root.findAllByProps({ testID: 'screen-container' })).toHaveLength(0);

      const imagePane = renderer.root.findByProps({ testID: 'appraisal-image-pane' });
      expect(imagePane.findByProps({ testID: 'detail-valuation' })).toBeTruthy();

      expect(renderer.root.findByProps({ testID: 'appraisal-data-pane' })).toBeTruthy();
    });

    it('keeps the single-column ScreenContainer layout below desktop width', async () => {
      Platform.OS = 'web';
      mockUseWindowDimensions.mockReturnValue({ width: 375, height: 800, scale: 1, fontScale: 1 });

      const renderer = await renderScreen();

      expect(renderer.root.findByProps({ testID: 'screen-container' })).toBeTruthy();
      expect(renderer.root.findAllByProps({ testID: 'appraisal-workstation' })).toHaveLength(0);
    });
  });
});
