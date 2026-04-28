import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useFocusEffect: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/preferences', () => ({
  getTheme: jest.fn(),
  saveTheme: jest.fn(),
  getNotifications: jest.fn(),
  saveNotifications: jest.fn(),
  getCurrency: jest.fn(),
  saveCurrency: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaInsetsContext: require('react').createContext({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import SettingsScreen from '../app/(tabs)/settings';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getTheme, getNotifications, getCurrency } from '@/lib/preferences';

// ─── Typed mock accessors ─────────────────────────────────────────────────────

const mockUseAuth = useAuth as jest.Mock;
const mockUseFocusEffect = useFocusEffect as jest.Mock;
const mockGetTheme = getTheme as jest.MockedFunction<typeof getTheme>;
const mockGetNotifications = getNotifications as jest.MockedFunction<typeof getNotifications>;
const mockGetCurrency = getCurrency as jest.MockedFunction<typeof getCurrency>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authenticatedAuth(overrides = {}) {
  return {
    session: { access_token: 'token' },
    user: {
      id: '123',
      email: 'user@example.com',
      createdAt: '2026-03-26T00:00:00.000Z',
      tier: 'FREE' as const,
      preferences: {},
    },
    isGuest: false,
    isLoading: false,
    signOut: jest.fn(),
    ...overrides,
  };
}

function guestAuth() {
  return {
    session: null,
    user: null,
    isGuest: true,
    isLoading: false,
    signOut: jest.fn(),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SettingsScreen — Sign Out', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTheme.mockResolvedValue('system');
    mockGetNotifications.mockResolvedValue('off');
    mockGetCurrency.mockResolvedValue('USD');
    mockUseFocusEffect.mockImplementation((callback) => {
      React.useEffect(() => callback(), [callback]);
    });
  });

  it('renders without crashing when authenticated', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SettingsScreen />);
    });

    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('shows Sign out row when authenticated', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SettingsScreen />);
    });

    const signOutButton = renderer!.root.findByProps({
      testID: 'settings-signout-button',
    });
    expect(signOutButton).toBeTruthy();
    expect(signOutButton.props.accessibilityLabel).toBe('Sign out of your account');
  });

  it('renders Sign out as a destructive action without trailing chevron', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SettingsScreen />);
    });

    const signOutButton = renderer!.root.findByProps({
      testID: 'settings-signout-button',
    });

    // Use findAll predicate — resilient to Text primitive combining className values
    const destructiveLabels = signOutButton.findAll(
      (node) =>
        node.props?.children === 'Sign out' &&
        typeof node.props?.className === 'string' &&
        node.props.className.includes('text-signal'),
    );
    expect(destructiveLabels.length).toBeGreaterThanOrEqual(1);

    const chevrons = signOutButton.findAll((node) => node.props?.children === '›');
    expect(chevrons).toHaveLength(0);
  });

  it('does not show Sign out row when guest', async () => {
    mockUseAuth.mockReturnValue(guestAuth());

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SettingsScreen />);
    });

    const signOutButtons = renderer!.root.findAll(
      (node) => node.props?.testID === 'settings-signout-button',
    );
    expect(signOutButtons).toHaveLength(0);
  });

  it('calls signOut when Sign out row is pressed', async () => {
    const mockSignOut = jest.fn();
    mockUseAuth.mockReturnValue(authenticatedAuth({ signOut: mockSignOut }));

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SettingsScreen />);
    });

    const signOutButton = renderer!.root.findByProps({
      testID: 'settings-signout-button',
    });

    await act(async () => {
      signOutButton.props.onPress();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
