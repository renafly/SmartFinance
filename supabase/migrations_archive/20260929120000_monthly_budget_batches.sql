-- ============================================================
-- Monthly Budget: creation batches ("Create all transfers" / "Undo batch")
-- ============================================================
-- One click of "Create all transfers" on the Monthly Budget screen posts,
-- in ONE database transaction, the month's income transaction(s) first and
-- then one real transfer (transfer_source + transfer_destination pair) per
-- expected-movement destination -- via confirm_planned_item_month, the same
-- function and the same transactions rows the app always used.
--
-- What this migration adds is an explicit record of that click:
--
--   monthly_budget_batches            one row per "Create all transfers"
--   transactions.monthly_budget_batch_id   every transaction that click created
--
-- Relationship chain (nothing is inferred from dates/amounts/accounts):
--   planned_items (the expected movement / income)
--     -> planned_item_occurrences (that item in a given month)
--       -> planned_item_occurrence_destinations (each destination)
--         -> transactions (planned_item_occurrence_*_id + role)   [existing]
--   monthly_budget_batches -> transactions.monthly_budget_batch_id [new]
--
-- undo_monthly_budget_batch(batch_id) deletes ONLY rows whose
-- monthly_budget_batch_id is that batch -- never a hand-entered
-- transaction, never another batch's, never another month's.
--
-- Duplicate safety, layered:
--   1. confirm_planned_item_month now locks the month's
--      monthly_budget_periods row (SELECT ... FOR UPDATE) before doing
--      anything, so two concurrent clicks serialise; the second sees the
--      period already 'committed' and returns without inserting anything.
--   2. Existing per-leg idempotency guards + partial unique indexes on
--      transactions (one row per occurrence destination + role) still apply.
--   3. The client disables the button while the request is in flight.
-- Atomicity: both functions are single plpgsql bodies = one transaction.
-- Any error rolls back every insert, the batch row and the period change.

create table if not exists public.monthly_budget_batches (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    month date not null,
    status text not null default 'active' check (status in ('active', 'undone')),
    income_count integer not null default 0,
    income_total numeric(14, 2) not null default 0,
    transfer_count integer not null default 0,
    transfer_total numeric(14, 2) not null default 0,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    undone_by uuid references public.profiles(id) on delete set null,
    undone_at timestamptz
);

comment on table public.monthly_budget_batches is
  'One row per Monthly Budget "Create all transfers" action. transactions.monthly_budget_batch_id links every transaction it created, so "Undo batch" removes exactly those. See 20260929120000_monthly_budget_batches.sql.';

create index if not exists idx_monthly_budget_batches_household_month
    on public.monthly_budget_batches (household_id, month, created_at desc);

-- At most one live batch per household+month.
create unique index if not exists idx_monthly_budget_batches_one_active
    on public.monthly_budget_batches (household_id, month)
    where status = 'active';

alter table public.monthly_budget_batches enable row level security;

drop policy if exists "Members can view monthly budget batches" on public.monthly_budget_batches;
create policy "Members can view monthly budget batches"
on public.monthly_budget_batches
for select
using (public.is_household_member(household_id, auth.uid()));
-- No insert/update/delete policies: rows are only written by the two
-- security definer functions below.

alter table public.transactions
    add column if not exists monthly_budget_batch_id uuid
        references public.monthly_budget_batches(id) on delete restrict;

create index if not exists idx_transactions_monthly_budget_batch_id
    on public.transactions (monthly_budget_batch_id)
    where monthly_budget_batch_id is not null;

comment on column public.transactions.monthly_budget_batch_id is
  'The Monthly Budget "Create all transfers" batch that created this transaction (null for everything else). Undo deletes by this id only.';

-- ------------------------------------------------------------
-- confirm_planned_item_month -- same signature/return as before
-- (20260901002400); now locks the period, records a batch, and stamps
-- every inserted transaction with its id.
-- ------------------------------------------------------------
create or replace function public.confirm_planned_item_month(
    p_household_id uuid,
    p_month date,
    p_transfers jsonb,
    p_confirmed_by uuid
)
returns public.monthly_budget_periods
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_leg jsonb;
    v_occurrence_id uuid;
    v_occurrence public.planned_item_occurrences%rowtype;
    v_role public.planned_item_transaction_role;
    v_account_id uuid;
    v_amount numeric;
    v_category_id uuid;
    v_lookup_account_id uuid;
    v_occurrence_destination_id uuid;
    v_transfer_groups jsonb := '{}'::jsonb;
    v_transfer_group_id uuid;
    v_type public.transaction_type;
    v_item_name text;
    v_month_key text;
    v_title text;
    v_notes text;
    v_period public.monthly_budget_periods%rowtype;
    v_batch_id uuid;
    v_income_count integer := 0;
    v_income_total numeric := 0;
    v_transfer_count integer := 0;
    v_transfer_total numeric := 0;
