# Data-subject export and deletion workflow design

Date: 2026-07-30  
Status: implementation design only; no remote or schema changes performed.

## Design principles

- Keep “household backup” separate from “personal-data export.”
- Execute privileged Auth and cross-system cleanup only in a trusted Edge Function.
- Authenticate every request from the user JWT; never accept a user ID from the request as authority.
- Require recent authentication for deletion and consider it for export.
- Make destructive operations idempotent, resumable, observable, and auditable without copying financial content into logs.
- Do not put `SUPABASE_SERVICE_ROLE_KEY` or a secret key in Expo configuration, browser code, response payloads, or logs.
- Do not delete or disclose another household member's data merely because it shares a household.

## Export workflow

### User experience

1. User opens Privacy controls and requests an export.
2. App explains:
   - household backup versus personal export;
   - categories included;
   - shared-household redaction rules;
   - expected completion and expiry;
   - identity verification/recent-login requirement.
3. Client calls an authenticated `request-personal-data-export` Edge Function.
4. Function derives the requester from the verified JWT and creates an idempotent job.
5. Worker builds an encrypted archive or JSON bundle, writes it to a private per-user Storage path, and records checksum/expiry.
6. User receives an in-app notification and can create a short-lived signed download URL after reauthentication.
7. Archive and job payload are purged automatically after a short documented period.

### Safest server architecture

- Edge Function uses user-auth mode/RLS-scoped client for ordinary user-visible data.
- A narrowly scoped admin client is used only for `auth.users`/identity metadata and reads that cannot be expressed through RLS.
- Every privileged query is constrained to the verified caller UUID.
- For large exports, queue a background job rather than holding the request open.
- Store export artifacts in a dedicated **private** bucket, e.g. `privacy-exports/<user-id>/<job-id>.zip`.
- No public URLs. Signed URL lifetime should be short.
- Response and audit logs contain job ID, requester ID, timestamps, counts, checksum, and status—not tokens or financial values.

### Export manifest

Include, subject to legal-basis review:

- Account: profile, Auth provider/identity summary, account creation/update timestamps.
- Membership: household memberships, roles, invitations sent/requested by the user.
- Finance data authored/provided by user: accounts attributed to them, transactions/recurring rules created by them, saving-pot actions, income inputs, attachments they uploaded.
- Shared finance data visible to the user: provide a separate section with clear joint/household provenance; redact other members' email/name unless necessary.
- Support: submitted feedback, messages, events visible to the author, screenshot files.
- Notifications: in-app notification history still retained.
- Devices: native push-token registrations and browser push endpoints/metadata; mask secrets in human-readable summaries, but treat them as personal data.
- Audit: audit events attributable to the user where disclosure does not impair others' rights or security.
- Consent/preferences: cookie/similar-technology consent and stored preferences if server-side evidence exists.
- Metadata: schema version, generated time, controller contact, retention/exclusion notes, checksums.

Do not claim completeness until Auth, Storage objects, feedback, notifications, audit/invitation logs, and processor-held data are covered or explicitly documented as unavailable/exempt.

## Deletion workflow

### Preflight state machine

Use explicit states such as:

`requested -> awaiting_reauthentication -> blocked_owner_action -> scheduled -> revoking -> deleting_objects -> deleting_app_data -> deleting_auth_user -> verifying -> complete | failed`

Each transition must be idempotent. Retrying must not restore data or duplicate side effects.

### Required preflight decisions

For every accepted household membership:

- Sole owner with other members: require transfer of ownership or a deliberate household deletion decision.
- Sole member/owner:
  - if no transactions, existing `delete_household` can hard-delete the household;
  - if transactions exist, current RPC only archives it and therefore does **not** satisfy user erasure by itself.
- Non-owner member: leave membership, then determine how user attribution is anonymized in shared records.
- Pending invitations: cancel or anonymize requester/recipient data as applicable.

Shared records must survive when required for other members' legitimate use, but direct identifiers should be removed or replaced with a non-reversible tombstone where legally appropriate.

### Ordered server-side operation

1. Verify JWT and recent authentication; derive `user_id`.
2. Create/claim an idempotency record.
3. Freeze high-risk mutations for that user or mark deletion pending.
4. Optionally generate the requested final export.
5. Revoke all sessions. Account deletion alone does not immediately invalidate already-issued JWTs; sensitive endpoints should reject deletion-pending users or validate `session_id`.
6. Resolve household ownership/membership.
7. Delete user-owned Storage objects:
   - transaction attachment objects;
   - feedback screenshots;
   - pending privacy-export archive.
8. Apply documented deletion/anonymization rules to:
   - `transactions.created_by`;
   - `recurring_transactions.created_by`;
   - `saving_pots.created_by`;
   - `attachments.uploaded_by`;
   - audit logs;
   - invitation/email logs;
   - feedback events and operational delivery logs.
9. Delete personal rows that already cascade safely:
   - feedback authored by the user and dependent messages/attachments, subject to support retention decision;
   - notifications;
   - push devices and web-push subscriptions;
   - membership rows;
   - profile-dependent records.
