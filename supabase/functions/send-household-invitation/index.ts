import { createClient } from "npm:@supabase/supabase-js@2.108.2";

type InvitePayload = {
  email: string;
  role: "owner" | "admin" | "member";
  inviteLink: string;
  householdId: string;
};

type EmailLogInsert = {
  household_id: string;
  requested_by: string;
  recipient_email: string;
  recipient_role: "owner" | "admin" | "member";
  invite_link: string;
  provider: "resend";
  status: "queued" | "sent" | "failed";
  error_message?: string;
  provider_message_id?: string;
  sent_at?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, { error: "Missing Supabase runtime configuration." });
  }

  if (!resendApiKey || !resendFromEmail) {
    return jsonResponse(500, { error: "Missing RESEND_API_KEY or RESEND_FROM_EMAIL secret." });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(401, { error: "Missing Authorization header." });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse(401, { error: "Unauthorized user context." });
  }

  let payload: InvitePayload;
  try {
    payload = (await req.json()) as InvitePayload;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body." });
  }

  const email = payload.email?.trim().toLowerCase();
  if (!email || !payload.householdId || !payload.inviteLink || !payload.role) {
    return jsonResponse(400, { error: "Missing required fields." });
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_household_admin", {
    p_household_id: payload.householdId,
    p_user_id: userData.user.id,
  });

  if (adminError) {
    return jsonResponse(500, { error: "Could not validate household permissions." });
  }

  if (!isAdmin) {
    return jsonResponse(403, { error: "Only household admins/owners can send invitations." });
  }

  const logBase: EmailLogInsert = {
    household_id: payload.householdId,
    requested_by: userData.user.id,
    recipient_email: email,
    recipient_role: payload.role,
    invite_link: payload.inviteLink,
    provider: "resend",
    status: "queued",
  };

  const { data: queuedLog, error: queuedLogError } = await supabase
    .from("invitation_email_logs")
    .insert(logBase)
    .select("id")
    .single();

  const emailLogId = queuedLog?.id ?? null;

  if (queuedLogError) {
    return jsonResponse(500, {
      error: "Could not create invitation email log entry.",
      details: queuedLogError.message,
    });
  }

  const { data: householdData } = await supabase
    .from("households")
    .select("name")
    .eq("id", payload.householdId)
    .maybeSingle();

  const householdName = householdData?.name ?? "your household";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <h2>You were invited to join ${householdName}</h2>
      <p>You have been invited as <strong>${payload.role}</strong>.</p>
      <p>Click below to accept the invitation:</p>
      <p>
        <a href="${payload.inviteLink}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
          Accept Invitation
        </a>
      </p>
      <p>If the button does not work, open this link:</p>
      <p><a href="${payload.inviteLink}">${payload.inviteLink}</a></p>
    </div>
  `;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: [email],
      subject: `Invitation to join ${householdName}`,
      html,
    }),
  });

  if (!resendResponse.ok) {
    const resendError = await resendResponse.text();

    await supabase
      .from("invitation_email_logs")
      .update({
        status: "failed",
        error_message: resendError.slice(0, 2000),
      })
      .eq("id", emailLogId);

    return jsonResponse(502, {
      error: "Resend request failed.",
      details: resendError,
    });
  }

  const resendBody = await resendResponse.json();

  await supabase
    .from("invitation_email_logs")
    .update({
      status: "sent",
      provider_message_id: resendBody?.id ?? null,
      sent_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", emailLogId);

  return jsonResponse(200, {
    ok: true,
    provider: "resend",
    deliveryId: resendBody?.id ?? null,
    logId: emailLogId,
  });
});