begin
    if not public.is_household_admin(p_household_id, auth.uid()) then
        raise exception 'Only household admins can confirm a monthly budget month';
    end if;

    p_transfers := coalesce(p_transfers, '[]'::jsonb);
    if jsonb_typeof(p_transfers) <> 'array' then
        raise exception 'Planned item transfers must be a JSON array';
    end if;

    -- Serialise concurrent clicks on the same month: make sure the period
    -- row exists, then lock it. A second caller blocks here until the
    -- first commits, then sees status <> 'open' and inserts nothing.
    insert into public.monthly_budget_periods (household_id, month, status)
    values (p_household_id, p_month, 'open')
    on conflict (household_id, month) do nothing;

    select * into v_period
      from public.monthly_budget_periods
     where household_id = p_household_id and month = p_month
     for update;

    if v_period.status <> 'open' then
        return v_period; -- already created: never create anything twice
    end if;

    insert into public.monthly_budget_batches (household_id, month, created_by)
    values (p_household_id, p_month, p_confirmed_by)
    returning id into v_batch_id;

    v_month_key := to_char(p_month, 'YYYY-MM');

    -- Income legs first (occurrence.source_account_id is null), then every
    -- transfer leg, each group in its original order -- see
    -- 20260901002400 for why created_at uses clock_timestamp().
    for v_leg in
        select elems.value
          from jsonb_array_elements(p_transfers) with ordinality as elems(value, ord)
          left join public.planned_item_occurrences poc
                 on poc.id = nullif(elems.value ->> 'occurrenceId', '')::uuid
                and poc.household_id = p_household_id
         order by coalesce(poc.source_account_id is not null, true), elems.ord
    loop
        v_occurrence_id := nullif(v_leg ->> 'occurrenceId', '')::uuid;
        if v_occurrence_id is null then
            raise exception 'Planned item transfer entry is missing occurrenceId';
        end if;

        select * into v_occurrence
          from public.planned_item_occurrences
         where id = v_occurrence_id
           and household_id = p_household_id
         for update;

        if not found then
            raise exception 'Planned item occurrence % does not belong to household %', v_occurrence_id, p_household_id;
        end if;
        if v_occurrence.month <> p_month then
            raise exception 'Planned item occurrence % is not in month %', v_occurrence_id, v_month_key;
        end if;

        if v_occurrence.status <> 'planned' or v_occurrence.is_estimate then
            continue;
        end if;

        v_role := (v_leg ->> 'role')::public.planned_item_transaction_role;
        v_account_id := nullif(v_leg ->> 'accountId', '')::uuid;
        v_amount := (v_leg ->> 'amount')::numeric;
        v_category_id := nullif(v_leg ->> 'categoryId', '')::uuid;
        v_lookup_account_id := nullif(v_leg ->> 'occurrenceDestinationLookupAccountId', '')::uuid;

        if v_role is null then
            raise exception 'Planned item transfer leg is missing a role (occurrence %)', v_occurrence_id;
        end if;
        if v_amount is null or v_amount <= 0 then
            raise exception 'Planned item transfer amount must be greater than zero (occurrence %)', v_occurrence_id;
        end if;
        if v_account_id is null then
            raise exception 'Planned item transfer is missing an account (occurrence %)', v_occurrence_id;
        end if;
        if not exists (
            select 1 from public.accounts where id = v_account_id and household_id = p_household_id
        ) then
            raise exception 'Planned item transfer account % does not belong to household %', v_account_id, p_household_id;
        end if;

        v_occurrence_destination_id := null;
        v_transfer_group_id := null;

        if v_lookup_account_id is not null then
            select id into v_occurrence_destination_id
              from public.planned_item_occurrence_destinations
             where occurrence_id = v_occurrence_id
               and destination_account_id = v_lookup_account_id
             limit 1;

            if v_occurrence_destination_id is null then
                raise exception 'No occurrence destination for account % on occurrence % -- call materialize_planned_item_occurrences first',
                    v_lookup_account_id, v_occurrence_id;
            end if;

            if v_role in ('transfer_source', 'transfer_destination') then
                v_transfer_group_id := nullif(v_transfer_groups ->> v_occurrence_destination_id::text, '')::uuid;
                if v_transfer_group_id is null then
                    v_transfer_group_id := gen_random_uuid();
                    v_transfer_groups := v_transfer_groups
                        || jsonb_build_object(v_occurrence_destination_id::text, v_transfer_group_id::text);
                end if;
            end if;
        end if;

        v_type := case when v_role in ('transfer_destination', 'income') then 'income' else 'expense' end;

        -- Per-leg idempotency (unchanged).
        if v_occurrence_destination_id is not null then
            if exists (
                select 1 from public.transactions
                 where planned_item_occurrence_destination_id = v_occurrence_destination_id
                   and planned_item_transaction_role = v_role
            ) then
                continue;
            end if;
        else
            if exists (
                select 1 from public.transactions
                 where planned_item_occurrence_id = v_occurrence_id
                   and planned_item_occurrence_destination_id is null
                   and planned_item_transaction_role = 'plain_expense'
            ) then
                continue;
            end if;
        end if;

        select pi.name into v_item_name
          from public.planned_items pi
         where pi.id = v_occurrence.planned_item_id;

        v_title := coalesce(v_item_name, 'Planned item');
        v_notes := 'Monthly budget ' || v_month_key || ' · ' || v_title;

        insert into public.transactions (
            household_id, account_id, category_id, transfer_group_id,
            title, notes, amount, type, transaction_date, created_by, created_at,
            planned_item_occurrence_id, planned_item_occurrence_destination_id,
            planned_item_transaction_role, monthly_budget_batch_id
        ) values (
            p_household_id, v_account_id, v_category_id, v_transfer_group_id,
            v_title, v_notes, v_amount, v_type, p_month::timestamptz, p_confirmed_by, clock_timestamp(),
            v_occurrence_id, v_occurrence_destination_id, v_role, v_batch_id
        );

        if v_role = 'income' then
            v_income_count := v_income_count + 1;
            v_income_total := v_income_total + v_amount;
        elsif v_role = 'transfer_source' then
            v_transfer_count := v_transfer_count + 1;
            v_transfer_total := v_transfer_total + v_amount;
        end if;
    end loop;

    if v_income_count = 0 and v_transfer_count = 0 then
        raise exception 'Nothing to create for % -- every income and movement is already created or not due this month.', v_month_key;
    end if;

    update public.monthly_budget_batches
       set income_count = v_income_count,
           income_total = v_income_total,
           transfer_count = v_transfer_count,
           transfer_total = v_transfer_total
     where id = v_batch_id;

    update public.planned_item_occurrences
       set status = 'confirmed',
           confirmed_at = now(),
           confirmed_by = p_confirmed_by
     where household_id = p_household_id
       and month = p_month
       and status = 'planned'
       and not is_estimate
       and id in (
           select distinct nullif(value ->> 'occurrenceId', '')::uuid
             from jsonb_array_elements(p_transfers)
       );

    update public.monthly_budget_periods
       set status = 'committed',
           confirmed_at = now(),
           confirmed_by = p_confirmed_by
     where id = v_period.id
     returning * into v_period;

    return v_period;
