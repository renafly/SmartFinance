import { Platform } from 'react-native';
import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'blue' | 'system';

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const THEME_STORAGE_KEY = 'smartfinance.theme';

type ThemeStorage = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
};

let themeStorage: ThemeStorage | null = null;

function getNativeStorage() {
  if (!themeStorage) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv') as {
      MMKV: new () => ThemeStorage;
    };

    themeStorage = new MMKV();
  }

  return themeStorage;
}

function normalizeTheme(value: string | null | undefined): ThemeMode | null {
  if (value === 'light' || value === 'dark' || value === 'blue' || value === 'system') {
    return value;
  }

  return null;
}

function getStoredTheme(): ThemeMode | null {
  try {
    if (Platform.OS === 'web') {
      return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
    }

    return normalizeTheme(getNativeStorage()?.getString(THEME_STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

function setStoredTheme(mode: ThemeMode) {
  try {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
      return;
    }

    getNativeStorage()?.set(THEME_STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures and keep the in-memory preference.
  }
}

const fallbackTheme: ThemeMode = getStoredTheme() ?? 'dark';

export const useThemeStore = create<ThemeState>((set) => ({
  mode: fallbackTheme,
  setMode: (mode) => {
    setStoredTheme(mode);
    set({ mode });
  },
}));
