# Data Encryption & Security Hardening Plan

## Context

SmartFinance is a manual household budgeting app on Supabase (managed Postgres + Auth). It does **not** link to real bank accounts (no Plaid-style integration, no stored account numbers/IBANs/credentials) — the sensitive data is limited to account names, balances, transaction amounts, titles/notes/merchant names, and category labels, all scoped per household via Row Level Security (RLS).

Two protections already exist with zero app changes required:

- **Encryption at rest** — Supabase encrypts the underlying Postgres storage volume by default. A stolen disk/backup yields nothing readable.
- **Encryption in transit** — all client↔Supabase traffic is TLS. Network sniffing yields nothing readable.

What's *not* covered by the above: a leaked service-role key, a bug in an RLS policy, a compromised admin session, or a raw SQL dump/export — any of these would currently expose plaintext. This plan is organized in four phases, roughly increasing in cost and decreasing in how much realistic risk they close for an app with this data profile.

## Phase 1 — Hardening (no schema changes, do first)

The highest-value, lowest-cost work. Closes the most common real-world "hack" vectors — encryption doesn't help against any of these, since a legitimately-authenticated attacker with RLS access reads the same plaintext either way.

1. **RLS policy audit.** Enumerate every table and confirm the `is_household_member`/`is_household_admin` gating is present and correct, with no missing `WHERE` clauses and no table left with RLS disabled unintentionally. Tables in scope: `accounts`, `transactions`, `transaction_splits`, `budget_configs`, `budget_rules`, `budget_rule_allocations`, `categories`, `saving_pots`, `saving_pot_accounts`, `recurring_transactions`, `monthly_budget_runs`, `monthly_income_inputs`, `household_members`, `invitations`, `attachments`, `notifications`, `wage_flow_categories`.
2. **SECURITY DEFINER function audit.** ~30 RPCs in `supabase/migrations/` run with elevated privilege (`save_monthly_budget_configuration`, `confirm_monthly_budget_run`, `create_transfer`, `update_completed_transfer`, etc.). Confirm every one pins `set search_path` (most already do — verify there are no stragglers, since a missing pin is a known search-path-hijack vector for definer functions) and validates household/ownership before acting, not just relying on RLS on the tables it touches internally.
3. **Secrets hygiene.** Confirm the service-role key is never bundled into the client (audit `.env`, `.env.example`, `app.config.ts`, `supabase/functions/*`); rotate it if there's any chance it was ever exposed (committed to git history, logged, etc.); confirm the `anon` key's effective access is fully bounded by RLS with no broader table grants.
4. **Rate limiting / abuse protection.** Confirm Supabase Auth's built-in rate limiting on login/password-reset/invite-accept is actually enabled, not disabled for dev convenience and left that way. Consider throttling at the Edge Function layer for the invite-accept and household-backup export endpoints specifically.
5. **Audit logging coverage.** `010_audit_logs.sql` and `20260711000300_audit_budget_rules.sql` already exist — confirm coverage extends to household-membership changes, budget confirmations, and backup exports, so a real incident is detectable after the fact.
6. **Run the `security-review` skill** against the current branch as a final pass once the above is done, to catch anything automatable that this list missed.

Estimated effort: days, not weeks. No user-facing behavior changes.

## Phase 2 — Encrypt free-text fields

Targets: `transactions.title`, `transactions.notes`, `transactions.merchant_name`.

Deliberately excludes `categories.name` — small, low-cardinality, low-sensitivity per household, and encrypting it would touch every category-label join/render across the app (~15+ files) for little real protection.