end;
$$;

comment on function public.confirm_planned_item_month(uuid, date, jsonb, uuid) is
  'Atomically creates a month''s income transaction(s) and then its expected-movement transfers, records them as one monthly_budget_batches row (transactions.monthly_budget_batch_id), and commits the period. Locks the period row first; a repeat call for an already-committed month creates nothing. See 20260929120000_monthly_budget_batches.sql.';

revoke all on function public.confirm_planned_item_month(uuid, date, jsonb, uuid) from public;
grant execute on function public.confirm_planned_item_month(uuid, date, jsonb, uuid) to authenticated;

-- ------------------------------------------------------------
-- undo_monthly_budget_batch -- deletes exactly one batch's transactions.
-- ------------------------------------------------------------
create or replace function public.undo_monthly_budget_batch(p_batch_id uuid)
returns public.monthly_budget_batches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_batch public.monthly_budget_batches%rowtype;
    v_occurrence_ids uuid[];
    v_blocked_count integer;
begin
    select * into v_batch
      from public.monthly_budget_batches
     where id = p_batch_id
     for update;

    if not found then
        raise exception 'Monthly budget batch % not found', p_batch_id;
    end if;
    if not public.is_household_admin(v_batch.household_id, auth.uid()) then
        raise exception 'Only household admins can undo a monthly budget batch';
    end if;
    if v_batch.status <> 'active' then
        return v_batch; -- already undone: nothing to do
    end if;

    select count(*) into v_blocked_count
      from public.transactions t
      join public.replenishment_run_transactions rrt on rrt.transaction_id = t.id
     where t.monthly_budget_batch_id = p_batch_id;

    if v_blocked_count > 0 then
        raise exception 'Cannot undo: % transaction(s) from this batch are used in a Replenishment (Reposição) run. Remove them from that run first.', v_blocked_count;
    end if;

    select coalesce(array_agg(distinct t.planned_item_occurrence_id), '{}'::uuid[]) into v_occurrence_ids
      from public.transactions t
     where t.monthly_budget_batch_id = p_batch_id
       and t.planned_item_occurrence_id is not null;

    delete from public.transactions
     where monthly_budget_batch_id = p_batch_id;

    update public.planned_item_occurrences
       set status = 'planned',
           confirmed_at = null,
           confirmed_by = null,
           is_overridden = false
     where id = any(v_occurrence_ids)
       and status = 'confirmed';

    update public.monthly_budget_periods
       set status = 'open',
           confirmed_at = null,
           confirmed_by = null
     where household_id = v_batch.household_id
       and month = v_batch.month
       and status in ('committed', 'closed');

    update public.monthly_budget_batches
       set status = 'undone',
           undone_at = now(),
           undone_by = auth.uid()
     where id = p_batch_id
     returning * into v_batch;

    return v_batch;
