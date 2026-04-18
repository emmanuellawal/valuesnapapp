import React from 'react';
import { Alert } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

// ─── Hoisted mocks ─────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'exp://localhost/'),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      exchangeCodeForSession: jest.fn(),
    },
  },
}));

jest.mock('@/lib/env', () => ({
  env: { useMock: false },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    session: null,
    user: null,
    isGuest: true,
    isLoading: false,
    signOut: jest.fn(),
  })),
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────────

import SignInScreen from '../app/auth/sign-in';
import { router } from 'expo-router';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';

// ─── Typed mock accessors ───────────────────────────────────────────────────────

const mockSignInWithOAuth = supabase.auth.signInWithOAuth as jest.Mock;
const mockExchangeCodeForSession = supabase.auth.exchangeCodeForSession as jest.Mock;
const mockOpenAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('SignInScreen — Google OAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (env as { useMock: boolean }).useMock = false;
  });

  it('renders the Google OAuth button and separator', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });
    expect(googleButton).toBeTruthy();
    expect(googleButton.props.accessibilityLabel).toBe('Continue with Google');
    expect(renderer!.root.findByProps({ children: 'or' })).toBeTruthy();
  });

  it('calls signInWithOAuth and opens the auth browser when button is tapped', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth' },
      error: null,
    });
    mockOpenAuthSession.mockResolvedValue({
      type: 'success',
      url: 'exp://localhost/?code=test-auth-code',
    });
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });

    await act(async () => {
      googleButton.props.onPress();
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.any(String) },
    });
    expect(mockOpenAuthSession).toHaveBeenCalledWith(
      'https://accounts.google.com/oauth',
      'exp://localhost/',
    );
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test-auth-code');
  });

  it('navigates to /(tabs) when the OAuth browser returns success', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth' },
      error: null,
    });
    mockOpenAuthSession.mockResolvedValue({
      type: 'success',
      url: 'exp://localhost/?code=test-auth-code',
    });
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });

    await act(async () => {
      googleButton.props.onPress();
    });

    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('shows error message when signInWithOAuth returns error', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: 'OAuth not configured' },
    });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });

    await act(async () => {
      googleButton.props.onPress();
    });

    const errorNodes = renderer!.root.findAll(
      (node) =>
        typeof node.props?.children === 'string' &&
        node.props.children.includes('Google sign-in failed'),
    );
    expect(errorNodes.length).toBeGreaterThanOrEqual(1);
  });

  it('shows not-available message when data.url is null', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: null,
    });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });

    await act(async () => {
      googleButton.props.onPress();
    });

    const errorNodes = renderer!.root.findAll(
      (node) =>
        typeof node.props?.children === 'string' &&
        node.props.children.includes('not available'),
    );
    expect(errorNodes.length).toBeGreaterThanOrEqual(1);
  });

  it('bypasses OAuth and shows Alert in mock mode', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    (env as { useMock: boolean }).useMock = true;

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });

    await act(async () => {
      googleButton.props.onPress();
    });

    expect(mockSignInWithOAuth).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('does not navigate or show error when the user cancels or dismisses the browser', async () => {
    for (const resultType of ['cancel', 'dismiss'] as const) {
      jest.clearAllMocks();
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth' },
        error: null,
      });
      mockOpenAuthSession.mockResolvedValue({ type: resultType });

      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<SignInScreen />);
      });

      const googleButton = renderer!.root.findByProps({
        testID: 'google-oauth-button',
      });

      await act(async () => {
        googleButton.props.onPress();
      });

      expect(mockOpenAuthSession).toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();

      const errorNodes = renderer!.root.findAll(
        (node) =>
          typeof node.props?.children === 'string' &&
          (node.props.children.includes('Google sign-in') ||
            node.props.children.includes('Connection error') ||
            node.props.children.includes('not available')),
      );
      expect(errorNodes.length).toBe(0);
    }
  });

  it('shows connection error message when signInWithOAuth throws a network error', async () => {
    mockSignInWithOAuth.mockRejectedValue(new Error('Failed to fetch'));

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });

    await act(async () => {
      googleButton.props.onPress();
    });

    expect(router.replace).not.toHaveBeenCalled();
    expect(mockOpenAuthSession).not.toHaveBeenCalled();

    const errorNodes = renderer!.root.findAll(
      (node) =>
        typeof node.props?.children === 'string' &&
        node.props.children.includes('Connection error'),
    );
    expect(errorNodes.length).toBeGreaterThanOrEqual(1);
  });
});
