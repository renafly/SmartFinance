import { Platform } from 'react-native';

export type AppLanguage = 'en' | 'pt';

export type LanguageOption = {
  value: AppLanguage;
  label: string;
};

const LANGUAGE_STORAGE_KEY = 'smartfinance.language';

type LanguageStorage = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
};

let languageStorage: LanguageStorage | null = null;

function getNativeStorage() {
  if (!languageStorage) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv') as {
      MMKV: new () => LanguageStorage;
    };

    languageStorage = new MMKV();
  }

  return languageStorage;
}

export const supportedLanguages: AppLanguage[] = ['en', 'pt'];

export function normalizeLanguage(value: string | null | undefined): AppLanguage | null {
  if (value === 'en' || value === 'pt') return value;
  return null;
}

export function getStoredLanguage(): AppLanguage | null {
  try {
    if (Platform.OS === 'web') {
      return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
    }

    return normalizeLanguage(getNativeStorage()?.getString(LANGUAGE_STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

export function setStoredLanguage(language: AppLanguage) {
  try {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      return;
    }

    getNativeStorage()?.set(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage failures and keep the in-memory preference.
  }
}
