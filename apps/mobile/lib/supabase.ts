import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';

const serverSafeStorage = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => {},
  removeItem: async (_key: string) => {},
};

const authStorage = typeof window === 'undefined' ? serverSafeStorage : AsyncStorage;

// Supabase client singleton for the mobile app.
// Uses the ANON (public) key — never the service role key.
// AsyncStorage provides session persistence on React Native (no browser cookies).
//
// IMPORTANT: env.supabaseUrl and env.supabaseAnonKey are validated at startup
// by validateEnv() in app/_layout.tsx when useMock=false. The non-null assertion
// is safe because the app throws before this code path runs if either var is missing.
export const supabase = createClient(
  env.supabaseUrl!,
  env.supabaseAnonKey!,
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Required for React Native — there is no browser URL bar to detect session
      // tokens from. Omitting this (or setting true) causes silent auth failures.
      detectSessionInUrl: false,
    },
  },
);

// Re-export Supabase auth types for use in Stories 4.2–4.11.
// Note: Supabase's User type differs from the app's own User interface in
// types/user.ts (which adds `tier` and `preferences`). Stories that bridge
// these two types (e.g., 4.6 AuthContext) will need to handle the mapping.
export type { User, Session } from '@supabase/supabase-js';
