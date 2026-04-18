import React from 'react';
import { Linking } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '2.0.0' } },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

import SettingsScreen from '../app/(tabs)/settings';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

const mockRouter = router as jest.Mocked<typeof router>;
const mockUseAuth = useAuth as jest.Mock;

function authenticatedAuth(overrides = {}) {
  return {
    session: {
      access_token: 'token',
      user: {
        id: 'user-123',
        email: 'user@example.com',
        app_metadata: { provider: 'email' },
        user_metadata: {},
        created_at: '2026-03-27T00:00:00.000Z',
      },
    },
    user: {
      id: 'user-123',
      email: 'user@example.com',
      createdAt: '2026-03-27T00:00:00.000Z',
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

describe('SettingsScreen — Story 4.8', () => {
  let openUrlSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    openUrlSpy.mockRestore();
  });

  async function renderScreen() {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SettingsScreen />);
    });

    return renderer!;
  }

  it('renders guest account CTAs and hides authenticated-only actions', async () => {
    mockUseAuth.mockReturnValue(guestAuth());

    const renderer = await renderScreen();

    expect(renderer.root.findByProps({ children: 'Not signed in' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'settings-create-account-button' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'settings-sign-in-button' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'settings-signout-button' })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'settings-delete-account-button' })).toHaveLength(0);
  });

  it('navigates guests to register and sign-in from the account CTA rows', async () => {
    mockUseAuth.mockReturnValue(guestAuth());

    const renderer = await renderScreen();
    const createAccountButton = renderer.root.findByProps({ testID: 'settings-create-account-button' });
    const signInButton = renderer.root.findByProps({ testID: 'settings-sign-in-button' });

    await act(async () => {
      createAccountButton.props.onPress();
      signInButton.props.onPress();
    });

    expect(mockRouter.push).toHaveBeenNthCalledWith(1, '/auth/register');
    expect(mockRouter.push).toHaveBeenNthCalledWith(2, '/auth/sign-in');
  });

  it('shows authenticated account info including email and email sign-in method', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    const renderer = await renderScreen();
    const signInMethodRow = renderer.root.findByProps({ testID: 'settings-sign-in-method' });

    expect(renderer.root.findByProps({ children: 'user@example.com' })).toBeTruthy();
    expect(signInMethodRow).toBeTruthy();
    expect(signInMethodRow.findByProps({ children: 'Email' })).toBeTruthy();
  });

  it('shows Google when the auth provider is google', async () => {
    mockUseAuth.mockReturnValue(
      authenticatedAuth({
        session: {
          access_token: 'token',
          user: {
            id: 'user-123',
            email: 'user@example.com',
            app_metadata: { provider: 'google' },
            user_metadata: {},
            created_at: '2026-03-27T00:00:00.000Z',
          },
        },
      }),
    );

    const renderer = await renderScreen();

    expect(renderer.root.findByProps({ children: 'Google' })).toBeTruthy();
  });

  it('navigates to delete account confirmation', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    const renderer = await renderScreen();
    const deleteButton = renderer.root.findByProps({ testID: 'settings-delete-account-button' });

    await act(async () => {
      deleteButton.props.onPress();
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/account/delete-confirm');
  });

  it('opens help and support mailto link', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    const renderer = await renderScreen();
    const helpButton = renderer.root.findByProps({ testID: 'settings-help-button' });

    await act(async () => {
      helpButton.props.onPress();
    });

    expect(openUrlSpy).toHaveBeenCalledWith('mailto:support@valuesnap.app');
  });

  it('shows the dynamic app version from expo constants', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    const renderer = await renderScreen();
    const versionRow = renderer.root.findByProps({ testID: 'settings-version' });

    expect(versionRow).toBeTruthy();
    expect(renderer.root.findByProps({ children: '2.0.0' })).toBeTruthy();
  });

  it('renders sign-in method and version rows as non-interactive boxes', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    const renderer = await renderScreen();
    const signInMethodRow = renderer.root.findByProps({ testID: 'settings-sign-in-method' });
    const versionRow = renderer.root.findByProps({ testID: 'settings-version' });

    expect(signInMethodRow.props.onPress).toBeUndefined();
    expect(versionRow.props.onPress).toBeUndefined();
  });
});
