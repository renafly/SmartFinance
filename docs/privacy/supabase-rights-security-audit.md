# Supabase privacy, rights, and security audit

Date: 2026-07-30  
Scope: repository-only review; no remote Supabase state, schema, data, Auth settings, Vault secrets, logs, advisors, or deployed function configuration was changed or verified.

## Executive assessment

Kintally has a comparatively strong RLS baseline and has explicitly hardened views, grants, RPC execution, attachment storage, feedback storage, notifications, and service-only maintenance. It does **not** yet provide a complete GDPR data-subject export or account-erasure workflow.

The principal blocker is architectural: the client can delete household data, but it cannot safely delete its own `auth.users` record. A trusted server boundary is required for Auth-user deletion and for complete export of Auth identity data. The existing household backup is useful portability functionality, but it is not a complete Article 15/20 export and must not be described as one.

## Findings

### SR-01 — No authenticated account-deletion workflow

Severity: **Critical compliance gap**

Evidence:

- `src/providers/AuthProvider.tsx:46-58` exposes sign-in, logout, and refresh only.
- `src/providers/AuthProvider.tsx:216-231` signs out but does not delete or revoke the account.
- Repository search finds no `auth.admin.deleteUser`, account deletion route, or Edge Function.
- `supabase/migrations/020_household_deletion.sql:79-146` deletes or archives a household, not a user.

Impact:

- A user cannot exercise self-service erasure.
- Deleting a household with transactions only sets `households.deleted_at`; the finance records remain (`020_household_deletion.sql:122-144`).
- Deleting an Auth user requires privileged Auth Admin access and cannot safely be performed in the Expo client.

Required action:

- Add a dedicated authenticated Edge Function for deletion.
- Require a fresh/recent session or explicit reauthentication.
- Resolve shared-household ownership and retention decisions before destructive work.
- Revoke sessions and delete Storage objects before deleting the Auth user.
- Never expose a service-role/secret key to `EXPO_PUBLIC_*`.

### SR-02 — Household backup is not a complete personal-data export

Severity: **High**

Evidence:

- Export queries household, members/profile names and emails, accounts, categories, saving pots, transactions, recurring rules, budgets, and attachment metadata (`src/features/household-backup/services/household-backup.service.ts:981-1142`).
- The output contains other household members' email addresses and names (`:488-496`).
- Attachment records are exported, but the binary invoice/files are not bundled; the UI disclosure confirms this in `src/locales/en/common.json:377`.
- The export does not include Auth identities/session/account metadata, feedback and screenshots, feedback messages/events, audit logs, invitation/email logs, app notifications, push devices, web-push subscriptions, consent evidence, or processor-side logs.

Impact:

- It is a household backup/import format, not a scoped personal-data access/portability response.
- Any household member who can invoke it may receive other members' identifying data under current household-member RLS. That may fit household collaboration but requires a clear disclosure and a purpose/authorization review.
- A household export cannot distinguish “data provided by this requester” from data jointly created or owned by other members.

Required action:

- Keep the current feature labeled “household backup.”
- Build a separate personal-data export with a manifest, provenance, timestamps, and explicit exclusions.
- For a user-only export, minimize other members to opaque IDs or necessary relationship labels unless disclosure is justified.

### SR-03 — Auth/session settings are not evidenced as production-hardened

Severity: **High**

Evidence:

- Client sessions persist and auto-refresh in `AsyncStorage` (`src/shared/lib/supabase/client.ts:30-36`).
- Native callbacks can receive access and refresh tokens and pass them to `setSession` (`src/providers/AuthProvider.tsx:22-40`).
- Local `supabase/config.toml:271-276` leaves session timebox and inactivity timeout commented out.
- Logout correctly calls `supabase.auth.signOut()` (`AuthProvider.tsx:216-230`), but repository state cannot prove production JWT expiry, inactivity, timebox, single-session, MFA, redirect allow-list, or leaked-password settings.

Impact:

- Default Supabase sessions can be indefinite and multi-device.
- A finance application warrants explicit, tested session policy and callback/redirect review.

Required action:

- Record production Auth settings as deploy evidence.
- Select a defensible JWT expiry, inactivity timeout, and maximum lifetime.
- Require recent authentication for export/deletion and other high-risk actions.
- Test session revocation and callback URL allow-listing on web and native.

### SR-04 — Strong RLS hardening exists, but deployed parity is unverified

Severity: **Medium (verification gap)**

Evidence:

- The hardening migration enables RLS across exposed finance tables and makes views `security_invoker` (`supabase/migrations/20260710000100_security_rls_rpc_hardening.sql:13-49`).
- It revokes anonymous table access and limits RPC execution (`:55-176`).
- Household row access is based on accepted membership and ignores soft-deleted households (`supabase/migrations/020_household_deletion.sql:11-77`).
- Current Supabase guidance requires RLS on exposed schemas and warns that service keys bypass RLS.

Impact:

- Static migration review cannot prove the remote database matches migration history, that every exposed table/view is covered, or that no Dashboard-created objects/policies exist.

Required action:

- Before release, compare remote migration state, run database/security advisors, enumerate exposed tables/views/functions and grants, and execute cross-tenant contract tests against a disposable or staging project.

### SR-05 — Attachment Storage access is well constrained; deletion/export lifecycle is incomplete

Severity: **High**

Evidence:

- The attachments bucket is private with MIME and 10 MB limits (`supabase/migrations/20260710000200_attachment_storage_privacy.sql:5-15`).
- Object paths are validated against a transaction and accepted household membership for insert/select/delete (`:57-104`).
- No update policy is present, so overwrite/upsert is intentionally unavailable.
- Attachment metadata references `uploaded_by ... on delete restrict` (`supabase/migrations/009_attachments.sql:5-12`).

