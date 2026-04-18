/**
 * Tests for contexts/AuthContext.tsx
 * Story 4.6 — AC1, AC2, AC3, AC6
 */

import React from 'react';
import { act, create } from 'react-test-renderer';

// ─── Supabase mock ────────────────────────────────────────────────────────────
// jest.mock is hoisted; use jest.fn() directly in the factory to avoid
// temporal-dead-zone issues with outer let/const variables.

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signOut: jest.fn(),
    },
  },
}));

import { supabase } from '@/lib/supabase';
import { AuthProvider, useAuth, mapSupabaseUser } from '@/contexts/AuthContext';
import { isUser, isGuestUser } from '@/types/user';

// Typed mock accessors
const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;

// ─── Error boundary for testing throw behaviour ───────────────────────────────

class TestErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (e: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError?: (e: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSupabaseUser(overrides: Partial<{
  id: string;
  email: string | undefined;
  created_at: string;
  user_metadata: Record<string, unknown>;
}> = {}) {
  return {
    id: 'supabase-user-id-123',
    email: 'test@example.com',
    created_at: '2025-01-01T00:00:00.000Z',
    user_metadata: {} as Record<string, unknown>,
    ...overrides,
  };
}

function makeSession(user = makeSupabaseUser()) {
  return { access_token: 'fake-token', refresh_token: 'fake-refresh', user };
}

/** Captures context value on each render. */
function ContextCapture({ onCapture }: { onCapture: (val: ReturnType<typeof useAuth>) => void }) {
  const ctx = useAuth();
  onCapture(ctx);
  return null;
}

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  // Default onAuthStateChange stub - returns valid subscription shape
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  });
});

// ─── mapSupabaseUser ──────────────────────────────────────────────────────────

describe('mapSupabaseUser (AC6)', () => {
  it('maps id, email, and createdAt from Supabase user', () => {
    const su = makeSupabaseUser();
    const appUser = mapSupabaseUser(su as any);

    expect(appUser.id).toBe('supabase-user-id-123');
    expect(appUser.email).toBe('test@example.com');
    expect(appUser.createdAt).toBe('2025-01-01T00:00:00.000Z');
  });

  it('defaults tier to FREE when user_metadata.tier is absent', () => {
    const su = makeSupabaseUser({ user_metadata: {} });
    const appUser = mapSupabaseUser(su as any);
    expect(appUser.tier).toBe('FREE');
  });

  it('uses tier from user_metadata when present', () => {
    const su = makeSupabaseUser({ user_metadata: { tier: 'PRO' } });
    const appUser = mapSupabaseUser(su as any);
    expect(appUser.tier).toBe('PRO');
  });

  it('uses empty string for email when supabase email is undefined', () => {
    const su = makeSupabaseUser({ email: undefined as any });
    const appUser = mapSupabaseUser(su as any);
    expect(appUser.email).toBe('');
  });

  it('passes isUser() type guard', () => {
    const su = makeSupabaseUser();
    const appUser = mapSupabaseUser(su as any);
    expect(isUser(appUser)).toBe(true);
  });

  it('does not pass isGuestUser() type guard', () => {
    const su = makeSupabaseUser();
    const appUser = mapSupabaseUser(su as any);
    expect(isGuestUser(appUser)).toBe(false);
  });
});

// ─── useAuth outside provider ──────────────────────────────────────────────────

describe('useAuth() outside AuthProvider (AC1)', () => {
  it('throws with a descriptive error message', async () => {
    // Suppress React's own error logging for this intentional throw test
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    let caughtError: Error | null = null;

    function ThrowingComponent() {
      useAuth();
      return null;
    }

    await act(async () => {
      create(
        <TestErrorBoundary onError={(e) => { caughtError = e; }}>
          <ThrowingComponent />
        </TestErrorBoundary>
      );
    });

    consoleError.mockRestore();
    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toContain('useAuth must be used within <AuthProvider>');
  });
});

// ─── AuthProvider — guest state ────────────────────────────────────────────────

