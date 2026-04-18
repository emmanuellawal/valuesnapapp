import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Box,
  Stack,
  Text,
  SwissPressable,
  ScreenContainer,
} from '@/components/primitives';
import { FormInput } from '@/components/atoms';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';

// Required for expo-web-browser OAuth redirect handling
WebBrowser.maybeCompleteAuthSession();

// ─── Validation Schema ────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Please enter a valid email address')
      .email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// ─── Error Mapping ────────────────────────────────────────────────────────────

function mapSupabaseError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('invalid') && lower.includes('email')) {
    return 'Please enter a valid email address.';
  }
  if (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('failed to fetch')
  ) {
    return 'Connection error. Please check your internet and try again.';
  }
  return 'Registration failed. Please try again.';
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SubmitState = 'idle' | 'loading' | 'confirm-email';

// ─── Screen ───────────────────────────────────────────────────────────────────

/**
 * RegisterScreen — Email/password account creation.
 *
 * On success: AuthContext auto-updates via onAuthStateChange(SIGNED_IN).
 * Navigation is driven by router.replace, not by watching AuthContext.
 *
 * @see Story 4.2: Implement User Registration
 * @see contexts/AuthContext.tsx — provider that receives the SIGNED_IN event
 */
export default function RegisterScreen() {
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [serverError, setServerError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    setOauthError(null);
    setSubmitState('loading');

    // Mock mode: bypass Supabase, navigate to app for development testing
    if (env.useMock) {
      setSubmitState('idle');
      Alert.alert(
        'Mock Mode',
        'Registration bypassed in mock mode.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }],
      );
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setServerError(mapSupabaseError(error.message));
        setSubmitState('idle');
        return;
      }

      if (data.session) {
        // Session active: onAuthStateChange(SIGNED_IN) has already fired.
        // AuthContext is now updated. Navigate to app.
        router.replace('/(tabs)');
      } else {
        // Email confirmation required: session is null until user confirms.
        setSubmitState('confirm-email');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown error';
      setServerError(mapSupabaseError(message));
      setSubmitState('idle');
    }
  };

  const googleSignIn = async () => {
    setOauthError(null);
    setServerError(null);
    setIsOAuthLoading(true);

    // Mock mode bypass
    if (env.useMock) {
      setIsOAuthLoading(false);
      Alert.alert('Mock Mode', 'Google OAuth bypassed in mock mode.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
      return;
    }

    try {
      const redirectUrl = Linking.createURL('/');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      });

      if (error) {
        setOauthError('Google sign-in failed. Please try again.');
        return;
      }

      if (!data.url) {
        setOauthError('Google sign-in is not available. Please use email and password.');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success') {
        // Extract authorization code from redirect URL (PKCE flow)
        const url = new URL(result.url);
        const code = url.searchParams.get('code');

        if (code) {
          const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
          if (sessionError) {
            setOauthError('Google sign-in failed. Please try again.');
            return;
          }
        } else {
          setOauthError('Authentication incomplete. Please try again.');
          return;
        }

        // Session established via exchangeCodeForSession → onAuthStateChange(SIGNED_IN) fires
        router.replace('/(tabs)');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
        setOauthError('Connection error. Please check your internet and try again.');
      } else {
        setOauthError('Google sign-in failed. Please try again.');
      }
    } finally {
      setIsOAuthLoading(false);
    }
  };

  // ── Email confirmation view ──────────────────────────────────────────────────

  if (submitState === 'confirm-email') {
    return (
      <ScreenContainer>
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
          Account
        </Text>
        <Text variant="h1" className="text-ink mt-2">
          Check your inbox
        </Text>
        <Text variant="body" className="text-ink-muted mt-6">
          We sent a confirmation link to your email. Click the link to activate
          your account, then return to the app.
        </Text>
        <SwissPressable
          accessibilityLabel="Back to app"
          className="mt-12"
          onPress={() => router.replace('/(tabs)')}
        >
          <Text variant="body" className="text-ink underline">
            Back to app
          </Text>
        </SwissPressable>
      </ScreenContainer>
    );
  }

  // ── Registration form ────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-paper"
    >
      <ScreenContainer keyboardShouldPersistTaps="handled">
        {/* Header */}
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
          Account
        </Text>
        <Text variant="h1" className="text-ink mt-2">
          Create account
        </Text>

        {/* Form */}
        <Stack gap={6} className="mt-12">
          {/* Email */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <FormInput
                ref={ref}
                label="Email"
                placeholder="you@example.com"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
                textContentType="emailAddress"
                testID="register-email-input"
              />
            )}
          />

          {/* Password */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <FormInput
                ref={ref}
                label="Password"
                placeholder="Minimum 8 characters"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="next"
                textContentType="newPassword"
                testID="register-password-input"
              />
            )}
          />

          {/* Confirm Password */}
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <FormInput
                ref={ref}
                label="Confirm password"
                placeholder="Repeat password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="done"
                textContentType="newPassword"
                onSubmitEditing={handleSubmit(onSubmit)}
                testID="register-confirm-password-input"
              />
            )}
          />

          {/* Server error */}
          {serverError ? (
            <View accessibilityLiveRegion="polite">
              <Text variant="body-sm" className="text-signal">
                {serverError}
              </Text>
            </View>
          ) : null}

          {/* CTA */}
          <SwissPressable
            accessibilityLabel={
              submitState === 'loading' ? 'Creating account' : 'Create account'
            }
            disabled={submitState === 'loading'}
            onPress={handleSubmit(onSubmit)}
            className="bg-signal py-4 mt-2"
            testID="register-submit-button"
          >
            <Text variant="body" className="text-paper text-center font-semibold">
              {submitState === 'loading' ? 'Creating account…' : 'Create account'}
            </Text>
          </SwissPressable>

          {/* Sign-in link (Story 4.3 creates the target screen) */}
          <Box className="flex-row justify-center items-center mt-4 gap-1">
            <Text variant="body-sm" className="text-ink-muted">
              Already have an account?
            </Text>
            <SwissPressable
              accessibilityLabel="Sign in to existing account"
              onPress={() => router.push('/auth/sign-in')}
            >
              <Text variant="body-sm" className="text-ink underline">
                Sign in
              </Text>
            </SwissPressable>
          </Box>

          {/* Separator */}
          <Box className="flex-row items-center gap-3 my-2">
            <Box className="flex-1 h-px bg-divider" />
            <Text variant="body-sm" className="text-ink-muted">
              or
            </Text>
            <Box className="flex-1 h-px bg-divider" />
          </Box>

          {/* Google OAuth error */}
          {oauthError ? (
            <View accessibilityLiveRegion="polite">
              <Text variant="body-sm" className="text-signal">
                {oauthError}
              </Text>
            </View>
          ) : null}

          {/* Google OAuth button */}
          <SwissPressable
            accessibilityLabel={isOAuthLoading ? 'Signing in with Google' : 'Continue with Google'}
            className="bg-paper border border-ink py-4"
            onPress={googleSignIn}
            disabled={isOAuthLoading}
            testID="google-oauth-button"
          >
            <Text variant="body" className="text-ink text-center font-semibold">
              {isOAuthLoading ? 'Signing in with Google…' : 'Continue with Google'}
            </Text>
          </SwissPressable>
        </Stack>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
