export const COOKIE_CONSENT_VERSION = 1 as const;
export const COOKIE_CONSENT_STORAGE_KEY = "sf_cookie_consent_v1";

export type CookieConsent = {
  version: typeof COOKIE_CONSENT_VERSION;
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  decidedAt: string;
};

export type CookieConsentChoices = Pick<
  CookieConsent,
  "preferences" | "analytics"
>;

export type CookieConsentState = CookieConsent | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  return !Number.isNaN(Date.parse(value));
}

export function parseCookieConsent(value: unknown): CookieConsentState {
  if (!isRecord(value)) return null;

  if (
    value.version !== COOKIE_CONSENT_VERSION ||
    value.necessary !== true ||
    typeof value.preferences !== "boolean" ||
    typeof value.analytics !== "boolean" ||
    !isValidIsoDate(value.decidedAt)
  ) {
    return null;
  }

  return {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    preferences: value.preferences,
    analytics: value.analytics,
    decidedAt: value.decidedAt,
  };
}

export function parseStoredCookieConsent(
  serialized: string | null,
): CookieConsentState {
  if (serialized === null) return null;

  try {
    return parseCookieConsent(JSON.parse(serialized));
  } catch {
    return null;
  }
}

export function createCookieConsent(
  choices: CookieConsentChoices,
  decidedAt = new Date(),
): CookieConsent {
  return {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    preferences: choices.preferences,
    analytics: choices.analytics,
    decidedAt: decidedAt.toISOString(),
  };
}
