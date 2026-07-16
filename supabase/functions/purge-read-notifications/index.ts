import { createClient } from "npm:@supabase/supabase-js@2.110.0";

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

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!cronSecret || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Notification cleanup is not configured." });
  }

  if (!hasValidCronSecret(req, cronSecret)) {
    return jsonResponse(401, { error: "Unauthorized." });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.rpc("purge_read_notifications_older_than", {
    p_days: 30,
  });

  if (error) {
    return jsonResponse(502, { error: "Notification cleanup failed." });
  }

  return jsonResponse(200, {
    ok: true,
    deleted: typeof data === "number" ? data : 0,
  });
});
