import React from 'react';
import { Alert } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('@/lib/env', () => ({
  env: { useMock: false },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      updateUser: jest.fn(),
    },
  },
}));

import UpdatePasswordScreen from '../app/auth/update-password';
import { router } from 'expo-router';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockUpdateUser = supabase.auth.updateUser as jest.Mock;
const mockRouterReplace = router.replace as jest.Mock;

function findByTestId(renderer: ReactTestRenderer, testID: string) {
  return renderer.root.find((node) => node.props?.testID === testID);
}

describe('UpdatePasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (env as { useMock: boolean }).useMock = false;
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'token', user: { id: 'user-1' } } },
    });
  });

  it('shows expired state when no recovery session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<UpdatePasswordScreen />);
    });

    await act(async () => {});

    expect(renderer!.root.findByProps({ children: 'Reset link expired' })).toBeTruthy();
  });

  it('shows validation error when passwords do not match', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<UpdatePasswordScreen />);
    });

    await act(async () => {});

    await act(async () => {
      findByTestId(renderer!, 'update-password-input').props.onChangeText('password123');
      findByTestId(renderer!, 'update-password-confirm-input').props.onChangeText('different456');
      findByTestId(renderer!, 'update-password-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(renderer!.root.findByProps({ children: 'Passwords do not match' })).toBeTruthy();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('updates password and routes to tabs on success', async () => {
    mockUpdateUser.mockResolvedValue({ data: {}, error: null });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<UpdatePasswordScreen />);
    });

    await act(async () => {});

    await act(async () => {
      findByTestId(renderer!, 'update-password-input').props.onChangeText('password123');
      findByTestId(renderer!, 'update-password-confirm-input').props.onChangeText('password123');
      findByTestId(renderer!, 'update-password-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'password123' });
    expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('shows update error when Supabase rejects the password', async () => {
    mockUpdateUser.mockResolvedValue({
      data: {},
      error: { message: 'Password should be at least 8 characters' },
    });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<UpdatePasswordScreen />);
    });

    await act(async () => {});

    await act(async () => {
      findByTestId(renderer!, 'update-password-input').props.onChangeText('password123');
      findByTestId(renderer!, 'update-password-confirm-input').props.onChangeText('password123');
      findByTestId(renderer!, 'update-password-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(renderer!.root.findByProps({ children: 'Password must be at least 8 characters.' })).toBeTruthy();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('uses mock-mode bypass', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    (env as { useMock: boolean }).useMock = true;

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<UpdatePasswordScreen />);
    });

    await act(async () => {});

    await act(async () => {
      findByTestId(renderer!, 'update-password-input').props.onChangeText('password123');
      findByTestId(renderer!, 'update-password-confirm-input').props.onChangeText('password123');
      findByTestId(renderer!, 'update-password-submit-button').props.onPress();
    });

    expect(Alert.alert).toHaveBeenCalled();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});