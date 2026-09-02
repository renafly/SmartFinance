-- ============================================================
-- confirm_planned_item_month: post income before expenses/transfers
-- ============================================================
-- Redefines confirm_planned_item_month() (20260901001800_planned_item_rpcs.sql,
-- function #2) in place -- same signature, same grants, no schema change.
-- User request: "when you run the monthly budget first run always the
-- incomes and then the expenses".
--
-- Why this needed two changes, not one:
--
-- 1. Loop order. The original loop processed p_transfers strictly in
--    array order -- whatever order the TS resolver produced, which
--    follows planned_items.listForHousehold's `order by name` (alphabetical,
--    income and expense/transfer items interleaved by name, not grouped
--    by direction). Reordering the driving query so every leg belonging
--    to an inflow occurrence (`planned_item_occurrences.source_account_id
--    is null` -- the same null-check match_planned_item_occurrence and
--    the Transfers-list UI already use as "is this income", see
--    planned_items_source_account_by_direction) is visited before any
--    outflow leg (plain_expense/transfer_source/transfer_destination)
--    handles *which order rows get inserted in*.
--
-- 2. But insertion order alone does NOT determine display order.
--    transactions.created_at defaults to `now()`, and Postgres freezes
--    `now()` (= transaction_timestamp()) at the start of the current
--    transaction -- every row this function inserts, across the whole
--    loop, gets the exact same created_at value, regardless of which
--    order they were inserted in. list_account_ledger / list_transaction_movements
--    / account_running_balance all order rows by
--    `(transaction_date, created_at, transaction_id, movement_id)`
--    (20260901000600_account_ledger_running_balance.sql); with
--    transaction_date identical (every Monthly Budget row for a month is
--    dated the 1st of that month, see p_month::timestamptz below) and
--    created_at now also identical, the real tiebreaker was
--    transaction_id -- a random gen_random_uuid() with no relationship
--    to income vs expense. So loop-order alone would have been a no-op:
--    the ledger/running-balance view would still show income and expense
--    rows in effectively random relative order. Fixed by stamping each
--    row's created_at with clock_timestamp() instead of the table
--    default -- unlike now(), clock_timestamp() genuinely advances
--    between statements within one transaction, so it reflects real
--    insertion order. (Still for all practical purposes "the moment the
--    month was confirmed" -- these calls span microseconds, not
--    anything a user would notice as a timestamp discrepancy.)
--
-- Together: every income leg this call generates gets a strictly earlier
-- created_at than every expense/transfer/allocation leg, so any view
-- ordered by (transaction_date, created_at, ...) -- the Transactions
-- list, Account History, and every running-balance computation -- shows
-- income landing before it gets spent, instead of a same-day ordering
-- that could (roughly half the time, being UUID-random) show an expense
-- debiting the account before that day's income appears, which reads as
-- a false transient negative/low balance even though the day nets out
-- fine.
--
-- Unchanged: every other behavior (idempotency guards, transfer_group_id
-- minting, validation, occurrence/period status updates) -- this only
-- touches the driving query's ORDER BY and adds one column to the
-- INSERT's column/value lists.

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
begin
    if not public.is_household_admin(p_household_id, auth.uid()) then
        raise exception 'Only household admins can confirm a monthly budget month';
    end if;

    p_transfers := coalesce(p_transfers, '[]'::jsonb);
    if jsonb_typeof(p_transfers) <> 'array' then
        raise exception 'Planned item transfers must be a JSON array';
    end if;

    v_month_key := to_char(p_month, 'YYYY-MM');

    -- Income legs (occurrence.source_account_id is null -- an inflow
    -- occurrence never has one, see planned_items_source_account_by_direction)
    -- first, in their original relative order; every other leg
    -- (plain_expense/transfer_source/transfer_destination, i.e. every
    -- outflow occurrence) after, also in original relative order.
    -- `with ordinality` + `elems.ord` is the tiebreak that keeps each
    -- group's own internal order stable -- without it Postgres gives no
    -- guarantee two same-sort-key rows come out in input order.
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

        -- Idempotent no-op for a retried call, and a defensive backstop
        -- against an is_estimate occurrence the TS layer should never
        -- have included in p_transfers to begin with.
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
                -- One shared transfer_group_id per (occurrence_destination,
                -- pair) -- minted once, reused by whichever of the two
                -- legs is processed second.
                v_transfer_group_id := nullif(v_transfer_groups ->> v_occurrence_destination_id::text, '')::uuid;
                if v_transfer_group_id is null then
                    v_transfer_group_id := gen_random_uuid();
                    v_transfer_groups := v_transfer_groups
                        || jsonb_build_object(v_occurrence_destination_id::text, v_transfer_group_id::text);
                end if;
            end if;
        end if;

        v_type := case when v_role in ('transfer_destination', 'income') then 'income' else 'expense' end;

        -- Idempotency guard -- rely on the same identity the two partial
        -- unique indexes on transactions enforce, so a retried call skips
        -- a leg already inserted instead of erroring or duplicating.
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
            planned_item_transaction_role
        ) values (
            p_household_id, v_account_id, v_category_id, v_transfer_group_id,
            v_title, v_notes, v_amount, v_type, p_month::timestamptz, p_confirmed_by, clock_timestamp(),
            v_occurrence_id, v_occurrence_destination_id, v_role
        );
    end loop;

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

    insert into public.monthly_budget_periods (household_id, month, status, confirmed_at, confirmed_by)
    values (p_household_id, p_month, 'committed', now(), p_confirmed_by)
    on conflict (household_id, month) do update
        set status = 'committed',
            confirmed_at = excluded.confirmed_at,
            confirmed_by = excluded.confirmed_by
        where monthly_budget_periods.status = 'open'
    returning * into v_period;

    if v_period.id is null then
        -- Already committed/closed (the ON CONFLICT ... WHERE guard
        -- skipped the update) -- return the period's current state
        -- rather than erroring; a repeat confirm of an already-committed
        -- month is a safe no-op, same spirit as confirm_monthly_budget_run's
        -- "already confirmed -> return the row as-is" handling.
        select * into v_period
          from public.monthly_budget_periods
         where household_id = p_household_id and month = p_month;
    end if;

    return v_period;
end;
$$;

comment on function public.confirm_planned_item_month(uuid, date, jsonb, uuid) is
  'Atomically posts every non-estimate planned occurrence''s transaction leg(s) for a month and commits the period. Income legs (occurrence.source_account_id is null) are always inserted -- and, via an explicit clock_timestamp() created_at, always land chronologically -- before expense/transfer/allocation legs, so ledger/running-balance views never show a same-day expense debiting an account before that day''s income. See 20260901002400_confirm_planned_item_month_income_first.sql for why both the loop order and the created_at value needed to change together.';

revoke all on function public.confirm_planned_item_month(uuid, date, jsonb, uuid) from public;
grant execute on function public.confirm_planned_item_month(uuid, date, jsonb, uuid) to authenticated;
