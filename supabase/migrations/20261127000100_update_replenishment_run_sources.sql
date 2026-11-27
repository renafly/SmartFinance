-- Replenishments: change, after confirming, which account funded each
-- covered transaction.
--
-- confirm_replenishment_run decides once, per covered unit (a whole
-- non-split expense, or one account allocation of a split one), which
-- source(s) fund it, reassigns the transaction and records the choice in
-- replenishment_run_transactions.new_sources. Until now that choice was
-- final. update_replenishment_run_sources lets the user move a unit to a
-- different account afterwards.
--
-- Per changed unit it works on the transaction's current funding as a
-- multiset keyed by account/pot (a plain transaction is one entry, a split
-- one is its transaction_allocations rows):
--   funding := funding - old new_sources + new sources
-- and writes it back with the smallest change: untouched entries (e.g. a
-- reimbursed slice kept on the original account, or another unit's slice)
-- keep their rows and provenance; one remaining entry collapses the
-- transaction to a plain one; several make (or keep) it split. If the old
-- new_sources are no longer present in the funding, the transaction was
-- edited after the replenishment and the whole call fails.
--
-- Afterwards new_sources is refreshed and replenishment_run_sources'
-- amounts are recomputed from every unit's new_sources, so the run's
-- history (Fontes, "Financiado por") always matches the transactions. The
-- run's total_amount never changes: each unit's new sources must sum to
-- exactly what it was replenished for.
--
-- Editor sources are accounts only; a unit may not be "replenished" from
-- its own original account.

create or replace function public.update_replenishment_run_sources(p_run_id uuid, p_unit_sources jsonb)
returns public.replenishment_runs
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
    v_run public.replenishment_runs%rowtype;
    v_rrt public.replenishment_run_transactions%rowtype;
    v_tx public.transactions%rowtype;
    v_unit jsonb;
    v_source jsonb;
    v_transaction_id uuid;
    v_old_account_id uuid;
    v_source_account_id uuid;
    v_source_amount numeric;
    v_old_total numeric;
    v_new_total numeric;
    v_new_by_account jsonb;
    v_new_sources jsonb;
    v_funding jsonb;
    v_key text;
    v_current numeric;
    v_entry record;
    v_entry_count integer;
    v_plain_backing_account_id uuid;
    v_representative_account_id uuid;
    v_seen text[] := '{}';
    v_sort_order integer;
begin
    select * into v_run from public.replenishment_runs where id = p_run_id for update;
    if not found then
        raise exception 'Replenishment run not found';
    end if;
    if not public.is_household_member(v_run.household_id, auth.uid()) then
        raise exception 'Not authorized to change this replenishment';
    end if;
    if v_run.status <> 'confirmed' then
        raise exception 'Only confirmed replenishment runs can have their sources changed';
    end if;
    if p_unit_sources is null or jsonb_typeof(p_unit_sources) <> 'array' or jsonb_array_length(p_unit_sources) = 0 then
        raise exception 'At least one funding change is required';
    end if;

    for v_unit in select value from jsonb_array_elements(p_unit_sources)
    loop
        v_transaction_id := nullif(v_unit ->> 'transactionId', '')::uuid;
        v_old_account_id := nullif(v_unit ->> 'accountId', '')::uuid;
        if v_transaction_id is null or v_old_account_id is null then
            raise exception 'Funding change is missing transactionId/accountId';
        end if;

        v_key := v_transaction_id::text || ':' || v_old_account_id::text;
        if v_key = any (v_seen) then
            raise exception 'Transaction % appears more than once', v_transaction_id;
        end if;
        v_seen := v_seen || v_key;

        select * into v_rrt
          from public.replenishment_run_transactions
         where run_id = v_run.id and transaction_id = v_transaction_id and account_id = v_old_account_id
         for update;
        if not found then
            raise exception 'Transaction % is not covered by this replenishment', v_transaction_id;
        end if;
        if v_rrt.new_sources is null or jsonb_typeof(v_rrt.new_sources) <> 'array' or jsonb_array_length(v_rrt.new_sources) = 0 then
            raise exception 'Transaction % was replenished with transfers and its sources cannot be changed', v_transaction_id;
        end if;

        select coalesce(sum(round((s ->> 'amount')::numeric, 2)), 0)
          into v_old_total
          from jsonb_array_elements(v_rrt.new_sources) s;

        -- Validate the new sources and merge duplicates of the same account.
        if jsonb_typeof(v_unit -> 'sources') is distinct from 'array' or jsonb_array_length(v_unit -> 'sources') = 0 then
            raise exception 'Funding change for transaction % has no sources', v_transaction_id;
        end if;
        v_new_by_account := '{}'::jsonb;
        v_new_total := 0;
        for v_source in select value from jsonb_array_elements(v_unit -> 'sources')
        loop
            v_source_account_id := nullif(v_source ->> 'accountId', '')::uuid;
            v_source_amount := round(coalesce((v_source ->> 'amount')::numeric, 0), 2);
            if v_source_account_id is null then
                raise exception 'Funding change source is missing accountId';
            end if;
            if v_source_amount <= 0 then
                raise exception 'Every source amount must be greater than zero';
            end if;
            if v_source_account_id = v_old_account_id then
                raise exception 'Transaction % cannot be replenished from its own original account', v_transaction_id;
            end if;
            if not exists (
                select 1 from public.accounts where id = v_source_account_id and household_id = v_run.household_id
            ) then
                raise exception 'Source account does not belong to this household';
            end if;
            v_new_by_account := jsonb_set(
                v_new_by_account,
                array[v_source_account_id::text],
                to_jsonb(coalesce((v_new_by_account ->> v_source_account_id::text)::numeric, 0) + v_source_amount)
            );
            v_new_total := v_new_total + v_source_amount;
        end loop;
        if round(v_new_total, 2) <> round(v_old_total, 2) then
            raise exception 'Sources for transaction % must sum to %', v_transaction_id, v_old_total;
        end if;

        select * into v_tx from public.transactions where id = v_transaction_id for update;
        if not found or v_tx.household_id <> v_run.household_id then
            raise exception 'Covered transaction % no longer exists', v_transaction_id;
        end if;

        -- Current funding, keyed 'account:<id>' / 'pot:<id>'.
        v_plain_backing_account_id := null;
        if v_tx.is_split then
            select coalesce(jsonb_object_agg(
                       case when a.source_type = 'pot' then 'pot:' || a.pot_id else 'account:' || a.account_id end,
                       a.amount
                   ), '{}'::jsonb)
              into v_funding
              from public.transaction_allocations a
             where a.transaction_id = v_tx.id;
        elsif v_tx.pot_id is not null then
            v_funding := jsonb_build_object('pot:' || v_tx.pot_id, v_tx.amount);
            v_plain_backing_account_id := v_tx.account_id;
        else
            v_funding := jsonb_build_object('account:' || v_tx.account_id, v_tx.amount);
        end if;

        -- Remove what this replenishment put there.
        for v_source in select value from jsonb_array_elements(v_rrt.new_sources)
        loop
            v_key := case when v_source ->> 'source_type' = 'pot'
                          then 'pot:' || (v_source ->> 'pot_id')
                          else 'account:' || (v_source ->> 'account_id') end;
            v_current := (v_funding ->> v_key)::numeric;
            if v_current is null or round(v_current, 2) < round((v_source ->> 'amount')::numeric, 2) then
                raise exception 'Transaction % changed since this replenishment was confirmed -- edit it in Transactions instead.', v_transaction_id;
            end if;
            v_funding := jsonb_set(v_funding, array[v_key], to_jsonb(round(v_current - (v_source ->> 'amount')::numeric, 2)));
        end loop;

        -- Add the new sources.
        v_new_sources := '[]'::jsonb;
        for v_entry in select key, value::numeric as amount from jsonb_each_text(v_new_by_account)
        loop
            v_key := 'account:' || v_entry.key;
            v_funding := jsonb_set(
                v_funding,
                array[v_key],
                to_jsonb(round(coalesce((v_funding ->> v_key)::numeric, 0) + v_entry.amount, 2))
            );
            v_new_sources := v_new_sources || jsonb_build_object(
                'source_type', 'account',
                'account_id', v_entry.key::uuid,
                'pot_id', null,
                'amount', v_entry.amount
            );
        end loop;

        -- Drop emptied entries.
        select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
          into v_funding
          from jsonb_each(v_funding)
         where (value #>> '{}')::numeric > 0;

        select count(*) into v_entry_count from jsonb_object_keys(v_funding);

        if v_entry_count = 1 then
            -- One source left: a plain transaction.
            select key into v_key from jsonb_object_keys(v_funding) key;
            delete from public.transaction_allocations where transaction_id = v_tx.id;
            if v_key like 'account:%' then
                update public.transactions
                   set is_split = false,
                       account_id = substr(v_key, 9)::uuid,
                       pot_id = null
                 where id = v_tx.id;
            elsif v_plain_backing_account_id is not null then
                -- Still the plain pot funding it already had.
                update public.transactions
                   set is_split = false,
                       account_id = v_plain_backing_account_id,
                       pot_id = substr(v_key, 5)::uuid
                 where id = v_tx.id;
            else
                raise exception 'Transaction % would be funded only by a pot, which needs to be edited in Transactions', v_tx.id;
            end if;
        else
            -- Several sources: keep untouched allocation rows, adjust or
            -- remove changed ones, insert new ones.
            if v_tx.is_split then
                delete from public.transaction_allocations a
                 where a.transaction_id = v_tx.id
                   and not (v_funding ? (case when a.source_type = 'pot' then 'pot:' || a.pot_id else 'account:' || a.account_id end));

                update public.transaction_allocations a
                   set amount = (v_funding ->> (case when a.source_type = 'pot' then 'pot:' || a.pot_id else 'account:' || a.account_id end))::numeric
                 where a.transaction_id = v_tx.id
                   and a.amount <> (v_funding ->> (case when a.source_type = 'pot' then 'pot:' || a.pot_id else 'account:' || a.account_id end))::numeric;
            end if;

            select coalesce(max(sort_order) + 1, 0) into v_sort_order
              from public.transaction_allocations where transaction_id = v_tx.id;

            for v_entry in select key, value::numeric as amount from jsonb_each_text(v_funding) order by key
            loop
                if exists (
                    select 1 from public.transaction_allocations a
                     where a.transaction_id = v_tx.id
                       and (case when a.source_type = 'pot' then 'pot:' || a.pot_id else 'account:' || a.account_id end) = v_entry.key
                ) then
                    continue;
                end if;

                insert into public.transaction_allocations (
                    household_id, transaction_id, source_type, account_id, pot_id, amount, sort_order,
                    original_source_type, original_account_id, replenishment_run_id
                ) values (
                    v_tx.household_id,
                    v_tx.id,
                    case when v_entry.key like 'pot:%' then 'pot' else 'account' end,
                    case when v_entry.key like 'account:%' then substr(v_entry.key, 9)::uuid end,
                    case when v_entry.key like 'pot:%' then substr(v_entry.key, 5)::uuid end,
                    v_entry.amount,
                    v_sort_order,
                    -- A slice this edit put there came through this run;
                    -- anything else (e.g. the kept original slice of a
                    -- previously plain transaction) has no replenishment.
                    case when v_new_by_account ? substr(v_entry.key, 9) and v_entry.key like 'account:%' then 'account' end,
                    case when v_new_by_account ? substr(v_entry.key, 9) and v_entry.key like 'account:%'
                         then coalesce(v_tx.original_account_id, v_old_account_id) end,
                    case when v_new_by_account ? substr(v_entry.key, 9) and v_entry.key like 'account:%' then v_run.id end
                );
                v_sort_order := v_sort_order + 1;
            end loop;

            -- Representative account (largest account allocation), as in
            -- confirm_replenishment_run / save_transaction_allocations.
            select a.account_id into v_representative_account_id
              from public.transaction_allocations a
             where a.transaction_id = v_tx.id and a.account_id is not null
             order by a.amount desc, a.sort_order asc
             limit 1;

            update public.transactions
               set is_split = true,
                   account_id = coalesce(v_representative_account_id, account_id),
                   pot_id = null
             where id = v_tx.id;
        end if;

        update public.replenishment_run_transactions
           set new_sources = v_new_sources
         where id = v_rrt.id;
    end loop;

    -- Recompute the run's sources from every unit's new_sources.
    update public.replenishment_run_sources rs
       set amount = coalesce((
               select sum((s ->> 'amount')::numeric)
                 from public.replenishment_run_transactions rrt,
                      jsonb_array_elements(coalesce(rrt.new_sources, '[]'::jsonb)) s
                where rrt.run_id = v_run.id
                  and (
                      (rs.source_kind = 'pot' and s ->> 'source_type' = 'pot' and (s ->> 'pot_id')::uuid = rs.pot_id)
                      or (s ->> 'source_type' = 'account' and (s ->> 'account_id')::uuid = rs.resolved_account_id)
                  )
           ), 0),
           updated_at = now()
     where rs.run_id = v_run.id;

    insert into public.replenishment_run_sources (run_id, source_kind, pot_id, resolved_account_id, amount, suggested_amount, sort_order)
    select v_run.id,
           'account',
           null,
           totals.account_id,
           totals.amount,
           0,
           (select coalesce(max(sort_order), -1) from public.replenishment_run_sources where run_id = v_run.id)
             + row_number() over (order by totals.account_id)
      from (
          select (s ->> 'account_id')::uuid as account_id, sum((s ->> 'amount')::numeric) as amount
            from public.replenishment_run_transactions rrt,
                 jsonb_array_elements(coalesce(rrt.new_sources, '[]'::jsonb)) s
           where rrt.run_id = v_run.id
             and s ->> 'source_type' = 'account'
           group by 1
      ) totals
     where not exists (
         select 1 from public.replenishment_run_sources rs
          where rs.run_id = v_run.id and rs.resolved_account_id = totals.account_id
     );

    delete from public.replenishment_run_sources
     where run_id = v_run.id
       and source_kind = 'account'
       and amount = 0;

    update public.replenishment_runs
       set updated_at = now()
     where id = v_run.id
     returning * into v_run;

    return v_run;
end;
$$;

COMMENT ON FUNCTION public.update_replenishment_run_sources(uuid, jsonb) IS 'Changes, on a confirmed replenishment run, which account(s) fund the given covered units. Per unit: the transaction''s current funding minus the unit''s recorded new_sources plus the new sources, written back with the smallest change (untouched slices such as a reimbursed remainder keep their rows; one remaining source collapses the transaction to a plain one). Fails -- atomically, for the whole call -- if a unit''s recorded sources are no longer present (the transaction was edited since), if the new sources do not sum to what the unit was replenished for, or if a source is the unit''s own original account. Refreshes new_sources and recomputes replenishment_run_sources; total_amount never changes.';

revoke all on function public.update_replenishment_run_sources(uuid, jsonb) from public, anon;
grant execute on function public.update_replenishment_run_sources(uuid, jsonb) to authenticated;
