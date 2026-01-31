/**
 * Environment Configuration
 *
 * Provides typed access to environment variables with validation.
 * All client-exposed variables must be prefixed with EXPO_PUBLIC_.
 *
 * @example
 * ```typescript
 * import { env, validateEnv } from '@/lib/env';
 *
 * // Call at app startup
 * validateEnv();
 *
 * // Type-safe access
 * if (env.useMock) {
 *   console.log('Using mock services');
 * } else {
 *   fetch(env.apiUrl + '/api/valuation');
 * }
 * ```
 */

/**
 * Typed environment configuration interface.
 */
export interface Env {
  /** Enable mock services (default: true for development) */
  useMock: boolean;
  /** Supabase project URL (required when useMock=false) */
  supabaseUrl: string | undefined;
  /** Supabase anonymous key (required when useMock=false) */
  supabaseAnonKey: string | undefined;
  /** Backend API base URL (required when useMock=false) */
  apiUrl: string | undefined;
}

/**
 * Parse boolean from environment variable string.
 * Handles: 'true', 'false', '1', '0', 'yes', 'no' (case-insensitive)
 *
 * @param value - Environment variable value (string or undefined)
 * @param defaultValue - Default value if undefined or empty
 * @returns Parsed boolean
 */
function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') return defaultValue;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}

/**
 * Typed environment configuration.
 * Access environment variables with proper types.
 */
export const env: Env = {
  useMock: parseBool(process.env.EXPO_PUBLIC_USE_MOCK, true),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  apiUrl: process.env.EXPO_PUBLIC_API_URL,
};

/**
 * Validate environment configuration.
 * Call at app startup to fail fast on missing required variables.
 *
 * @throws Error if required variables are missing (when useMock=false)
 * @throws Error if useMock=true in production build
 */
export function validateEnv(): void {
  const missing: string[] = [];

  // Production safety check: never ship with mock mode
  if (env.useMock && !__DEV__) {
    throw new Error(
      'Production builds must not use mock mode.\n' +
        'Set EXPO_PUBLIC_USE_MOCK=false and configure real API credentials.'
    );
  }

  // When not in mock mode, require real API credentials
  if (!env.useMock) {
    if (!env.supabaseUrl) {
      missing.push('EXPO_PUBLIC_SUPABASE_URL');
    }
    if (!env.supabaseAnonKey) {
      missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    }
    if (!env.apiUrl) {
      missing.push('EXPO_PUBLIC_API_URL');
    }

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables:\n` +
          missing.map((v) => `  - ${v}`).join('\n') +
          '\n\nSet EXPO_PUBLIC_USE_MOCK=true to use mock services instead.'
      );
    }

    // Warn when using real APIs in development (costs money, slower)
    if (__DEV__) {
      console.warn('⚠️ Running with real APIs in development mode');
    }
  }
}
