import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';
import type { Session } from '@/lib/supabase';
import type { User as SupabaseUser } from '@/lib/supabase';
import type { User as AppUser } from '@/types/user';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  session: Session | null;
  user: AppUser | null;
  isGuest: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

// ─── User Bridge ──────────────────────────────────────────────────────────────

export function mapSupabaseUser(su: SupabaseUser): AppUser {
  return {
    id: su.id,
    email: su.email ?? '',
    createdAt: su.created_at,
    tier: (su.user_metadata?.tier as AppUser['tier']) ?? 'FREE',
    preferences: su.user_metadata?.preferences,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Restore session from AsyncStorage on launch.
    //    supabase.ts configures AsyncStorage + persistSession: true,
    //    so getSession() will find any stored token automatically.
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session ?? null;
      setSession(s);
      setUser(s?.user ? mapSupabaseUser(s.user) : null);
      setIsLoading(false);
    }).catch(() => {
      // Graceful fallback: treat as guest on error
      setSession(null);
      setUser(null);
      setIsLoading(false);
    });

    // 2. Real-time state sync for sign-in, sign-out, token refresh, user updates.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ? mapSupabaseUser(newSession.user) : null);
        setIsLoading(false);
      },
    );

    // 3. Clean up listener on unmount (prevents memory leaks).
    return () => subscription.unsubscribe();
  }, []);

  // NFR-S10 deferred: Supabase does not natively enforce per-user session count
  // limits (max 3 concurrent sessions). Enforcement requires a custom DB trigger
  // or edge function tracking JWT issuance per auth.users.id — out of scope for
  // this story. Risk is low for Phase 1 (typical user has 1–2 devices). To be
  // addressed in a future "Security Hardening — Concurrent Session Limits" story.
  const signOut = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange SIGNED_OUT fires and clears session/user automatically.
  };

  const value: AuthContextValue = {
    session,
    user,
    isGuest: !isLoading && session === null,
    isLoading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}
