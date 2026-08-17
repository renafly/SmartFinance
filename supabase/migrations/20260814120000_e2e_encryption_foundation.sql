-- ============================================================
-- E2E / zero-knowledge encryption — additive foundation
-- ============================================================
-- See docs/e2e-encryption-plan.md for the full design and rollout plan.
--
-- IMPORTANT: this migration is intentionally a no-op for every existing
-- feature. It only ADDS new tables and new nullable columns. No existing
-- column, view, RPC, or RLS policy is dropped or changed, and no existing
-- plaintext column is touched. It is safe to ship independently of any
-- client-side crypto work landing.
--
-- This migration cannot, by itself, encrypt anything — the server must
-- never see the household data key (HDK) or any plaintext, so only an
-- authenticated client can populate the new "*_enc" columns below. See
-- src/features/security/services/e2e-migration.service.ts for the
-- client-side counterpart that actually performs the data migration.
--
-- Plaintext columns are deliberately left in place after this migration.
-- Dropping them is a separate, later, irreversible migration that should
-- only be written once every household that wants encryption has finished
-- migrating and the app no longer reads any plaintext sensitive column
-- (see docs/e2e-encryption-plan.md §6, step 7).

-- ------------------------------------------------------------
-- 1. Key management tables
-- ------------------------------------------------------------

-- One row per user. Public key is plaintext (harmless). The private key is
-- only ever stored wrapped (encrypted) with a key derived from that user's
-- vault passphrase — a secret the server never receives.
create table if not exists public.user_keypairs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  public_key bytea not null,
  wrapped_private_key bytea not null,
  wrap_salt bytea not null,
  wrap_kdf_params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_keypairs is
  'X25519 (or equivalent) keypair per user for E2E encryption. wrapped_private_key is ciphertext the server cannot open — see docs/e2e-encryption-plan.md §2.1.';
comment on column public.user_keypairs.wrap_kdf_params is
  'Argon2id (or chosen KDF) parameters used to derive the wrapping key from the vault passphrase, stored so params can be tuned later without breaking old wraps.';

-- One row per (household, member): the household data key (HDK), encrypted
-- ("wrapped") to that specific member's public key. Adding a member means
-- inserting a row here; revoking a member means deleting their row. The
-- server can store and serve these wraps without ever being able to open
-- them.
create table if not exists public.household_key_wraps (
  household_id uuid not null references public.households(id) on delete cascade,
  member_user_id uuid not null references public.profiles(id) on delete cascade,
  wrapped_household_key bytea not null,
  wrapped_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (household_id, member_user_id)
);

comment on table public.household_key_wraps is
  'Per-member wrap of a household''s data key (HDK). wrapped_by_user_id is an audit trail of which member performed the wrap (see docs/e2e-encryption-plan.md §2.2).';

