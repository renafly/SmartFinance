const { timingSafeEqual } = require("node:crypto");

function hasValidCronSecret(authorization, expectedSecret) {
  if (!expectedSecret || !authorization?.startsWith("Bearer ")) return false;

  const suppliedSecret = authorization.slice("Bearer ".length);
  const suppliedBuffer = Buffer.from(suppliedSecret);
  const expectedBuffer = Buffer.from(expectedSecret);

  return suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!cronSecret || !supabaseUrl) {
    res.status(500).json({ error: "Recurring execution is not configured." });
    return;
  }

  if (!hasValidCronSecret(req.headers.authorization, cronSecret)) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/execute-recurring-movements`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(55_000),
  });

  if (!response.ok) {
    res.status(502).json({ error: "Recurring execution gateway failed." });
    return;
  }

  const result = await response.json();
  res.status(200).json(result);
};
