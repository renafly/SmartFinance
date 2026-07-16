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
    const { data, error } = await supabase
      .from("app_notifications")
      .insert({
        recipient_id: input.recipientId,
        household_id: input.householdId ?? null,
        type: "diagnostics",
        title: input.title,
        body: input.body,
        data: { source: "release-diagnostics" },
        source_key: `diagnostics-${Date.now()}`,
      })
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  }

  async waitForPushDispatch(id: string, timeoutMs = 12_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const { data, error } = await supabase
        .from("app_notifications")
        .select("push_dispatch_status")
        .eq("id", id)
        .single();
      if (error) throw error;
      if (data.push_dispatch_status === "delivered") return;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("Push delivery was not confirmed by the backend.");
  }

  async registerPushDevice(userId: string, token: string, platform: "android" | "ios") {
    const { error } = await supabase.from("push_devices").upsert(
      { user_id: userId, expo_push_token: token, platform },
      { onConflict: "expo_push_token" },
    );
    if (error) throw error;
  }

  async registerWebPushDevice(input: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    expirationTime: number | null;
    userAgent: string;
  }) {
    const { error } = await supabase.from("web_push_subscriptions").upsert(
      {
        user_id: input.userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        expiration_time: input.expirationTime,
        user_agent: input.userAgent,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw error;
  }
}

export const notificationsService = new NotificationsService();
