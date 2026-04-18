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
      signInWithPassword: jest.fn(),
    },
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import SignInScreen from '../app/auth/sign-in';
import { router } from 'expo-router';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

// ─── Typed mock accessors ─────────────────────────────────────────────────────

const mockSignInWithPassword = supabase.auth.signInWithPassword as jest.Mock;
const mockRouterReplace = router.replace as jest.Mock;
const mockRouterPush = router.push as jest.Mock;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findByTestId(renderer: ReactTestRenderer, testID: string) {
  return renderer.root.find((node) => node.props?.testID === testID);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (env as { useMock: boolean }).useMock = false;
  });

  it('renders without crashing', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('shows "Sign in" button', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const submitButton = findByTestId(renderer!, 'sign-in-submit-button');
    expect(submitButton).toBeTruthy();
  });

  it('shows email validation error when email is empty on submit', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const submitButton = findByTestId(renderer!, 'sign-in-submit-button');

    await act(async () => {
      submitButton.props.onPress();
    });

    await act(async () => {});

    expect(
      renderer!.root.findByProps({ children: 'Please enter your email' }),
    ).toBeTruthy();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('shows password required error when password is empty on submit', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const emailInput = findByTestId(renderer!, 'sign-in-email-input');
    const submitButton = findByTestId(renderer!, 'sign-in-submit-button');

    await act(async () => {
      emailInput.props.onChangeText('test@example.com');
      submitButton.props.onPress();
    });

    await act(async () => {});

    expect(
      renderer!.root.findByProps({ children: 'Please enter your password' }),
    ).toBeTruthy();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('bypasses Supabase and shows Alert in mock mode', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    (env as { useMock: boolean }).useMock = true;

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'sign-in-email-input').props.onChangeText('test@example.com');
      findByTestId(renderer!, 'sign-in-password-input').props.onChangeText('password123');
      findByTestId(renderer!, 'sign-in-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('calls router.replace("/(tabs)") on successful sign-in', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'token' }, user: {} },
      error: null,
    });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'sign-in-email-input').props.onChangeText('user@example.com');
      findByTestId(renderer!, 'sign-in-password-input').props.onChangeText('correctpassword');
      findByTestId(renderer!, 'sign-in-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'correctpassword',
    });
    expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('shows incorrect credentials error when Supabase returns invalid login error', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'sign-in-email-input').props.onChangeText('user@example.com');
      findByTestId(renderer!, 'sign-in-password-input').props.onChangeText('wrongpassword');
      findByTestId(renderer!, 'sign-in-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(
      renderer!.root.findByProps({ children: 'Incorrect email or password. Please try again.' }),
    ).toBeTruthy();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('shows connection error when signInWithPassword throws a network error', async () => {
    mockSignInWithPassword.mockRejectedValue(new Error('Failed to fetch'));

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'sign-in-email-input').props.onChangeText('user@example.com');
      findByTestId(renderer!, 'sign-in-password-input').props.onChangeText('anypassword');
      findByTestId(renderer!, 'sign-in-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(
      renderer!.root.findByProps({ children: 'Connection error. Please check your internet and try again.' }),
    ).toBeTruthy();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('calls router.push("/auth/register") when Create account is pressed', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const createAccountLink = renderer!.root.findByProps({
      accessibilityLabel: 'Create a new account',
    });

    await act(async () => {
      createAccountLink.props.onPress();
    });

    expect(mockRouterPush).toHaveBeenCalledWith('/auth/register');
  });

  it('calls router.push("/auth/forgot-password") when Forgot password is pressed', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const forgotPasswordLink = renderer!.root.findByProps({
      accessibilityLabel: 'Reset your password',
    });

    await act(async () => {
      forgotPasswordLink.props.onPress();
    });

    expect(mockRouterPush).toHaveBeenCalledWith('/auth/forgot-password');
  });
});
