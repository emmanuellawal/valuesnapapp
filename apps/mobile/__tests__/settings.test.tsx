import React from 'react';
import { Linking } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useFocusEffect: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '2.0.0' } },
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

import SettingsScreen from '../app/(tabs)/settings';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTheme,
  saveTheme,
  getNotifications,
  saveNotifications,
  getCurrency,
  saveCurrency,
} from '@/lib/preferences';

const mockRouter = router as jest.Mocked<typeof router>;
const mockUseAuth = useAuth as jest.Mock;
const mockUseFocusEffect = useFocusEffect as jest.Mock;
const mockGetTheme = getTheme as jest.MockedFunction<typeof getTheme>;
const mockSaveTheme = saveTheme as jest.MockedFunction<typeof saveTheme>;
const mockGetNotifications = getNotifications as jest.MockedFunction<typeof getNotifications>;
const mockSaveNotifications = saveNotifications as jest.MockedFunction<typeof saveNotifications>;
const mockGetCurrency = getCurrency as jest.MockedFunction<typeof getCurrency>;
const mockSaveCurrency = saveCurrency as jest.MockedFunction<typeof saveCurrency>;

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
  let lastFocusEffect: (() => void | (() => void)) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    mockGetTheme.mockResolvedValue('system');
    mockSaveTheme.mockResolvedValue();
    mockGetNotifications.mockResolvedValue('off');
    mockSaveNotifications.mockResolvedValue();
    mockGetCurrency.mockResolvedValue('USD');
    mockSaveCurrency.mockResolvedValue();
    mockUseFocusEffect.mockImplementation((callback) => {
      lastFocusEffect = callback;
      React.useEffect(() => callback(), [callback]);
    });
  });

  afterEach(() => {
    openUrlSpy.mockRestore();
    lastFocusEffect = undefined;
  });

  async function renderScreen() {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SettingsScreen />);
    });

    await act(async () => {
      await Promise.resolve();
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

  it('loads persisted preference values when the screen gains focus', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockGetTheme.mockResolvedValue('light');
    mockGetNotifications.mockResolvedValue('on');
    mockGetCurrency.mockResolvedValue('EUR');

    const renderer = await renderScreen();

    expect(renderer.root.findByProps({ children: 'Light' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'On' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'EUR' })).toBeTruthy();
  });

  it('re-reads persisted preference values on a later focus event', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockGetTheme.mockResolvedValueOnce('system').mockResolvedValueOnce('dark');
    mockGetNotifications.mockResolvedValueOnce('off').mockResolvedValueOnce('on');
    mockGetCurrency.mockResolvedValueOnce('USD').mockResolvedValueOnce('GBP');

    const renderer = await renderScreen();

    expect(renderer.root.findByProps({ children: 'System' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'Off' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'USD' })).toBeTruthy();

    await act(async () => {
      lastFocusEffect?.();
      await Promise.resolve();
    });

    expect(renderer.root.findByProps({ children: 'Dark' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'On' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'GBP' })).toBeTruthy();
  });

  it('cycles theme and persists the next value when pressed', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    const renderer = await renderScreen();
    const themeButton = renderer.root.findByProps({ testID: 'settings-theme-button' });

    await act(async () => {
      themeButton.props.onPress();
    });

    expect(mockSaveTheme).toHaveBeenCalledWith('light');
    expect(renderer.root.findByProps({ children: 'Light' })).toBeTruthy();
  });

  it('wraps theme from dark back to system when pressed', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockGetTheme.mockResolvedValue('dark');

    const renderer = await renderScreen();
    const themeButton = renderer.root.findByProps({ testID: 'settings-theme-button' });

    await act(async () => {
      themeButton.props.onPress();
    });

    expect(mockSaveTheme).toHaveBeenCalledWith('system');
    expect(renderer.root.findByProps({ children: 'System' })).toBeTruthy();
  });

  it('toggles notifications and persists the next value when pressed', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    const renderer = await renderScreen();
    const notificationsButton = renderer.root.findByProps({
      testID: 'settings-notifications-button',
    });

    await act(async () => {
      notificationsButton.props.onPress();
    });

    expect(mockSaveNotifications).toHaveBeenCalledWith('on');
    expect(renderer.root.findByProps({ children: 'On' })).toBeTruthy();
  });

  it('cycles currency and persists the next value when pressed', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    const renderer = await renderScreen();
    const currencyButton = renderer.root.findByProps({ testID: 'settings-currency-button' });

    await act(async () => {
      currencyButton.props.onPress();
    });

    expect(mockSaveCurrency).toHaveBeenCalledWith('GBP');
    expect(renderer.root.findByProps({ children: 'GBP' })).toBeTruthy();
  });

  it('wraps currency from AUD back to USD when pressed', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockGetCurrency.mockResolvedValue('AUD');

    const renderer = await renderScreen();
    const currencyButton = renderer.root.findByProps({ testID: 'settings-currency-button' });

    await act(async () => {
      currencyButton.props.onPress();
    });

    expect(mockSaveCurrency).toHaveBeenCalledWith('USD');
    expect(renderer.root.findByProps({ children: 'USD' })).toBeTruthy();
  });

  it('describes preference cycling behavior to assistive technology', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    const renderer = await renderScreen();

    expect(renderer.root.findByProps({ testID: 'settings-theme-button' }).props.accessibilityHint).toBe(
      'Cycles between System, Light, and Dark',
    );
    expect(
      renderer.root.findByProps({ testID: 'settings-notifications-button' }).props.accessibilityHint,
    ).toBe('Toggles notifications on or off');
    expect(renderer.root.findByProps({ testID: 'settings-currency-button' }).props.accessibilityHint).toBe(
      'Cycles between USD, GBP, EUR, CAD, and AUD',
    );
  });
});
