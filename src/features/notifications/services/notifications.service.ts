import { supabase } from "@/shared/lib/supabase/client";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  read_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

class NotificationsService {
  async listForCurrentUser() {
    await this.purgeReadNotificationsOlderThan(30);

    const { data, error } = await supabase
      .from("app_notifications")
      .select("id,title,body,type,read_at,deleted_at,created_at")
      .is("deleted_at", null)
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

  async softDelete(id: string) {
    const { error } = await supabase
      .from("app_notifications")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }

  async createTestNotification(input: {
    recipientId: string;
    title: string;
    body: string;
    householdId?: string | null;
  }) {
    const { error } = await supabase.from("app_notifications").insert({
      recipient_id: input.recipientId,
      household_id: input.householdId ?? null,
      type: "diagnostics",
      title: input.title,
      body: input.body,
      data: { source: "release-diagnostics" },
      source_key: `diagnostics-${Date.now()}`,
    });

    if (error) throw error;
  }

  async registerPushDevice(userId: string, token: string, platform: "android" | "ios") {
    const { error } = await supabase.from("push_devices").upsert(
      { user_id: userId, expo_push_token: token, platform },
      { onConflict: "expo_push_token" },
    );
    if (error) throw error;
  }

  async purgeReadNotificationsOlderThan(days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const { error } = await supabase
      .from("app_notifications")
      .delete()
      .lt("read_at", cutoff.toISOString());

    if (error) throw error;
  }
}

export const notificationsService = new NotificationsService();
