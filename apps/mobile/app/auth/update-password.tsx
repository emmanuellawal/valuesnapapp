import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { FormInput } from '@/components/atoms';
import { Box, ScreenContainer, Stack, SwissPressable, Text } from '@/components/primitives';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;
type SubmitState = 'idle' | 'loading';

function mapUpdatePasswordError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('weak') || lower.includes('password')) {
    return 'Password must be at least 8 characters.';
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return 'Connection error. Please check your internet and try again.';
  }
  return 'Password update failed. Please try again.';
}

export default function UpdatePasswordScreen() {
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [serverError, setServerError] = useState<string | null>(null);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    mode: 'onBlur',
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setHasRecoverySession(Boolean(data.session));
      })
      .catch(() => {
        if (!isMounted) return;
        setHasRecoverySession(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const onSubmit = async (values: UpdatePasswordFormValues) => {
    setServerError(null);
    setSubmitState('loading');

    if (env.useMock) {
      Alert.alert('Mock Mode', 'Password update bypassed in mock mode.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) {
        setServerError(mapUpdatePasswordError(error.message));
        setSubmitState('idle');
        return;
      }

      router.replace('/(tabs)');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setServerError(mapUpdatePasswordError(message));
      setSubmitState('idle');
    }
  };

  if (hasRecoverySession === false) {
    return (
      <ScreenContainer>
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
          Account
        </Text>
        <Text variant="h1" className="text-ink mt-2">
          Reset link expired
        </Text>
        <Text variant="body" className="text-ink-muted mt-6">
          This password reset link is no longer valid. Request a new one to continue.
        </Text>
        <SwissPressable
          accessibilityLabel="Request a new reset link"
          className="mt-12"
          onPress={() => router.replace('/auth/forgot-password' as never)}
        >
          <Text variant="body" className="text-ink underline">
            Request a new reset link
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
          Choose a new password
        </Text>
        <Text variant="body" className="text-ink-muted mt-6">
          Set a new password for your account.
        </Text>

        <Stack gap={6} className="mt-12">
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <FormInput
                ref={ref}
                label="New password"
                placeholder="Minimum 8 characters"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="next"
                textContentType="newPassword"
                testID="update-password-input"
              />
            )}
          />

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
                testID="update-password-confirm-input"
              />
            )}
          />

          {serverError ? (
            <View accessibilityLiveRegion="polite" testID="update-password-error">
              <Text variant="body-sm" className="text-signal">
                {serverError}
              </Text>
            </View>
          ) : null}

          <SwissPressable
            accessibilityLabel={submitState === 'loading' ? 'Updating password' : 'Update password'}
            className="bg-signal py-4 mt-2"
            disabled={submitState === 'loading' || hasRecoverySession !== true}
            onPress={handleSubmit(onSubmit)}
            testID="update-password-submit-button"
          >
            <Text variant="body" className="text-paper text-center font-semibold">
              {submitState === 'loading' ? 'Updating password…' : 'Update password'}
            </Text>
          </SwissPressable>

          <Box className="flex-row justify-center items-center mt-4 gap-1">
            <Text variant="body-sm" className="text-ink-muted">
              Need a fresh recovery link?
            </Text>
            <SwissPressable
              accessibilityLabel="Request a new reset link"
              onPress={() => router.replace('/auth/forgot-password' as never)}
            >
              <Text variant="body-sm" className="text-ink underline">
                Start over
              </Text>
            </SwissPressable>
          </Box>
        </Stack>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}