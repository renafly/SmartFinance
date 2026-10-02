-- ============================================================
-- Monthly Budget rebuild (Phase 2) -- planned_item_destinations
-- ============================================================
-- Template-level fan-out of a planned_items row across one or more
-- destination accounts. A row here is only ever a *template* -- concrete,
-- resolved-for-the-month amounts live on planned_item_occurrence_destinations
-- (see the next migration).

create table public.planned_item_destinations (
    id uuid primary key default gen_random_uuid(),
    planned_item_id uuid not null references public.planned_items(id) on delete cascade,
    destination_account_id uuid not null references public.accounts(id) on delete restrict,
    amount numeric(14,2),
    amount_enc bytea,
    percent numeric(5,2) check (percent > 0 and percent <= 100),
    category_id uuid references public.categories(id) on delete set null,
    sort_order smallint not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    enc_version smallint not null default 0,
    unique (planned_item_id, destination_account_id)
);

comment on table public.planned_item_destinations is
  'Template-level fan-out of a planned_items row across destination accounts. amount is populated only when the parent''s allocation_mode = custom_amount; percent only when custom_percent. equal_split/single destinations carry neither -- there is nothing stored to sum at the template level for those modes.';
comment on column public.planned_item_destinations.enc_version is
  'Shared per-row E2E encryption marker for amount_enc, same convention as planned_items.enc_version.';

create index idx_planned_item_destinations_item on public.planned_item_destinations(planned_item_id);

create trigger set_planned_item_destinations_updated_at
before update on public.planned_item_destinations
for each row
execute function public.update_updated_at();

