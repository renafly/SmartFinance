import {
  COOKIE_CONSENT_VERSION,
  createCookieConsent,
  parseCookieConsent,
  parseStoredCookieConsent,
} from "./consent";

describe("cookie consent", () => {
  it("starts undecided for missing, malformed, and stale values", () => {
    expect(parseStoredCookieConsent(null)).toBeNull();
    expect(parseStoredCookieConsent("{")).toBeNull();
    expect(
      parseCookieConsent({
        version: COOKIE_CONSENT_VERSION + 1,
        necessary: true,
        preferences: true,
        analytics: true,
        decidedAt: "2026-07-30T10:00:00.000Z",
      }),
    ).toBeNull();
  });

  it("requires necessary consent to remain true", () => {
    expect(
      parseCookieConsent({
        version: COOKIE_CONSENT_VERSION,
        necessary: false,
        preferences: false,
        analytics: false,
        decidedAt: "2026-07-30T10:00:00.000Z",
      }),
    ).toBeNull();
  });

  it("creates a valid versioned decision", () => {
    const consent = createCookieConsent(
      { preferences: false, analytics: true },
      new Date("2026-07-30T10:00:00.000Z"),
    );

    expect(consent).toEqual({
      version: COOKIE_CONSENT_VERSION,
      necessary: true,
      preferences: false,
      analytics: true,
      decidedAt: "2026-07-30T10:00:00.000Z",
    });
    expect(parseStoredCookieConsent(JSON.stringify(consent))).toEqual(consent);
  });
});
