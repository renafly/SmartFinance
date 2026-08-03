import { act, renderHook } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";
import {
  CookieConsentProvider,
  useCookieConsent,
} from "./CookieConsentProvider";
import { COOKIE_CONSENT_VERSION, type CookieConsent } from "./consent";
import { cookieConsentStorage } from "./storage";

jest.mock("./storage", () => ({
  clearOptionalPreferenceStorage: jest.fn(),
  cookieConsentStorage: {
    read: jest.fn(),
    write: jest.fn(),
    clear: jest.fn(),
  },
}));

const storage = cookieConsentStorage as jest.Mocked<
  typeof cookieConsentStorage
>;

function wrapper({ children }: PropsWithChildren) {
  return <CookieConsentProvider>{children}</CookieConsentProvider>;
}

describe("CookieConsentProvider", () => {
  beforeEach(() => {
    storage.read.mockReturnValue(null);
  });

  it("starts undecided when no valid decision is stored", async () => {
    const { result } = await renderHook(() => useCookieConsent(), { wrapper });

    expect(result.current.consent).toBeNull();
    expect(result.current.status).toBe("undecided");
  });

  it("restores a persisted decision", async () => {
    const persisted: CookieConsent = {
      version: COOKIE_CONSENT_VERSION,
      necessary: true,
      preferences: true,
      analytics: false,
      decidedAt: "2026-07-30T10:00:00.000Z",
    };
    storage.read.mockReturnValue(persisted);

    const { result } = await renderHook(() => useCookieConsent(), { wrapper });

    expect(result.current.consent).toEqual(persisted);
    expect(result.current.status).toBe("decided");
  });

  it("accepts and persists all optional categories", async () => {
    const { result } = await renderHook(() => useCookieConsent(), { wrapper });

    await act(async () => {
      result.current.acceptAll();
    });

    expect(result.current.consent).toEqual(
      expect.objectContaining({
        version: COOKIE_CONSENT_VERSION,
        necessary: true,
        preferences: true,
        analytics: true,
      }),
    );
    expect(storage.write).toHaveBeenCalledWith(result.current.consent);
  });

  it("rejects and persists all optional categories", async () => {
    const { result } = await renderHook(() => useCookieConsent(), { wrapper });

    await act(async () => {
      result.current.rejectOptional();
    });

    expect(result.current.consent).toEqual(
      expect.objectContaining({
        necessary: true,
        preferences: false,
        analytics: false,
      }),
    );
    expect(storage.write).toHaveBeenCalledWith(result.current.consent);
  });

  it("persists granular category choices", async () => {
    const { result } = await renderHook(() => useCookieConsent(), { wrapper });

    await act(async () => {
      result.current.savePreferences({
        preferences: true,
        analytics: false,
      });
    });

    expect(result.current.consent).toEqual(
      expect.objectContaining({
        necessary: true,
        preferences: true,
        analytics: false,
      }),
    );
    expect(storage.write).toHaveBeenCalledWith(result.current.consent);
  });

  it("clears a persisted decision and returns to undecided", async () => {
    storage.read.mockReturnValue({
      version: COOKIE_CONSENT_VERSION,
      necessary: true,
      preferences: true,
      analytics: true,
      decidedAt: "2026-07-30T10:00:00.000Z",
    });
    const { result } = await renderHook(() => useCookieConsent(), { wrapper });

    await act(async () => {
      result.current.resetConsent();
    });

    expect(storage.clear).toHaveBeenCalledTimes(1);
    expect(result.current.consent).toBeNull();
    expect(result.current.status).toBe("undecided");
  });
});
