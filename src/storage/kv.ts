/**
 * طبقة التخزين المحلي — AsyncStorage (يعمل بدون إنترنت تمامًا).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  CASES: 'tw_cases_v1',
  SETTINGS: 'tw_settings_v1',
  SECURITY_LOG: 'tw_security_log_v1',
} as const;

export async function loadJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
