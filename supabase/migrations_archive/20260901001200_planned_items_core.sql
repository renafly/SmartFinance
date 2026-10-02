-- ============================================================
-- Monthly Budget rebuild (Phase 2) -- planned_items core
-- ============================================================
-- New, additive-only schema for the ground-up Monthly Budget rebuild.
-- Does not touch budget_rules / budget_rule_allocations /
-- recurring_expenses / recurring_expense_matches / income_sources /
-- monthly_budget_runs -- those are migrated away from in a later phase,
-- not this one.
--
-- This file: shared enums + the `planned_items` table (the definition of
-- a recurring or one-time planned expense/income) and its
-- definition_version bump trigger. `planned_item_destinations` (the
-- template fan-out) follows in the next migration.

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------

create type public.planned_item_direction as enum ('outflow', 'inflow');

create type public.planned_item_allocation_mode as enum (
    'single',
    'equal_split',
    'custom_amount',
    'custom_percent'
);

create type public.planned_item_recurrence_type as enum (
    'monthly',
    'specific_months',
    'interval',
    'one_time'
);

create type public.planned_item_occurrence_status as enum (
    'planned',
    'confirmed',
    'matched',
    'skipped',
    'cancelled'
);

create type public.monthly_budget_period_status as enum (
    'open',
    'committed',
    'closed'
);

create type public.planned_item_transaction_role as enum (
    'plain_expense',
    'transfer_source',
    'transfer_destination',
    'income'
);

-- ------------------------------------------------------------
-- planned_items
-- ------------------------------------------------------------
-- One row per definition of a planned expense/income (e.g. "Rent",
-- "Salary", "Investments split"). Analogous to what budget_rules /
-- income_sources / recurring_transactions modeled separately -- this
-- table unifies outflow and inflow planning. `definition_version` is
-- bumped whenever a change would invalidate previously-generated
-- occurrences' snapshot of this definition (see the trigger below and
-- the companion trigger on planned_item_destinations).

create table public.planned_items (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    name text not null,
    name_enc bytea,
    direction public.planned_item_direction not null,
    amount numeric(14,2) not null check (amount > 0),
    amount_enc bytea,
    source_account_id uuid references public.accounts(id) on delete restrict,
    category_id uuid not null references public.categories(id) on delete restrict,
    owner_member_id uuid references public.profiles(id) on delete set null,
    is_estimate boolean not null default false,
    allocation_mode public.planned_item_allocation_mode not null default 'single',
    recurrence_type public.planned_item_recurrence_type not null default 'monthly',
    recurrence_months smallint[],
    recurrence_interval_months smallint,
    one_time_month date,
    start_month date,
    end_month date,
    is_active boolean not null default true,
    definition_version integer not null default 1,
    notes text,
    notes_enc bytea,
    deleted_at timestamptz,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    enc_version smallint not null default 0,
    constraint planned_items_source_account_by_direction check (
        (direction = 'outflow' and source_account_id is not null) or
        (direction = 'inflow' and source_account_id is null)
    )
);

comment on table public.planned_items is
  'Definition of a planned, recurring or one-time expense/income for the Monthly Budget rebuild (Phase 2). Ground-up replacement for budget_rules/income_sources/recurring_transactions in this domain -- those tables are migrated away from in a later phase, not this one.';
comment on column public.planned_items.definition_version is
  'Bumped whenever a change to this row (amount, source_account_id, category_id, allocation_mode) or to its destinations would invalidate the snapshot already captured on existing planned_item_occurrences. See planned_item_occurrences.source_definition_version.';
comment on column public.planned_items.category_id is
  'Mandatory by design (Phase 2 architecture review) -- every planned item must be categorized, unlike the optional category on income_sources/budget_rule_allocations.';
comment on column public.planned_items.enc_version is
  'Shared per-row E2E encryption marker for this table''s *_enc columns (name_enc, amount_enc, notes_enc), same convention as budget_rules.enc_version / transactions.enc_version (see 20260814120000_e2e_encryption_foundation.sql). 0 = plaintext only / not yet migrated, 1 = ciphertext populated.';

create index idx_planned_items_household_active on public.planned_items(household_id, is_active);

create trigger set_planned_items_updated_at
before update on public.planned_items
for each row
execute function public.update_updated_at();

-- Bump definition_version whenever a change to this row would invalidate
-- an existing occurrence's snapshot of the definition. Only fires when
-- one of the four "shape" columns actually changed value (not on every
-- update -- e.g. renaming a planned item or toggling is_active does not
-- bump the version).
create or replace function public.bump_planned_item_definition_version()
returns trigger
language plpgsql
as $$
begin
    if (new.amount is distinct from old.amount)
        or (new.source_account_id is distinct from old.source_account_id)
        or (new.category_id is distinct from old.category_id)
        or (new.allocation_mode is distinct from old.allocation_mode) then
        new.definition_version = old.definition_version + 1;
    end if;
    return new;
end;
$$;

comment on function public.bump_planned_item_definition_version() is
  'BEFORE UPDATE trigger on planned_items: bumps definition_version when amount, source_account_id, category_id or allocation_mode actually changed. Companion to bump_planned_item_version_from_destination() on planned_item_destinations, which bumps the same counter when the destination set changes.';

create trigger bump_planned_items_definition_version
before update on public.planned_items
for each row
execute function public.bump_planned_item_definition_version();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
-- Mirrors budget_rules' policy pattern exactly (see 022_monthly_budget.sql):
-- any household member can read, only household admins can write. This is
-- the "restrict writes to admins" convention used throughout the Monthly
-- Budget feature (budget_rules, budget_rule_allocations,
-- monthly_budget_runs, monthly_income_inputs) -- unlike the
-- "any member can write" convention used by income_sources /
-- recurring_transactions, which this feature does not follow.

alter table public.planned_items enable row level security;

create policy "Members can view planned items"
on public.planned_items
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Admins can manage planned items"
on public.planned_items
for all
using (
    public.is_household_admin(household_id, auth.uid())
)
with check (
    public.is_household_admin(household_id, auth.uid())
);
