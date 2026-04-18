import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';

export interface AuthRedirectResult {
  handled: boolean;
  route?: '/auth/forgot-password' | '/auth/update-password';
  error?: string;
}

export function buildPasswordResetRedirectUrl(): string {
  return Linking.createURL('/auth/update-password');
}

export function parseAuthRedirectParams(url: string): Record<string, string> {
  try {
    const parsed = new URL(url);
    const params: Record<string, string> = {};

    if (parsed.hash.startsWith('#')) {
      const hashParams = new URLSearchParams(parsed.hash.slice(1));
      hashParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    parsed.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return params;
  } catch {
    return {};
  }
}

export async function handleIncomingAuthRedirect(url: string): Promise<AuthRedirectResult> {
  const params = parseAuthRedirectParams(url);

  if (params.type !== 'recovery') {
    return { handled: false };
  }

  if (params.error_description) {
    return {
      handled: true,
      route: '/auth/forgot-password',
      error: params.error_description,
    };
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  if (!accessToken || !refreshToken) {
    return {
      handled: true,
      route: '/auth/forgot-password',
      error: 'Password recovery link is incomplete or expired. Please request a new reset link.',
    };
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    return {
      handled: true,
      route: '/auth/forgot-password',
      error: 'Password recovery link has expired. Please request a new reset link.',
    };
  }

  return {
    handled: true,
    route: '/auth/update-password',
  };
}