-- ------------------------------------------------------------
-- Trigger A -- BEFORE INSERT OR UPDATE: validate against the parent
-- planned_items row (source account clash, amount/percent shape for the
-- parent's allocation_mode).
-- ------------------------------------------------------------

create or replace function public.validate_planned_item_destination()
returns trigger
language plpgsql
as $$
declare
    v_source_account_id uuid;
    v_allocation_mode public.planned_item_allocation_mode;
begin
    select source_account_id, allocation_mode
        into v_source_account_id, v_allocation_mode
        from public.planned_items
        where id = new.planned_item_id;

    if not found then
        raise exception 'Planned item % does not exist', new.planned_item_id;
    end if;

    if v_source_account_id is not null and new.destination_account_id = v_source_account_id then
        raise exception 'Destination account cannot be the same as the planned item''s source account (item %)', new.planned_item_id;
    end if;

    if v_allocation_mode in ('single', 'equal_split') then
        if new.amount is not null or new.percent is not null then
            raise exception '% destinations must not specify amount or percent (item %)', v_allocation_mode, new.planned_item_id;
        end if;
    elsif v_allocation_mode = 'custom_amount' then
        if new.amount is null then
            raise exception 'custom_amount destinations require an amount (item %)', new.planned_item_id;
        end if;
        if new.percent is not null then
            raise exception 'custom_amount destinations must not specify percent (item %)', new.planned_item_id;
        end if;
    elsif v_allocation_mode = 'custom_percent' then
        if new.percent is null then
            raise exception 'custom_percent destinations require a percent (item %)', new.planned_item_id;
        end if;
        if new.amount is not null then
            raise exception 'custom_percent destinations must not specify amount (item %)', new.planned_item_id;
        end if;
    end if;

    return new;
end;
$$;

comment on function public.validate_planned_item_destination() is
  'BEFORE INSERT OR UPDATE trigger on planned_item_destinations: rejects a destination equal to the parent''s source account, and enforces that amount/percent are populated (or not) according to the parent planned_items.allocation_mode. single/equal_split treated identically -- neither stores a per-destination figure at the template level.';

create trigger validate_planned_item_destination
before insert or update on public.planned_item_destinations
for each row
execute function public.validate_planned_item_destination();

-- ------------------------------------------------------------
-- Trigger B -- AFTER INSERT OR UPDATE OR DELETE: bump the parent's
-- definition_version. Any change to the destination set counts as a
-- definition change (fires per affected row, so N destination changes in
-- one transaction bump the counter N times -- this is intentional, see
-- the migration report).
-- ------------------------------------------------------------

create or replace function public.bump_planned_item_version_from_destination()
returns trigger
language plpgsql
as $$
declare
    v_planned_item_id uuid;
begin
    v_planned_item_id := coalesce(new.planned_item_id, old.planned_item_id);

    update public.planned_items
        set definition_version = definition_version + 1
        where id = v_planned_item_id;

    return null;
end;
$$;

comment on function public.bump_planned_item_version_from_destination() is
  'AFTER INSERT OR UPDATE OR DELETE trigger on planned_item_destinations: bumps the parent planned_items.definition_version. Companion to bump_planned_item_definition_version() on planned_items itself.';

create trigger bump_planned_item_version_on_destination_change
after insert or update or delete on public.planned_item_destinations
for each row
execute function public.bump_planned_item_version_from_destination();

-- ------------------------------------------------------------
-- Trigger C -- deferred constraint trigger, checked once per affected
-- planned_item_id at transaction commit:
--   * estimate restriction: an is_estimate parent may have at most 1
--     destination row.
--   * allocation-sum guarantee for the modes checkable at the template
--     level: custom_amount destinations must sum exactly to the parent's
--     amount; custom_percent destinations must sum exactly to 100.
--     (equal_split/single have nothing stored to sum here, by design.)
-- Deferred so inserting N destination rows one at a time within one
-- transaction cannot spuriously fail mid-way.
-- ------------------------------------------------------------

create or replace function public.check_planned_item_destinations_deferred()
returns trigger
language plpgsql
as $$
declare
    v_planned_item_id uuid;
    v_is_estimate boolean;
    v_allocation_mode public.planned_item_allocation_mode;
    v_amount numeric(14,2);
    v_dest_count integer;
    v_sum_amount numeric(14,2);
    v_sum_percent numeric(5,2);
begin
    v_planned_item_id := coalesce(new.planned_item_id, old.planned_item_id);

    select is_estimate, allocation_mode, amount
        into v_is_estimate, v_allocation_mode, v_amount
        from public.planned_items
        where id = v_planned_item_id;

    if not found then
        -- Parent planned_item was deleted; cascade already removed every
        -- destination row for it, so there is nothing left to check.
        return null;
    end if;

    select count(*), coalesce(sum(amount), 0), coalesce(sum(percent), 0)
        into v_dest_count, v_sum_amount, v_sum_percent
        from public.planned_item_destinations
        where planned_item_id = v_planned_item_id;

    if v_is_estimate and v_dest_count > 1 then
        raise exception 'Estimate planned items may have at most one destination (item % has %)', v_planned_item_id, v_dest_count;
    end if;

    if v_allocation_mode = 'custom_amount' and v_sum_amount <> v_amount then
        raise exception 'Destination amounts (%) must sum exactly to the planned item amount (%) for item %', v_sum_amount, v_amount, v_planned_item_id;
    end if;

    if v_allocation_mode = 'custom_percent' and v_sum_percent <> 100 then
        raise exception 'Destination percentages (%) must sum exactly to 100 for item %', v_sum_percent, v_planned_item_id;
    end if;

    return null;
end;
$$;

comment on function public.check_planned_item_destinations_deferred() is
  'Deferred (INITIALLY DEFERRED) constraint trigger function on planned_item_destinations, checked once per affected planned_item_id at commit: enforces the is_estimate <= 1 destination rule and the custom_amount/custom_percent sum-exactness rules. equal_split/single are intentionally not sum-checked here -- there is no stored per-destination figure to sum at the template level for those modes.';

create constraint trigger check_planned_item_destinations_deferred
after insert or update or delete on public.planned_item_destinations
deferrable initially deferred
for each row
execute function public.check_planned_item_destinations_deferred();

-- ------------------------------------------------------------
-- RLS -- child table, joins up through planned_items.household_id
-- (structural pattern from budget_rule_allocations, see
-- 20260813000000_monthly_budget_rule_allocations.sql), same
-- admin-writes/member-reads permission level as planned_items itself.
-- ------------------------------------------------------------

alter table public.planned_item_destinations enable row level security;

create policy "Members can view planned item destinations"
on public.planned_item_destinations
for select
using (
    exists (
        select 1
        from public.planned_items pi
        where pi.id = planned_item_id
            and public.is_household_member(pi.household_id, auth.uid())
    )
);

create policy "Admins can manage planned item destinations"
on public.planned_item_destinations
for all
using (
    exists (
        select 1
        from public.planned_items pi
        where pi.id = planned_item_id
            and public.is_household_admin(pi.household_id, auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.planned_items pi
        where pi.id = planned_item_id
            and public.is_household_admin(pi.household_id, auth.uid())
    )
);
