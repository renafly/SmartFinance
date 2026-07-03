# send-household-invitation

Supabase Edge Function that sends household invitation emails via Resend.

## Required secrets

- RESEND_API_KEY
- RESEND_FROM_EMAIL

Example sender format:

- SmartFinance <noreply@yourdomain.com>

## Local test

1. Set secrets:
   supabase secrets set RESEND_API_KEY=... RESEND_FROM_EMAIL="SmartFinance <noreply@yourdomain.com>"
2. Run:
   supabase functions serve send-household-invitation --env-file .env

## Deploy

- supabase functions deploy send-household-invitation --project-ref <project_ref>

## Security model

- Requires authenticated JWT (Authorization header)
- Validates caller is household admin/owner through is_household_admin RPC
- Sends email only if permission check passes

## Delivery logs

Each request writes a row in public.invitation_email_logs with status lifecycle:

- queued
- sent
- failed

This provides an auditable history of invitation email deliveries and failures.
