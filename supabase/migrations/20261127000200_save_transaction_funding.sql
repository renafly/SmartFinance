-- Split the effective cost of a reimbursed expense across several accounts.
--
-- Until now Split Source and reimbursements were mutually exclusive in the
-- app: a reimbursement always went back into the expense's single "Paid
-- from" account. Now an expense can have both:
--   * the user splits the EFFECTIVE cost (amount - reimbursed) over accounts;
--   * each reimbursement is received in one of the accounts money left
--     from (without a split: the transaction's own account; with a split:
--     one of the split's accounts);
--   * transaction_allocations keeps the FULL amounts, so they still sum to
--     the transaction amount: full[account] = effective[account] + the
--     reimbursements received in that account.
--
-- save_transaction_funding saves the reimbursement set and the split in one
-- transaction (the app used to write them in two separate calls).
--
-- replenishable_units: for a split expense, the reimbursed part of each
-- allocation is now what that account received (capped at its amount);
-- only reimbursements not received in any of the split's accounts (legacy
-- rows) are still spread proportionally. Plain expenses are unchanged.

create or replace function public.save_transaction_funding(
    p_transaction_id uuid,
    p_effective_allocations jsonb,
    p_reimbursements jsonb
)
returns void
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
    v_tx public.transactions%rowtype;
    v_row jsonb;
    v_account_id uuid;
    v_amount numeric;
    v_reimbursed_total numeric := 0;
    v_effective_total numeric := 0;
    v_received jsonb := '{}'::jsonb;
    v_split_accounts uuid[] := '{}';
    v_full jsonb := '[]'::jsonb;
    v_keep_ids uuid[] := '{}';
    v_reimbursement_id uuid;
    v_payer text;
    v_received_on date;
    v_full_amount numeric;
begin
    select * into v_tx from public.transactions where id = p_transaction_id for update;
    if not found then
        raise exception using errcode = '22023', message = 'Transaction not found.';
    end if;
    if not public.is_household_member(v_tx.household_id, (select auth.uid())) then
        raise exception using errcode = '42501', message = 'Household membership is required.';
    end if;
    if v_tx.type <> 'expense' or v_tx.transfer_group_id is not null then
        raise exception using errcode = '22023', message = 'Only expenses can have a split with reimbursements.';
    end if;
    if p_effective_allocations is null or jsonb_typeof(p_effective_allocations) <> 'array'
       or p_reimbursements is null or jsonb_typeof(p_reimbursements) <> 'array' then
        raise exception using errcode = '22023', message = 'Allocations and reimbursements must be arrays.';
    end if;

    -- Split accounts (validated below when there is a split).
    for v_row in select value from jsonb_array_elements(p_effective_allocations)
    loop
        v_account_id := nullif(v_row ->> 'account_id', '')::uuid;
        if v_account_id is null then
            raise exception using errcode = '22023', message = 'Each split row needs an account.';
        end if;
        if v_account_id = any (v_split_accounts) then
            raise exception using errcode = '23505', message = 'Each account can only be used once per transaction.';
        end if;
        if not exists (select 1 from public.accounts where id = v_account_id and household_id = v_tx.household_id) then
            raise exception using errcode = '22023', message = 'Split account must belong to this household.';
        end if;
        v_split_accounts := v_split_accounts || v_account_id;
    end loop;

    if jsonb_array_length(p_effective_allocations) = 1 then
        raise exception using errcode = '22023', message = 'A split transaction requires at least two allocations.';
    end if;

    -- Reimbursements: validate, then upsert the final set.
    for v_row in select value from jsonb_array_elements(p_reimbursements)
    loop
        v_reimbursement_id := nullif(v_row ->> 'id', '')::uuid;
        v_payer := btrim(coalesce(v_row ->> 'payer_name', ''));
        v_amount := round(coalesce((v_row ->> 'amount')::numeric, 0), 2);
        v_account_id := nullif(v_row ->> 'account_id', '')::uuid;
        v_received_on := coalesce(nullif(v_row ->> 'received_on', '')::date, current_date);

        if v_payer = '' then
            raise exception using errcode = '22023', message = 'Every reimbursement needs a payer name.';
        end if;
        if v_amount <= 0 then
            raise exception using errcode = '22023', message = 'Every reimbursement amount must be greater than zero.';
        end if;
        if v_account_id is null then
            raise exception using errcode = '22023', message = 'Every reimbursement needs the account it was received in.';
        end if;
        if cardinality(v_split_accounts) > 0 then
            if not (v_account_id = any (v_split_accounts)) then
                raise exception using errcode = '22023', message = 'A reimbursement can only be received in one of the accounts the expense was paid from.';
            end if;
        elsif v_account_id <> v_tx.account_id then
            raise exception using errcode = '22023', message = 'A reimbursement can only be received in the account the expense was paid from.';
        end if;

        if v_reimbursement_id is not null then
            update public.transaction_reimbursements
               set payer_name = v_payer,
                   amount = v_amount,
                   note = nullif(v_row ->> 'note', ''),
                   source_type = 'account',
                   account_id = v_account_id,
                   pot_id = null,
                   received_on = v_received_on
             where id = v_reimbursement_id
               and transaction_id = v_tx.id;
            if not found then
                raise exception using errcode = '22023', message = 'Reimbursement does not belong to this transaction.';
            end if;
        else
            insert into public.transaction_reimbursements (
                household_id, transaction_id, payer_name, amount, note, created_by,
                source_type, account_id, pot_id, received_on
            ) values (
                v_tx.household_id, v_tx.id, v_payer, v_amount, nullif(v_row ->> 'note', ''), (select auth.uid()),
                'account', v_account_id, null, v_received_on
            )
            returning id into v_reimbursement_id;
        end if;

        v_keep_ids := v_keep_ids || v_reimbursement_id;
        v_reimbursed_total := v_reimbursed_total + v_amount;
        v_received := jsonb_set(
            v_received,
            array[v_account_id::text],
            to_jsonb(coalesce((v_received ->> v_account_id::text)::numeric, 0) + v_amount)
        );
    end loop;

    delete from public.transaction_reimbursements
     where transaction_id = v_tx.id
       and not (id = any (v_keep_ids));

    if cardinality(v_split_accounts) = 0 then
        perform public.save_transaction_allocations(v_tx.id, '[]'::jsonb);
        return;
    end if;

    -- Split: effective rows must cover amount - reimbursed exactly.
    if round(v_reimbursed_total, 2) >= round(v_tx.amount, 2) then
        raise exception using errcode = '22023', message = 'A fully reimbursed expense cannot be split.';
    end if;

    for v_row in select value from jsonb_array_elements(p_effective_allocations)
    loop
        v_account_id := (v_row ->> 'account_id')::uuid;
        v_amount := round(coalesce((v_row ->> 'amount')::numeric, 0), 2);
        if v_amount < 0 then
            raise exception using errcode = '22023', message = 'Split amounts cannot be negative.';
        end if;
        if v_amount = 0 and not (v_received ? v_account_id::text) then
            raise exception using errcode = '22023', message = 'Every split amount must be greater than zero.';
        end if;
        v_effective_total := v_effective_total + v_amount;
        v_full_amount := v_amount + coalesce((v_received ->> v_account_id::text)::numeric, 0);
        v_full := v_full || jsonb_build_object(
            'source_type', 'account',
            'account_id', v_account_id,
            'pot_id', null,
            'amount', v_full_amount
        );
    end loop;

    if round(v_effective_total, 2) <> round(v_tx.amount - v_reimbursed_total, 2) then
        raise exception using
            errcode = '22023',
            message = format('The split (%s) must sum to the amount not reimbursed (%s).', v_effective_total, v_tx.amount - v_reimbursed_total);
    end if;

    perform public.save_transaction_allocations(v_tx.id, v_full);
