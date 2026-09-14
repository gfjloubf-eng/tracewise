/**
 * تخزين آمن للمفاتيح (مثل توكن GitHub ومفتاح AI).
 * يستخدم SecureStore على الجهاز، ويتحول لتخزين في الذاكرة على الويب/الاختبارات.
 */
import { Platform } from 'react-native';

const memory = new Map<string, string>();

let secureStore: typeof import('expo-secure-store') | null = null;
try {
  if (Platform.OS !== 'web') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    secureStore = require('expo-secure-store');
  }
} catch {
  secureStore = null;
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (secureStore) {
    await secureStore.setItemAsync(key, value);
  } else {
    memory.set(key, value);
  }
}

export async function secureGet(key: string): Promise<string | null> {
  if (secureStore) {
    try {
      return await secureStore.getItemAsync(key);
    } catch {
      return memory.get(key) ?? null;
    }
  }
  return memory.get(key) ?? null;
}

export async function secureDelete(key: string): Promise<void> {
  memory.delete(key);
  if (secureStore) {
    try {
      await secureStore.deleteItemAsync(key);
    } catch {
      /* ignore */
    }
  }
}
