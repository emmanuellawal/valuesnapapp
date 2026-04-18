/**
 * Tests for app/auth/register.tsx
 * Story 4.2 — AC12: Unit Tests Pass
 *
 * Pattern: react-test-renderer (matches existing AuthContext.test.tsx pattern)
 * Run: npx jest __tests__/auth-register.test.tsx --no-coverage
 */

import React from 'react';
import { Alert } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('@/lib/env', () => ({
  env: { useMock: false },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
    },
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import RegisterScreen from '../app/auth/register';
import { router } from 'expo-router';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

// ─── Typed mock accessors ─────────────────────────────────────────────────────

const mockSignUp = supabase.auth.signUp as jest.Mock;
const mockRouterReplace = router.replace as jest.Mock;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findByTestId(renderer: ReactTestRenderer, testID: string) {
  return renderer.root.find((node) => node.props?.testID === testID);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset useMock to false before each test
    (env as { useMock: boolean }).useMock = false;
  });

  it('renders without crashing', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('shows "Create account" button', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    const submitButton = findByTestId(renderer!, 'register-submit-button');
    expect(submitButton).toBeTruthy();
  });

  it('shows email validation error for invalid email on submit', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    const emailInput = findByTestId(renderer!, 'register-email-input');
    const submitButton = findByTestId(renderer!, 'register-submit-button');

    await act(async () => {
      emailInput.props.onChangeText('notanemail');
      submitButton.props.onPress();
    });

    // Allow validation to settle
    await act(async () => {});

    expect(
      renderer!.root.findByProps({ children: 'Please enter a valid email address' }),
    ).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows password too short error on submit', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    const emailInput = findByTestId(renderer!, 'register-email-input');
    const passwordInput = findByTestId(renderer!, 'register-password-input');
    const submitButton = findByTestId(renderer!, 'register-submit-button');

    await act(async () => {
      emailInput.props.onChangeText('valid@example.com');
      passwordInput.props.onChangeText('short');
      submitButton.props.onPress();
    });

    await act(async () => {});

    expect(
      renderer!.root.findByProps({ children: 'Password must be at least 8 characters' }),
    ).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows password mismatch error on submit', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    const emailInput = findByTestId(renderer!, 'register-email-input');
    const passwordInput = findByTestId(renderer!, 'register-password-input');
    const confirmInput = findByTestId(renderer!, 'register-confirm-password-input');
    const submitButton = findByTestId(renderer!, 'register-submit-button');

    await act(async () => {
      emailInput.props.onChangeText('valid@example.com');
      passwordInput.props.onChangeText('password123');
      confirmInput.props.onChangeText('differentpass');
      submitButton.props.onPress();
    });

    await act(async () => {});

    expect(
      renderer!.root.findByProps({ children: 'Passwords do not match' }),
    ).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('bypasses Supabase and calls Alert in mock mode', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    (env as { useMock: boolean }).useMock = true;

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'register-email-input').props.onChangeText('test@example.com');
      findByTestId(renderer!, 'register-password-input').props.onChangeText('password123');
      findByTestId(renderer!, 'register-confirm-password-input').props.onChangeText('password123');
      findByTestId(renderer!, 'register-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(mockSignUp).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });

  // ── H1: happy-path — session active ─────────────────────────────────────────

  it('calls router.replace("/(tabs)") on successful registration with active session', async () => {
    mockSignUp.mockResolvedValue({
      data: { session: { access_token: 'token' }, user: {} },
      error: null,
    });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'register-email-input').props.onChangeText('test@example.com');
      findByTestId(renderer!, 'register-password-input').props.onChangeText('password123');
      findByTestId(renderer!, 'register-confirm-password-input').props.onChangeText('password123');
      findByTestId(renderer!, 'register-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)');
  });

  // ── H2a: server error — duplicate email ──────────────────────────────────────

  it('shows duplicate email error when Supabase returns already-registered error', async () => {
    mockSignUp.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'User already registered' },
    });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'register-email-input').props.onChangeText('existing@example.com');
      findByTestId(renderer!, 'register-password-input').props.onChangeText('password123');
      findByTestId(renderer!, 'register-confirm-password-input').props.onChangeText('password123');
      findByTestId(renderer!, 'register-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(
      renderer!.root.findByProps({
        children: 'An account with this email already exists. Try signing in instead.',
      }),
    ).toBeTruthy();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  // ── H2b: server error — network failure ──────────────────────────────────────

  it('shows connection error when signUp throws a network error', async () => {
    mockSignUp.mockRejectedValue(new Error('Failed to fetch'));

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'register-email-input').props.onChangeText('test@example.com');
      findByTestId(renderer!, 'register-password-input').props.onChangeText('password123');
      findByTestId(renderer!, 'register-confirm-password-input').props.onChangeText('password123');
      findByTestId(renderer!, 'register-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(
      renderer!.root.findByProps({
        children: 'Connection error. Please check your internet and try again.',
      }),
    ).toBeTruthy();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  // ── M2: email confirmation state ─────────────────────────────────────────────

  it('shows "Check your inbox" when email confirmation is required', async () => {
    mockSignUp.mockResolvedValue({
      data: { session: null, user: { id: 'user-id', email: 'test@example.com' } },
      error: null,
    });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'register-email-input').props.onChangeText('test@example.com');
      findByTestId(renderer!, 'register-password-input').props.onChangeText('password123');
      findByTestId(renderer!, 'register-confirm-password-input').props.onChangeText('password123');
      findByTestId(renderer!, 'register-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(
      renderer!.root.findByProps({ children: 'Check your inbox' }),
    ).toBeTruthy();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});
