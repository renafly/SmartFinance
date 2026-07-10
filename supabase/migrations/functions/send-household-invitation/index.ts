import { createClient } from "npm:@supabase/supabase-js@2.108.2";

type HouseholdRole = "owner" | "admin" | "member";

type InvitePayload = {
  email: string;
  role: HouseholdRole;
  token?: string;
  inviteLink?: string;
  nativeInviteLink?: string;
  webInviteLink?: string | null;
  householdId: string;
};

type EmailLogInsert = {
  household_id: string;
  requested_by: string;
  recipient_email: string;
  recipient_role: HouseholdRole;
  invite_link: string;
  provider: "resend";
  status: "queued" | "sent" | "failed";
  error_message?: string;
  provider_message_id?: string;
  sent_at?: string;
};

const INVITE_TOKEN_PATTERN = /^invite_[A-Za-z0-9_-]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NATIVE_SCHEME = "smartfinance:";

const baseCorsHeaders = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

function normalizeHttpOrigin(value: string | null | undefined) {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    const isLocalhost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1";

    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalhost)) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function getAllowedOrigins() {
  const origins = new Set<string>();
  const csvOrigins = [
    Deno.env.get("INVITE_ALLOWED_ORIGINS"),
    Deno.env.get("ALLOWED_APP_ORIGINS"),
  ];

  for (const csv of csvOrigins) {
    for (const value of csv?.split(",") ?? []) {
      const origin = normalizeHttpOrigin(value);
      if (origin) origins.add(origin);
    }
  }

  const configuredInviteOrigin = normalizeHttpOrigin(
    Deno.env.get("INVITE_WEB_URL") ?? Deno.env.get("EXPO_PUBLIC_INVITE_WEB_URL"),
  );
  if (configuredInviteOrigin) origins.add(configuredInviteOrigin);

  const siteOrigin = normalizeHttpOrigin(Deno.env.get("SITE_URL"));
  if (siteOrigin) origins.add(siteOrigin);

  return origins;
}

function getCorsHeaders(req: Request) {
  const origin = normalizeHttpOrigin(req.headers.get("Origin"));
  const allowedOrigins = getAllowedOrigins();

  if (origin && allowedOrigins.has(origin)) {
    return {
      ...baseCorsHeaders,
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
    };
  }

  return baseCorsHeaders;
}

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function extractInviteTokenFromLink(value: string | null | undefined) {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);

    if (url.protocol === NATIVE_SCHEME) {
      if (url.hostname !== "invite" || url.search || url.hash) return null;
      const token = url.pathname.replace(/^\//, "");
      return INVITE_TOKEN_PATTERN.test(token) ? token : null;
    }

    const origin = normalizeHttpOrigin(candidate);
    if (!origin || url.search || url.hash) return null;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 2 || parts[0] !== "invite") return null;

    return INVITE_TOKEN_PATTERN.test(parts[1]) ? parts[1] : null;
  } catch {
    return null;
  }
}

function resolveInviteToken(payload: InvitePayload) {
  const candidates = [
    payload.token?.trim() ?? null,
    extractInviteTokenFromLink(payload.inviteLink),
    extractInviteTokenFromLink(payload.webInviteLink),
    extractInviteTokenFromLink(payload.nativeInviteLink),
  ].filter((token): token is string => Boolean(token));

  if (candidates.length === 0) return null;

  const [token] = candidates;
  if (!INVITE_TOKEN_PATTERN.test(token)) return null;

  return candidates.every((candidate) => candidate === token) ? token : null;
}

