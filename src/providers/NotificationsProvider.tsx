import { useEffect, useRef, type PropsWithChildren } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { useAuth } from "@/providers/AuthProvider";
import { useNotifications } from "@/features/notifications/hooks";
import { notificationsService } from "@/features/notifications/services/notifications.service";
import { useToast } from "./ToastProvider";

export function NotificationsProvider({ children }: PropsWithChildren) {
  const { profile } = useAuth();
  const { data = [] } = useNotifications();
  const { show } = useToast();
  const shownIds = useRef(new Set<string>());

  useEffect(() => {
    const unread = data.filter((item) => !item.read_at);
    const next = unread.find((item) => !shownIds.current.has(item.id));
    if (!next) return;
    shownIds.current.add(next.id);
    show(`${next.title}: ${next.body}`);
  }, [data, show]);

  useEffect(() => {
    if (!profile?.id || Platform.OS === "web" || !Device.isDevice) return;
    let active = true;
    const userId = profile.id;

    async function register() {
      const Notifications = await import("expo-notifications");
      Notifications.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
      });
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "SmartFinance",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      const existing = await Notifications.getPermissionsAsync();
      const permission = existing.status === "granted" ? existing : await Notifications.requestPermissionsAsync();
      if (!active || permission.status !== "granted") return;
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) return;
      let token: string;
      try {
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } catch {
        // Android push-token registration requires native Firebase configuration.
        return;
      }
      if (active && (Platform.OS === "android" || Platform.OS === "ios")) {
        await notificationsService.registerPushDevice(userId, token, Platform.OS);
      }
    }

    void register();
    return () => { active = false; };
  }, [profile?.id]);

  return <>{children}</>;
}
