import { supabase } from "@/shared/lib/supabase/client";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  read_at: string | null;
  created_at: string;
};

class NotificationsService {
  async listForCurrentUser() {
    const { data, error } = await supabase
      .from("app_notifications")
      .select("id,title,body,type,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as AppNotification[];
  }

  async markRead(id: string) {
    const { error } = await supabase
      .from("app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }

  async registerPushDevice(userId: string, token: string, platform: "android" | "ios") {
    const { error } = await supabase.from("push_devices").upsert(
      { user_id: userId, expo_push_token: token, platform },
      { onConflict: "expo_push_token" },
    );
    if (error) throw error;
  }
}

export const notificationsService = new NotificationsService();