Impact:

- Auth user deletion can fail indirectly because profile deletion is restricted by attachment ownership references.
- Supabase also refuses Auth-user deletion while that user owns Storage objects.
- Household soft deletion leaves files and metadata present unless a retention/purge process is added.

Required action:

- Deletion workflow must inventory and delete/reassign owned Storage objects and handle `attachments.uploaded_by`.
- Personal export should either include authenticated downloads or a documented manifest/exclusion.
- Add a household/account retention purge design; do not rely on database cascades to delete Storage bytes.

### SR-06 — Feedback has deliberate access controls and retention, but must join rights workflows

Severity: **Medium**

Evidence:

- Feedback tables have RLS and direct client table grants are revoked (`supabase/migrations/20260717000100_feedback_system.sql:274-350`).
- User and admin operations are exposed through specifically granted RPCs (`:1751-1792`).
- Screenshots use authenticated, path-scoped Storage policies (`:405-474`).
- Maintenance removes screenshot objects and purges withdrawn/closed feedback on 30/365-day schedules; delivery records use 90 days (`supabase/functions/feedback-maintenance/index.ts:42-69`).
- Feedback rows and messages cascade from profiles, while some event actor references become null (`20260717000100_feedback_system.sql:44-216`).

Impact:

- Existing retention is a good baseline, but user export currently omits feedback.
- Account deletion must decide whether support/audit evidence is deleted, anonymized, or retained under a documented legal basis.

Required action:

- Include authored feedback/messages and attachment manifest/files in the rights export.
- Before profile deletion, run the documented anonymization/retention decision for feedback events and delivery records.

### SR-07 — Notifications and push identifiers are protected but omitted from export

Severity: **Medium**

Evidence:

- Notifications are recipient-scoped and direct grants are narrow (`supabase/migrations/20260710000500_notifications.sql:21-34`).
- Native push tokens and web-push endpoints/keys are owner-scoped with RLS (`:36-59`; `supabase/migrations/20260714000400_notification_push_delivery.sql:2-29`).
- Read notifications have a 30-day purge path (`supabase/functions/purge-read-notifications/index.ts:22-57`).
- Dispatch uses service role only after a separate webhook-secret check (`supabase/functions/dispatch-notification/index.ts:73-100`).

Impact:

- Push tokens/endpoints are personal identifiers and need inventory, export policy, and deletion coverage.
- Unread notifications do not appear to have an explicit maximum retention in repository evidence.

Required action:

- Delete all push devices/subscriptions during account deletion (profile cascades provide a fallback).
- Include notification history or disclose its exclusion/retention basis in access responses.
- Set and document retention for unread/undelivered notifications.

### SR-08 — Service-role functions are not publicly usable by design; deployment controls need evidence

Severity: **Medium**

Evidence:

- Several cron/webhook functions set `verify_jwt = false` (`supabase/config.toml:385-389`; function-specific configs), then compare a separate bearer secret before creating a service-role client.
- `dispatch-notification` verifies `NOTIFICATION_WEBHOOK_SECRET` (`supabase/functions/dispatch-notification/index.ts:73-100`).
- Purge and recurring functions similarly verify `CRON_SECRET`.
- Service-role keys exist only in Edge Function environment lookups; the browser client explicitly uses a publishable key and warns against service role (`src/shared/lib/supabase/client.ts:17-36`).

Impact:

- The design can be safe for service-to-service calls, but correctness depends on secret strength, rotation, Vault configuration, deploy parity, and log redaction.
- Simple string equality is used; remote rate limiting/WAF controls are not evidenced.

Required action:

- Verify deployed `verify_jwt` settings and secret rotation procedure.
- Prefer current Supabase secret-key/service-auth patterns for new server-only functions.
- Add request size limits, structured audit metadata without payload secrets, and rate limiting where internet-exposed.

## Positive controls

- No service-role key is present in the public client.
- RLS is explicitly enabled for core and later feature tables.
- Views are converted to `security_invoker`.
- Security-definer RPCs generally set a controlled `search_path`, perform `auth.uid()`/role checks, revoke `PUBLIC`, and grant specific roles.
- Attachment and feedback buckets are private and path/relationship scoped.
- Notification and feedback maintenance separate privileged service operations from end-user operations.
- Dependencies in Edge Functions are version pinned.

## Required remote verification

This audit cannot support a production-compliance claim until the following read-only evidence is captured from the linked project:

1. Migration list and schema drift.
2. Database security and performance advisors.
3. Exposed schemas, table/view/function grants, RLS enabled flags, and policy definitions.
4. Storage bucket privacy, object ownership, and policies.
5. Auth JWT expiry, timebox, inactivity, single-session, MFA, OAuth redirect allow-list, and provider settings.
6. Deployed Edge Function `verify_jwt` configuration and secret rotation dates.
7. Cron job state and last successful retention runs.
8. Region, backups/PITR retention, log retention, subprocessors, and DPA/transfer documentation.

## Official Supabase references reviewed

- Supabase changelog index (review attempted as required; direct markdown fetch was unavailable in the browsing environment, and no relevant breaking-change result was identified).
- User sessions: https://supabase.com/docs/guides/auth/sessions
- User management/deletion: https://supabase.com/docs/guides/auth/managing-user-data
- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Securing Edge Functions: https://supabase.com/docs/guides/functions/auth
- Authorization headers: https://supabase.com/docs/guides/functions/auth-headers
