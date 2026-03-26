import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox, Platform } from 'react-native';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/components/useColorScheme';
import { ErrorBoundary } from '@/components/organisms/ErrorBoundary';
import { validateEnv } from '@/lib/env';

// Validate environment configuration at app startup
// Throws if required vars are missing (when not in mock mode)
validateEnv();

// Suppress known deprecation warning from react-native-screens@4.16.0:
// ScreenStackHeaderConfig passes pointerEvents="box-none" as a direct prop.
// On native this is harmless; on web/SSR react-native-web's createDOMProps
// flags it as deprecated (github.com/expo/expo/issues/33248).
// LogBox handles native; the console filter below handles web and SSR output.
// TODO: Remove once react-native-screens fixes ScreenStackHeaderConfig prop usage.
LogBox.ignoreLogs([
  'props.pointerEvents is deprecated. Use style.pointerEvents',
]);

if (Platform.OS === 'web') {
  const _consoleWarn = console.warn.bind(console);
  console.warn = (...args: Parameters<typeof console.warn>) => {
    if (typeof args[0] === 'string' && args[0].includes('props.pointerEvents is deprecated')) return;
    _consoleWarn(...args);
  };
}

// Swiss Minimalist Design Theme
// Overrides React Navigation defaults with Swiss design tokens
const SwissTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFFFFF',  // paper - pure white
    card: '#FFFFFF',        // paper - pure white  
    text: '#000000',        // ink - pure black
    border: '#E0E0E0',      // divider - light gray borders
    primary: '#E53935',     // signal - red for CTAs only
    notification: '#E53935', // signal - red for badges
  },
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : SwissTheme}>
      <ErrorBoundary>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
