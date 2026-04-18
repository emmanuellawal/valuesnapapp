import React from 'react';
import { Alert } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('@/lib/env', () => ({
  env: { useMock: false },
}));

jest.mock('@/lib/authRecovery', () => ({
  buildPasswordResetRedirectUrl: jest.fn(() => 'mobile://auth/update-password'),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: jest.fn(),
    },
  },
}));

import ForgotPasswordScreen from '../app/auth/forgot-password';
import { router, useLocalSearchParams } from 'expo-router';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

const mockResetPasswordForEmail = supabase.auth.resetPasswordForEmail as jest.Mock;
const mockRouterPush = router.push as jest.Mock;
const mockRouterReplace = router.replace as jest.Mock;
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;

function findByTestId(renderer: ReactTestRenderer, testID: string) {
  return renderer.root.find((node) => node.props?.testID === testID);
}

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (env as { useMock: boolean }).useMock = false;
    mockUseLocalSearchParams.mockReturnValue({});
  });

  it('shows email validation error when email is empty', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ForgotPasswordScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'forgot-password-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(renderer!.root.findByProps({ children: 'Please enter your email' })).toBeTruthy();
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('shows success state after reset request succeeds', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ForgotPasswordScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'forgot-password-email-input').props.onChangeText('user@example.com');
      findByTestId(renderer!, 'forgot-password-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: 'mobile://auth/update-password',
    });
    expect(renderer!.root.findByProps({ children: 'Check your inbox' })).toBeTruthy();
  });

  it('shows a generic success state when Supabase reports an unknown email', async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { message: 'User not found' },
    });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ForgotPasswordScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'forgot-password-email-input').props.onChangeText('ghost@example.com');
      findByTestId(renderer!, 'forgot-password-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(renderer!.root.findByProps({ children: 'Check your inbox' })).toBeTruthy();
  });

  it('shows connection error on network failure', async () => {
    mockResetPasswordForEmail.mockRejectedValue(new Error('Failed to fetch'));

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ForgotPasswordScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'forgot-password-email-input').props.onChangeText('user@example.com');
      findByTestId(renderer!, 'forgot-password-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(renderer!.root.findByProps({ children: 'Connection error. Please check your internet and try again.' })).toBeTruthy();
  });

  it('renders recovery-link error passed in route params', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      error: 'Password recovery link has expired. Please request a new reset link.',
    });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ForgotPasswordScreen />);
    });

    expect(renderer!.root.findByProps({ children: 'Password recovery link has expired. Please request a new reset link.' })).toBeTruthy();
  });

  it('navigates back to sign in', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ForgotPasswordScreen />);
    });

    const signInLink = renderer!.root.findByProps({ accessibilityLabel: 'Back to sign in' });

    await act(async () => {
      signInLink.props.onPress();
    });

    expect(mockRouterPush).toHaveBeenCalledWith('/auth/sign-in');
  });

  it('uses mock-mode bypass', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    (env as { useMock: boolean }).useMock = true;

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<ForgotPasswordScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'forgot-password-email-input').props.onChangeText('user@example.com');
      findByTestId(renderer!, 'forgot-password-submit-button').props.onPress();
    });

    expect(Alert.alert).toHaveBeenCalled();
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});