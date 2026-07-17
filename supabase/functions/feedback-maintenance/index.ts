import { createClient } from "npm:@supabase/supabase-js@2.110.0";

const BUCKET = "feedback-screenshots";
const BATCH_SIZE = 500;
const MAX_BATCHES = 20;

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function hasValidSecret(req: Request, expectedSecret: string) {
  const authorization = req.headers.get("authorization") ?? "";
  const suppliedSecret = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  return suppliedSecret.length === expectedSecret.length && suppliedSecret === expectedSecret;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed." });

  const maintenanceSecret = Deno.env.get("FEEDBACK_MAINTENANCE_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!maintenanceSecret || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Feedback maintenance is not configured." });
  }
  if (!hasValidSecret(req, maintenanceSecret)) {
    return jsonResponse(401, { error: "Unauthorized." });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let objectsDeleted = 0;

  for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
    const { data, error } = await supabase.rpc("list_feedback_retention_objects", {
      p_withdrawn_days: 30,
      p_closed_days: 365,
      p_limit: BATCH_SIZE,
    });
    if (error) return jsonResponse(502, { error: "Could not load retention objects." });

    const paths = ((data ?? []) as Array<{ storage_path: string }>).map(
      ({ storage_path }) => storage_path,
    );
    if (!paths.length) break;

    const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths);
    if (removeError) return jsonResponse(502, { error: "Could not remove retained screenshots." });
    objectsDeleted += paths.length;

    if (paths.length < BATCH_SIZE) break;
  }

  const { data: cleanup, error: cleanupError } = await supabase.rpc("purge_feedback_retention", {
    p_withdrawn_days: 30,
    p_closed_days: 365,
    p_delivery_days: 90,
  });
  if (cleanupError) return jsonResponse(502, { error: "Could not purge retained feedback data." });

  return jsonResponse(200, { ok: true, objectsDeleted, cleanup });
});
