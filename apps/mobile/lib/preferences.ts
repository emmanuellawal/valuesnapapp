import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';
export type NotificationsPreference = 'on' | 'off';
export type CurrencyPreference = 'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD';

const PREF_THEME = 'valuesnap:theme';
const PREF_NOTIFICATIONS = 'valuesnap:notifications';
const PREF_CURRENCY = 'valuesnap:currency';

const THEME_VALUES: readonly ThemePreference[] = ['system', 'light', 'dark'];
const NOTIFICATIONS_VALUES: readonly NotificationsPreference[] = ['on', 'off'];
const CURRENCY_VALUES: readonly CurrencyPreference[] = ['USD', 'GBP', 'EUR', 'CAD', 'AUD'];

export async function getPreference<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return defaultValue;
    }

    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export async function setPreference<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best-effort only — preference persistence should never crash the UI.
  }
}

function isAllowedValue<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
): value is T {
  return typeof value === 'string' && allowedValues.includes(value as T);
}

async function getValidatedPreference<T extends string>(
  key: string,
  defaultValue: T,
  allowedValues: readonly T[],
): Promise<T> {
  const value = await getPreference<unknown>(key, defaultValue);

  return isAllowedValue(value, allowedValues) ? value : defaultValue;
}

export async function getTheme(): Promise<ThemePreference> {
  return getValidatedPreference(PREF_THEME, 'system', THEME_VALUES);
}

export async function saveTheme(value: ThemePreference): Promise<void> {
  await setPreference(PREF_THEME, value);
}

export async function getNotifications(): Promise<NotificationsPreference> {
  return getValidatedPreference(PREF_NOTIFICATIONS, 'off', NOTIFICATIONS_VALUES);
}

export async function saveNotifications(value: NotificationsPreference): Promise<void> {
  await setPreference(PREF_NOTIFICATIONS, value);
}

export async function getCurrency(): Promise<CurrencyPreference> {
  return getValidatedPreference(PREF_CURRENCY, 'USD', CURRENCY_VALUES);
}

export async function saveCurrency(value: CurrencyPreference): Promise<void> {
  await setPreference(PREF_CURRENCY, value);
}