10. Delete the profile only after all `ON DELETE RESTRICT` references are resolved.
11. Delete the Auth user with Admin API from the Edge Function.
12. Verify Auth user, profile, device registrations, Storage ownership, and direct identifiers are absent; record counts, not content.
13. Sign the client out, expire the job, and send confirmation to a separately justified contact channel if retained.

### Why Storage deletion comes first

Supabase documents that an Auth user cannot be deleted while owning Storage objects. Database cascades remove Storage metadata references only when explicitly modeled; they do not guarantee that application file bytes and all `storage.objects` ownership constraints are handled. Therefore list and delete/reassign owned objects before Admin Auth deletion.

### Failure and recovery

- Do not perform all work in an unbounded client request.
- Persist a step marker and last safe error code.
- A worker may retry idempotently.
- Never log access/refresh tokens, signed URLs, push subscription keys, attachment names containing personal data, or finance payloads.
- Alert operators on partial failures and expose a neutral status to the user.
- Maintain a legally justified minimal deletion ledger: opaque request ID, user tombstone/hash if appropriate, timestamps, result, policy version, and operator/system actor.

## Erasure matrix requiring product/legal decisions

| Data                                             | Default technical action                                     | Edge case                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `auth.users`, identities, sessions               | revoke then delete                                           | issued JWT remains valid until expiry unless sensitive endpoints check session/deletion state |
| `profiles`                                       | delete last                                                  | restricted references must be resolved first                                                  |
| sole-owned household without transactions        | hard delete                                                  | cascades database rows but Storage must be deleted separately                                 |
| household with transactions/shared members       | transfer, anonymize, or documented retention                 | current household RPC only soft-deletes                                                       |
| transactions/recurring/saving-pot creator fields | anonymize/reassign if shared record retained                 | several foreign keys use `ON DELETE RESTRICT`                                                 |
| attachments                                      | delete object then metadata, or reassign attribution         | Storage ownership can block Auth deletion                                                     |
| feedback/screenshots                             | delete or retain/anonymize per support/legal basis           | existing 30/365-day retention is not an account-deletion policy                               |
| audit logs                                       | minimize/anonymize or retain under documented security basis | avoid impairing other members' rights/security                                                |
| notifications                                    | delete                                                       | define retention for unread records                                                           |
| push devices/subscriptions                       | delete immediately                                           | endpoints/tokens are personal identifiers                                                     |
| backups/PITR                                     | age out under documented schedule                            | deletion from active DB does not instantly erase immutable backups                            |
| processor logs                                   | invoke processor procedure or age out                        | document Supabase/Vercel/Google retention                                                     |

## Implementation backlog

### P0 — prerequisites

- Approve a record-by-record erasure/retention matrix.
- Decide ownership transfer and shared-household anonymization UX.
- Capture production Supabase Auth, RLS, Storage, retention, backup, and region evidence.
- Write threat model for export/deletion endpoints.

### P1 — export

- Add privacy export job/status tables with RLS and narrow grants.
- Add private privacy-export bucket and per-user policies.
- Implement authenticated request/status/download functions.
- Add serializer with explicit column allow-lists and shared-member redaction.
- Add checksum, expiry, cleanup schedule, and tests.
- Add bilingual UI and disclosures.

### P1 — deletion

- Add deletion job/state model and deletion-pending authorization guard.
- Add authenticated request/cancel/status Edge Function.
- Add recent-auth verification.
- Implement ownership transfer/leave/anonymization operations.
- Implement Storage inventory/deletion.
- Resolve all restrictive foreign keys without weakening authorization.
- Revoke sessions, delete Auth user server-side, and verify completion.
- Add bilingual confirmation UI with typed/high-friction confirmation.

### P1 — verification

- Cross-tenant RLS tests for every exported/deleted table.
- Tests that a caller cannot choose another user ID.
- Expired/revoked JWT and stale-session tests.
- Idempotency, partial failure, retry, timeout, and concurrency tests.
- Storage traversal/path-confusion and signed-URL expiry tests.
- Assertions that logs never include tokens, push keys, signed URLs, or finance payloads.
- End-to-end staging exercise with two-member and sole-owner households.

### P2 — operations

- Rights-request SLA dashboard and escalation path.
- Processor deletion checklist.
- Backup/PITR aging disclosure.
- Scheduled verification of retention jobs.
- Evidence bundle for each release: migrations, advisors, policies, Auth settings, test results, and policy version.

## Definition of done

- Export is demonstrably complete against the approved inventory or lists justified exclusions.
- Deletion removes the Auth user, active personal rows and owned Storage objects, and applies approved anonymization to shared/retained records.
- Existing tokens cannot use sensitive operations after deletion begins.
- Operations are idempotent and recover from partial failure.
- Two-person household tests prove one user's request neither deletes nor improperly reveals the other's personal data.
- Retention in logs, backups, feedback, notifications, and processors is documented and verified.
- Legal/privacy review approves the deployed workflow and bilingual notices.
