const mockRegisterWebPushSubscription = jest.fn();

jest.mock("./services/notifications.service", () => ({
  notificationsService: {
    registerWebPushDevice: (...args: unknown[]) => mockRegisterWebPushSubscription(...args),
  },
}));

// The module must be imported after Jest installs the service mock.
// eslint-disable-next-line import/first
import { registerWebPushDevice } from "./web-push";

function setBrowserGlobals(input?: {
  permission?: NotificationPermission;
  existingSubscription?: PushSubscription | null;
}) {
  const subscription = {
    expirationTime: null,
    toJSON: () => ({
      endpoint: "https://push.example/subscription",
      keys: { p256dh: "p256dh-key", auth: "auth-key" },
    }),
  } as unknown as PushSubscription;
  const pushManager = {
    getSubscription: jest.fn(async () => input?.existingSubscription ?? null),
    subscribe: jest.fn(async () => subscription),
  };
  const serviceWorker = {
    register: jest.fn(async () => undefined),
    ready: Promise.resolve({ pushManager }),
  };
  const notification = {
    permission: input?.permission ?? "granted",
    requestPermission: jest.fn(async () => "granted" as NotificationPermission),
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { PushManager: function PushManager() {}, Notification: notification, atob },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { serviceWorker, userAgent: "SmartFinance test browser" },
  });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: notification,
  });

  return { pushManager, serviceWorker };
}

describe("registerWebPushDevice", () => {
  const originalVapidKey = process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;

  afterEach(() => {
    process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY = originalVapidKey;
    Object.defineProperty(globalThis, "window", { configurable: true, value: undefined });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: undefined });
    Object.defineProperty(globalThis, "Notification", { configurable: true, value: undefined });
  });

  it("reports unsupported outside a browser", async () => {
    Object.defineProperty(globalThis, "window", { configurable: true, value: undefined });
    await expect(registerWebPushDevice("user-id")).resolves.toBe("unsupported");
  });

  it("reports missing VAPID configuration without subscribing", async () => {
    const { pushManager } = setBrowserGlobals();
    delete process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;

    await expect(registerWebPushDevice("user-id")).resolves.toBe("unconfigured");
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("registers the worker, subscribes, and stores the subscription", async () => {
    const { pushManager, serviceWorker } = setBrowserGlobals();
    process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY = "AQAB";

    await expect(registerWebPushDevice("user-id")).resolves.toBe("registered");
    expect(serviceWorker.register).toHaveBeenCalledWith(
      "/smartfinance-notifications-sw.js",
      { scope: "/" },
    );
    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    });
    expect(mockRegisterWebPushSubscription).toHaveBeenCalledWith({
      userId: "user-id",
      endpoint: "https://push.example/subscription",
      p256dh: "p256dh-key",
      auth: "auth-key",
      expirationTime: null,
      userAgent: "SmartFinance test browser",
    });
  });
});
