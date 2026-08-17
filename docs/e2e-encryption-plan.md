# Phase 4 Implementation Plan: Full End-to-End (Zero-Knowledge) Encryption

## Status of this document

This expands "Phase 4" from `docs/data-encryption-security-plan.md` into a standalone implementation plan, built from a three-agent research pass over the actual schema, RPCs, and auth/sharing model (not the earlier high-level sketch). Read this before starting any work — the research surfaced two hard blockers that change the design from what a generic "add encryption" plan would look like.

**The one-sentence version:** this app authenticates exclusively via Google OAuth (no password anywhere client-side) and shares data across household members with no existing key-distribution channel. Both are solvable, but both require new product surface (a vault passphrase/recovery flow, and a member key-wrapping step on invite acceptance) before a single column gets encrypted. Budget 6-10 weeks of engineering, not "a migration."

---

## 1. Why this is hard here specifically

A generic zero-knowledge encryption plan assumes two things this app doesn't have:

1. **A user secret to derive a key from.** Most E2E designs derive the encryption key from the user's login password (Signal, Bitwarden, etc.). This app's only sign-in path is Google OAuth / ID-token exchange (`AuthProvider.tsx:210-235`, `google-sign-in-button.tsx:44-68`) — there is no password anywhere in the client, confirmed by grep across `src/`. Anthropic's research agent flagged this as the single biggest constraint. The fix is to introduce an entirely new secret — a **vault passphrase** — that has nothing to do with Supabase Auth and is never sent to the server. This is new onboarding UX, not a reuse of anything that exists today.

