import React, { forwardRef } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { Text } from '@/components/primitives';

export interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
}

/**
 * FormInput — Swiss Minimalist text input with label and inline error.
 *
 * Bottom-border only (no box) — authentic Swiss typographic form.
 * Error border uses signal color. Forwards ref for react-hook-form Controller.
 *
 * @see Story 4.2: Implement User Registration
 */
export const FormInput = forwardRef<TextInput, FormInputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <View accessibilityRole="none">
        <Text
          variant="caption"
          className="text-ink-muted uppercase tracking-wide mb-2"
        >
          {label}
        </Text>
        <TextInput
          ref={ref}
          className={[
            'border-b py-3 text-body',
            'text-ink bg-paper',
            error ? 'border-signal' : 'border-ink',
            className ?? '',
          ].join(' ')}
          placeholderTextColor="#9E9E9E"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={label}
          {...props}
        />
        {error ? (
          <Text variant="caption" className="text-signal mt-1">
            {error}
          </Text>
        ) : null}
      </View>
    );
  },
);

FormInput.displayName = 'FormInput';
