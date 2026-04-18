import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import SettingsScreen from '../app/(tabs)/settings';
import { useAuth } from '@/contexts/AuthContext';

// ─── Typed mock accessors ─────────────────────────────────────────────────────

const mockUseAuth = useAuth as jest.Mock;

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