end;
$$;

comment on function public.undo_monthly_budget_batch(uuid) is
  'Deletes exactly the transactions a Monthly Budget "Create all transfers" batch created (transactions.monthly_budget_batch_id), returns their occurrences to planned, reopens the month and marks the batch undone. Never touches any other transaction.';

revoke all on function public.undo_monthly_budget_batch(uuid) from public;
grant execute on function public.undo_monthly_budget_batch(uuid) to authenticated;

-- ------------------------------------------------------------
-- revert_monthly_budget_month (months created before batches existed):
-- unchanged from 20260929100000 except that it also retires the month's
-- batch, so the "one active batch per month" index can't block a re-create.
-- ------------------------------------------------------------
create or replace function public.revert_monthly_budget_month(
    p_household_id uuid,
    p_month date
)
returns public.monthly_budget_periods
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_period public.monthly_budget_periods%rowtype;
    v_blocked_count integer;
    v_occurrence_ids uuid[];
begin
    if not public.is_household_admin(p_household_id, auth.uid()) then
        raise exception 'Only household admins can revert a monthly budget month';
    end if;

    -- Income occurrences + movement occurrences (at least one destination).
    select coalesce(array_agg(poc.id), '{}'::uuid[]) into v_occurrence_ids
      from public.planned_item_occurrences poc
     where poc.household_id = p_household_id
       and poc.month = p_month
       and (
             poc.source_account_id is null
             or exists (
                 select 1
                   from public.planned_item_occurrence_destinations pod
                  where pod.occurrence_id = poc.id
             )
           );

    select count(*) into v_blocked_count
      from public.transactions t
      join public.replenishment_run_transactions rrt on rrt.transaction_id = t.id
     where t.household_id = p_household_id
       and t.planned_item_occurrence_id = any(v_occurrence_ids);

    if v_blocked_count > 0 then
        raise exception 'Cannot reset Monthly Budget for %: % transaction(s) generated for this month are referenced by a Replenishment (Reposição) run. Remove them from that run first, then try again.',
            to_char(p_month, 'YYYY-MM'), v_blocked_count;
    end if;

    delete from public.transactions
     where household_id = p_household_id
       and planned_item_occurrence_id = any(v_occurrence_ids);

    update public.planned_item_occurrences
       set status = 'planned',
           confirmed_at = null,
           confirmed_by = null,
           is_overridden = false
     where household_id = p_household_id
       and month = p_month
       and status in ('confirmed', 'skipped', 'cancelled')
       and id = any(v_occurrence_ids);

    -- Any live "Create all transfers" batch for this month is now empty --
    -- mark it undone so the month can be created again.
    update public.monthly_budget_batches
       set status = 'undone',
           undone_at = now(),
           undone_by = auth.uid()
     where household_id = p_household_id
       and month = p_month
       and status = 'active';

    update public.monthly_budget_periods
       set status = 'open',
           confirmed_at = null,
           confirmed_by = null
     where household_id = p_household_id
       and month = p_month
     returning * into v_period;

    if v_period.id is null then
        select * into v_period
          from public.monthly_budget_periods
         where household_id = p_household_id
           and month = p_month;
    end if;

    return v_period;
end;
$$;

comment on function public.revert_monthly_budget_month(uuid, date) is
  'Undoes a Monthly Budget save for this household+month: deletes the income and movement (transfer) transactions it generated, resets those occurrences back to planned, and reopens the monthly_budget_periods row. Plain recurring expenses paid on Category Budgets and matched/hand-entered transactions are never touched. See 20260929100000_monthly_budget_save_scope.sql; also marks the month''s batch undone (20260929120000).';

revoke all on function public.revert_monthly_budget_month(uuid, date) from public;
grant execute on function public.revert_monthly_budget_month(uuid, date) to authenticated;
