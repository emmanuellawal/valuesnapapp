import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { FormInput } from '@/components/atoms';
import { Box, ScreenContainer, Stack, SwissPressable, Text } from '@/components/primitives';
import { buildPasswordResetRedirectUrl } from '@/lib/authRecovery';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Please enter your email')
    .email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
type SubmitState = 'idle' | 'loading' | 'sent';

function mapForgotPasswordError(message: string): string | null {
  const lower = message.toLowerCase();
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return 'Connection error. Please check your internet and try again.';
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many reset attempts. Please wait and try again.';
  }
  return null;
}

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ error?: string }>();
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (typeof params.error === 'string' && params.error.length > 0) {
      setServerError(params.error);
    }
  }, [params.error]);

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setServerError(null);
    setSubmitState('loading');

    if (env.useMock) {
      Alert.alert('Mock Mode', 'Password reset email bypassed in mock mode.', [
        { text: 'OK', onPress: () => setSubmitState('sent') },
      ]);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: buildPasswordResetRedirectUrl(),
      });

      if (error) {
        const friendlyError = mapForgotPasswordError(error.message);
        if (friendlyError) {
          setServerError(friendlyError);
          setSubmitState('idle');
          return;
        }
      }

      setSubmitState('sent');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const friendlyError = mapForgotPasswordError(message);
      if (friendlyError) {
        setServerError(friendlyError);
        setSubmitState('idle');
        return;
      }

      setSubmitState('sent');
    }
  };

  if (submitState === 'sent') {
    return (
      <ScreenContainer>
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
          Account
        </Text>
        <Text variant="h1" className="text-ink mt-2">
          Check your inbox
        </Text>
        <Text variant="body" className="text-ink-muted mt-6">
          If an account exists for that email, we sent a password reset link. Open it on this device to choose a new password.
        </Text>
        <SwissPressable
          accessibilityLabel="Back to sign in"
          className="mt-12"
          onPress={() => router.replace('/auth/sign-in')}
        >
          <Text variant="body" className="text-ink underline">
            Back to sign in
          </Text>
        </SwissPressable>
      </ScreenContainer>
    );
  }

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
          Reset password
        </Text>
        <Text variant="body" className="text-ink-muted mt-6">
          Enter your email and we’ll send you a password reset link.
        </Text>

        <Stack gap={6} className="mt-12">
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
                returnKeyType="done"
                textContentType="emailAddress"
                onSubmitEditing={handleSubmit(onSubmit)}
                testID="forgot-password-email-input"
              />
            )}
          />

          {serverError ? (
            <View accessibilityLiveRegion="polite" testID="forgot-password-error">
              <Text variant="body-sm" className="text-signal">
                {serverError}
              </Text>
            </View>
          ) : null}

          <SwissPressable
            accessibilityLabel={submitState === 'loading' ? 'Sending reset link' : 'Send reset link'}
            className="bg-signal py-4 mt-2"
            disabled={submitState === 'loading'}
            onPress={handleSubmit(onSubmit)}
            testID="forgot-password-submit-button"
          >
            <Text variant="body" className="text-paper text-center font-semibold">
              {submitState === 'loading' ? 'Sending reset link…' : 'Send reset link'}
            </Text>
          </SwissPressable>

          <Box className="flex-row justify-center items-center mt-4 gap-1">
            <Text variant="body-sm" className="text-ink-muted">
              Remembered your password?
            </Text>
            <SwissPressable
              accessibilityLabel="Back to sign in"
              onPress={() => router.push('/auth/sign-in')}
            >
              <Text variant="body-sm" className="text-ink underline">
                Sign in
              </Text>
            </SwissPressable>
          </Box>
        </Stack>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}