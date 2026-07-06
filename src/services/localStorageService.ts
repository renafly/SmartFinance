import { MMKV } from 'react-native-mmkv';

// Single shared instance. If per-user encrypted storage is needed later,
// construct a second MMKV instance with an `id`/`encryptionKey` rather
// than repurposing this default one.
export const storage = new MMKV();

export const StorageService = {
  getString(key: string): string | undefined {
    return storage.getString(key);
  },
  setString(key: string, value: string): void {
    storage.set(key, value);
  },
  getObject<T>(key: string): T | undefined {
    const raw = storage.getString(key);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  },
  setObject<T>(key: string, value: T): void {
    storage.set(key, JSON.stringify(value));
  },
  delete(key: string): void {
    storage.delete(key);
  },
  clearAll(): void {
    storage.clearAll();
  },
};
