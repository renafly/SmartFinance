-- ============================================================
-- Monthly Budget rebuild (Phase 2) -- planned_item_occurrences
-- ============================================================
-- One row per planned_items row per active month: the resolved,
-- per-month instance of a definition, snapshotting the definition as it
-- stood when the occurrence was generated (source_definition_version)
-- so a later edit to the definition doesn't silently rewrite history for
-- months already generated/confirmed. planned_item_occurrence_destinations
-- holds the resolved (always-concrete) per-account split for that month.
-- planned_item_matches links an is_estimate occurrence to the real
-- transaction that reconciled it.

create table public.planned_item_occurrences (
    id uuid primary key default gen_random_uuid(),
    planned_item_id uuid not null references public.planned_items(id) on delete cascade,
    household_id uuid not null references public.households(id) on delete cascade,
    month date not null,
    status public.planned_item_occurrence_status not null default 'planned',
    expected_amount numeric(14,2) not null,
    expected_amount_enc bytea,
    source_account_id uuid references public.accounts(id) on delete set null,
    category_id uuid not null references public.categories(id) on delete restrict,
    is_estimate boolean not null,
    source_definition_version integer not null,
    is_overridden boolean not null default false,
    confirmed_at timestamptz,
    confirmed_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    enc_version smallint not null default 0,
    unique (planned_item_id, month)
);

comment on table public.planned_item_occurrences is
  'One row per planned_items row per active month -- the resolved, per-month instance. source_definition_version snapshots planned_items.definition_version as it stood when this occurrence was generated/last resynced, so later edits to the definition do not silently rewrite history for months already generated or confirmed. is_overridden marks an occurrence a user has hand-edited away from what the definition would currently produce.';
comment on column public.planned_item_occurrences.source_account_id is
  'uuid, references accounts(id) -- snapshot of the planned item''s source account at generation time. Null for inflow occurrences, matching planned_items.source_account_id.';
comment on column public.planned_item_occurrences.source_definition_version is
  'Snapshot of planned_items.definition_version at the time this occurrence was generated/last resynced. Used to detect that the definition has since changed underneath an already-generated occurrence.';

create index idx_planned_item_occurrences_household_month on public.planned_item_occurrences(household_id, month);

create trigger set_planned_item_occurrences_updated_at
before update on public.planned_item_occurrences
for each row
execute function public.update_updated_at();

alter table public.planned_item_occurrences enable row level security;

create policy "Members can view planned item occurrences"
on public.planned_item_occurrences
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Admins can manage planned item occurrences"
on public.planned_item_occurrences
for all
using (
    public.is_household_admin(household_id, auth.uid())
)
with check (
    public.is_household_admin(household_id, auth.uid())
);

-- ------------------------------------------------------------
-- planned_item_occurrence_destinations
-- ------------------------------------------------------------
-- Resolved split for one occurrence, this month. Unlike
-- planned_item_destinations (the template), amount is always concrete
-- here regardless of the parent definition's allocation_mode -- there is
-- no separate "percent" column because by the time a row exists here the
-- percentage has already been resolved to a currency amount.
--
-- Deliberately has NO generated_transaction_id column (present in an
-- earlier draft, removed in architecture review) -- transaction lineage
-- lives on transactions.planned_item_occurrence_destination_id instead
-- (see the transactions migration).

