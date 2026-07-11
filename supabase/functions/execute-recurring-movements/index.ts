import { createClient } from "npm:@supabase/supabase-js@2.110.0";

const LISBON_TIME_ZONE = "Europe/Lisbon";

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function hasValidCronSecret(req: Request, expectedSecret: string) {
  const authorization = req.headers.get("authorization") ?? "";
  const suppliedSecret = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  return suppliedSecret.length === expectedSecret.length && suppliedSecret === expectedSecret;
}

function getLisbonClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LISBON_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: values.hour,
  };
}

async function notifyScheduledMovementIssues(supabase: any, scheduledFor: string) {
  const { data: executions } = await supabase
    .from("recurring_run_executions")
    .select("id,status,skip_reason,error_message,recurring_transaction:recurring_transactions(created_by,title)")
    .eq("scheduled_for", scheduledFor)
    .in("status", ["skipped", "failed"]);

  const payload = (executions ?? []).flatMap((execution: any) => {
    const rule = execution.recurring_transaction;
    if (!rule?.created_by) return [];
    const reason = execution.skip_reason ?? execution.error_message ?? "scheduled_movement_failed";
    return [{
      recipient_id: rule.created_by,
      type: "scheduled_movement_issue",
      title: "Scheduled movement needs attention",
      body: `${rule.title}: ${reason}`,
      data: { url: "/transfers", executionId: execution.id },
      source_key: `recurring-execution:${execution.id}`,
    }];
  });
  if (!payload.length) return;

  const { data: created } = await supabase
    .from("app_notifications")
    .upsert(payload, { onConflict: "source_key", ignoreDuplicates: true })
    .select("recipient_id,title,body,data");
  if (!created?.length) return;

  const recipientIds = [...new Set(created.map((item: any) => item.recipient_id))];
  const { data: devices } = await supabase
    .from("push_devices")
    .select("user_id,expo_push_token")
    .in("user_id", recipientIds);
  const messages = (devices ?? []).flatMap((device: any) => {
    const notification = created.find((item: any) => item.recipient_id === device.user_id);
    return notification ? [{ to: device.expo_push_token, sound: "default", title: notification.title, body: notification.body, data: notification.data }] : [];
  });
  if (messages.length) {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!cronSecret || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Recurring execution is not configured." });
  }

  if (!hasValidCronSecret(req, cronSecret)) {
    return jsonResponse(401, { error: "Unauthorized." });
  }

  const clock = getLisbonClock();
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.rpc("execute_due_recurring_movements", {
    p_as_of_date: clock.date,
  });

  if (error) {
    return jsonResponse(502, { error: "Recurring execution failed." });
  }

  const result = Array.isArray(data) ? data[0] : data;
  await notifyScheduledMovementIssues(supabase, clock.date);
  return jsonResponse(200, {
    ok: true,
    executionDate: clock.date,
    completed: result?.completed_count ?? 0,
    skipped: result?.skipped_count ?? 0,
    failed: result?.failed_count ?? 0,
  });
});
