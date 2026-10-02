-- ============================================================
-- Monthly Budget rebuild (Phase 3+4) -- planned_item RPCs
-- ============================================================
-- Companion migration to the Phase 2 schema
-- (20260901001200..20260901001700_planned_items_*.sql). Per the Phase 3+4
-- design principle, every bit of split/rounding/recurrence-month-matching
-- math lives in exactly one place -- the TypeScript resolver at
-- src/features/planned-items/services/planned-items-resolver.ts
-- (resolvePlannedMonth). Every function below takes that resolver's
-- already-computed output and persists it, re-validating structurally
-- (types, FKs, idempotency guards) but never re-deriving an amount --
-- the same division of labor confirm_monthly_budget_run already uses
-- (see 20260803073904_confirm_monthly_budget_run_atomically.sql, the
-- reference this migration mirrors for transaction-insertion shape and
-- permission model) and create_transfer (006_transactions.sql /
-- 20260701213840_add_transfer_category_to_rpc.sql) for the two-leg
-- transfer column list.
--
-- ------------------------------------------------------------
-- 1. materialize_planned_item_occurrences -- upserts occurrences +
--    occurrence-destinations for exactly the entries the TS resolver
--    decided need (re)resolving ('create'/'refresh' actions -- an
--    'unchanged' occurrence is never included by the caller, so this
--    function never touches it). This is what gives preview its
--    "materialize with no financial side effects" property: it only
--    ever writes planned_item_occurrences/planned_item_occurrence_destinations,
--    never transactions.
--
--    p_resolved is a JSON array, each element shaped like
--    ResolvedOccurrence (camelCase, straight from the TS types):
--      { "occurrence": { "plannedItemId", "expectedAmount",
--                         "sourceAccountId", "categoryId", "isEstimate",
--                         "sourceDefinitionVersion", ... },
--        "destinations": [ { "plannedItemDestinationId", "destinationAccountId",
--                             "amount", "categoryId" }, ... ] }
--    A plain-expense occurrence (0 template destinations) carries a
--    "destinations" array that is simply empty -- this function inserts
--    one row per array entry, so an empty array naturally upserts zero
--    occurrence_destination rows. The deferred "destination amounts must
--    sum to expected_amount" trigger
--    (check_planned_item_occurrence_destinations_deferred, redefined in
--    20260901001900_fix_occurrence_destinations_sum_trigger.sql) skips
--    the check entirely when an occurrence has zero destination rows, so
--    no placeholder row is needed here.
--
--    Idempotent: re-calling with the same input upserts on the existing
--    unique(planned_item_id, month) key and is a safe no-op once nothing
--    has changed. Only upserts an occurrence still 'planned' and not
--    hand-overridden (the ON CONFLICT ... WHERE guard) -- if the TS
--    resolver raced with a concurrent confirm/override, the stale entry
--    is silently skipped rather than clobbering real state.
-- ------------------------------------------------------------