create table public.planned_item_occurrence_destinations (
    id uuid primary key default gen_random_uuid(),
    occurrence_id uuid not null references public.planned_item_occurrences(id) on delete cascade,
    planned_item_destination_id uuid references public.planned_item_destinations(id) on delete set null,
    destination_account_id uuid not null references public.accounts(id) on delete restrict,
    amount numeric(14,2) not null,
    amount_enc bytea,
    category_id uuid references public.categories(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    enc_version smallint not null default 0
);

comment on table public.planned_item_occurrence_destinations is
  'Resolved (always-concrete) per-account split for one occurrence, this month. No generated_transaction_id column by design -- transaction lineage lives on transactions.planned_item_occurrence_destination_id / transactions.planned_item_occurrence_id instead.';

create index idx_planned_item_occurrence_destinations_occurrence on public.planned_item_occurrence_destinations(occurrence_id);

create trigger set_planned_item_occurrence_destinations_updated_at
before update on public.planned_item_occurrence_destinations
for each row
execute function public.update_updated_at();

-- Deferred constraint trigger, checked once per affected occurrence_id at
-- commit: sum(amount) across an occurrence's destination rows must equal
-- that occurrence's expected_amount exactly, for every allocation mode --
-- these are always concrete numbers here, unlike the template table.
create or replace function public.check_planned_item_occurrence_destinations_deferred()
returns trigger
language plpgsql
as $$
declare
    v_occurrence_id uuid;
    v_expected_amount numeric(14,2);
    v_sum_amount numeric(14,2);
begin
    v_occurrence_id := coalesce(new.occurrence_id, old.occurrence_id);

    select expected_amount into v_expected_amount
        from public.planned_item_occurrences
        where id = v_occurrence_id;

    if not found then
        -- Parent occurrence was deleted; cascade already removed every
        -- destination row for it, so there is nothing left to check.
        return null;
    end if;

    select coalesce(sum(amount), 0) into v_sum_amount
        from public.planned_item_occurrence_destinations
        where occurrence_id = v_occurrence_id;

    if v_sum_amount <> v_expected_amount then
        raise exception 'Occurrence destination amounts (%) must sum exactly to the expected amount (%) for occurrence %', v_sum_amount, v_expected_amount, v_occurrence_id;
    end if;

    return null;
end;
$$;

comment on function public.check_planned_item_occurrence_destinations_deferred() is
  'Deferred (INITIALLY DEFERRED) constraint trigger function on planned_item_occurrence_destinations, checked once per affected occurrence_id at commit: sum(amount) must equal planned_item_occurrences.expected_amount exactly, for every allocation mode.';

create constraint trigger check_planned_item_occurrence_destinations_deferred
after insert or update or delete on public.planned_item_occurrence_destinations
deferrable initially deferred
for each row
execute function public.check_planned_item_occurrence_destinations_deferred();

alter table public.planned_item_occurrence_destinations enable row level security;

create policy "Members can view planned item occurrence destinations"
on public.planned_item_occurrence_destinations
for select
using (
    exists (
        select 1
        from public.planned_item_occurrences o
        where o.id = occurrence_id
            and public.is_household_member(o.household_id, auth.uid())
    )
);

create policy "Admins can manage planned item occurrence destinations"
on public.planned_item_occurrence_destinations
for all
using (
    exists (
        select 1
        from public.planned_item_occurrences o
        where o.id = occurrence_id
            and public.is_household_admin(o.household_id, auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.planned_item_occurrences o
        where o.id = occurrence_id
            and public.is_household_admin(o.household_id, auth.uid())
    )
);

-- ------------------------------------------------------------
-- planned_item_matches
-- ------------------------------------------------------------
-- Reconciliation link between an is_estimate occurrence and the real
-- transaction that settled it. Both occurrence_id and transaction_id are
-- unique: one occurrence can match at most one transaction, and (unlike
-- an earlier draft) one transaction can match at most one occurrence.

create table public.planned_item_matches (
    id uuid primary key default gen_random_uuid(),
    occurrence_id uuid not null unique references public.planned_item_occurrences(id) on delete cascade,
    transaction_id uuid not null unique references public.transactions(id) on delete cascade,
    matched_by uuid references public.profiles(id) on delete set null,
    matched_at timestamptz not null default now()
);

comment on table public.planned_item_matches is
  'Reconciliation link between an estimate planned_item_occurrence and the real transaction that settled it. transaction_id is unique (added in architecture review) so one real transaction can never be matched to more than one occurrence.';

alter table public.planned_item_matches enable row level security;

create policy "Members can view planned item matches"
on public.planned_item_matches
for select
using (
    exists (
        select 1
        from public.planned_item_occurrences o
        where o.id = occurrence_id
            and public.is_household_member(o.household_id, auth.uid())
    )
);

create policy "Admins can manage planned item matches"
on public.planned_item_matches
for all
using (
    exists (
        select 1
        from public.planned_item_occurrences o
        where o.id = occurrence_id
            and public.is_household_admin(o.household_id, auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.planned_item_occurrences o
        where o.id = occurrence_id
            and public.is_household_admin(o.household_id, auth.uid())
    )
);
