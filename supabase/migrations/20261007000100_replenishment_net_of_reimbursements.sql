-- Replenishments: only cover what is still owed after reimbursements.
--
-- Before: an expense that somebody had already partly paid back (a
-- transaction_reimbursements row, e.g. "Continente" 257.70 with 84.28
-- reimbursed by "Carlos e Andreia") was offered for replenishment at its full
-- amount, so the replenished account ended up compensated twice for the
-- reimbursed part (once by the reimbursement, once by the replenishment).
--
-- Now:
--   * replenishable_units() returns, per replenishable unit (a whole non-split
--     expense, or one account allocation of a split one), the unit's amount,
--     its share of the expense's reimbursements and what is left to
--     replenish. The wizard uses it for the amounts it shows/selects, and
--     confirm_replenishment_run uses it to validate.
--   * confirm_replenishment_run reassigns only the replenished part. The
--     reimbursed remainder stays funded by the original account as a "kept"
--     allocation, so the transaction keeps its full amount (257.70 in the
--     transactions list) while the replenishment covers 173.42.
--
-- Reimbursement share: for a non-split expense, all of its reimbursements.
-- For a split expense, the reimbursed total is spread over its allocations in
-- proportion to their amounts (cent remainder on the last allocation by
-- sort_order), so every unit -- and therefore every account -- gets its fair
-- part of what was paid back.

create or replace function public.replenishable_units(p_household_id uuid, p_transaction_ids uuid[])
returns table (
    transaction_id uuid,
    account_id uuid,
    unit_amount numeric,
    reimbursed_amount numeric,
    replenishable_amount numeric
)
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
    with tx as (
        select t.id, t.amount, t.is_split, t.account_id
          from public.transactions t
         where t.household_id = p_household_id
           and t.id = any (p_transaction_ids)
           and t.type = 'expense'
           and t.transfer_group_id is null
    ),
    reimbursed as (
        select r.transaction_id, sum(r.amount) as total
          from public.transaction_reimbursements r
         where r.household_id = p_household_id
           and r.transaction_id = any (p_transaction_ids)
         group by r.transaction_id
    ),
    plain as (
        select tx.id as transaction_id,
               tx.account_id,
               tx.amount as unit_amount,
               least(coalesce(re.total, 0), tx.amount) as reimbursed_amount
          from tx
          left join reimbursed re on re.transaction_id = tx.id
         where not tx.is_split
           and tx.account_id is not null
    ),
    alloc as (
        select a.transaction_id,
               a.source_type,
               a.account_id,
               a.amount,
               tx.amount as tx_amount,
               least(coalesce(re.total, 0), tx.amount) as reimbursed_total,
               row_number() over (partition by a.transaction_id order by a.sort_order desc, a.id desc) as rn_last
          from public.transaction_allocations a
          join tx on tx.id = a.transaction_id and tx.is_split
          left join reimbursed re on re.transaction_id = a.transaction_id
    ),
    shares as (
        select alloc.*,
               case when rn_last = 1 then null
                    else round(reimbursed_total * amount / nullif(tx_amount, 0), 2)
               end as share
          from alloc
    ),
    split_units as (
        select s.transaction_id,
               s.account_id,
               s.amount as unit_amount,
               least(
                   s.amount,
                   greatest(
                       0,
                       coalesce(s.share, s.reimbursed_total - coalesce(sum(s.share) over (partition by s.transaction_id), 0))
                   )
               ) as reimbursed_amount,
               s.source_type
          from shares s
    )
    select transaction_id, account_id, unit_amount, reimbursed_amount,
           greatest(unit_amount - reimbursed_amount, 0) as replenishable_amount
      from plain
    union all
    select transaction_id, account_id, unit_amount, reimbursed_amount,
           greatest(unit_amount - reimbursed_amount, 0) as replenishable_amount
      from split_units
     where source_type = 'account';
$$;

COMMENT ON FUNCTION public.replenishable_units(uuid, uuid[]) IS 'Per replenishable unit of the given expense transactions (a whole non-split expense, or one account allocation of a split one): unit_amount, its share of the expense''s reimbursements (reimbursed_amount; split expenses share them in proportion to allocation amounts) and replenishable_amount = what a replenishment may still cover. Used by the replenishment wizard and validated by confirm_replenishment_run. Security invoker -- RLS applies.';

revoke all on function public.replenishable_units(uuid, uuid[]) from public, anon;
grant execute on function public.replenishable_units(uuid, uuid[]) to authenticated;

