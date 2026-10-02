-- ============================================================
-- confirm_replenishment_run: reassign origin instead of creating transfers
-- ============================================================
-- Replaces the transfer-creating body from
-- 20260901000100_confirm_replenishment_run.sql. Signature changes from
-- (p_run_id, p_transfers, p_preview) to (p_run_id, p_unit_sources,
-- p_preview): p_transfers carried account-level transfer legs to insert;
-- p_unit_sources carries, per covered transaction/allocation ("unit" --
-- see replenishment_run_transactions, one row per (transaction_id,
-- account_id) covered), the new funding source(s) it should be reassigned
-- to:
--
--   [{
--     "transactionId": uuid,
--     "accountId": uuid,           -- the unit's OLD account_id, identifying
--                                   -- which replenishment_run_transactions
--                                   -- row this is
--     "sources": [
--       { "sourceType": "account"|"pot", "accountId": uuid|null,
--         "potId": uuid|null, "amount": number }
--     ]
--   }, ...]
--
-- Almost every unit has exactly one source (the whole thing came from one
-- account/pot). More than one only happens when the wizard's settlement
-- algorithm had to split a unit across two money sources at a boundary --
-- see ReplenishmentWizard.tsx's per-unit settlement computation. Kept
-- general here (any source count) rather than special-cased, since the
-- validation/application logic is the same either way.
--
-- Still atomic and retry-safe like the run it replaces, for the same
-- reason: this whole function body runs as one statement/transaction, so a
-- client retry only ever sees one of two states. Either the previous call
-- fully committed (mutations and the final status = 'confirmed' flip
-- together) -- in which case v_run.status is already 'confirmed' and the
-- guard right after locking the run returns immediately, before touching
-- anything -- or it didn't commit at all (any exception, anywhere,
-- including a deferred constraint failing at commit after the function
-- body already returned, rolls back every mutation the call made), in
-- which case v_run.status is still 'draft' and nothing from that attempt
-- persisted, so simply running the whole loop again from scratch is
-- correct. There is no state where some units were durably reassigned but
-- the run is still draft, so the loop deliberately does not try to
-- recognize "already done" units mid-run -- an earlier version of this
-- function did, and got it wrong for the case in the transaction_allocations
-- branch below where the very row that check reads is the one this same
-- unit deletes.
-- replenishment_run_id on transactions/transaction_allocations is set
-- anyway, alongside original_source_type/original_account_id -- not for
-- this idempotency, but as visible audit trail: which run last reassigned
-- this row.

drop function if exists public.confirm_replenishment_run(uuid, jsonb, jsonb);

create or replace function public.confirm_replenishment_run(
    p_run_id uuid,
    p_unit_sources jsonb,
    p_preview jsonb
)
returns public.replenishment_runs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_run public.replenishment_runs%rowtype;
    v_unit jsonb;
    v_source jsonb;
    v_transaction_id uuid;
    v_old_account_id uuid;
    v_covered_total numeric;
    v_conflicting_transaction_id uuid;
    v_transaction public.transactions%rowtype;
    v_allocation public.transaction_allocations%rowtype;
    v_unit_total numeric;
    v_source_count integer;
    v_source_type text;
    v_source_account_id uuid;
    v_source_pot_id uuid;
    v_source_amount numeric;
    v_sources_sum numeric;
    v_new_sources jsonb;
    v_existing_allocation_id uuid;
    v_representative_account_id uuid;
    v_representative_amount numeric;
    v_sort_order integer;
