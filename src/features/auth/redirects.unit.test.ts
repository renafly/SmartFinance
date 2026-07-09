import {
  buildCurrentRedirectTo,
  consumePendingRedirectTo,
  normalizeRedirectTo,
  peekPendingRedirectTo,
  storePendingRedirectTo,
} from "./redirects";

function installWindow(pathname = "/(protected)/accounts", search = "", hash = "") {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: jest.fn((key: string) => store.get(key) ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: jest.fn((key: string) => {
      store.delete(key);
    }),
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { pathname, search, hash },
      sessionStorage,
    },
  });

  return sessionStorage;
}

describe("auth redirect helpers", () => {
  afterEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: undefined,
    });
  });

  it("normalizes protected redirects and rejects public auth targets", () => {
    expect(normalizeRedirectTo(" /(protected)/transactions?month=2026-07 ")).toBe(
      "/(protected)/transactions?month=2026-07",
    );
    expect(normalizeRedirectTo(["/(protected)/budget", "/(protected)/accounts"])).toBe("/(protected)/budget");

    expect(normalizeRedirectTo("https://example.com/(protected)")).toBeNull();
    expect(normalizeRedirectTo("//example.com/(protected)")).toBeNull();
    expect(normalizeRedirectTo("/login?redirectTo=/(protected)/accounts")).toBeNull();
    expect(normalizeRedirectTo("/google-auth?code=abc")).toBeNull();
    expect(normalizeRedirectTo("/(auth)/login")).toBeNull();
    expect(normalizeRedirectTo("/(public)/invite/token")).toBeNull();
  });

  it("stores, peeks, and consumes a pending protected redirect", () => {
    const sessionStorage = installWindow();

    expect(storePendingRedirectTo("/(protected)/transactions?filter=income")).toBe(
      "/(protected)/transactions?filter=income",
    );
    expect(sessionStorage.setItem).toHaveBeenCalledWith(
      "smartfinance.pendingRedirectTo",
      "/(protected)/transactions?filter=income",
    );

    expect(peekPendingRedirectTo()).toBe("/(protected)/transactions?filter=income");
    expect(consumePendingRedirectTo()).toBe("/(protected)/transactions?filter=income");
    expect(sessionStorage.removeItem).toHaveBeenCalledWith("smartfinance.pendingRedirectTo");
    expect(peekPendingRedirectTo()).toBeNull();
  });

  it("does not store rejected targets and falls back after consume", () => {
    const sessionStorage = installWindow();

    expect(storePendingRedirectTo("/google-auth")).toBeNull();
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
    expect(consumePendingRedirectTo("/login")).toBe("/(protected)");
  });

  it("builds the current redirect from window location or route params", () => {
    installWindow("/(protected)/budget", "?month=2026-07", "#preview");

    expect(buildCurrentRedirectTo("/ignored")).toBe("/(protected)/budget?month=2026-07#preview");

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: undefined,
    });

    expect(buildCurrentRedirectTo("/(protected)/transactions", { type: "expense", tag: ["food", "home"] })).toBe(
      "/(protected)/transactions?type=expense&tag=food&tag=home",
    );
  });
});