describe('AuthProvider guest state (AC2, AC3)', () => {
  it('starts with isLoading=true then resolves to guest state when no session', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    let captured: ReturnType<typeof useAuth> | null = null;

    await act(async () => {
      create(
        <AuthProvider>
          <ContextCapture onCapture={(v) => { captured = v; }} />
        </AuthProvider>
      );
    });

    expect(captured).not.toBeNull();
    expect(captured!.session).toBeNull();
    expect(captured!.user).toBeNull();
    expect(captured!.isGuest).toBe(true);
    expect(captured!.isLoading).toBe(false);
  });

  it('resolves to authenticated state when session exists', async () => {
    const session = makeSession();
    mockGetSession.mockResolvedValueOnce({ data: { session } });

    let captured: ReturnType<typeof useAuth> | null = null;

    await act(async () => {
      create(
        <AuthProvider>
          <ContextCapture onCapture={(v) => { captured = v; }} />
        </AuthProvider>
      );
    });

    expect(captured!.session).toEqual(session);
    expect(captured!.user).not.toBeNull();
    expect(captured!.user!.id).toBe('supabase-user-id-123');
    expect(captured!.user!.email).toBe('test@example.com');
    expect(captured!.isGuest).toBe(false);
    expect(captured!.isLoading).toBe(false);
  });

  it('falls back to guest state when getSession() throws (AC2 graceful degradation)', async () => {
    mockGetSession.mockRejectedValueOnce(new Error('network error'));

    let captured: ReturnType<typeof useAuth> | null = null;

    await act(async () => {
      create(
        <AuthProvider>
          <ContextCapture onCapture={(v) => { captured = v; }} />
        </AuthProvider>
      );
    });

    expect(captured!.session).toBeNull();
    expect(captured!.user).toBeNull();
    expect(captured!.isGuest).toBe(true);
    expect(captured!.isLoading).toBe(false);
  });
});

// ─── Subscription cleanup ──────────────────────────────────────────────────────

describe('AuthProvider subscription cleanup (AC4)', () => {
  it('calls unsubscribe when AuthProvider unmounts', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    const mockUnsubscribe = jest.fn();
    mockOnAuthStateChange.mockReturnValueOnce({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });

    let renderer: ReturnType<typeof create>;

    await act(async () => {
      renderer = create(
        <AuthProvider>
          <ContextCapture onCapture={() => {}} />
        </AuthProvider>
      );
    });

    await act(async () => {
      renderer!.unmount();
    });

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});

// ─── onAuthStateChange callback behaviour (AC4) ──────────────────────────────

describe('onAuthStateChange callback (AC4)', () => {
  it('updates context to authenticated when SIGNED_IN fires', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    let captured: ReturnType<typeof useAuth> | null = null;

    await act(async () => {
      create(
        <AuthProvider>
          <ContextCapture onCapture={(v) => { captured = v; }} />
        </AuthProvider>
      );
    });

    // Initially guest
    expect(captured!.isGuest).toBe(true);

    // Simulate SIGNED_IN event via the captured callback
    const callback = mockOnAuthStateChange.mock.calls[0][0];
    const session = makeSession();

    await act(async () => {
      callback('SIGNED_IN', session);
    });

    expect(captured!.session).toEqual(session);
    expect(captured!.user).not.toBeNull();
    expect(captured!.user!.id).toBe('supabase-user-id-123');
    expect(captured!.isGuest).toBe(false);
  });

  it('updates context to guest when SIGNED_OUT fires', async () => {
    const session = makeSession();
    mockGetSession.mockResolvedValueOnce({ data: { session } });

    let captured: ReturnType<typeof useAuth> | null = null;

    await act(async () => {
      create(
        <AuthProvider>
          <ContextCapture onCapture={(v) => { captured = v; }} />
        </AuthProvider>
      );
    });

    // Initially authenticated
    expect(captured!.isGuest).toBe(false);

    // Simulate SIGNED_OUT event
    const callback = mockOnAuthStateChange.mock.calls[0][0];

    await act(async () => {
      callback('SIGNED_OUT', null);
    });

    expect(captured!.session).toBeNull();
    expect(captured!.user).toBeNull();
    expect(captured!.isGuest).toBe(true);
  });
});

// ─── signOut ──────────────────────────────────────────────────────────────────

describe('signOut (AC4)', () => {
  it('calls supabase.auth.signOut', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce({ error: null });

    let captured: ReturnType<typeof useAuth> | null = null;

    await act(async () => {
      create(
        <AuthProvider>
          <ContextCapture onCapture={(v) => { captured = v; }} />
        </AuthProvider>
      );
    });

    await act(async () => {
      await captured!.signOut();
    });

    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });
});
