# Privacy readiness implementation backlog

Status: engineering backlog derived from the repository audit on 2026-07-30.
Completion of these items supports privacy readiness but is not, by itself, a
legal certification.

## P0 — release and compliance-claim blockers

| Work item                                         | Owner                   | Dependency                                              | Acceptance evidence                                                                                     |
| ------------------------------------------------- | ----------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Complete controller identity and privacy contacts | Business/legal          | `legal-business-inputs.md`                              | Approved legal name, address, contact and DPO/representative decision                                   |
| Approve purpose, legal-basis and retention matrix | Product/legal/privacy   | Data inventory                                          | Every inventory row has an approved purpose, basis, retention rule and deletion action                  |
| Verify the production processor set               | Engineering/procurement | Production configuration                                | Signed-off processor register containing regions, DPAs, subprocessors and transfer safeguards           |
| Verify production Supabase security parity        | Backend/security        | Read-only project access                                | Migration parity, advisors, grants, RLS, Storage, Auth settings, Edge Function config and cron evidence |
| Decide shared-household erasure rules             | Product/legal           | Household ownership model                               | Approved transfer, leave, anonymization and retained-record behavior for each household case            |
| Publish a complete bilingual privacy notice       | Legal/product/frontend  | All controller, processor, purpose and retention inputs | Counsel-reviewed EN/PT notice matching deployed behavior                                                |
| Complete a production cookie/network audit        | Frontend/security       | Deployable web build                                    | Evidence for undecided, rejected, preferences-only, analytics-accepted and withdrawn states             |

No production UI should claim full GDPR/ePrivacy compliance until all P0 items
are complete and approved by the accountable controller.

## P1 — data-subject rights

### Personal-data export

- Add authenticated, idempotent export job and status records.
- Add a dedicated private export bucket with short-lived signed downloads.
- Derive the requester exclusively from a verified user JWT.
- Require recent authentication before download.
- Use explicit allow-lists and provenance for exported fields.
- Redact or replace other household members' identifiers where disclosure is
  not justified.
- Cover Auth identity summaries, profile, memberships, user-attributed finance
  data, feedback, notifications, devices, Storage objects and relevant audit
  records.
- Include a manifest, schema version, generation time, checksum, retention and
  justified exclusions.
- Purge archives and job payloads automatically after an approved short period.

Acceptance: two-member and sole-owner staging tests demonstrate completeness,
cross-tenant isolation, redaction, expiry and retry safety.

### Account deletion and erasure

- Add an authenticated deletion request/status Edge Function.
- Require recent authentication and high-friction confirmation.
- Use an idempotent, resumable deletion state machine.
- Mark deletion pending and prevent sensitive mutations during processing.
- Resolve household ownership before destructive work.
- Delete or reassign owned Storage objects before deleting the Auth user.
- Apply the approved matrix to shared financial rows, creator fields, feedback,
  invitation logs, audit logs and operational records.
- Delete notification and push registrations.
- Revoke sessions and ensure deletion-pending users cannot perform sensitive
  actions with an already-issued token.
- Delete the profile only after restrictive references are resolved.
- Delete the Auth user from a trusted server using Admin API credentials.
- Verify removal and retain only the approved minimal deletion ledger.

Acceptance: partial-failure, concurrency, retry, stale-token, shared-household,
Storage and cross-tenant tests pass without exposing a service-role credential.

## P1 — retention and minimization

- Define and implement a purge/anonymization policy for `audit_logs.old_data`
  and `audit_logs.new_data`.
- Remove full invitation URLs/tokens from durable invitation delivery logs;
  define a short purge period for the remaining delivery metadata.
- Define maximum retention for unread notifications and stale push devices.
- Verify feedback and notification maintenance jobs are deployed and monitored.
- Define household soft-delete aging and Storage-byte cleanup.
- Define backup/PITR aging disclosures and operational deletion verification.
- Review arbitrary notification, feedback and audit JSON for minimization and
  redaction.
- Decide whether last-seen release state belongs to the web preference-consent
  category and gate or classify it consistently.

Acceptance: every retention rule has executable cleanup, monitoring, a test and
an accountable owner.

## P1 — authentication and application security

- Record and approve production JWT expiry, inactivity timeout, maximum session
  lifetime, single-session and MFA decisions.
- Test OAuth redirect allow-lists for production web and native callbacks.
- Enforce a production Content Security Policy and verify that reports contain
  no tokens or financial content.
- Prevent authentication tokens, signed URLs, push keys and financial payloads
  from entering logs or analytics.
- Add rights-operation authorization and rate-limit tests.
- Review administrator/support access and offboarding.

Acceptance: security review has no unresolved critical/high finding in the
privacy and authentication scope.

## P2 — governance and operations

- Establish rights-request intake, identity verification, deadline tracking and
  escalation.
- Establish personal-data breach assessment and 72-hour CNPD decision tracking.
- Document processor incident and downstream deletion procedures.
- Schedule periodic access, retention, processor and transfer reviews.
- Maintain a release evidence bundle containing schema/advisor output, policy
  versions, consent tests, retention-job health and legal approvals.
- Complete a DPIA or document the approved decision that one is not required.

## Work completed in the current tranche

- Versioned web consent with separate preferences and analytics choices.
- Analytics blocked until explicit consent.
- Optional web preference persistence follows the user's choice.
- Public bilingual cookie and similar-technologies policy.
- Permanent web privacy controls in Settings.
- Code-derived personal-data inventory and processor register.
- Supabase RLS, Storage, session, export and deletion readiness audit.
- Rights workflow architecture and legal/business input checklist.

## Next engineering tranche

Do not begin destructive account deletion with assumptions. The next safe
engineering tranche is:

1. Capture production Supabase read-only evidence.
2. Obtain approved shared-household erasure and retention decisions.
3. Threat-model export/deletion.
4. Design migrations for job state, deletion-pending enforcement and private
   export storage.
5. Implement personal export before account deletion, then test both against a
   two-user staging household.
