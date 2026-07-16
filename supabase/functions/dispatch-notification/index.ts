import { createClient } from "npm:@supabase/supabase-js@2.110.0";
import webpush from "npm:web-push@3.6.7";

type NotificationRecord = {
  id: string;
  recipient_id: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
};

type DatabaseWebhookPayload = {
  type: "INSERT" | string;
  table: string;
  schema: string;
  record: NotificationRecord;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function sendExpoPush(
  devices: Array<{ id: string; expo_push_token: string }>,
  notification: NotificationRecord,
  supabase: ReturnType<typeof createClient>,
) {
  if (!devices.length) return { sent: 0 };
  const messages = devices.map((device) => ({
    to: device.expo_push_token,
    sound: "default",
    priority: "high",
    channelId: "default",
    title: notification.title,
    body: notification.body,
    data: { ...(notification.data ?? {}), notificationId: notification.id },
  }));
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
  if (!response.ok) throw new Error(`Expo Push returned ${response.status}.`);
  const responseBody = (await response.json()) as {
    data?: Array<{ status: "ok" | "error"; message?: string; details?: { error?: string } }>;
  };
  const tickets = responseBody.data ?? [];
  if (tickets.length !== messages.length) {
    throw new Error("Expo Push returned an incomplete ticket response.");
  }
  const failedTickets = tickets.flatMap((ticket, index) =>
    ticket.status === "error" ? [{ ticket, device: devices[index] }] : [],
  );
  const invalidDeviceIds = failedTickets
    .filter(({ ticket }) => ticket.details?.error === "DeviceNotRegistered")
    .map(({ device }) => device?.id)
    .filter((id): id is string => Boolean(id));
  if (invalidDeviceIds.length) {
    await supabase.from("push_devices").delete().in("id", invalidDeviceIds);
  }
  const retryableFailure = failedTickets.find(
    ({ ticket }) => ticket.details?.error !== "DeviceNotRegistered",
  );
  if (retryableFailure) {
    throw new Error(retryableFailure.ticket.message ?? "Expo rejected a push notification.");
  }
  return { sent: tickets.filter((ticket) => ticket.status === "ok").length };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed." });

  const webhookSecret = Deno.env.get("NOTIFICATION_WEBHOOK_SECRET");
  const suppliedSecret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!webhookSecret || suppliedSecret !== webhookSecret) {
    return jsonResponse(401, { error: "Unauthorized." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Notification dispatch is not configured." });
  }

  const payload = (await req.json()) as DatabaseWebhookPayload;
  if (
    payload.type !== "INSERT" ||
    payload.schema !== "public" ||
    payload.table !== "app_notifications" ||
    !payload.record?.id
  ) {
    return jsonResponse(202, { ignored: true });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const [{ data: nativeDevices, error: nativeError }, { data: webDevices, error: webError }] =
    await Promise.all([
      supabase
        .from("push_devices")
        .select("id,expo_push_token")
        .eq("user_id", payload.record.recipient_id),
      supabase
        .from("web_push_subscriptions")
        .select("id,endpoint,p256dh,auth")
        .eq("user_id", payload.record.recipient_id),
    ]);

  if (nativeError || webError) {
    return jsonResponse(502, { error: "Could not load push subscriptions." });
  }

  const { data: claimed, error: claimError } = await supabase
    .from("app_notifications")
    .update({
      push_dispatch_status: "processing",
      push_dispatch_attempted_at: new Date().toISOString(),
    })
    .eq("id", payload.record.id)
    .eq("push_dispatch_status", "pending")
    .select("id,native_push_dispatched_at,web_push_dispatched_at")
    .maybeSingle();
  if (claimError) return jsonResponse(502, { error: "Could not claim notification delivery." });
  if (!claimed) return jsonResponse(200, { duplicate: true });

  try {
    const expoResult = claimed.native_push_dispatched_at
      ? { sent: 0 }
      : await sendExpoPush(nativeDevices ?? [], payload.record, supabase);
    if (!claimed.native_push_dispatched_at) {
      await supabase
        .from("app_notifications")
        .update({ native_push_dispatched_at: new Date().toISOString() })
        .eq("id", payload.record.id);
    }
    let webSent = 0;

    const vapidSubject = Deno.env.get("WEB_PUSH_VAPID_SUBJECT");
    const vapidPublicKey = Deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("WEB_PUSH_VAPID_PRIVATE_KEY");
    if (
      !claimed.web_push_dispatched_at &&
      webDevices?.length &&
      (!vapidSubject || !vapidPublicKey || !vapidPrivateKey)
    ) {
      throw new Error("Web Push VAPID secrets are not configured.");
    }
    if (
      !claimed.web_push_dispatched_at &&
      vapidSubject &&
      vapidPublicKey &&
      vapidPrivateKey &&
      webDevices?.length
    ) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      const body = JSON.stringify({
        notificationId: payload.record.id,
        title: payload.record.title,
        body: payload.record.body,
        data: payload.record.data ?? {},
      });
      const results = await Promise.allSettled(
        webDevices.map(async (device) => {
          try {
            await webpush.sendNotification(
              { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
              body,
            );
            webSent += 1;
          } catch (error) {
            const statusCode = (error as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
              await supabase.from("web_push_subscriptions").delete().eq("id", device.id);
              return;
            }
            throw error;
          }
        }),
      );
      const rejected = results.find((result) => result.status === "rejected");
      if (rejected?.status === "rejected") throw rejected.reason;
    }
    if (!claimed.web_push_dispatched_at) {
      await supabase
        .from("app_notifications")
        .update({ web_push_dispatched_at: new Date().toISOString() })
        .eq("id", payload.record.id);
    }

    await supabase
      .from("app_notifications")
      .update({
        push_dispatch_status: "delivered",
        push_dispatched_at: new Date().toISOString(),
      })
      .eq("id", payload.record.id);
    return jsonResponse(200, { ok: true, nativeSent: expoResult.sent, webSent });
  } catch (error) {
    await supabase
      .from("app_notifications")
      .update({ push_dispatch_status: "pending", push_dispatched_at: null })
      .eq("id", payload.record.id);
    return jsonResponse(502, {
      error: error instanceof Error ? error.message : "Push delivery failed.",
    });
  }
});
