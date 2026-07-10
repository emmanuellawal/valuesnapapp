import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';

const serverSafeStorage = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => {},
  removeItem: async (_key: string) => {},
};

const authStorage = typeof window === 'undefined' ? serverSafeStorage : AsyncStorage;

let client: SupabaseClient | null = null;

function resolveSupabaseConfig(): { url: string; anonKey: string } {
  const url = env.supabaseUrl;
  const anonKey = env.supabaseAnonKey;

  if (!url || !anonKey) {
    if (env.useMock || env.demo) {
      return {
        url: url ?? 'https://placeholder.supabase.co',
        anonKey: anonKey ?? 'placeholder-anon-key',
      };
    }
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  return { url, anonKey };
}

export function getSupabaseClient(): SupabaseClient {
  if (client) {
    return client;
  }

  const { url, anonKey } = resolveSupabaseConfig();

  client = createClient(url, anonKey, {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });

  return client;
}

// Lazy proxy so module import does not crash before validateEnv().
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getSupabaseClient(), prop, receiver);
    return typeof value === 'function' ? value.bind(getSupabaseClient()) : value;
  },
});

// Re-export Supabase auth types for use in Stories 4.2–4.11.
export type { User, Session } from '@supabase/supabase-js';
