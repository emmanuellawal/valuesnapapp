import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Box, Stack, Text, SwissPressable, ScreenContainer } from '@/components/primitives';
import { FormInput } from '@/components/atoms';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';

// Required for expo-web-browser OAuth redirect handling
WebBrowser.maybeCompleteAuthSession();

// ─── Schema ──────────────────────────────────────────────────────────────────

const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'Please enter your email')
    .email('Please enter a valid email address'),
  password: z.string().min(1, 'Please enter your password'),
});

type SignInFormValues = z.infer<typeof signInSchema>;

// ─── Error mapping ────────────────────────────────────────────────────────────

function mapSignInError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('wrong password')
  ) {
    return 'Incorrect email or password. Please try again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }
  if (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('failed to fetch')
  ) {
    return 'Connection error. Please check your internet and try again.';
  }
  return 'Sign in failed. Please try again.';
}

// ─── Submit state ─────────────────────────────────────────────────────────────

type SubmitState = 'idle' | 'loading';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SignInScreen() {
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [serverError, setServerError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: SignInFormValues) => {
    setServerError(null);
    setOauthError(null);
    setSubmitState('loading');

    // Mock mode bypass
    if (env.useMock) {
      setSubmitState('idle');
      Alert.alert('Mock Mode', 'Sign in bypassed in mock mode.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setServerError(mapSignInError(error.message));
        setSubmitState('idle');
        return;
      }

      // Session activates → onAuthStateChange(SIGNED_IN) fires → AuthContext updates automatically
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setServerError(mapSignInError(message));
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

  const isLoading = submitState === 'loading';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-paper"
    >
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
          Account
        </Text>
        <Text variant="h1" className="text-ink mt-2">
          Sign in
        </Text>

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
                onSubmitEditing={() => passwordRef.current?.focus()}
                testID="sign-in-email-input"
              />
            )}
          />

          {/* Password */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                ref={passwordRef}
                label="Password"
                placeholder="Enter your password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry
                autoComplete="current-password"
                returnKeyType="done"
                textContentType="password"
                onSubmitEditing={handleSubmit(onSubmit)}
                testID="sign-in-password-input"
              />
            )}
          />

          <Box className="items-start -mt-2">
            <SwissPressable
              accessibilityLabel="Reset your password"
              onPress={() => router.push('/auth/forgot-password' as never)}
            >
              <Text variant="body-sm" className="text-ink underline">
                Forgot password?
              </Text>
            </SwissPressable>
          </Box>

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
            accessibilityLabel={isLoading ? 'Signing in' : 'Sign in'}
            className="bg-signal py-4 mt-2"
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
            testID="sign-in-submit-button"
          >
            <Text variant="body" className="text-paper text-center font-semibold">
              {isLoading ? 'Signing in…' : 'Sign in'}
            </Text>
          </SwissPressable>

          {/* Create account link */}
          <Box className="flex-row justify-center items-center mt-4 gap-1">
            <Text variant="body-sm" className="text-ink-muted">
              Don{"'"}t have an account?
            </Text>
            <SwissPressable
              accessibilityLabel="Create a new account"
              onPress={() => router.push('/auth/register')}
            >
              <Text variant="body-sm" className="text-ink underline">
                Create account
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