end;
$$;

COMMENT ON FUNCTION public.save_transaction_funding(uuid, jsonb, jsonb) IS 'Saves an expense''s reimbursements and Split Source together, in one transaction. p_reimbursements is the full final set [{id|null, payer_name, amount, note, account_id, received_on}] (rows left out are deleted); each must be received in an account the expense is paid from (the transaction''s account, or one of the split''s accounts). p_effective_allocations [{account_id, amount}] splits the effective cost (amount - reimbursed) and is stored as full allocations (effective + reimbursements received per account) via save_transaction_allocations; an empty array means no split. Security invoker -- RLS and save_transaction_allocations'' membership checks apply.';

revoke all on function public.save_transaction_funding(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_transaction_funding(uuid, jsonb, jsonb) to authenticated;

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
    received as (
        select r.transaction_id, r.account_id, sum(r.amount) as total
          from public.transaction_reimbursements r
         where r.household_id = p_household_id
           and r.transaction_id = any (p_transaction_ids)
           and r.source_type = 'account'
           and r.account_id is not null
         group by r.transaction_id, r.account_id
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
               least(coalesce(re.total, 0), tx.amount) as reimbursed_total,
               -- What this allocation's own account received back.
               least(coalesce(rv.total, 0), a.amount) as received,
               row_number() over (partition by a.transaction_id order by a.sort_order desc, a.id desc) as rn_last
          from public.transaction_allocations a
          join tx on tx.id = a.transaction_id and tx.is_split
          left join reimbursed re on re.transaction_id = a.transaction_id
          left join received rv on rv.transaction_id = a.transaction_id and rv.account_id = a.account_id
    ),
    pooled as (
        -- Reimbursements not received in any of the split's accounts
        -- (legacy rows) are still spread over what is left of each
        -- allocation, in proportion to it.
        select alloc.*,
               greatest(alloc.reimbursed_total - sum(alloc.received) over (partition by alloc.transaction_id), 0) as unreceived_total,
               sum(alloc.amount - alloc.received) over (partition by alloc.transaction_id) as open_total
          from alloc
    ),
    shares as (
        select pooled.*,
               case when rn_last = 1 then null
                    else round(unreceived_total * (amount - received) / nullif(open_total, 0), 2)
               end as share
          from pooled
    ),
    split_units as (
        select s.transaction_id,
               s.account_id,
               s.amount as unit_amount,
               s.received + least(
                   s.amount - s.received,
                   greatest(
                       0,
                       coalesce(s.share, s.unreceived_total - coalesce(sum(s.share) over (partition by s.transaction_id), 0))
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

COMMENT ON FUNCTION public.replenishable_units(uuid, uuid[]) IS 'Per replenishable unit of the given expense transactions (a whole non-split expense, or one account allocation of a split one): unit_amount, its share of the expense''s reimbursements (reimbursed_amount; for a split expense, what that account received back, plus a proportional share of reimbursements not received in any split account) and replenishable_amount = what a replenishment may still cover. Used by the replenishment wizard and validated by confirm_replenishment_run. Security invoker -- RLS applies.';
