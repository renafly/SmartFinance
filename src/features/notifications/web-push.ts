import { notificationsService } from "./services/notifications.service";

export type WebPushRegistrationResult =
  | "registered"
  | "permission-denied"
  | "unsupported"
  | "unconfigured";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export async function registerWebPushDevice(
  userId: string,
  requestPermission = false,
): Promise<WebPushRegistrationResult> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }

  const vapidPublicKey = process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return "unconfigured";

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : requestPermission
        ? await Notification.requestPermission()
        : Notification.permission;

  if (permission !== "granted") return "permission-denied";

  await navigator.serviceWorker.register(
    "/smartfinance-notifications-sw.js",
    { scope: "/" },
  );
  const activeRegistration = await navigator.serviceWorker.ready;
  const existingSubscription = await activeRegistration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await activeRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));
  const serialized = subscription.toJSON();

  if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) {
    throw new Error("The browser returned an incomplete push subscription.");
  }

  await notificationsService.registerWebPushDevice({
    userId,
    endpoint: serialized.endpoint,
    p256dh: serialized.keys.p256dh,
    auth: serialized.keys.auth,
    expirationTime: subscription.expirationTime,
    userAgent: navigator.userAgent,
  });

  return "registered";
}