create or replace function public.materialize_planned_item_occurrences(
    p_household_id uuid,
    p_month date,
    p_resolved jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_entry jsonb;
    v_occ jsonb;
    v_dest jsonb;
    v_occurrence_id uuid;
    v_planned_item_id uuid;
    v_count integer := 0;
begin
    if not public.is_household_admin(p_household_id, auth.uid()) then
        raise exception 'Only household admins can materialize planned item occurrences';
    end if;

    p_resolved := coalesce(p_resolved, '[]'::jsonb);
    if jsonb_typeof(p_resolved) <> 'array' then
        raise exception 'Resolved occurrences must be a JSON array';
    end if;

    for v_entry in select value from jsonb_array_elements(p_resolved)
    loop
        v_occ := v_entry -> 'occurrence';
        if v_occ is null then
            raise exception 'Resolved occurrence entry is missing "occurrence"';
        end if;

        v_planned_item_id := nullif(v_occ ->> 'plannedItemId', '')::uuid;
        if v_planned_item_id is null then
            raise exception 'Resolved occurrence entry is missing a valid plannedItemId';
        end if;

        if not exists (
            select 1 from public.planned_items pi
             where pi.id = v_planned_item_id
               and pi.household_id = p_household_id
        ) then
            raise exception 'Planned item % does not belong to household %', v_planned_item_id, p_household_id;
        end if;

        insert into public.planned_item_occurrences (
            planned_item_id, household_id, month, status, expected_amount,
            source_account_id, category_id, is_estimate, source_definition_version,
            is_overridden
        ) values (
            v_planned_item_id,
            p_household_id,
            p_month,
            'planned',
            (v_occ ->> 'expectedAmount')::numeric,
            nullif(v_occ ->> 'sourceAccountId', '')::uuid,
            (v_occ ->> 'categoryId')::uuid,
            coalesce((v_occ ->> 'isEstimate')::boolean, false),
            coalesce((v_occ ->> 'sourceDefinitionVersion')::integer, 1),
            false
        )
        on conflict (planned_item_id, month) do update
            set expected_amount = excluded.expected_amount,
                source_account_id = excluded.source_account_id,
                category_id = excluded.category_id,
                is_estimate = excluded.is_estimate,
                source_definition_version = excluded.source_definition_version
            where planned_item_occurrences.status = 'planned'
              and not planned_item_occurrences.is_overridden
        returning id into v_occurrence_id;

        if v_occurrence_id is null then
            -- The occurrence exists but is no longer 'planned' (or has
            -- since been hand-overridden) -- the TS resolver should never
            -- send such an entry, but if a concurrent confirm/override
            -- raced it, leave the existing row untouched rather than
            -- failing the whole batch.
            continue;
        end if;

        delete from public.planned_item_occurrence_destinations
         where occurrence_id = v_occurrence_id;

        for v_dest in select value from jsonb_array_elements(coalesce(v_entry -> 'destinations', '[]'::jsonb))
        loop
            insert into public.planned_item_occurrence_destinations (
                occurrence_id, planned_item_destination_id, destination_account_id,
                amount, category_id
            ) values (
                v_occurrence_id,
                nullif(v_dest ->> 'plannedItemDestinationId', '')::uuid,
                (v_dest ->> 'destinationAccountId')::uuid,
                (v_dest ->> 'amount')::numeric,
                nullif(v_dest ->> 'categoryId', '')::uuid
            );
        end loop;

        v_count := v_count + 1;
    end loop;

    return v_count;
end;
$$;

revoke all on function public.materialize_planned_item_occurrences(uuid, date, jsonb) from public;
grant execute on function public.materialize_planned_item_occurrences(uuid, date, jsonb) to authenticated;

-- ------------------------------------------------------------
-- 2. confirm_planned_item_month -- atomic. p_transfers is the TS
--    resolver's precomputed leg-by-leg plan (ResolvedTransactionLeg[],
--    flattened across every non-estimate 'planned' occurrence this
--    month -- an is_estimate occurrence's legs are never included by the
--    caller in the first place; the is_estimate check below is a
--    defensive backstop only). Each element:
--      { "occurrenceId", "role", "accountId", "amount", "categoryId",
--        "occurrenceDestinationLookupAccountId" }
--    transfer_group_id is deliberately NOT read from the client (it has
--    no business meaning -- see ResolvedTransactionLeg.transferGroupId's
--    doc comment) -- this function mints its own via gen_random_uuid()
--    per transfer_source/transfer_destination pair, exactly like
--    confirm_monthly_budget_run does.
--
--    For each occurrence: locked FOR UPDATE, skipped (no-op) if not
--    status = 'planned' (covers a retried call and a defensively-sent
--    is_estimate entry alike). Transaction legs are inserted exactly per
--    the role mapping the resolver already computed; a plain_expense
--    leg carries occurrenceDestinationLookupAccountId = null (there is no
--    occurrence_destination row for it to look up -- the occurrence has
--    zero of them), so planned_item_occurrence_destination_id is always
--    left NULL (matches idx_transactions_one_plain_expense_per_occurrence)
--    and the leg's amount/account come straight from the occurrence
--    itself.
--
--    Idempotent: the two partial unique indexes on transactions
--    (idx_transactions_one_role_per_occurrence_destination,
--    idx_transactions_one_plain_expense_per_occurrence) are checked
--    before each insert, so a retried call skips legs already inserted
--    rather than erroring or duplicating.
--
--    After every occurrence: upserts monthly_budget_periods for
--    (p_household_id, p_month) to status = 'committed' (only ever
--    advances from 'open', never overwrites 'closed' -- the WHERE guard
--    on the ON CONFLICT DO UPDATE below). Any failure anywhere in this
--    function rolls back the whole call (ordinary Postgres function/
--    transaction semantics -- no special handling needed).
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
begin
    if not public.is_household_admin(p_household_id, auth.uid()) then
        raise exception 'Only household admins can confirm a monthly budget month';
    end if;

    p_transfers := coalesce(p_transfers, '[]'::jsonb);
    if jsonb_typeof(p_transfers) <> 'array' then
        raise exception 'Planned item transfers must be a JSON array';
    end if;

    v_month_key := to_char(p_month, 'YYYY-MM');

    for v_leg in select value from jsonb_array_elements(p_transfers)
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
            title, notes, amount, type, transaction_date, created_by,
            planned_item_occurrence_id, planned_item_occurrence_destination_id,
            planned_item_transaction_role
        ) values (
            p_household_id, v_account_id, v_category_id, v_transfer_group_id,
            v_title, v_notes, v_amount, v_type, p_month::timestamptz, p_confirmed_by,
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

revoke all on function public.confirm_planned_item_month(uuid, date, jsonb, uuid) from public;
grant execute on function public.confirm_planned_item_month(uuid, date, jsonb, uuid) to authenticated;

-- ------------------------------------------------------------
-- 3. revert_planned_item_occurrence -- only while the owning month is
--    still 'open' (a missing monthly_budget_periods row counts as open --
--    it means the month was never confirmed as a whole, e.g. only
--    individually matched occurrences exist so far).
-- ------------------------------------------------------------

create or replace function public.revert_planned_item_occurrence(p_occurrence_id uuid)
returns public.planned_item_occurrences
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_occurrence public.planned_item_occurrences%rowtype;
    v_period_status public.monthly_budget_period_status;
begin
    select * into v_occurrence
      from public.planned_item_occurrences
     where id = p_occurrence_id
     for update;

    if not found then
        raise exception 'Planned item occurrence % not found', p_occurrence_id;
    end if;

    if not public.is_household_admin(v_occurrence.household_id, auth.uid()) then
        raise exception 'Only household admins can revert a planned item occurrence';
    end if;

    select status into v_period_status
      from public.monthly_budget_periods
     where household_id = v_occurrence.household_id
       and month = v_occurrence.month;

    if coalesce(v_period_status, 'open') <> 'open' then
        raise exception 'Cannot revert: month % is %, edit the transaction directly instead',
            to_char(v_occurrence.month, 'YYYY-MM'), v_period_status;
    end if;

    delete from public.transactions
     where planned_item_occurrence_id = p_occurrence_id;

    update public.planned_item_occurrences
       set status = 'planned',
           confirmed_at = null,
           confirmed_by = null
     where id = p_occurrence_id
     returning * into v_occurrence;

    return v_occurrence;
end;
$$;

revoke all on function public.revert_planned_item_occurrence(uuid) from public;
grant execute on function public.revert_planned_item_occurrence(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4. match_planned_item_occurrence -- links an is_estimate occurrence
--    (or any 'planned' occurrence) to the real transaction that
--    reconciled it. Validates household + type before inserting, and
--    turns either of planned_item_matches' two unique constraints into a
--    named error instead of a raw constraint-violation message.
-- ------------------------------------------------------------

create or replace function public.match_planned_item_occurrence(
    p_occurrence_id uuid,
    p_transaction_id uuid,
    p_matched_by uuid
)
returns public.planned_item_occurrences
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_occurrence public.planned_item_occurrences%rowtype;
    v_transaction public.transactions%rowtype;
    v_expected_type public.transaction_type;
begin
    select * into v_occurrence
      from public.planned_item_occurrences
     where id = p_occurrence_id
     for update;

    if not found then
        raise exception 'Planned item occurrence % not found', p_occurrence_id;
    end if;

    if not public.is_household_admin(v_occurrence.household_id, auth.uid()) then
        raise exception 'Only household admins can match a planned item occurrence';
    end if;

    select * into v_transaction
      from public.transactions
     where id = p_transaction_id
     for update;

    if not found then
        raise exception 'Transaction % not found', p_transaction_id;
    end if;

    if v_transaction.household_id <> v_occurrence.household_id then
        raise exception 'Transaction % does not belong to the same household as occurrence %', p_transaction_id, p_occurrence_id;
    end if;

    -- source_account_id is null iff the occurrence is inflow (see
    -- planned_items_source_account_by_direction); an inflow occurrence
    -- must match an income transaction, an outflow one an expense.
    v_expected_type := case when v_occurrence.source_account_id is null then 'income' else 'expense' end;
    if v_transaction.type <> v_expected_type then
        raise exception 'Transaction % is type %, but occurrence % needs a % transaction',
            p_transaction_id, v_transaction.type, p_occurrence_id, v_expected_type;
    end if;

    insert into public.planned_item_matches (occurrence_id, transaction_id, matched_by)
    values (p_occurrence_id, p_transaction_id, p_matched_by);

    update public.planned_item_occurrences
       set status = 'matched'
     where id = p_occurrence_id
     returning * into v_occurrence;

    return v_occurrence;
exception
    when unique_violation then
        if exists (select 1 from public.planned_item_matches where occurrence_id = p_occurrence_id) then
            raise exception 'Occurrence % is already matched to a transaction', p_occurrence_id;
        else
            raise exception 'Transaction % is already matched to another occurrence', p_transaction_id;
        end if;
end;
$$;

revoke all on function public.match_planned_item_occurrence(uuid, uuid, uuid) from public;
grant execute on function public.match_planned_item_occurrence(uuid, uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- 5. unmatch_planned_item_occurrence -- deletes the match row only; the
--    real transaction itself is never touched.
-- ------------------------------------------------------------

create or replace function public.unmatch_planned_item_occurrence(p_occurrence_id uuid)
returns public.planned_item_occurrences
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_occurrence public.planned_item_occurrences%rowtype;
begin
    select * into v_occurrence
      from public.planned_item_occurrences
     where id = p_occurrence_id
     for update;

    if not found then
        raise exception 'Planned item occurrence % not found', p_occurrence_id;
    end if;

    if not public.is_household_admin(v_occurrence.household_id, auth.uid()) then
        raise exception 'Only household admins can unmatch a planned item occurrence';
    end if;

    delete from public.planned_item_matches where occurrence_id = p_occurrence_id;

    update public.planned_item_occurrences
       set status = 'planned'
     where id = p_occurrence_id
     returning * into v_occurrence;

    return v_occurrence;
end;
$$;

revoke all on function public.unmatch_planned_item_occurrence(uuid) from public;
grant execute on function public.unmatch_planned_item_occurrence(uuid) to authenticated;

-- ------------------------------------------------------------
-- 6. skip_planned_item_occurrence / cancel_planned_item_occurrence --
--    simple guarded status transitions, 'planned' only.
-- ------------------------------------------------------------

create or replace function public.skip_planned_item_occurrence(p_occurrence_id uuid)
returns public.planned_item_occurrences
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_occurrence public.planned_item_occurrences%rowtype;
begin
    select * into v_occurrence
      from public.planned_item_occurrences
     where id = p_occurrence_id
     for update;

    if not found then
        raise exception 'Planned item occurrence % not found', p_occurrence_id;
    end if;

    if not public.is_household_admin(v_occurrence.household_id, auth.uid()) then
        raise exception 'Only household admins can skip a planned item occurrence';
    end if;

    if v_occurrence.status <> 'planned' then
        raise exception 'Only a planned occurrence can be skipped (occurrence % is %)', p_occurrence_id, v_occurrence.status;
    end if;

    update public.planned_item_occurrences
       set status = 'skipped'
     where id = p_occurrence_id
     returning * into v_occurrence;

    return v_occurrence;
end;
$$;

revoke all on function public.skip_planned_item_occurrence(uuid) from public;
grant execute on function public.skip_planned_item_occurrence(uuid) to authenticated;

create or replace function public.cancel_planned_item_occurrence(p_occurrence_id uuid)
returns public.planned_item_occurrences
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_occurrence public.planned_item_occurrences%rowtype;
begin
    select * into v_occurrence
      from public.planned_item_occurrences
     where id = p_occurrence_id
     for update;

    if not found then
        raise exception 'Planned item occurrence % not found', p_occurrence_id;
    end if;

    if not public.is_household_admin(v_occurrence.household_id, auth.uid()) then
        raise exception 'Only household admins can cancel a planned item occurrence';
    end if;

    if v_occurrence.status <> 'planned' then
        raise exception 'Only a planned occurrence can be cancelled (occurrence % is %)', p_occurrence_id, v_occurrence.status;
    end if;

    update public.planned_item_occurrences
       set status = 'cancelled'
     where id = p_occurrence_id
     returning * into v_occurrence;

    return v_occurrence;
end;
$$;

revoke all on function public.cancel_planned_item_occurrence(uuid) from public;
grant execute on function public.cancel_planned_item_occurrence(uuid) to authenticated;

-- ------------------------------------------------------------
-- 7. reset_planned_item_occurrence_to_template -- clears is_overridden
--    and forces source_definition_version back to 0 so the next
--    materialize_planned_item_occurrences call (driven by a fresh TS
--    resolve) treats it as stale and refreshes it. Does not itself
--    resolve new values.
-- ------------------------------------------------------------

create or replace function public.reset_planned_item_occurrence_to_template(p_occurrence_id uuid)
returns public.planned_item_occurrences
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_occurrence public.planned_item_occurrences%rowtype;
begin
    select * into v_occurrence
      from public.planned_item_occurrences
     where id = p_occurrence_id
     for update;

    if not found then
        raise exception 'Planned item occurrence % not found', p_occurrence_id;
    end if;

    if not public.is_household_admin(v_occurrence.household_id, auth.uid()) then
        raise exception 'Only household admins can reset a planned item occurrence';
    end if;

    if v_occurrence.status <> 'planned' then
        raise exception 'Only a planned occurrence can be reset to its template (occurrence % is %)', p_occurrence_id, v_occurrence.status;
    end if;

    update public.planned_item_occurrences
       set is_overridden = false,
           source_definition_version = 0
     where id = p_occurrence_id
     returning * into v_occurrence;

    return v_occurrence;
end;
$$;

revoke all on function public.reset_planned_item_occurrence_to_template(uuid) from public;
grant execute on function public.reset_planned_item_occurrence_to_template(uuid) to authenticated;
