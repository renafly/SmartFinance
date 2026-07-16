import { Platform } from 'react-native';

type NativeStorage = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
};

let nativeStorage: NativeStorage | null = null;

function getNativeStorage() {
  if (!nativeStorage) {
    // Keep the native dependency out of the web bundle.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv') as { MMKV: new () => NativeStorage };
    nativeStorage = new MMKV();
  }

  return nativeStorage;
}

export function getPersistentString(key: string) {
  try {
    if (Platform.OS === 'web') {
      return typeof window === 'undefined' ? null : window.localStorage?.getItem(key) ?? null;
    }

    return getNativeStorage().getString(key) ?? null;
  } catch {
    return null;
  }
}

export function setPersistentString(key: string, value: string) {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage?.setItem(key, value);
      return;
    }

    getNativeStorage().set(key, value);
  } catch {
    // Storage is an enhancement; UI state remains usable if it is unavailable.
  }
}