1. **Mechanism**: `pgsodium` + Supabase Vault, not raw `pgcrypto` with app-managed keys — it's the officially supported path and keeps key material out of application code.
2. **Migration**: add encrypted column variants (or use pgsodium's transparent-encryption column support), backfill existing rows, verify, then drop the plaintext columns.
3. **The hard part — search.** `list_transaction_movements`/`summarize_transaction_movements` currently do `ilike '%search%'` against title/notes/merchant_name. That doesn't work against ciphertext. Needs a separate blind-index (keyed hash of search tokens, e.g. trigrams) stored alongside the ciphertext, purely for matching — not reversible back to plaintext on its own. Worth a small spike before committing to the full migration, since this is the part most likely to have surprises.
4. **Category/title suggestion features** (`src/features/transactions/category-suggestions/`, `title-suggestions/`) currently score against historical plaintext titles server-side or via fetched rows — after encryption, this needs to decrypt client-side post-fetch (feasible; per-household dataset is small) rather than matching ciphertext.
5. **Household backup/restore** (`household-backup.service.ts`) reads/writes these columns wholesale today. Simplest path: keep them as opaque ciphertext through export/import unchanged (same key), rather than decrypt-on-export/re-encrypt-on-import — confirm this satisfies whatever backup-portability expectations exist (e.g. restoring into a different household) before committing to it.

Suggested rollout: pilot on `transactions.notes` alone first (lowest-traffic field, cheapest to unwind if something's wrong) before extending to `title`/`merchant_name`.

## Phase 3 — Encrypt amounts & balances

Targets: `transactions.amount`, `accounts.initial_balance`, `budget_rules.amount`, `budget_rule_allocations.amount`, `saving_pots.target_amount`, `monthly_income_inputs.amount`.

This is the expensive phase, because almost every reporting feature in the app currently computes directly on these numbers in SQL: the `account_balances` view, `list_transaction_movements`/`summarize_transaction_movements`'s sums and amount-range filters, Wage Flow's category-bucket math, the Monthly Budget preview/confirm engine, saving-pot forecasts. Three ways to handle it:

- **(a) Move aggregation to the client** — fetch encrypted rows, decrypt in JS, compute sums/filters/buckets there. Feasible at this app's per-household data volume, but is a genuine rewrite of every one of the code paths above. Server-side amount-range filtering (`p_min_amount`/`p_max_amount`) either goes away or has to over-fetch and filter client-side.
- **(b) Keep a parallel unencrypted aggregate** (e.g. a running-total column) for reporting while row-level detail is encrypted — preserves performance, but the aggregate itself leaks information, weakening the guarantee this phase is meant to provide.
- **(c) Order-preserving / homomorphic encryption** so SQL can sum/compare ciphertext directly — real cryptographic complexity with limited mature tooling; not recommended at this project's scale.

Recommend **(a)** if this phase is pursued, rolled out smallest-surface-first (saving-pot forecasts are already computed client-side today, so that one's nearly free) to largest (Wage Flow and the Monthly Budget engine, both deeply SQL/RPC-based).

Given the app has no bank-linking or stored credentials, this phase buys comparatively little additional real-world protection for a large amount of rework. Recommend treating it as optional, revisited only if a specific compliance requirement makes it necessary.

## Phase 4 — Full end-to-end / zero-knowledge encryption

Only relevant if there's an explicit requirement that *nobody, including us, can ever read a household's data* — a materially different bar than "protect against a breach."

- A key derived from each user's passphrase, never sent to the server, encrypts everything client-side; the server only ever stores/returns ciphertext plus whatever minimal metadata (ids, dates) must stay plaintext for joins/RLS to function.
- Every consequence from Phases 2 and 3 applies simultaneously (search, sums, filters, joins all move client-side), plus:
  - **Household sharing needs real key management** — each member needs access to the shared key (per-member key wrapping), including a defined story for adding/removing members and for a forgotten passphrase. Pure zero-knowledge systems generally mean a forgotten passphrase is unrecoverable data loss — a real product decision, not just an engineering detail.
  - All ~30 SECURITY DEFINER RPCs that currently read amounts/titles to do real work need re-evaluation or replacement.

This is a multi-week rearchitecture and its own planning exercise, not something to fold into Phases 1–3. Only take it on with a concrete driver (e.g. a specific legal/compliance requirement), not as a default "more secure is always better" choice.

## Suggested sequencing

1. **Phase 1** — now. Days of work, no user-facing risk, closes the most likely real attack paths.
2. **Phase 2** — next, piloted on `transactions.notes` before wider rollout.
3. **Phase 3** — only with a specific driver; scope and estimate separately when/if that driver appears.
4. **Phase 4** — only with an explicit zero-knowledge requirement; separate planning cycle, not a natural next step after Phase 3.
