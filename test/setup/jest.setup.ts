import 'react-native-gesture-handler/jestSetup';

process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'test-anon-key';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('react-native-mmkv', () => {
  const stores = new Map<string, Map<string, string | number | boolean | ArrayBuffer>>();

  function createMMKV(config: { id?: string } = {}) {
    const id = config.id ?? 'mmkv.default';
    const store = stores.get(id) ?? new Map<string, string | number | boolean | ArrayBuffer>();
    stores.set(id, store);

    return {
      id,
      getString: jest.fn((key: string) => {
        const value = store.get(key);
        return typeof value === 'string' ? value : undefined;
      }),
      set: jest.fn((key: string, value: string | number | boolean | ArrayBuffer) => {
        store.set(key, value);
      }),
      remove: jest.fn((key: string) => store.delete(key)),
      clearAll: jest.fn(() => store.clear()),
      contains: jest.fn((key: string) => store.has(key)),
      getAllKeys: jest.fn(() => [...store.keys()]),
    };
  }

  return { createMMKV };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path = '') => `smartfinance://${path}`),
  openURL: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

beforeEach(() => {
  jest.useRealTimers();
});
