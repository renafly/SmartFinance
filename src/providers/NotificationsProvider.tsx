import { useEffect, useRef, type PropsWithChildren } from "react";
import { AppState, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { useAuth } from "@/providers/AuthProvider";
import { useNotifications } from "@/features/notifications/hooks";
import { notificationsService } from "@/features/notifications/services/notifications.service";
import { registerWebPushDevice } from "@/features/notifications/web-push";
import { supabase } from "@/shared/lib/supabase/client";
import { useToast } from "./ToastProvider";

export function NotificationsProvider({ children }: PropsWithChildren) {
  const { profile } = useAuth();
  const { data = [] } = useNotifications();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const shownIds = useRef(new Set<string>());

  useEffect(() => {
    const unread = data.filter((item) => !item.read_at);
    const next = unread.find((item) => !shownIds.current.has(item.id));
    if (!next) return;
    shownIds.current.add(next.id);
    show(`${next.title}: ${next.body}`);
  }, [data, show]);

  useEffect(() => {
    if (!profile?.id) return;
    const userId = profile.id;
    const channel = supabase
      .channel(`app-notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  useEffect(() => {
    if (!profile?.id) return;
    const userId = profile.id;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      }
    });
    return () => subscription.remove();
  }, [profile?.id, queryClient]);

  useEffect(() => {
    if (Platform.OS !== "web" || !profile?.id || typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      void registerWebPushDevice(profile.id).catch(() => {
        // Diagnostics exposes setup or browser-specific registration errors.
      });
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id || Platform.OS === "web" || !Device.isDevice) return;
    let active = true;
    let receivedSubscription: { remove: () => void } | undefined;
    let responseSubscription: { remove: () => void } | undefined;
    const userId = profile.id;

    async function register() {
      const Notifications = await import("expo-notifications");
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        }),
      });
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "SmartFinance",
          importance: Notifications.AndroidImportance.HIGH,
          sound: "default",
          vibrationPattern: [0, 250, 250, 250],
        });
      }
      receivedSubscription = Notifications.addNotificationReceivedListener(() => {
        void queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      });
      responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {
        void queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      });
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
    return () => {
      active = false;
      receivedSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [profile?.id, queryClient]);

  return <>{children}</>;
}
