# SmartFinance Release Checklist

Use this checklist before promoting a Vercel deployment to production.

## Build Gates

- Run `npx tsc --noEmit --pretty false`.
- Run `npx expo export --platform web`.
- Confirm Vercel uses `npx expo export --platform web` and `dist`.
- Confirm `vercel.json` keeps SPA rewrites for protected pages and `/invite/:token` links.
- Confirm Vercel response headers are present on `/login`, `/settings`, and `/invite/:token`.

## Environment

- Set `EXPO_PUBLIC_SUPABASE_URL`.
- Set `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Set `EXPO_PUBLIC_INVITE_WEB_URL` to the production web domain.
- Set `SUPABASE_URL` in Vercel for the server-only recurring scheduler gateway.
- Set a high-entropy `CRON_SECRET` in both Vercel and Supabase Edge Function secrets. Do not use an `EXPO_PUBLIC_` name for either value.
- Open Diagnostics in the protected drawer and run the live checks.
- Confirm the `attachments` storage bucket is reachable.
- Confirm `send-household-invitation` responds to the diagnostics preflight check.

## Recurring Automation

- Deploy `execute-recurring-movements` with `supabase functions deploy execute-recurring-movements --no-verify-jwt` after applying the recurring execution migration.
- Confirm the Edge Function has `CRON_SECRET`; Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions.
- Confirm Vercel Cron is enabled for `/api/cron/execute-recurring` on the production deployment and uses the daily `0 1 * * *` schedule on Hobby.
- Verify `/api/cron/execute-recurring` returns `401` without a valid `Authorization: Bearer <CRON_SECRET>` header.
- Verify a valid daily run creates one transaction for recurring income/expense, two linked rows for recurring transfers, and one execution-history row per scheduled occurrence.
- Verify an insufficient source balance records a skipped execution, advances the rule, and creates no partial transfer rows.
- Confirm the cron endpoint is excluded from the Expo SPA rewrite and neither `CRON_SECRET` nor the service-role key appears in web environment variables or client bundles.

## Background Notifications

- Apply migrations `20260714000300_notifications_realtime_and_cleanup.sql` and `20260714000400_notification_push_delivery.sql`.
- Deploy `dispatch-notification` with `supabase functions deploy dispatch-notification --no-verify-jwt`.
- Generate one VAPID key pair and set `WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`, and `WEB_PUSH_VAPID_SUBJECT` as Supabase Edge Function secrets.
- Set `NOTIFICATION_WEBHOOK_SECRET` as a high-entropy Supabase Edge Function secret.
- Store the dispatcher URL and the same webhook secret in Supabase Vault as `notification_dispatch_url` and `notification_webhook_secret`. The URL must end in `/functions/v1/dispatch-notification`.
- Set `EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` to the same public VAPID key in Vercel before exporting the web app.
- Configure `GOOGLE_SERVICES_JSON` as an EAS secret file containing Android Firebase `google-services.json`; `app.config.ts` maps it to `android.googleServicesFile`. Upload the matching FCM V1 service-account credential to EAS and produce a new development or release build. Remote push does not work in Expo Go.
- On web Diagnostics, grant notification permission and confirm a row appears in `web_push_subscriptions` before testing with the tab closed.
- On a physical Android device, confirm a row appears in `push_devices` before testing with the app minimized.
- Insert one `app_notifications` row and confirm one browser/Android system notification appears and the menu badge updates immediately when the app is open.
- Never expose the VAPID private key, service-role key, or webhook secret through an `EXPO_PUBLIC_` variable.

## Auth And Routing

- Open `/login` directly from the production domain.
- Sign in with Google from the production domain.
- Confirm Google OAuth JavaScript origins include the production domain.
- Confirm Supabase redirect URLs include the production domain callback flow.
- Open `/settings` while signed out and verify it redirects to login.
- After login, verify the app returns to the originally requested protected page.
- Open `/invite/:token` directly from a clean browser session.
- Accept a valid invite with the invited Google account.
- Try an invite with the wrong Google account and confirm it does not loop.

## Security Headers

- Confirm `Content-Security-Policy-Report-Only` is present before enforcing CSP.
- Review browser console CSP reports after login, invite acceptance, dashboard load, and attachment flows.
- Confirm `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `X-Frame-Options: DENY` are present.
- Confirm CSP report-only does not block Google sign-in, Supabase calls, Vercel Speed Insights, static assets, fonts, or images.
- Do not switch from report-only CSP to enforcing CSP until production smoke tests are clean.

## Responsive UI

- Verify the drawer becomes usable as a hamburger menu on small screens.
- Verify drawer content scrolls on short mobile heights.
- Verify dashboard tracker cards collapse from two columns to one on narrow screens.
- Verify accounts, transactions, settings, monthly budget, savings, transfers, categories, and members use the full available width.
- Verify table-heavy surfaces remain readable on phone width.

## Finance Semantics

- Confirm shared accounts are not attributed to the wrong member.
- Confirm saving pots backed by accounts are not double-counted in total wealth.
- Confirm transfer creation still writes double-entry transaction rows.
- Confirm scheduled transfers and monthly budget rules preserve source and destination semantics.
- Set the same strong `CRON_SECRET` in Vercel and Supabase Edge Function secrets, and set `SUPABASE_URL` in Vercel.
- Confirm the daily Vercel cron reaches `/api/cron/execute-recurring`. Hobby timing is only precise to approximately one hour, but execution is idempotent and uses the Lisbon calendar date.
- Confirm scheduled executions create one row for income/expense rules and two linked rows for transfers, without duplicates after a repeated cron invocation.
- Confirm household import/export creates a new household and does not include invoice binary files in v1.