-- Tracks whether a household has opted into encryption and how far the
-- one-time data migration has progressed, so the client-side migration
-- tool (and the rest of the app) can resume/branch correctly.
create table if not exists public.household_encryption_status (
  household_id uuid primary key references public.households(id) on delete cascade,
  is_enabled boolean not null default false,
  enabled_at timestamptz,
  enabled_by uuid references public.profiles(id) on delete set null,
  migration_status text not null default 'not_started'
    check (migration_status in ('not_started', 'in_progress', 'completed')),
  migration_progress jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.household_encryption_status is
  'One row per household. migration_progress is a per-table row-count/cursor map used by the client-side migration tool to resume after interruption — see docs/e2e-encryption-plan.md §5.';

create trigger set_updated_at_user_keypairs
  before update on public.user_keypairs
  for each row execute function public.update_updated_at();

create trigger set_updated_at_household_encryption_status
  before update on public.household_encryption_status
  for each row execute function public.update_updated_at();

alter table public.user_keypairs enable row level security;
alter table public.household_key_wraps enable row level security;
alter table public.household_encryption_status enable row level security;

-- A user can read/write only their own keypair row.
create policy user_keypairs_select_own on public.user_keypairs
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy user_keypairs_insert_own on public.user_keypairs
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy user_keypairs_update_own on public.user_keypairs
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Household members can read every wrap for their household (needed so an
-- existing member's client can enumerate who still needs a wrap when a new
-- member joins), but a wrap can only be inserted by a household member and
-- only for another member of that same household. Wraps are immutable
-- once created (no update policy) — re-keying is a delete + insert.
create policy household_key_wraps_select_member on public.household_key_wraps
  for select to authenticated
  using (public.is_household_member(household_id, (select auth.uid())));

create policy household_key_wraps_insert_member on public.household_key_wraps
  for insert to authenticated
  with check (
    public.is_household_member(household_id, (select auth.uid()))
    and public.is_household_member(household_id, member_user_id)
  );

create policy household_key_wraps_delete_admin on public.household_key_wraps
  for delete to authenticated
  using (public.is_household_admin(household_id, (select auth.uid())));

create policy household_encryption_status_select_member on public.household_encryption_status
  for select to authenticated
  using (public.is_household_member(household_id, (select auth.uid())));

create policy household_encryption_status_write_admin on public.household_encryption_status
  for all to authenticated
  using (public.is_household_admin(household_id, (select auth.uid())))
  with check (public.is_household_admin(household_id, (select auth.uid())));

-- ------------------------------------------------------------
-- 2. Ciphertext sibling columns
-- ------------------------------------------------------------
-- Every sensitive column identified in docs/e2e-encryption-plan.md §3 gets
-- a nullable "*_enc" bytea sibling plus a shared per-row enc_version marker
-- per table (0 = plaintext only / not yet migrated, 1 = ciphertext
-- populated). Keeping one enc_version per row (not per column) is enough
-- here because a row is only ever migrated as a whole unit by the
-- migration tool. Existing columns, defaults, and constraints are
-- untouched.

alter table public.accounts
  add column if not exists initial_balance_enc bytea,
  add column if not exists enc_version smallint not null default 0;

alter table public.transactions
  add column if not exists amount_enc bytea,
  add column if not exists title_enc bytea,
  add column if not exists notes_enc bytea,
  add column if not exists merchant_name_enc bytea,
  add column if not exists enc_version smallint not null default 0;

alter table public.budget_rules
  add column if not exists amount_enc bytea,
  add column if not exists enc_version smallint not null default 0;

alter table public.budget_rule_allocations
  add column if not exists amount_enc bytea,
  add column if not exists enc_version smallint not null default 0;

alter table public.saving_pots
  add column if not exists target_amount_enc bytea,
  add column if not exists enc_version smallint not null default 0;

alter table public.monthly_income_inputs
  add column if not exists amount_enc bytea,
  add column if not exists enc_version smallint not null default 0;

alter table public.recurring_transactions
  add column if not exists title_enc bytea,
  add column if not exists notes_enc bytea,
  add column if not exists amount_enc bytea,
  add column if not exists enc_version smallint not null default 0;

alter table public.transaction_splits
  add column if not exists amount_enc bytea,
  add column if not exists notes_enc bytea,
  add column if not exists enc_version smallint not null default 0;

alter table public.account_reconciliations
  add column if not exists statement_balance_enc bytea,
  add column if not exists ledger_balance_enc bytea,
  add column if not exists enc_version smallint not null default 0;

alter table public.transaction_rules
  add column if not exists pattern_enc bytea,
  add column if not exists normalized_pattern_enc bytea,
  add column if not exists merchant_name_enc bytea,
  add column if not exists enc_version smallint not null default 0;

alter table public.merchant_aliases
  add column if not exists alias_enc bytea,
  add column if not exists normalized_alias_enc bytea,
  add column if not exists merchant_name_enc bytea,
  add column if not exists enc_version smallint not null default 0;

comment on column public.transactions.amount_enc is
  'Ciphertext of amount, encrypted client-side with the household data key. NULL until this household completes the E2E migration (see household_encryption_status). Plaintext "amount" column is retained until a later, separate cleanup migration — see docs/e2e-encryption-plan.md §6.';

-- account_reconciliations.difference is currently a GENERATED ALWAYS column
-- computed from statement_balance/ledger_balance, which cannot be computed
-- server-side once those inputs are ciphertext. It is deliberately left
-- as-is here (still generated from the plaintext columns) — once the
-- plaintext columns are dropped in the later cleanup migration, this
-- generated column must be dropped too and the difference recomputed
-- client-side instead. Flagging here so it isn't missed later.

-- ------------------------------------------------------------
-- 3. Indexes
-- ------------------------------------------------------------
-- Partial indexes so lookups for "not yet migrated" rows during the
-- migration tool's batched walk stay cheap even as more rows flip to
-- enc_version = 1.
create index if not exists idx_transactions_enc_pending
  on public.transactions (household_id) where enc_version = 0;
create index if not exists idx_accounts_enc_pending
  on public.accounts (household_id) where enc_version = 0;
create index if not exists idx_budget_rules_enc_pending
  on public.budget_rules (id) where enc_version = 0;
create index if not exists idx_budget_rule_allocations_enc_pending
  on public.budget_rule_allocations (id) where enc_version = 0;
create index if not exists idx_saving_pots_enc_pending
  on public.saving_pots (household_id) where enc_version = 0;
create index if not exists idx_monthly_income_inputs_enc_pending
  on public.monthly_income_inputs (id) where enc_version = 0;
create index if not exists idx_recurring_transactions_enc_pending
  on public.recurring_transactions (household_id) where enc_version = 0;