2. **A way to hand a shared key to a new household member.** Households share data across members (`households`/`household_members`/`household_invitations`). Today, `accept_household_invitation` (`011_invitations.sql:79-161`) runs entirely server-side from an emailed token — the invitee's client never receives anything from an existing member's device, and existing members get no signal that they need to do anything when someone joins. Real key-sharing requires either an asymmetric per-member keypair scheme (existing member wraps the household key to the new member's public key) or an out-of-band shared secret (household passphrase/QR code). Both require new UX at invite-acceptance time.

On top of those two, the schema/RPC research confirmed the scale of the rework once keys exist: four Postgres views (`account_balances`, `monthly_summary`, `saving_pot_balances`, `monthly_category_spending`) and roughly eight SECURITY DEFINER/INVOKER functions compute directly over amounts (`sum()`, comparisons, range filters) or search over free text (`ilike`) — none of that works against ciphertext, so it all has to move client-side. `list_transaction_movements`/`summarize_transaction_movements` alone power the entire Transactions screen and are the single largest piece of this rework.

Given all of that, Phase 4 is a genuine rearchitecture, not an extension of Phases 1-3. It should not be started without an explicit driver (a compliance requirement, a specific trust commitment to users) — "more secure is always better" is not sufficient justification for this scope, which is exactly what the original Phase 4 sketch already said.

---

## 2. Cryptographic design

### 2.1 Key hierarchy

Three layers, standard envelope-encryption pattern adapted for OAuth-only auth and household sharing:

- **Household Data Key (HDK)** — one random 256-bit symmetric key per household (XChaCha20-Poly1305 or AES-256-GCM), generated client-side once, on the device of whoever enables encryption for that household. This is the key that actually encrypts every row. It never changes for the life of the household (rotation is a separate, rarer operation — see §6).
- **Member Keypair** — each user gets a long-lived asymmetric keypair (X25519) generated client-side on first use of the encryption feature. The public key is stored server-side in plaintext (harmless — it's a public key). The private key is encrypted at rest with a key derived from that user's **vault passphrase** (Argon2id → symmetric key → wraps the private key) and stored server-side as ciphertext the server cannot open. This is what lets the HDK be handed to a new member without ever passing through the server in the clear: an existing member decrypts the HDK locally, re-encrypts ("wraps") it to the new member's public key, and only that wrapped blob is written server-side.
- **Vault passphrase** — new, user-chosen, independent of the Google account. Never transmitted. Used only to derive the key that unwraps a member's own private key on that device. Losing it means losing access to that member's private key and, unless another mechanism exists, permanent loss of access to the household's encrypted data for that member (see §6, recovery).

This is the standard design used by password-manager-style zero-knowledge apps (Bitwarden's org-key model is the closest analogue: an org symmetric key wrapped to each member's RSA/asymmetric keypair, itself protected by the member's master password). It's chosen over pure symmetric secret-sharing because it supports adding/removing members without re-encrypting all data (removing a member just deletes/rotates their wrap, not the HDK — unless you want forward secrecy on removal, which is a rotation, see §6).

### 2.2 New tables (additive, see accompanying migration)

- `user_keypairs` — `user_id`, `public_key` (plaintext, bytea), `wrapped_private_key` (ciphertext), `wrap_salt`, `wrap_kdf_params` (Argon2id params, so they can be tuned later without breaking old wraps), `created_at`.
- `household_key_wraps` — `household_id`, `member_user_id`, `wrapped_household_key` (the HDK encrypted to that member's public key), `wrapped_by_user_id` (audit trail — who performed the wrap), `created_at`. One row per (household, member); this is the table that grows by one row every time a member is added, and is what "revoking" a member deletes.
- `household_encryption_status` — `household_id`, `is_enabled` (bool), `enabled_at`, `enabled_by`, `migration_status` (`not_started` / `in_progress` / `completed`), `migration_progress` (jsonb, per-table row counts — see the migration script in §5). Lets the client know whether to expect ciphertext or plaintext for a given household during the transition, and gives the migration script a resume point.

### 2.3 Recovery model (must be decided before building, not after)

Pure zero-knowledge means a lost vault passphrase is, by definition, unrecoverable by the server. Three options, pick one before implementation:

- **(a) No recovery.** Simplest, most honest about "zero-knowledge." Losing the passphrase loses that member's access; other members are unaffected (their wraps are independent) and can re-invite the locked-out member as if fresh, generating a new keypair for them. Data isn't lost, just that member's access to their own wrap — they rejoin like a new member.
- **(b) Recovery code shown once at setup.** A high-entropy code (e.g. 24 words) that can independently derive/unwrap the same private key, shown once, user is told to store it offline. Still zero-knowledge (server never sees the code), but shifts the recoverability burden fully onto the user storing it safely.
- **(c) Social/admin recovery.** A household admin can re-wrap the HDK to a locked-out member after some out-of-band verification. This reintroduces a trust dependency (the admin's device must still have its own working key) and is the most user-friendly but the least "zero-knowledge-pure" — worth naming honestly rather than calling it zero-knowledge if this is chosen.

Recommendation: **(a) + (b) combined** — show a recovery code at setup (optional to save), and if it's lost too, fall back to (a)'s "rejoin as new member" behavior. This needs a product decision, not just an engineering one, since it directly trades user convenience against the security claim being made to users.

---

## 3. Encryption scope

Per the earlier scope decision (amounts & balances, names & labels, everything financial), the columns in scope are:

**Numeric (all currently summed/compared in SQL — see §4):**
`transactions.amount`, `accounts.initial_balance`, `budget_rules.amount`, `budget_rule_allocations.amount`, `saving_pots.target_amount`, `monthly_income_inputs.amount`, `transaction_splits.amount`, `account_reconciliations.statement_balance`/`ledger_balance` (and its generated `difference` column, which can't survive as a generated column once its inputs are ciphertext — becomes a client-computed value instead).

**Free text (currently searched with `ilike` — see §4):**
`transactions.title`, `transactions.notes`, `transactions.merchant_name`, `recurring_transactions.title`/`notes`, `transaction_splits.notes`, `account_reconciliations.notes`, `transaction_rules.pattern`/`normalized_pattern`/`merchant_name`, `merchant_aliases.alias`/`normalized_alias`/`merchant_name`.

**Deliberately out of scope for row encryption, handled separately:**
- `accounts.name`, `saving_pots.name`, `categories.name` — low-cardinality labels; encrypting them means every list/picker/join across ~15+ files needs decrypt-before-render, for comparatively little protection (this mirrors the Phase 2 doc's reasoning for excluding `categories.name`). Recommend deferring these to a later sub-phase once the core amount/title/notes pipeline is proven, not skipping forever, since the user's scope answer was "everything financial."
- `attachments` file bytes — a different problem (Supabase Storage, not Postgres rows). Needs client-side encrypt-before-upload using the same HDK, and `attachments.file_name`/`storage_path` need to stop being the literal original filename (currently leaks e.g. "IMG_costco_receipt.jpg"). Scope this as its own workstream after the row-encryption core lands.
- `profiles.full_name`/`email` — identity data tied to Supabase Auth itself; encrypting these breaks Auth's own use of `email` and household-invitation-by-email lookup. Out of scope; flag as a known residual plaintext surface (the server can always see who's in a household and their name/email, just not their financial data).

---

## 4. What breaks and how each piece gets redesigned

This table is the direct output of the RPC/view research agent's "hit list," re-expressed as required work. Tier 1 = must be redesigned before encryption can ship at all; Tier 2 = narrower, can follow shortly after; Tier 3 = no change needed.

**Tier 1 — core redesign:**

| Current object | Problem | Redesign |
|---|---|---|
| `account_balances` view | `initial_balance + sum(±amount)` in SQL | Delete the view. Client fetches encrypted `initial_balance` + all encrypted transaction amounts for the account, decrypts, sums locally. Needs client-side caching/memoization since this was previously a cheap DB aggregate — now it's O(transactions) work on every balance render. |
| `balance_after_transaction()` | Running balance per row, used by transaction list | Same as above — compute client-side after decrypting the account's transaction stream, in date order, once per session/cache invalidation, not per row. |
| `list_transaction_movements()` | `ilike` search on title/notes/merchant_name; amount range filter; `ORDER BY amount`/`lower(title)` | Server returns ciphertext rows filtered only by structural columns (household, account, category, date range, transfer/non-transfer). Search, amount-range filtering, and amount/title sorting all move client-side after decrypt. This is fine at household data volumes (hundreds to low thousands of transactions) but is a real behavior change: no more server-side pagination *after* a text/amount filter — client fetches a bounded window, decrypts, then filters/sorts in memory. Needs a UX check on whether "search" still feels instant once decryption is in the loop (Argon2/AEAD decrypt of a few hundred rows is milliseconds, should be fine, but budget a spike to confirm on lower-end Android devices). |
| `summarize_transaction_movements()` | `sum(amount)` over the same filtered set | Client computes income/expense/net totals over the same decrypted window used above — same function, shared code path. |
| `save_monthly_budget_configuration()` | Cent-precision split/validation of rule amounts across allocations | Move the split arithmetic entirely client-side (it already runs client-side in `monthly-budget.service.ts`'s `buildPreview()` for the preview — this becomes the *only* place it runs). The RPC becomes a passthrough: client sends already-validated, already-encrypted allocation ciphertexts; RPC only checks structural invariants (allocation count, destination accounts exist and belong to household) not amount validity. |
| `confirm_monthly_budget_run()` | Amount comparisons (`< 0`/`> 0`) and **server-composed plaintext titles** (`'Monthly wage: ' \|\| member_label`) | Title composition moves client-side (client already has the member's name from a normal query — it builds the string, encrypts it, sends ciphertext). Amount validation (e.g. "income must be positive") moves client-side; RPC trusts the client and only enforces structural correctness (right number of transaction pairs, correct transfer_group pairing, household ownership). This is a real trust-model shift worth calling out explicitly in §7. |
| `execute_due_recurring_movements()` | Service-role scheduler; insufficient-funds check compares live balance to a plaintext rule amount; runs unattended with **no client in the loop** | This is the hardest single item in the whole plan. A server-side cron job cannot decrypt anything under a true zero-knowledge design — there is no user session to hold a key. Three options: **(i)** drop the insufficient-funds pre-check server-side (create the transaction unconditionally, let balances go negative, surface an in-app warning next time the user's client decrypts and notices) — simplest, changes product behavior slightly; **(ii)** keep a coarse, separately-maintained plaintext "available headroom" flag per account that's deliberately imprecise (e.g. a boolean or bucketed range, not the real balance) so the scheduler can make an approximate call without seeing exact figures — a real leak, needs explicit sign-off since it dilutes the zero-knowledge claim for this one field; **(iii)** replace the server cron with a client-triggered "catch up on due recurring transactions" check that runs when any household member's app opens, using their session key — removes the unattended-execution guarantee (nothing runs if no one opens the app), needs a product decision on whether that's acceptable. Recommend **(i)**, it's the most honest and lowest-complexity; flag to the user for a final call. |
| `monthly_summary`, `monthly_category_spending` views | `sum(amount)` reporting | Same pattern as `account_balances` — client-side aggregation over decrypted rows, likely cached/memoized per month since these back dashboard/insights screens. |
| `saving_pot_balances` view | Depends on `account_balances`; also compares `target_amount` | Client-side, built on top of the client-side `account_balances` replacement above. |
| Wage Flow (`src/features/financial-insights/wage-flow.ts`) | Already entirely client-side today (`calculateWageFlow()` runs over fetched `transactions` rows) | No structural change — it already operates on rows fetched from the client. Just needs to decrypt `amount`/`category_id`-adjacent fields before running its existing bucketing logic. This is one of the cheaper pieces precisely because it was already client-side. |
| Saving Pot forecasting (`buildSavingPotForecasts()`) | Already client-side | Same as Wage Flow — decrypt-then-compute, no logic change. |

**Tier 2 — narrower redesign:**

| Current object | Redesign |
|---|---|
| `categorize_monthly_budget_wage()` (title `LIKE 'Monthly wage:%'` trigger) | Client already knows it just wrote a wage transaction (it's the one composing the title now, per the Tier 1 change above) — have the client set the category directly instead of relying on a server-side pattern match over now-encrypted text. |
| `create_transfer()` (3 overloads) / `update_completed_transfer()` | Mostly passthrough already (insert amount/title/notes verbatim) — fine as ciphertext blobs once the bare `if p_amount <= 0` validation moves client-side. |

**Tier 3 — no change:** `audit_trigger()` (already a blind `to_jsonb` snapshot — ciphertext flows through unexamined, though see §7 for a residual concern), all membership/invitation/notification/onboarding RPCs, all 25 feedback-system functions (confirmed zero contact with sensitive columns).

**Also needs its own workstream — Household Backup/Restore:** `household-backup.service.ts` currently exports the *decrypted* view of everything as a plaintext JSON file (it reads via the normal client, which under this design will have already decrypted rows before serializing). An unencrypted backup file completely defeats zero-knowledge the moment someone exports one. Two options: **(a)** the export re-encrypts everything under a user-supplied export passphrase (new UX: "set a password to protect this backup file"), or **(b)** the export stays as raw ciphertext + the wrapped HDK re-wrapped to that same export passphrase, so importing requires re-deriving the key. Recommend (a) for simplicity — it's a well-understood pattern (this is exactly what a password-protected zip is). Import into a *different* new household additionally needs the imported household to get a fresh HDK, since the old household's HDK/wraps aren't meaningful in the new household's member set — this is a genuinely new re-keying step in the import flow, not a copy.

---

## 5. Migration approach for existing data

**This cannot be a single SQL script.** The whole point of zero-knowledge encryption is that the server never sees plaintext, which means the server cannot be the thing that reads today's plaintext rows and writes tomorrow's ciphertext — only an authenticated client holding the HDK can do that. Any tool claiming to do this purely in SQL either isn't achieving zero-knowledge (a server-side pgcrypto call still means the server touched plaintext and a key in the same transaction) or is lying about what it does.

So the actual migration has two parts, delivered as two separate artifacts (see the accompanying files):

1. **A SQL schema migration** (`supabase/migrations/20260814120000_e2e_encryption_foundation.sql`) — purely additive: creates `user_keypairs`, `household_key_wraps`, `household_encryption_status`, and adds nullable `*_enc` (ciphertext) sibling columns next to every sensitive plaintext column identified in §3, plus a per-row `enc_version` marker so mixed plaintext/ciphertext state is queryable during the transition. Existing plaintext columns and all existing RPCs/views are left completely untouched — this migration is safe to ship independently, with zero behavior change, well before any client code reads/writes the new columns. It's the foundation the client-side tool below needs to exist.

2. **A client-side migration tool** (`src/features/security/services/e2e-migration.service.ts`, scaffolded — not fully implemented, since the underlying crypto library choice is still open per §8) — this is the actual "migration script" in the sense the request meant it, but it has to run inside an authenticated household member's session (their client is the only place the HDK can be assembled), not as a detached server-side job. It's designed to be triggered from a one-time admin-only settings screen ("Enable end-to-end encryption for this household"), and it: generates the HDK if this is the first member enabling it, wraps it to every current member's public key (generating keypairs for members who don't have one yet — which needs those members to have set a vault passphrase first, so this has a real ordering dependency across members, not just a single admin action), then walks every sensitive table in batches, encrypts each row's sensitive columns, writes to the `*_enc` columns, and updates `household_encryption_status.migration_progress` so it can resume if interrupted (mobile app backgrounded mid-migration, etc.). Plaintext columns are **not** dropped by this tool — that's a deliberate separate, later, irreversible step (see §6) done only after every household that wants encryption has completed migration and the app has been fully cut over to reading `*_enc` columns.

---

## 6. Rollout sequencing

1. **Foundation (1-2 weeks):** ship the additive SQL migration (§5.1). Zero user-facing change. Pick and spike the crypto library (see §8) against this repo's actual Expo/RN/web build, since the research agent flagged that no candidate library has been verified compatible here yet.
2. **Vault passphrase + keypair UX (1-2 weeks):** new onboarding screen for setting a vault passphrase, keypair generation, recovery-code display (per the §2.3 decision). Ships behind a feature flag, no data encrypted yet — this is purely the identity/key layer, testable in isolation.
3. **Household key-wrapping + invite flow changes (1 week):** the new "wrap HDK to new member" step, wired into invite acceptance. Testable with the foundation from step 2, still no financial data touched.
4. **Client-side crypto + Tier 1 redesigns, one at a time (3-4 weeks):** in the order listed in §4's Tier 1 table, roughly cheapest-and-most-isolated first: Wage Flow and Saving Pot forecasting (already client-side, least risky) → `account_balances`/`balance_after_transaction` replacement → `list_transaction_movements`/`summarize_transaction_movements` (biggest single piece — the whole Transactions screen) → Monthly Budget engine (`save_monthly_budget_configuration`/`confirm_monthly_budget_run`) → the recurring-scheduler decision from §4 (needs a product sign-off before building, not during).
5. **Backup/restore redesign (1 week):** per §4's "also needs its own workstream" — do this after step 4 so there's real ciphertext to correctly round-trip through an encrypted export.
6. **Data migration tool + per-household rollout (ongoing):** run the client-side migration tool (§5.2) household-by-household, starting with a small internal/test household, watching `household_encryption_status.migration_progress` for errors before wider rollout.
7. **Cutover + cleanup (separate, later, irreversible):** only after every household is migrated and the app no longer reads any plaintext sensitive column, drop the old plaintext columns in a follow-up migration. Do not schedule this until step 6 is fully complete and verified — it's the one step in this whole plan that can't be undone.

Steps 1-3 have no dependency on the final crypto library choice being perfect (they're mostly UX/schema), so they can start immediately after the spike in step 1. Steps 4-5 are the bulk of the engineering effort and match the Tier 1/Tier 2 breakdown from §4.

## 7. Residual risks and honest caveats to surface to the user

- **`confirm_monthly_budget_run()` and similar RPCs move from server-validated to client-trusted for amount correctness** (§4). A malicious or buggy client could write an inconsistent transfer pair (mismatched amounts between the two legs) that the server can no longer catch, since it can't read the amounts. Mitigate with structural checks only (transfer pairing, household ownership) — full amount-consistency validation is a real capability the app is giving up in exchange for zero-knowledge, not a free lunch.
- **`audit_logs.old_data`/`new_data`** stores a `to_jsonb` snapshot of the whole row — under this design that snapshot will contain the same ciphertext blobs as the row itself, so no plaintext leaks there, but it's worth explicitly re-confirming after implementation rather than assuming, since it's exactly the kind of place a stray plaintext field could slip through if a column is missed in §3's scope list.
- **`app_notifications.title`/`body` and the external webhook dispatch** (`dispatch_app_notification_push`/`enqueue_pending_notification_pushes`, which `net.http_post` full notification rows to an external service) currently bake plaintext amounts/titles into human-readable push copy server-side. Under zero-knowledge this has to change to generic copy ("You have a new transaction") composed server-side from structural data only, with any amount/title-specific copy generated client-side after decrypt and shown only once the push is opened. This is a real, separate small workstream not fully covered above — flagging it now so it isn't discovered late.
- **The recurring-transaction scheduler gap (§4, Tier 1)** is a genuine product-behavior change, not just an engineering detail — needs explicit sign-off on which of the three options in that row is acceptable before implementation starts.
- **Vault-passphrase recovery (§2.3)** is a security/UX tradeoff that needs a decision before the onboarding screen (rollout step 2) is built, since it changes what that screen needs to show/collect.
