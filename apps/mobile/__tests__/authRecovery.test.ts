jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      setSession: jest.fn(),
    },
  },
}));

import { handleIncomingAuthRedirect, parseAuthRedirectParams } from '@/lib/authRecovery';
import { supabase } from '@/lib/supabase';

const mockSetSession = supabase.auth.setSession as jest.Mock;

describe('authRecovery helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses query and hash params from auth redirects', () => {
    const params = parseAuthRedirectParams(
      'mobile://auth/update-password?type=recovery#access_token=access-token&refresh_token=refresh-token',
    );

    expect(params.type).toBe('recovery');
    expect(params.access_token).toBe('access-token');
    expect(params.refresh_token).toBe('refresh-token');
  });

  it('returns ignored result for non-recovery redirects', async () => {
    const result = await handleIncomingAuthRedirect('mobile://auth/sign-in?type=magiclink');

    expect(result).toEqual({ handled: false });
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('establishes a recovery session when tokens are present', async () => {
    mockSetSession.mockResolvedValue({ data: {}, error: null });

    const result = await handleIncomingAuthRedirect(
      'mobile://auth/update-password?type=recovery#access_token=access-token&refresh_token=refresh-token',
    );

    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
    expect(result).toEqual({ handled: true, route: '/auth/update-password' });
  });

  it('routes back to forgot-password when the recovery link is incomplete', async () => {
    const result = await handleIncomingAuthRedirect('mobile://auth/update-password?type=recovery');

    expect(result).toEqual({
      handled: true,
      route: '/auth/forgot-password',
      error: 'Password recovery link is incomplete or expired. Please request a new reset link.',
    });
  });

  it('routes back to forgot-password when Supabase rejects the recovery session', async () => {
    mockSetSession.mockResolvedValue({ data: {}, error: { message: 'expired' } });

    const result = await handleIncomingAuthRedirect(
      'mobile://auth/update-password?type=recovery#access_token=access-token&refresh_token=refresh-token',
    );

    expect(result).toEqual({
      handled: true,
      route: '/auth/forgot-password',
      error: 'Password recovery link has expired. Please request a new reset link.',
    });
  });
});