function resolveWebInviteOrigin(payload: InvitePayload, allowedOrigins: Set<string>) {
  const payloadWebLink = payload.webInviteLink?.trim();

  if (payloadWebLink) {
    try {
      const url = new URL(payloadWebLink);
      const origin = normalizeHttpOrigin(url.origin);
      if (origin && allowedOrigins.has(origin)) return origin;
    } catch {
      return null;
    }
  }

  return allowedOrigins.values().next().value ?? null;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." }, corsHeaders);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");

  if (!supabaseUrl || !supabaseAnonKey || !resendApiKey || !resendFromEmail) {
    return jsonResponse(500, { error: "Invitation email service is not configured." }, corsHeaders);
  }

  const rawAuthHeader =
    req.headers.get("authorization") ??
    req.headers.get("Authorization") ??
    req.headers.get("x-authorization");

  const authHeader = rawAuthHeader
    ? rawAuthHeader.startsWith("Bearer ")
      ? rawAuthHeader
      : `Bearer ${rawAuthHeader}`
    : null;

  if (!authHeader) {
    return jsonResponse(401, { error: "Unauthorized." }, corsHeaders);
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
    return jsonResponse(401, { error: "Unauthorized." }, corsHeaders);
  }

  let payload: InvitePayload;
  try {
    payload = (await req.json()) as InvitePayload;
  } catch {
    return jsonResponse(400, { error: "Invalid request." }, corsHeaders);
  }

  const requestedEmail = payload.email?.trim().toLowerCase();
  const token = resolveInviteToken(payload);

  if (
    !requestedEmail ||
    !EMAIL_PATTERN.test(requestedEmail) ||
    !payload.householdId ||
    !UUID_PATTERN.test(payload.householdId) ||
    !payload.role ||
    !token
  ) {
    return jsonResponse(400, { error: "Invalid invitation request." }, corsHeaders);
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_household_admin", {
    p_household_id: payload.householdId,
    p_user_id: userData.user.id,
  });

  if (adminError || !isAdmin) {
    return jsonResponse(403, { error: "Invitation request is not allowed." }, corsHeaders);
  }

  const { data: invitationData, error: invitationError } = await supabase
    .from("household_invitations")
    .select("id, role")
    .eq("household_id", payload.householdId)
    .eq("email", requestedEmail)
    .eq("token", token)
    .is("accepted_at", null)
    .maybeSingle();

  if (invitationError || !invitationData) {
    return jsonResponse(400, { error: "Invalid invitation request." }, corsHeaders);
  }

  const recipientEmail = requestedEmail;
  const recipientRole = invitationData.role as HouseholdRole;
  const allowedOrigins = getAllowedOrigins();
  const webInviteOrigin = resolveWebInviteOrigin(payload, allowedOrigins);
  const webInviteLink = webInviteOrigin ? `${webInviteOrigin}/invite/${token}` : null;
  const nativeInviteLink = `smartfinance://invite/${token}`;
  const primaryInviteLink = webInviteLink ?? nativeInviteLink;

  const logBase: EmailLogInsert = {
    household_id: payload.householdId,
    requested_by: userData.user.id,
    recipient_email: recipientEmail,
    recipient_role: recipientRole,
    invite_link: primaryInviteLink,
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
    return jsonResponse(500, { error: "Could not queue invitation email." }, corsHeaders);
  }

  const { data: householdData } = await supabase
    .from("households")
    .select("name")
    .eq("id", payload.householdId)
    .maybeSingle();

  const householdName = householdData?.name ?? "your household";
  const safeHouseholdName = escapeHtml(householdName);
  const safeRole = escapeHtml(recipientRole);
  const safeSubjectHouseholdName = householdName.replace(/[\r\n]+/g, " ").trim();
  const safePrimaryInviteLink = escapeHtml(primaryInviteLink);
  const safeWebInviteLink = webInviteLink ? escapeHtml(webInviteLink) : null;
  const safeNativeInviteLink = escapeHtml(nativeInviteLink);

  const webBlock = safeWebInviteLink
    ? `
      <p>If you are on desktop/web, use this link:</p>
      <p><a href="${safeWebInviteLink}">${safeWebInviteLink}</a></p>
    `
    : "";

  const nativeBlock = nativeInviteLink !== primaryInviteLink
    ? `
      <p>If you are on mobile app, use this deep link:</p>
      <p><a href="${safeNativeInviteLink}">${safeNativeInviteLink}</a></p>
    `
    : "";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <h2>You were invited to join ${safeHouseholdName}</h2>
      <p>You have been invited as <strong>${safeRole}</strong>.</p>
      <p>Click below to accept the invitation:</p>
      <p>
        <a href="${safePrimaryInviteLink}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
          Accept Invitation
        </a>
      </p>
      <p>If the button does not work, open this link:</p>
      <p><a href="${safePrimaryInviteLink}">${safePrimaryInviteLink}</a></p>
      ${webBlock}
      ${nativeBlock}
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
      to: [recipientEmail],
      subject: `Invitation to join ${safeSubjectHouseholdName || "your household"}`,
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

    return jsonResponse(502, { error: "Could not send invitation email." }, corsHeaders);
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

  return jsonResponse(
    200,
    {
      ok: true,
      provider: "resend",
      recipient: recipientEmail,
      deliveryId: resendBody?.id ?? null,
      logId: emailLogId,
    },
    corsHeaders,
  );
});