begin
    select *
      into v_run
      from public.replenishment_runs
     where id = p_run_id
     for update;

    if not found then
        raise exception 'Replenishment run not found';
    end if;

    if not public.is_household_member(v_run.household_id, auth.uid()) then
        raise exception 'Not authorized to confirm this replenishment';
    end if;

    -- A retry after a successful commit is a no-op. The row lock also
    -- prevents two concurrent confirmations from double-applying.
    if v_run.status = 'confirmed' then
        return v_run;
    end if;

    if v_run.status <> 'draft' then
        raise exception 'Only draft replenishment runs can be confirmed';
    end if;

    if p_unit_sources is null or jsonb_typeof(p_unit_sources) <> 'array' then
        raise exception 'Replenishment funding assignments must be a JSON array';
    end if;
    if jsonb_array_length(p_unit_sources) = 0 then
        raise exception 'Replenishment must include at least one funding assignment';
    end if;
    if p_preview is null or jsonb_typeof(p_preview) <> 'object' then
        raise exception 'Replenishment preview must be a JSON object';
    end if;
    -- Reject a stale/tampered preview -- what the user saw must be exactly
    -- what gets confirmed.
    if coalesce(p_preview -> 'unitSources', '[]'::jsonb) <> p_unit_sources then
        raise exception 'Replenishment funding assignments do not match the saved preview';
    end if;

    if not exists (
        select 1 from public.replenishment_run_transactions where run_id = v_run.id
    ) then
        raise exception 'Replenishment run has no covered transactions';
    end if;

    -- The covered transactions' snapshotted total must still match the
    -- run's declared total -- refuses to confirm against a preview that has
    -- gone stale relative to what was actually selected.
    select coalesce(sum(amount), 0)
      into v_covered_total
      from public.replenishment_run_transactions
     where run_id = v_run.id;

    if v_covered_total <> v_run.total_amount then
        raise exception 'Replenishment total no longer matches the selected transactions';
    end if;

    -- Double-repayment guard: none of this run's covered transactions may
    -- also be covered by a different, already-confirmed run.
    select rrt.transaction_id
      into v_conflicting_transaction_id
      from public.replenishment_run_transactions rrt
      join public.replenishment_runs other on other.id = rrt.run_id
     where rrt.transaction_id in (
             select transaction_id
               from public.replenishment_run_transactions
              where run_id = v_run.id
           )
       and other.id <> v_run.id
       and other.status = 'confirmed'
     limit 1;

    if v_conflicting_transaction_id is not null then
        raise exception using
            errcode = '23505',
            message = 'One or more selected transactions have already been replenished by another confirmed run.',
            detail = format('Transaction %s is already covered.', v_conflicting_transaction_id);
    end if;

    -- One iteration per covered unit: either a whole non-split transaction,
    -- or one transaction_allocations row of an already-split one.
    for v_unit in select value from jsonb_array_elements(p_unit_sources)
    loop
        v_transaction_id := nullif(v_unit ->> 'transactionId', '')::uuid;
        v_old_account_id := nullif(v_unit ->> 'accountId', '')::uuid;

        if v_transaction_id is null or v_old_account_id is null then
            raise exception 'Replenishment funding assignment is missing transactionId/accountId';
        end if;

        select coalesce(sum(amount), 0)
          into v_unit_total
          from public.replenishment_run_transactions
         where run_id = v_run.id
           and transaction_id = v_transaction_id
           and account_id = v_old_account_id;

        if v_unit_total <= 0 then
            raise exception 'Replenishment funding assignment does not match a covered transaction for this run';
        end if;

        v_source_count := jsonb_array_length(coalesce(v_unit -> 'sources', '[]'::jsonb));
        if v_source_count = 0 then
            raise exception 'Replenishment funding assignment for transaction % has no sources', v_transaction_id;
        end if;

        select coalesce(sum(round((s ->> 'amount')::numeric, 2)), 0)
          into v_sources_sum
          from jsonb_array_elements(v_unit -> 'sources') s;
        if round(v_sources_sum, 2) <> round(v_unit_total, 2) then
            raise exception 'Replenishment funding assignment for transaction % must sum to %', v_transaction_id, v_unit_total;
        end if;

        select *
          into v_transaction
          from public.transactions
         where id = v_transaction_id
         for update;

        if not found then
            raise exception 'Covered transaction % no longer exists', v_transaction_id;
        end if;

        if not v_transaction.is_split then
            -- ------------------------------------------------------------
            -- The whole (non-split) transaction is the unit.
            -- ------------------------------------------------------------
            if v_transaction.account_id <> v_old_account_id then
                raise exception 'Covered transaction % has changed account since this run was drafted', v_transaction_id;
            end if;

            if v_source_count = 1 then
                v_source := (v_unit -> 'sources') -> 0;
                v_source_type := v_source ->> 'sourceType';
                v_source_account_id := nullif(v_source ->> 'accountId', '')::uuid;
                v_source_pot_id := nullif(v_source ->> 'potId', '')::uuid;

                if v_source_type not in ('account', 'pot') or v_source_account_id is null then
                    raise exception 'Replenishment source for transaction % is invalid', v_transaction_id;
                end if;
                if not exists (
                    select 1 from public.accounts where id = v_source_account_id and household_id = v_run.household_id
                ) then
                    raise exception 'Replenishment source account does not belong to this household';
                end if;
                if v_source_pot_id is not null and not exists (
                    select 1 from public.saving_pots where id = v_source_pot_id and household_id = v_run.household_id
                ) then
                    raise exception 'Replenishment source pot does not belong to this household';
                end if;

                update public.transactions
                   set account_id = v_source_account_id,
                       pot_id = v_source_pot_id,
                       original_source_type = coalesce(original_source_type, 'account'),
                       original_account_id = coalesce(original_account_id, v_old_account_id),
                       replenishment_run_id = v_run.id
                 where id = v_transaction_id;

                v_new_sources := jsonb_build_array(jsonb_build_object(
                    'source_type', v_source_type,
                    'account_id', v_source_account_id,
                    'pot_id', v_source_pot_id,
                    'amount', v_unit_total
                ));
            else
                -- Needs more than one source: convert into a split
                -- transaction funded by them, reusing the same
                -- transaction_allocations mechanism split transactions
                -- already use everywhere else in the app.
                v_representative_account_id := null;
                v_representative_amount := -1;
                v_new_sources := '[]'::jsonb;
                v_sort_order := 0;

                for v_source in select value from jsonb_array_elements(v_unit -> 'sources')
                loop
                    v_source_type := v_source ->> 'sourceType';
                    v_source_account_id := nullif(v_source ->> 'accountId', '')::uuid;
                    v_source_pot_id := nullif(v_source ->> 'potId', '')::uuid;
                    v_source_amount := round(coalesce((v_source ->> 'amount')::numeric, 0), 2);

                    if v_source_amount <= 0 then
                        raise exception 'Every replenishment source amount must be greater than zero';
                    end if;
                    if v_source_type = 'account' then
                        if v_source_account_id is null then
                            raise exception 'Replenishment account source is missing accountId';
                        end if;
                        if not exists (
                            select 1 from public.accounts where id = v_source_account_id and household_id = v_run.household_id
                        ) then
                            raise exception 'Replenishment source account does not belong to this household';
                        end if;
                    elsif v_source_type = 'pot' then
                        if v_source_pot_id is null then
                            raise exception 'Replenishment pot source is missing potId';
                        end if;
                        if not exists (
                            select 1 from public.saving_pots where id = v_source_pot_id and household_id = v_run.household_id
                        ) then
                            raise exception 'Replenishment source pot does not belong to this household';
                        end if;
                    else
                        raise exception 'Replenishment source for transaction % is invalid', v_transaction_id;
                    end if;

                    insert into public.transaction_allocations (
                        household_id, transaction_id, source_type, account_id, pot_id, amount, sort_order,
                        original_source_type, original_account_id, replenishment_run_id
                    ) values (
                        v_run.household_id, v_transaction_id, v_source_type, v_source_account_id, v_source_pot_id, v_source_amount,
                        v_sort_order, 'account', v_old_account_id, v_run.id
                    );
                    v_sort_order := v_sort_order + 1;

                    if v_source_account_id is not null and v_source_amount > v_representative_amount then
                        v_representative_account_id := v_source_account_id;
                        v_representative_amount := v_source_amount;
                    end if;

                    v_new_sources := v_new_sources || jsonb_build_object(
                        'source_type', v_source_type,
                        'account_id', v_source_account_id,
                        'pot_id', v_source_pot_id,
                        'amount', v_source_amount
                    );
                end loop;

                update public.transactions
                   set is_split = true,
                       account_id = coalesce(v_representative_account_id, account_id),
                       pot_id = null,
                       original_source_type = coalesce(original_source_type, 'account'),
                       original_account_id = coalesce(original_account_id, v_old_account_id),
                       replenishment_run_id = v_run.id
                 where id = v_transaction_id;
            end if;
        else
            -- ------------------------------------------------------------
            -- One transaction_allocations row of an already-split
            -- transaction is the unit -- only that slice's source changes;
            -- every other allocation on the same transaction is untouched.
            -- ------------------------------------------------------------
            select *
              into v_allocation
              from public.transaction_allocations
             where transaction_id = v_transaction_id
               and account_id = v_old_account_id
             for update;

            if not found then
                raise exception 'Covered allocation for transaction % / account % no longer exists', v_transaction_id, v_old_account_id;
            end if;

            if round(v_allocation.amount, 2) <> round(v_unit_total, 2) then
                raise exception 'Covered allocation for transaction % has changed amount since this run was drafted', v_transaction_id;
            end if;

            v_new_sources := '[]'::jsonb;

            -- Delete the old allocation row up front. Each new source below
            -- either merges into a sibling allocation already funding a
            -- different slice of this same transaction from the same
            -- account/pot (adding onto its amount -- its own
            -- original_*/replenishment_run_id are left as they were, since
            -- only part of its new total came through this replenishment)
            -- or inserts a fresh row -- either way the old row for this
            -- exact account must already be gone first, or the "one row
            -- per account/pot per transaction" unique indexes would see it
            -- as a duplicate of itself.
            delete from public.transaction_allocations where id = v_allocation.id;

            for v_source in select value from jsonb_array_elements(v_unit -> 'sources')
            loop
                v_source_type := v_source ->> 'sourceType';
                v_source_account_id := nullif(v_source ->> 'accountId', '')::uuid;
                v_source_pot_id := nullif(v_source ->> 'potId', '')::uuid;
                v_source_amount := round(coalesce((v_source ->> 'amount')::numeric, 0), 2);
                v_existing_allocation_id := null;

                if v_source_amount <= 0 then
                    raise exception 'Every replenishment source amount must be greater than zero';
                end if;

                if v_source_type = 'account' then
                    if v_source_account_id is null then
                        raise exception 'Replenishment account source is missing accountId';
                    end if;
                    if not exists (
                        select 1 from public.accounts where id = v_source_account_id and household_id = v_run.household_id
                    ) then
                        raise exception 'Replenishment source account does not belong to this household';
                    end if;
                    select id into v_existing_allocation_id
                      from public.transaction_allocations
                     where transaction_id = v_transaction_id and account_id = v_source_account_id
                     for update;
                elsif v_source_type = 'pot' then
                    if v_source_pot_id is null then
                        raise exception 'Replenishment pot source is missing potId';
                    end if;
                    if not exists (
                        select 1 from public.saving_pots where id = v_source_pot_id and household_id = v_run.household_id
                    ) then
                        raise exception 'Replenishment source pot does not belong to this household';
                    end if;
                    select id into v_existing_allocation_id
                      from public.transaction_allocations
                     where transaction_id = v_transaction_id and pot_id = v_source_pot_id
                     for update;
                else
                    raise exception 'Replenishment source for transaction % is invalid', v_transaction_id;
                end if;

                if v_existing_allocation_id is not null then
                    update public.transaction_allocations
                       set amount = amount + v_source_amount
                     where id = v_existing_allocation_id;
                else
                    insert into public.transaction_allocations (
                        household_id, transaction_id, source_type, account_id, pot_id, amount, sort_order,
                        original_source_type, original_account_id, replenishment_run_id
                    ) values (
                        v_run.household_id, v_transaction_id, v_source_type, v_source_account_id, v_source_pot_id, v_source_amount,
                        coalesce((select max(sort_order) + 1 from public.transaction_allocations where transaction_id = v_transaction_id), 0),
                        'account', coalesce(v_allocation.original_account_id, v_old_account_id), v_run.id
                    );
                end if;

                v_new_sources := v_new_sources || jsonb_build_object(
                    'source_type', v_source_type,
                    'account_id', v_source_account_id,
                    'pot_id', v_source_pot_id,
                    'amount', v_source_amount
                );
            end loop;

            -- A merge above (a new source that already funded a different
            -- slice of this same transaction) can leave exactly one
            -- allocation row where there used to be several -- e.g.
            -- replenishing a 50/150 split's 50 slice from the account that
            -- already funded the other 150 collapses it to one 200 row.
            -- transaction_allocations requires >= 2 rows whenever any
            -- exist (enforce_transaction_allocations_integrity), so a
            -- single remaining row must revert this transaction to a
            -- plain non-split one -- the same shape
            -- save_transaction_allocations produces for an empty
            -- allocations array, just arrived at from the other direction.
            if (select count(*) from public.transaction_allocations where transaction_id = v_transaction_id) = 1 then
                select * into v_allocation
                  from public.transaction_allocations
                 where transaction_id = v_transaction_id;

                delete from public.transaction_allocations where id = v_allocation.id;

                update public.transactions
                   set is_split = false,
                       account_id = coalesce(v_allocation.account_id, account_id),
                       pot_id = v_allocation.pot_id,
                       original_source_type = coalesce(original_source_type, 'account'),
                       original_account_id = coalesce(original_account_id, coalesce(v_allocation.original_account_id, v_old_account_id))
                 where id = v_transaction_id;
            else
                -- Recompute the parent transaction's representative
                -- account_id (largest account-type allocation), mirroring
                -- save_transaction_allocations -- this field is
                -- display/filter convenience only; transaction_allocations
                -- stays authoritative for balance math regardless of what
                -- it's set to.
                select ta.account_id
                  into v_representative_account_id
                  from public.transaction_allocations ta
                 where ta.transaction_id = v_transaction_id
                   and ta.account_id is not null
                 order by ta.amount desc, ta.sort_order asc
                 limit 1;

                update public.transactions
                   set account_id = coalesce(v_representative_account_id, account_id)
                 where id = v_transaction_id;
            end if;
        end if;

        update public.replenishment_run_transactions
           set new_sources = v_new_sources
         where run_id = v_run.id
           and transaction_id = v_transaction_id
           and account_id = v_old_account_id;
    end loop;

    update public.replenishment_runs
       set status = 'confirmed',
           preview_snapshot = p_preview,
           confirmed_at = now()
     where id = v_run.id
     returning * into v_run;

    return v_run;
end;
$$;

comment on function public.confirm_replenishment_run(uuid, jsonb, jsonb) is
'Atomically confirms a draft replenishment run: validates the submitted per-unit funding assignments against the stored preview, guards against double-replenishing a transaction already covered by another confirmed run, then for each covered unit (a whole non-split transaction, or one transaction_allocations row of a split one) reassigns its real account_id/pot_id directly to the new source(s) -- splitting it via transaction_allocations when more than one source is needed -- snapshotting the pre-replenishment source into original_source_type/original_account_id/original_pot_id (once; never overwritten). No new transfer/replenishment transactions are created. Also collapses a split transaction back to a plain non-split one if reassigning a slice merges it into a sibling allocation and leaves only one funding source. Idempotent -- retrying after a successful commit returns the already-confirmed run unchanged; a failed attempt (any exception, including a deferred constraint at commit) rolls back every mutation it made, so a retry against a still-draft run safely redoes the whole loop from scratch.';

revoke all on function public.confirm_replenishment_run(uuid, jsonb, jsonb) from public;
grant execute on function public.confirm_replenishment_run(uuid, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
