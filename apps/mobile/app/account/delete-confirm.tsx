import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { router } from 'expo-router';

import { FormInput } from '@/components/atoms';
import { ScreenContainer, Stack, SwissPressable, Text } from '@/components/primitives';
import { useAuth } from '@/contexts/AuthContext';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

const CONFIRM_PHRASE = 'DELETE';

export default function DeleteConfirmScreen() {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { signOut } = useAuth();

  const isConfirmed = confirmText === CONFIRM_PHRASE;

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      if (env.useMock) {
        await signOut();
        router.replace('/(tabs)');
        return;
      }

      if (!env.apiUrl) {
        throw new Error('API URL is not configured');
      }

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setDeleteError('Session expired. Please sign in again.');
        setIsDeleting(false);
        return;
      }

      const response = await fetch(`${env.apiUrl}/api/account`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }

      await signOut();
      router.replace('/(tabs)');
    } catch {
      setDeleteError('Account deletion failed. Please try again.');
      setIsDeleting(false);
    }
  };

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
          Delete Account
        </Text>

        <Text
          variant="body"
          className="text-ink mt-12"
          testID="delete-confirm-warning"
        >
          This will permanently delete all your valuations and account data. This action cannot
          be undone.
        </Text>

        <Stack gap={6} className="mt-8">
          <FormInput
            label='Type "DELETE" to confirm'
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            testID="delete-confirm-input"
            accessibilityLabel="Type DELETE to confirm account deletion"
          />

          <SwissPressable
            onPress={handleDelete}
            disabled={!isConfirmed || isDeleting}
            accessibilityLabel={isDeleting ? 'Deleting account' : 'Permanently delete my account'}
            className="py-4 border-b border-divider"
            testID="delete-confirm-button"
          >
            <Text variant="body" className="text-signal">
              {isDeleting ? 'Deleting…' : 'Delete My Account'}
            </Text>
          </SwissPressable>

          {deleteError ? (
            <View accessibilityLiveRegion="polite" testID="delete-confirm-error">
              <Text variant="body-sm" className="text-signal">
                {deleteError}
              </Text>
            </View>
          ) : null}

          <SwissPressable
            onPress={() => router.back()}
            accessibilityLabel="Cancel account deletion and go back"
            className="py-4 border-b border-divider"
            testID="delete-confirm-cancel-button"
          >
            <Text variant="body" className="text-ink">
              Cancel
            </Text>
          </SwissPressable>
        </Stack>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}