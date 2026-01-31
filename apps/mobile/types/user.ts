/**
 * User and Authentication Types
 */

/**
 * User tier levels.
 */
export type UserTier = 'FREE' | 'PRO';

/**
 * Authenticated user profile.
 */
export interface User {
  /** Unique user ID */
  id: string;

  /** User email address */
  email: string;

  /** ISO timestamp of account creation */
  createdAt: string;

  /** Subscription tier */
  tier: UserTier;

  /** Optional user preferences */
  preferences?: Record<string, unknown>;
}

/**
 * Guest user session (unauthenticated).
 */
export interface GuestUser {
  /** Session ID for tracking */
  sessionId: string;

  /** Maximum valuations allowed per session */
  valuationLimit: number;

  /** Remaining valuations in current session */
  remainingValuations: number;
}

/**
 * Authentication state union type.
 * - User: Authenticated user
 * - GuestUser: Guest session
 * - null: Not authenticated / loading
 */
export type AuthState = User | GuestUser | null;

/**
 * Type guard to check if auth state is an authenticated user.
 */
export function isUser(auth: AuthState): auth is User {
  return auth !== null && 'email' in auth;
}

/**
 * Type guard to check if auth state is a guest user.
 */
export function isGuestUser(auth: AuthState): auth is GuestUser {
  return auth !== null && 'sessionId' in auth;
}
