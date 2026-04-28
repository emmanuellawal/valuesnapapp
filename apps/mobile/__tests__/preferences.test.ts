/**
 * Tests for lib/preferences.ts
 * Story 5.5.3, AC6 + AC8
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getPreference,
  setPreference,
  getTheme,
  saveTheme,
  getNotifications,
  saveNotifications,
  getCurrency,
  saveCurrency,
} from '@/lib/preferences';

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe('getPreference', () => {
  it('returns the default value when the key is absent', async () => {
    const result = await getPreference('valuesnap:missing', 'fallback');

    expect(result).toBe('fallback');
  });

  it('returns the stored value after setPreference writes it', async () => {
    await setPreference('valuesnap:test-object', { enabled: true });

    const result = await getPreference('valuesnap:test-object', { enabled: false });

    expect(result).toEqual({ enabled: true });
  });

  it('returns the default value when AsyncStorage.getItem throws', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk full'));

    const result = await getPreference('valuesnap:error', 'fallback');

    expect(result).toBe('fallback');
  });
});

describe('setPreference', () => {
  it('does not throw when AsyncStorage.setItem throws', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('write failed'));

    await expect(setPreference('valuesnap:error', 'value')).resolves.toBeUndefined();
  });
});

describe('typed preference helpers', () => {
  it('persists and reads the theme preference', async () => {
    await saveTheme('dark');

    await expect(getTheme()).resolves.toBe('dark');
  });

  it('persists and reads the notifications preference', async () => {
    await saveNotifications('on');

    await expect(getNotifications()).resolves.toBe('on');
  });

  it('persists and reads the currency preference', async () => {
    await saveCurrency('EUR');

    await expect(getCurrency()).resolves.toBe('EUR');
  });

  it('falls back to the default theme when stored data is invalid', async () => {
    await AsyncStorage.setItem('valuesnap:theme', JSON.stringify('sepia'));

    await expect(getTheme()).resolves.toBe('system');
  });
});
