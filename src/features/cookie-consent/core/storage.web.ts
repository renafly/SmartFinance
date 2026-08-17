import {
  COOKIE_CONSENT_STORAGE_KEY,
  parseStoredCookieConsent,
  type CookieConsentState,
} from "./consent";
import type { CookieConsentStorage } from "./storage";

// Language is intentionally excluded here: it's treated as a necessary
// usability preference (see src/shared/i18n/languages.ts) and isn't
// cleared when someone rejects optional cookies. Only theme remains
// gated behind the "Preferences" consent category.
const OPTIONAL_PREFERENCE_KEYS = ["kintally.theme"] as const;

function getBrowserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export const cookieConsentStorage: CookieConsentStorage = {
  read(): CookieConsentState {
    const storage = getBrowserStorage();
    if (!storage) return null;

    try {
      return parseStoredCookieConsent(
        storage.getItem(COOKIE_CONSENT_STORAGE_KEY),
      );
    } catch {
      return null;
    }
  },

  write(consent): void {
    try {
      getBrowserStorage()?.setItem(
        COOKIE_CONSENT_STORAGE_KEY,
        JSON.stringify(consent),
      );
    } catch {
      // Privacy mode and storage quotas must not prevent the app from working.
    }
  },

  clear(): void {
    try {
      getBrowserStorage()?.removeItem(COOKIE_CONSENT_STORAGE_KEY);
    } catch {
      // Treat unavailable storage as already cleared.
    }
  },
};

export function isPreferenceStorageAllowed(): boolean {
  return cookieConsentStorage.read()?.preferences === true;
}

export function clearOptionalPreferenceStorage(): void {
  const storage = getBrowserStorage();
  if (!storage) return;

  try {
    OPTIONAL_PREFERENCE_KEYS.forEach((key) => storage.removeItem(key));
  } catch {
    // Treat unavailable storage as already cleared.
  }
}
