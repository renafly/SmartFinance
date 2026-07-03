# Pre-Production TODOs

## Email Delivery

- Remove sandbox hardcode in index.ts and send to payload email.
- Verify a production sending domain in Resend.
- Set RESEND_FROM_EMAIL to a verified domain sender (for example, invites@smartfinance.app).
- Keep RESEND_API_KEY in Supabase secrets and rotate on schedule.

## Security And Access

- Confirm only household admins and owners can trigger invites in app UI and Edge Function.
- Review RLS policies on invitation_email_logs for least privilege.
- Add rate limiting strategy for invitation sends per user and per household.

## Reliability And Observability

- Add structured logs for function start, permission check, provider request, and final status.
- Add retry policy or dead-letter workflow for transient provider failures.
- Add alerting on repeated failed sends from invitation_email_logs.

## Product UX

- Surface clear error messages in app when email send fails.
- Decide final behavior: fail invitation creation when email fails, or keep manual share fallback.
- Replace smartfinance:// invite link with production deep link handling and tested fallback URL.

## Testing

- Add integration test for success path with mocked provider response.
- Add integration test for unauthorized and forbidden paths.
- Add test for provider failure and log status transition queued -> failed.

## Operations

- Document secret setup, deployment, and rollback steps.
- Add checklist for smoke test after deployment.
- Add runbook entry for Resend outage or API errors.