CREATE OR REPLACE FUNCTION public.confirm_replenishment_run(p_run_id uuid, p_unit_sources jsonb, p_preview jsonb) RETURNS public.replenishment_runs
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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
    v_unit_amount numeric;
    v_replenishable numeric;
    v_remainder numeric;
    v_is_kept boolean;
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

        -- What this unit may be replenished for: its amount minus its share
        -- of the transaction's reimbursements (see replenishable_units). The
        -- run must cover exactly that -- anything else means the transaction,
        -- the split, or its reimbursements changed after the run was drafted.
        v_unit_amount := null;
        v_replenishable := null;
        select ru.unit_amount, ru.replenishable_amount
          into v_unit_amount, v_replenishable
          from public.replenishable_units(v_run.household_id, array[v_transaction_id]) ru
         where ru.account_id = v_old_account_id;

        if v_unit_amount is null then
            raise exception 'Covered transaction % no longer has a part paid from this account', v_transaction_id;
        end if;
        if round(v_replenishable, 2) <> round(v_unit_total, 2) then
            raise exception 'Transaction % changed (amount, split or reimbursements) since this replenishment was drafted -- start a new one.', v_transaction_id;
        end if;

        -- The reimbursed part was already paid back to this account by
        -- someone else, so it stays funded by it: add it as a "kept" source.
        -- That turns a partially-covered transaction into a split (new
        -- source(s) + the kept slice) whose total still equals the original
        -- amount, so the transactions list keeps showing the full value.
        v_remainder := round(v_unit_amount - v_unit_total, 2);
        if v_remainder > 0 then
            v_unit := jsonb_set(
                v_unit,
                '{sources}',
                coalesce(v_unit -> 'sources', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                    'sourceType', 'account',
                    'accountId', v_old_account_id::text,
                    'amount', v_remainder,
                    'kept', true
                ))
            );
            v_source_count := v_source_count + 1;
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
                    v_is_kept := coalesce((v_source ->> 'kept')::boolean, false);

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
                        v_sort_order,
                        case when v_is_kept then (case when v_transaction.original_source_type = 'account' then 'account' end) else 'account' end,
                        case when v_is_kept then (case when v_transaction.original_source_type = 'account' then v_transaction.original_account_id end) else v_old_account_id end,
                        case when v_is_kept then v_transaction.replenishment_run_id else v_run.id end
                    );
                    v_sort_order := v_sort_order + 1;

                    if v_source_account_id is not null and v_source_amount > v_representative_amount then
                        v_representative_account_id := v_source_account_id;
                        v_representative_amount := v_source_amount;
                    end if;

                    if not v_is_kept then
                        v_new_sources := v_new_sources || jsonb_build_object(
                            'source_type', v_source_type,
                            'account_id', v_source_account_id,
                            'pot_id', v_source_pot_id,
                            'amount', v_source_amount
                        );
                    end if;
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
                v_is_kept := coalesce((v_source ->> 'kept')::boolean, false);
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
                        case when v_is_kept then (case when v_allocation.original_source_type = 'account' then 'account' end) else 'account' end,
                        case when v_is_kept then (case when v_allocation.original_source_type = 'account' then v_allocation.original_account_id end) else coalesce(v_allocation.original_account_id, v_old_account_id) end,
                        case when v_is_kept then v_allocation.replenishment_run_id else v_run.id end
                    );
                end if;

                if not v_is_kept then
                    v_new_sources := v_new_sources || jsonb_build_object(
                        'source_type', v_source_type,
                        'account_id', v_source_account_id,
                        'pot_id', v_source_pot_id,
                        'amount', v_source_amount
                    );
                end if;
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

COMMENT ON FUNCTION public.confirm_replenishment_run(p_run_id uuid, p_unit_sources jsonb, p_preview jsonb) IS 'Atomically confirms a draft replenishment run: validates the submitted per-unit funding assignments against the stored preview, guards against double-replenishing a transaction already covered by another confirmed run, checks every covered unit still has exactly the replenishable amount it was drafted with (unit amount minus its share of reimbursements -- see replenishable_units), then reassigns that part of each unit (a whole non-split transaction, or one transaction_allocations row of a split one) to the new source(s), splitting via transaction_allocations when needed. A reimbursed remainder stays on the original account as a kept allocation, so the transaction''s amount never changes. Snapshots the pre-replenishment source into original_source_type/original_account_id/original_pot_id (once; never overwritten). No new transfer/replenishment transactions are created. Collapses a split back to a plain transaction if only one funding source is left. Idempotent -- retrying after a successful commit returns the already-confirmed run unchanged; a failed attempt rolls back every mutation it made.';
