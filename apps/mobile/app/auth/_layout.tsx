import { Stack } from 'expo-router';

/**
 * Auth Layout — Stack navigator for all auth screens (register, sign-in, OAuth).
 *
 * Outer Stack in app/_layout.tsx has `headerShown: false` for "auth" group,
 * so this inner Stack fully controls header appearance.
 *
 * Swiss header: white background, black text, no shadow.
 *
 * @see Story 4.2: Implement User Registration
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#000000',
        headerShadowVisible: false,
        headerBackTitle: 'Back',
      }}
    />
  );
}
