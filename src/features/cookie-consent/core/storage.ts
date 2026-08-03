import type { CookieConsentState } from "./consent";

export interface CookieConsentStorage {
  read(): CookieConsentState;
  write(consent: Exclude<CookieConsentState, null>): void;
  clear(): void;
}

export function isPreferenceStorageAllowed(): boolean {
  return true;
}

export function clearOptionalPreferenceStorage(): void {
  // Browser-only cleanup. Native preferences are device settings, not cookies.
}

let nativeSessionConsent: CookieConsentState = null;

// Consent applies to browser storage. Native keeps the choice in memory so
// shared UI can use the same provider without creating a persistent cookie-like
// preference on the device.
export const cookieConsentStorage: CookieConsentStorage = {
  read: () => nativeSessionConsent,
  write: (consent) => {
    nativeSessionConsent = consent;
  },
  clear: () => {
    nativeSessionConsent = null;
  },
};
